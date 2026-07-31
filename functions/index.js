const { setGlobalOptions } = require("firebase-functions/v2");
const {
  onCall,
  onRequest,
  HttpsError
} = require("firebase-functions/v2/https");
const {
  defineSecret,
  defineString
} = require("firebase-functions/params");
const admin = require("firebase-admin");
const Stripe = require("stripe");

admin.initializeApp();

setGlobalOptions({
  region: "europe-west3",
  maxInstances: 10,
  timeoutSeconds: 60,
  memory: "256MiB"
});

const db = admin.firestore();

const stripeSecretKey = defineSecret("STRIPE_SECRET_KEY");
const stripeWebhookSecret = defineSecret("STRIPE_WEBHOOK_SECRET");

const stripePriceId = defineString("STRIPE_PRICE_ID");
const applicationUrl = defineString("APPLICATION_URL");

function getStripe() {
  return new Stripe(stripeSecretKey.value(), {
    maxNetworkRetries: 2,
    timeout: 20000
  });
}

function requireUser(request) {
  if (!request.auth?.uid) {
    throw new HttpsError(
      "unauthenticated",
      "Eine Anmeldung ist erforderlich."
    );
  }

  return {
    uid: request.auth.uid,
    email: request.auth.token.email || ""
  };
}

function getApplicationOrigin() {
  let url;

  try {
    url = new URL(applicationUrl.value());
  } catch {
    throw new Error("APPLICATION_URL is invalid.");
  }

  if (
    url.protocol !== "https:" ||
    url.username ||
    url.password
  ) {
    throw new Error(
      "APPLICATION_URL must be a public HTTPS origin."
    );
  }

  return url.origin;
}

async function validateSubscriptionPrice(stripe) {
  const price = await stripe.prices.retrieve(
    stripePriceId.value(),
    {
      expand: ["product"]
    }
  );

  const valid =
    price.active === true &&
    price.currency === "eur" &&
    price.unit_amount === 299 &&
    price.type === "recurring" &&
    price.recurring?.interval === "month" &&
    price.recurring?.interval_count === 1;

  if (!valid) {
    console.error("Invalid Stripe price configuration:", {
      id: price.id,
      active: price.active,
      currency: price.currency,
      unitAmount: price.unit_amount,
      type: price.type,
      interval: price.recurring?.interval,
      intervalCount: price.recurring?.interval_count
    });

    throw new HttpsError(
      "failed-precondition",
      "Die Abonnement-Konfiguration ist ungültig."
    );
  }

  return price;
}

async function getOrCreateCustomer(
  stripe,
  uid,
  profile,
  authenticatedEmail
) {
  if (profile.stripeCustomerId) {
    try {
      const customer = await stripe.customers.retrieve(
        profile.stripeCustomerId
      );

      if (
        !customer.deleted &&
        customer.metadata?.firebaseUid === uid
      ) {
        return customer;
      }

      console.error(
        "Rejected Stripe customer with mismatched Firebase UID."
      );
    } catch (error) {
      console.warn(
        "Stored Stripe customer could not be retrieved:",
        error.message
      );
    }
  }

  const realEmail =
    authenticatedEmail &&
    !authenticatedEmail.endsWith("@sch.local")
      ? authenticatedEmail
      : undefined;

  const customer = await stripe.customers.create({
    email: realEmail,
    name: profile.name || undefined,
    metadata: {
      firebaseUid: uid
    }
  });

  await db.collection("userProfiles").doc(uid).set({
    stripeCustomerId: customer.id,
    subscriptionActive: false,
    subscriptionStatus: "incomplete",
    subscriptionUpdatedAt:
      admin.firestore.FieldValue.serverTimestamp()
  }, {
    merge: true
  });

  return customer;
}

async function getReusableCheckoutSession(
  stripe,
  profile,
  uid
) {
  if (!profile.checkoutSessionId) return null;

  try {
    const session = await stripe.checkout.sessions.retrieve(
      profile.checkoutSessionId
    );

    if (
      session.status === "open" &&
      session.mode === "subscription" &&
      session.client_reference_id === uid &&
      session.url
    ) {
      return session;
    }
  } catch (error) {
    console.warn(
      "Previous Checkout Session cannot be reused:",
      error.message
    );
  }

  return null;
}

