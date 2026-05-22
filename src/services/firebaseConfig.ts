import { initializeApp } from 'firebase/app';
import { getMessaging, getToken, onMessage } from 'firebase/messaging';

// Dummy Config (Ganti dengan konfigurasi asli dari Firebase Console Anda)
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "dity-store.firebaseapp.com",
  projectId: "dity-store",
  storageBucket: "dity-store.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:12345:web:abcde"
};

const app = initializeApp(firebaseConfig);
export const messaging = typeof window !== "undefined" ? getMessaging(app) : null;

/**
 * Meminta izin notifikasi dari browser dan mendapatkan token FCM.
 */
export const requestNotificationPermission = async () => {
  try {
    if (!messaging) return null;
    const token = await getToken(messaging, { vapidKey: "YOUR_VAPID_KEY_DARI_CONSOLE" });
    if (token) {
      console.log('Firebase Web Token:', token);
      return token;
    }
  } catch (error) {
    console.error('An error occurred while retrieving token.', error);
  }
};

/**
 * Listener untuk pesan notifikasi saat aplikasi foreground.
 */
export const onMessageListener = () =>
  new Promise((resolve) => {
    if (!messaging) return;
    onMessage(messaging, (payload) => {
      resolve(payload);
    });
  });
