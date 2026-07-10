importScripts('https://www.gstatic.com/firebasejs/9.23.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.23.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "AIzaSyCmT5DNOZK__ytivq54ClbiQNMvv5bwrTQ",
  authDomain: "arbeit-app-ff263.firebaseapp.com",
  projectId: "arbeit-app-ff263",
  storageBucket: "arbeit-app-ff263.firebasestorage.app",
  messagingSenderId: "337916056955",
  appId: "1:337916056955:web:99650927097d363d0019de"
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage(payload => {
  const title = payload.notification?.title || 'Handwerker-Portal';
  self.registration.showNotification(title, {
    body: payload.notification?.body || '',
    icon: '/icon-192.png',
    badge: '/icon-192.png'
  });
});