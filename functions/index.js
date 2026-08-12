const { setGlobalOptions } = require("firebase-functions/v2");
const {
  onCall,
  onRequest,
  HttpsError
} = require("firebase-functions/v2/https");
const { onSchedule } = require("firebase-functions/v2/scheduler");
const {
  defineSecret,
  defineString
} = require("firebase-functions/params");
const admin = require("firebase-admin");
const Stripe = require("stripe");
const { Resend } = require("resend");

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

const resendApiKey = defineSecret("RESEND_API_KEY");
const resendFromEmail = defineString("RESEND_FROM_EMAIL");

const TRIAL_DURATION_DAYS = 7;
const OTP_EXPIRY_MINUTES = 10;

function getResend() {
  return new Resend(resendApiKey.value());
}

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



function generateOtp() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

function normalizeEmailForOtp(email) {
  return String(email || "").trim().toLowerCase();
}

async function sendOtpEmail(email, code) {
  const resend = getResend();
  const from = resendFromEmail.value();

  const { error } = await resend.emails.send({
    from,
    to: [email],
    subject: "Dein Bestätigungscode – Meine Stunden Online",
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px 20px;">
        <div style="text-align:center;margin-bottom:28px;">
          <div style="font-weight:900;font-size:20px;letter-spacing:-0.5px;color:#0f172a;">MEINE STUNDEN</div>
          <div style="font-size:10px;font-weight:800;color:#E30613;letter-spacing:1px;margin-top:2px;">ONLINE</div>
        </div>
        <h2 style="font-size:18px;color:#0f172a;margin:0 0 8px;">Dein Bestätigungscode</h2>
        <p style="font-size:14px;color:#475569;margin:0 0 20px;">Gib diesen Code in der App ein, um dein Konto zu aktivieren:</p>
        <div style="background:#f8fafc;border:2px dashed #e2e8f0;border-radius:12px;padding:20px;text-align:center;margin-bottom:24px;">
          <span style="font-family:monospace;font-size:36px;font-weight:800;letter-spacing:8px;color:#0f172a;">${code}</span>
        </div>
        <p style="font-size:12px;color:#94a3b8;margin:0;">Dieser Code ist ${OTP_EXPIRY_MINUTES} Minuten gültig. Falls du diese E-Mail nicht angefordert hast, ignoriere sie bitte.</p>
        <hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0;">
        <p style="font-size:11px;color:#94a3b8;margin:0;">Meine Stunden Online – Professionelle Zeiterfassung für Handwerksbetriebe</p>
      </div>
    `
  });

  if (error) {
    console.error("Resend send failed:", error);
    throw new HttpsError("internal", "Die E-Mail konnte nicht gesendet werden.");
  }
}

exports.sendRegistrationOtp = onCall({
  secrets: [resendApiKey],
  consumeAppCheckToken: false
}, async request => {
  const email = normalizeEmailForOtp(request.data?.email);

  if (!email || !email.includes("@")) {
    throw new HttpsError(
      "invalid-argument",
      "Bitte eine gültige E-Mail-Adresse eingeben."
    );
  }

  const existingDoc = await db.collection("otpCodes").doc(email).get();

  if (existingDoc.exists) {
    const data = existingDoc.data() || {};
    const ageSeconds = data.createdAt
      ? (Date.now() - data.createdAt.toMillis()) / 1000
      : 999;

    if (ageSeconds < 60) {
      throw new HttpsError(
        "resource-exhausted",
        "Bitte warte eine Minute bevor du einen neuen Code anforderst."
      );
    }
  }

  const code = generateOtp();
  const now = admin.firestore.Timestamp.now();
  const expiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);

  await db.collection("otpCodes").doc(email).set({
    email,
    code,
    createdAt: now,
    expiresAt: admin.firestore.Timestamp.fromDate(expiresAt),
    used: false
  });

  await sendOtpEmail(email, code);

  return { success: true };
});

exports.verifyOtpAndCreateAccount = onCall({
  secrets: [resendApiKey],
  consumeAppCheckToken: false
}, async request => {
  const { email, otp, name, company, password } = request.data || {};
  const normalizedEmail = normalizeEmailForOtp(email);

  if (!normalizedEmail || !normalizedEmail.includes("@")) {
    throw new HttpsError("invalid-argument", "Ungültige E-Mail-Adresse.");
  }

  if (!otp || otp.length !== 6) {
    throw new HttpsError("invalid-argument", "Bitte den 6-stelligen Code eingeben.");
  }

  if (!name || !company || !password || password.length < 6) {
    throw new HttpsError(
      "invalid-argument",
      "Bitte alle Felder ausfüllen (Kennwort mind. 6 Zeichen)."
    );
  }

  const otpDoc = await db.collection("otpCodes").doc(normalizedEmail).get();

  if (!otpDoc.exists) {
    throw new HttpsError(
      "not-found",
      "Kein Code gefunden. Bitte fordere zuerst einen Code an."
    );
  }

  const otpData = otpDoc.data() || {};

  if (otpData.used) {
    throw new HttpsError(
      "permission-denied",
      "Dieser Code wurde bereits verwendet."
    );
  }

  if (otpData.expiresAt && otpData.expiresAt.toMillis() < Date.now()) {
    throw new HttpsError(
      "permission-denied",
      "Der Code ist abgelaufen. Bitte fordere einen neuen an."
    );
  }

  if (otpData.code !== otp) {
    throw new HttpsError(
      "permission-denied",
      "Der Code ist falsch. Bitte überprüfe deine Eingabe."
    );
  }

  try {
    await admin.auth().getUserByEmail(normalizedEmail);

    throw new HttpsError(
      "already-exists",
      "Für diese E-Mail-Adresse besteht bereits ein Konto. Bitte melde dich an."
    );
  } catch (error) {
    if (error instanceof HttpsError) throw error;
  }

  await db.collection("otpCodes").doc(normalizedEmail).update({ used: true });

  const userRecord = await admin.auth().createUser({
    email: normalizedEmail,
    password,
    displayName: name,
    emailVerified: true
  });

  const uid = userRecord.uid;
  const trialEndsAt = new Date(Date.now() + TRIAL_DURATION_DAYS * 24 * 60 * 60 * 1000);

  await db.collection("userProfiles").doc(uid).set({
    uid,
    name,
    email: normalizedEmail,
    companyName: company,
    vacationAllowed: 30,
    workSessions: [],
    leaveDays: [],
    trash: [],
    trialActive: true,
    trialEndsAt: admin.firestore.Timestamp.fromDate(trialEndsAt),
    subscriptionActive: false,
    subscriptionStatus: "trialing",
    trialReminderSent: null,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp()
  });

  try {
    const resend = getResend();
    const daysText = `${TRIAL_DURATION_DAYS} Tage`;

    await resend.emails.send({
      from: resendFromEmail.value(),
      to: [normalizedEmail],
      subject: `Willkommen bei Meine Stunden Online – ${daysText} kostenlos testen`,
      html: `
        <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px 20px;">
          <div style="text-align:center;margin-bottom:28px;">
            <div style="font-weight:900;font-size:20px;letter-spacing:-0.5px;color:#0f172a;">MEINE STUNDEN</div>
            <div style="font-size:10px;font-weight:800;color:#E30613;letter-spacing:1px;margin-top:2px;">ONLINE</div>
          </div>
          <h2 style="font-size:18px;color:#0f172a;margin:0 0 8px;">Willkommen, ${name}!</h2>
          <p style="font-size:14px;color:#475569;margin:0 0 16px;">Dein Konto wurde erfolgreich erstellt. Du hast jetzt <strong>${daysText} kostenlosen Zugang</strong> zu allen Features:</p>
          <ul style="font-size:14px;color:#475569;padding-left:20px;margin:0 0 20px;">
            <li style="margin-bottom:6px;">PDF-Stundenzettel mit deinem Firmennamen</li>
            <li style="margin-bottom:6px;">Automatische Überstundenberechnung</li>
            <li style="margin-bottom:6px;">KI-Stundenzettel Scan</li>
            <li style="margin-bottom:6px;">Cloud-Sync auf allen Geräten</li>
          </ul>
          <p style="font-size:13px;color:#64748b;margin:0;">Deine Testphase endet am <strong>${trialEndsAt.toLocaleDateString("de-DE")}</strong>. Danach kannst du das Abonnement für 2,99 €/Monat fortsetzen.</p>
          <hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0;">
          <p style="font-size:11px;color:#94a3b8;margin:0;">Meine Stunden Online – Professionelle Zeiterfassung für Handwerksbetriebe</p>
        </div>
      `
    });
  } catch (emailError) {
    console.warn("Welcome email failed:", emailError);
  }

  return {
    success: true,
    uid,
    trialEndsAt: trialEndsAt.toISOString()
  };
});

exports.sendTrialReminders = onSchedule({
  schedule: "every day 06:00",
  timeZone: "Europe/Berlin",
  secrets: [resendApiKey],
  memory: "256MiB",
  timeoutSeconds: 300
}, async () => {
  const now = admin.firestore.Timestamp.now();
  const twoDaysFromNow = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000);
  const fourDaysFromNow = new Date(Date.now() + 4 * 24 * 60 * 60 * 1000);

  const snapshot = await db.collection("userProfiles")
    .where("trialActive", "==", true)
    .where("subscriptionActive", "==", false)
    .where("trialEndsAt", ">=", admin.firestore.Timestamp.fromDate(twoDaysFromNow))
    .where("trialEndsAt", "<=", admin.firestore.Timestamp.fromDate(fourDaysFromNow))
    .get();

  if (snapshot.empty) {
    console.log("No trial reminders to send today.");
    return;
  }

  const resend = getResend();
  const from = resendFromEmail.value();
  let sent = 0;
  let failed = 0;

  for (const doc of snapshot.docs) {
    const profile = doc.data() || {};
    const email = profile.email;

    if (!email) continue;

    const trialEnd = profile.trialEndsAt?.toDate();

    if (!trialEnd) continue;

    const daysLeft = Math.ceil((trialEnd - now.toDate()) / (24 * 60 * 60 * 1000));

    if (daysLeft < 1 || daysLeft > 3) continue;

    const daysText = daysLeft === 1 ? "morgen" : `in ${daysLeft} Tagen`;

    try {
      await resend.emails.send({
        from,
        to: [email],
        subject: `Deine Testphase endet ${daysText} – Meine Stunden Online`,
        html: `
          <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px 20px;">
            <div style="text-align:center;margin-bottom:28px;">
              <div style="font-weight:900;font-size:20px;letter-spacing:-0.5px;color:#0f172a;">MEINE STUNDEN</div>
              <div style="font-size:10px;font-weight:800;color:#E30613;letter-spacing:1px;margin-top:2px;">ONLINE</div>
            </div>
            <h2 style="font-size:18px;color:#0f172a;margin:0 0 8px;">Deine Testphase endet ${daysText}</h2>
            <p style="font-size:14px;color:#475569;margin:0 0 16px;">Hallo ${profile.name || ""},</p>
            <p style="font-size:14px;color:#475569;margin:0 0 16px;">deine kostenlose Testphase bei Meine Stunden Online endet am <strong>${trialEnd.toLocaleDateString("de-DE")}</strong>. Damit du weiterhin alle Features nutzen kannst, schließe jetzt dein Abonnement ab:</p>
            <div style="text-align:center;margin:24px 0;">
              <div style="background:#E30613;color:#fff;padding:12px 28px;border-radius:8px;font-size:14px;font-weight:700;display:inline-block;">2,99 € pro Monat</div>
            </div>
            <p style="font-size:13px;color:#64748b;margin:0;">Melde dich in der App an und klicke auf "Jetzt abonnieren", um dein Abonnement zu starten.</p>
            <hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0;">
            <p style="font-size:11px;color:#94a3b8;margin:0;">Meine Stunden Online – Professionelle Zeiterfassung für Handwerksbetriebe</p>
          </div>
        `
      });

      await doc.ref.update({
        trialReminderSent: now,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });

      sent += 1;
    } catch (error) {
      console.error(`Trial reminder failed for ${email}:`, error);
      failed += 1;
    }
  }

  console.log(`Trial reminders: ${sent} sent, ${failed} failed.`);
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

  if (subscriptionActive) {
    update.trialActive = false;
    update.trialEndsAt = null;
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