exports.createSubscriptionCheckout = onCall({
  secrets: [stripeSecretKey],
  consumeAppCheckToken: false
}, async request => {
  const { uid, email } = requireUser(request);
  const stripe = getStripe();

  await validateSubscriptionPrice(stripe);

  const profileReference =
    db.collection("userProfiles").doc(uid);

  const profileSnapshot = await profileReference.get();

  if (!profileSnapshot.exists) {
    throw new HttpsError(
      "failed-precondition",
      "Das Benutzerprofil wurde nicht gefunden."
    );
  }

  const profile = profileSnapshot.data() || {};

  if (profile.uid && profile.uid !== uid) {
    throw new HttpsError(
      "permission-denied",
      "Das Benutzerprofil ist ungültig."
    );
  }

  if (
    profile.subscriptionActive === true &&
    ["active", "trialing"].includes(
      profile.subscriptionStatus
    )
  ) {
    throw new HttpsError(
      "already-exists",
      "Für dieses Konto besteht bereits ein aktives Abonnement."
    );
  }

  const reusableSession =
    await getReusableCheckoutSession(
      stripe,
      profile,
      uid
    );

  if (reusableSession) {
    return {
      checkoutUrl: reusableSession.url
    };
  }

  const customer = await getOrCreateCustomer(
    stripe,
    uid,
    profile,
    email
  );

  const origin = getApplicationOrigin();

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer: customer.id,
    client_reference_id: uid,
    locale: "de",
    line_items: [{
      price: stripePriceId.value(),
      quantity: 1
    }],
    success_url:
      `${origin}/?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url:
      `${origin}/?checkout=cancelled`,
    billing_address_collection: "required",
    tax_id_collection: {
      enabled: true
    },
    automatic_tax: {
      enabled: true
    },
    payment_method_collection: "always",
    allow_promotion_codes: false,
    customer_update: {
      address: "auto",
      name: "auto"
    },
    consent_collection: {
      terms_of_service: "required"
    },
    custom_text: {
      submit: {
        message:
          "2,99 € pro Monat. Das Abonnement verlängert sich monatlich und kann über das Kundenportal gekündigt werden."
      }
    },
    metadata: {
      firebaseUid: uid
    },
    subscription_data: {
      metadata: {
        firebaseUid: uid
      }
    }
  }, {
    idempotencyKey:
      `subscription-checkout-${uid}-${stripePriceId.value()}`
  });

  await profileReference.set({
    checkoutSessionId: session.id,
    stripeCustomerId: customer.id,
    stripePriceId: stripePriceId.value(),
    subscriptionActive: false,
    subscriptionStatus: "incomplete",
    subscriptionUpdatedAt:
      admin.firestore.FieldValue.serverTimestamp()
  }, {
    merge: true
  });

  return {
    checkoutUrl: session.url
  };
});

exports.createBillingPortalSession = onCall({
  secrets: [stripeSecretKey],
  consumeAppCheckToken: false
}, async request => {
  const { uid } = requireUser(request);
  const stripe = getStripe();

  const profileSnapshot = await db
    .collection("userProfiles")
    .doc(uid)
    .get();

  if (!profileSnapshot.exists) {
    throw new HttpsError(
      "not-found",
      "Das Benutzerprofil wurde nicht gefunden."
    );
  }

  const profile = profileSnapshot.data() || {};

  if (!profile.stripeCustomerId) {
    throw new HttpsError(
      "failed-precondition",
      "Für dieses Konto wurde kein Abonnement gefunden."
    );
  }

  const customer = await stripe.customers.retrieve(
    profile.stripeCustomerId
  );

  if (
    customer.deleted ||
    customer.metadata?.firebaseUid !== uid
  ) {
    throw new HttpsError(
      "permission-denied",
      "Das Stripe-Kundenkonto ist ungültig."
    );
  }

  const session =
    await stripe.billingPortal.sessions.create({
      customer: customer.id,
      return_url: `${getApplicationOrigin()}/?billing=returned`
    });

  return {
    portalUrl: session.url
  };
});

async function getSubscriptionUid(stripe, subscription) {
  if (subscription.metadata?.firebaseUid) {
    return subscription.metadata.firebaseUid;
  }

  const customerId =
    typeof subscription.customer === "string"
      ? subscription.customer
      : subscription.customer?.id;

  if (!customerId) return "";

  const customer = await stripe.customers.retrieve(
    customerId
  );

  if (customer.deleted) return "";

  return customer.metadata?.firebaseUid || "";
}

function stripeTimestamp(value) {
  if (!Number.isFinite(value)) return null;

  return admin.firestore.Timestamp.fromMillis(
    value * 1000
  );
}

async function updateSubscriptionProfile(
  stripe,
  subscription,
  paymentStatus = null
) {
  const uid = await getSubscriptionUid(
    stripe,
    subscription
  );

  if (!uid) {
    throw new Error(
      `No Firebase UID for subscription ${subscription.id}.`
    );
  }

  const activeStatuses = ["active", "trialing"];
  const subscriptionActive =
    activeStatuses.includes(subscription.status);

  const customerId =
    typeof subscription.customer === "string"
      ? subscription.customer
      : subscription.customer?.id || null;

  const firstItem = subscription.items?.data?.[0];

  const update = {
    stripeCustomerId: customerId,
    stripeSubscriptionId: subscription.id,
    stripeSubscriptionItemId: firstItem?.id || null,
    stripePriceId: firstItem?.price?.id || null,
    subscriptionStatus: subscription.status,
    subscriptionActive,
    subscriptionCancelAtPeriodEnd:
      Boolean(subscription.cancel_at_period_end),
    subscriptionCurrentPeriodEnd:
      stripeTimestamp(subscription.current_period_end),
    subscriptionUpdatedAt:
      admin.firestore.FieldValue.serverTimestamp()
  };

  if (paymentStatus) {
    update.lastPaymentStatus = paymentStatus;
    update.lastPaymentAt =
      admin.firestore.FieldValue.serverTimestamp();
  }

  await db.collection("userProfiles").doc(uid).set(
    update,
    {
      merge: true
    }
  );
}

async function processStripeEvent(stripe, event) {
  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object;

      if (session.mode !== "subscription") {
        return;
      }

      const uid =
        session.client_reference_id ||
        session.metadata?.firebaseUid;

      if (!uid) {
        throw new Error(
          `Checkout Session ${session.id} has no Firebase UID.`
        );
      }

      const subscriptionId =
        typeof session.subscription === "string"
          ? session.subscription
          : session.subscription?.id;

      if (!subscriptionId) {
        throw new Error(
          `Checkout Session ${session.id} has no subscription.`
        );
      }

      const subscription =
        await stripe.subscriptions.retrieve(
          subscriptionId
        );

      const subscriptionUid =
        await getSubscriptionUid(
          stripe,
          subscription
        );

      if (subscriptionUid !== uid) {
        throw new Error(
          `UID mismatch for Checkout Session ${session.id}.`
        );
      }

      await updateSubscriptionProfile(
        stripe,
        subscription,
        session.payment_status
      );

      break;
    }

    case "customer.subscription.created":
    case "customer.subscription.updated":
    case "customer.subscription.deleted": {
      await updateSubscriptionProfile(
        stripe,
        event.data.object
      );
      break;
    }

    case "invoice.paid":
    case "invoice.payment_failed": {
      const invoice = event.data.object;

      const subscriptionId =
        typeof invoice.subscription === "string"
          ? invoice.subscription
          : invoice.subscription?.id;

      if (!subscriptionId) return;

      const subscription =
        await stripe.subscriptions.retrieve(
          subscriptionId
        );

      await updateSubscriptionProfile(
        stripe,
        subscription,
        event.type === "invoice.paid"
          ? "paid"
          : "failed"
      );

      break;
    }

    default:
      console.info(
        `Ignored Stripe event: ${event.type}`
      );
  }
}

exports.stripeWebhook = onRequest({
  secrets: [
    stripeSecretKey,
    stripeWebhookSecret
  ],
  cors: false
}, async (request, response) => {
  if (request.method !== "POST") {
    response
      .set("Allow", "POST")
      .status(405)
      .send("Method Not Allowed");
    return;
  }

  const signature =
    request.headers["stripe-signature"];

  if (!signature) {
    response
      .status(400)
      .send("Missing Stripe signature");
    return;
  }

  const stripe = getStripe();

  let event;

  try {
    event = stripe.webhooks.constructEvent(
      request.rawBody,
      signature,
      stripeWebhookSecret.value()
    );
  } catch (error) {
    console.error(
      "Stripe signature verification failed:",
      error.message
    );

    response
      .status(400)
      .send("Invalid Stripe signature");
    return;
  }

  const eventReference = db
    .collection("stripeWebhookEvents")
    .doc(event.id);

  try {
    const acquired =
      await db.runTransaction(async transaction => {
        const snapshot =
          await transaction.get(eventReference);

        if (snapshot.exists) {
          return false;
        }

        transaction.create(eventReference, {
          eventType: event.type,
          status: "processing",
          receivedAt:
            admin.firestore.FieldValue.serverTimestamp()
        });

        return true;
      });

    if (!acquired) {
      response.status(200).json({
        received: true,
        duplicate: true
      });
      return;
    }

    await processStripeEvent(stripe, event);

    await eventReference.set({
      status: "processed",
      processedAt:
        admin.firestore.FieldValue.serverTimestamp()
    }, {
      merge: true
    });

    response.status(200).json({
      received: true
    });
  } catch (error) {
    console.error(
      `Stripe webhook ${event.id} failed:`,
      error
    );

    await eventReference.delete().catch(() => {});

    response
      .status(500)
      .send("Webhook processing failed");
  }
});
