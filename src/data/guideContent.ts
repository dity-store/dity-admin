export const guideData = {
  setup: {
    title: "Phase 1: Setup & Configuration Guide",
    description: "Langkah-langkah inisialisasi layanan Google Cloud dan Firebase untuk web app React.",
    sections: [
      {
        subtitle: "1. Google Cloud Console (OAuth & APIs)",
        content: `
- Buka Google Cloud Console.
- Buat proyek baru bernama **Dity Store Admin Web**.
- Navigasi ke **APIs & Services > Library**, aktifkan **Google Drive API** dan **Google Sheets API**.
- Pada menu **OAuth consent screen**, pilih tipe *External*, isi informasi aplikasi (abaikan logo jika belum verified).
- Pada menu **Credentials**, buat kredensial baru: **OAuth client ID**. Pilih tipe aplikasi *Web application*.
- Tambahkan **Authorized JavaScript origins** sesuai domain Anda (misal: \`http://localhost:3000\` untuk dev, atau URL Vercel/Cloud Run Anda).
- Salin **Client ID** yang dihasilkan untuk digunakan di dalam file React.
        `
      },
      {
        subtitle: "2. Firebase Cloud Messaging (Web Push)",
        content: `
- Buka Firebase Console, buat proyek baru.
- Tambahkan aplikasi **Web** ke proyek (ikon <\/>).
- Salin konfigurasi objek \`firebaseConfig\`.
- Buka menu **Project settings > Cloud Messaging**, lalu navigasi ke bagian **Web configuration**.
- Generate key pair baru di **Web Push certificates**. Ini akan menghasilkan **VAPID Key** (kunci publik) yang wajib dipasang di frontend web Anda.
- Catat Firebase Server Key (atau gunakan Service Account JSON) untuk digunakan di Google Apps Script (sebagai pihak yang menembak API FCM).
        `
      }
    ]
  },
  gas: {
    title: "Phase 2: Google Apps Script (Backend Bridge)",
    description: "Kode ini menjembatani Google Sheet (hasil Google Form) untuk menembak push notifikasi (FCM) ke web React Anda.",
    sections: [
      {
        subtitle: "Google Apps Script (onFormSubmit)",
        code: `// Tanamkan script ini di Google Sheet tempat Form responses masuk
// Set Trigger: onFormSubmit

function onFormSubmit(e) {
  try {
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
    var row = e.range.getRow();
    var data = sheet.getRange(row, 1, 1, sheet.getLastColumn()).getValues()[0];
    
    // Asumsi kolom: Timestamp(0), Nama(1), Layanan(2)
    var namaPelanggan = data[1] ? data[1] : "Klien Baru";
    var namaLayanan = data[2] ? data[2] : "Pesanan Baru";
    
    var payload = {
      // Gunakan topik atau token device admin yang spesifik
      "to": "/topics/admin_desktop",
      "notification": {
        "title": "⚡ Pesanan Masuk (Web)",
        "body": namaPelanggan + " memesan " + namaLayanan,
        "click_action": "https://url-web-admin-anda.com"
      }
    };
    
    // Ganti menggunakan Firebase HTTP v1 API jika memungkinkan, 
    // atau FCM Legacy API (Server Key) untuk kemudahan awal
    var options = {
      "method": "post",
      "contentType": "application/json",
      "headers": {
        "Authorization": "key=YOUR_FCM_SERVER_KEY" 
      },
      "payload": JSON.stringify(payload)
    };
    
    UrlFetchApp.fetch("https://fcm.googleapis.com/fcm/send", options);
  } catch(error) {
    console.error("Gagal mengirim notif ke Web: " + error);
  }
}`
      }
    ]
  },
  react: {
    title: "Phase 3: React Project Setup",
    description: "Command dan arsitektur awal untuk memulai proyek dengan Vite dan Tailwind.",
    sections: [
      {
        subtitle: "Command Inisialisasi",
        code: `# 1. Buat project Vite React
npm create vite@latest dity-admin-web -- --template react-ts

# 2. Masuk ke direktori
cd dity-admin-web

# 3. Instal dependensi wajib
npm install @react-oauth/google gapi-script firebase jspdf html2canvas

# 4. Instal React Router (untuk navigasi) dan Lucide (ikon)
npm install react-router-dom lucide-react

# 5. Jalankan server
npm run dev`
      }
    ]
  },
  services: {
    title: "Phase 4: Core Logic (Custom Hooks & Services)",
    description: "Implementasi logika untuk Firebase, OAuth2, Drive, dan Sheets (menggunakan fetch REST API agar lebih stabil di Vite dibanding gapi-script kuno).",
    sections: [
      {
        subtitle: "firebaseConfig.ts",
        code: `import { initializeApp } from 'firebase/app';
import { getMessaging, getToken, onMessage } from 'firebase/messaging';

const firebaseConfig = {
  apiKey: "AIzaSy...",
  authDomain: "dity-store.firebaseapp.com",
  projectId: "dity-store",
  storageBucket: "dity-store.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:12345:web:abcde"
};

const app = initializeApp(firebaseConfig);
export const messaging = typeof window !== "undefined" ? getMessaging(app) : null;

// Fungsi untuk meminta izin notifikasi dari browser
export const requestNotificationPermission = async () => {
  try {
    if (!messaging) return null;
    const token = await getToken(messaging, { vapidKey: "YOUR_VAPID_KEY_DARI_CONSOLE" });
    if (token) {
      console.log('Firebase Web Token:', token);
      // Simpan token ini ke DB jika ingin kirim notif spesifik ke device ini
      return token;
    }
  } catch (error) {
    console.error('An error occurred while retrieving token.', error);
  }
};

// Fungsi mendengarkan pesan saat web sedang dibuka (foreground)
export const onMessageListener = () =>
  new Promise((resolve) => {
    if (!messaging) return;
    onMessage(messaging, (payload) => {
      resolve(payload);
    });
  });`
      },
      {
        subtitle: "useGoogleAuth.ts",
        code: `import { useState } from 'react';
import { useGoogleLogin } from '@react-oauth/google';

/**
 * Custom Hook untuk mengelola Google Login.
 * PENTING: Bungkus aplikasi dengan <GoogleOAuthProvider clientId="..."> di main.tsx.
 */
export function useGoogleAuth() {
  const [accessToken, setAccessToken] = useState<string | null>(null);

  const login = useGoogleLogin({
    onSuccess: (tokenResponse) => {
      // Simpan Access Token (bisa juga dimasukkan ke localStorage / Zustand)
      setAccessToken(tokenResponse.access_token);
      console.log("Berhasil login, Token didapatkan.");
    },
    onError: (error) => console.error("Google Login Gagal:", error),
    // Mendefinisikan scope agar dapat membaca/menulis Drive & Sheets
    scope: "https://www.googleapis.com/auth/drive https://www.googleapis.com/auth/spreadsheets",
  });

  return { login, accessToken };
}`
      },
      {
        subtitle: "driveService.ts",
        code: `/**
 * Fungsi untuk meng-upload file ke Google Drive menggunakan REST API modern.
 * @param accessToken Token dari useGoogleAuth
 * @param file Objek File (atau Blob hasil generate PDF)
 * @param folderId ID Folder Drive tujuan (opsional)
 */
export const uploadFileToDrive = async (accessToken: string, file: Blob, filename: string, folderId?: string) => {
  const metadata = {
    name: filename,
    mimeType: 'application/pdf',
    parents: folderId ? [folderId] : []
  };

  const form = new FormData();
  form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
  form.append('file', file);

  try {
    const res = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
      method: 'POST',
      headers: {
        Authorization: \`Bearer \${accessToken}\`,
      },
      body: form
    });
    const data = await res.json();
    return data; // Berisi file ID
  } catch (err) {
    console.error("Gagal Upload ke Drive", err);
    throw err;
  }
};`
      },
      {
        subtitle: "sheetsService.ts",
        code: `/**
 * Operasi CRUD untuk Google Sheet menggunakan REST API.
 */
const SHEET_ID = "1nZmZYTXP16_Txy6KXGF_3OJRKdRZ8hldoGwMufz344k";

// Membaca Data Form Responses
export const getFormResponses = async (accessToken: string) => {
  const range = "Form Responses 1!A2:E";
  const url = \`https://sheets.googleapis.com/v4/spreadsheets/\${SHEET_ID}/values/\${range}\`;
  
  const res = await fetch(url, {
    headers: { Authorization: \`Bearer \${accessToken}\` }
  });
  return await res.json(); // Mengembalikan objek data.values (Array 2D)
};

// Mengubah Setting Jam Operasional Toko
export const updateStoreHours = async (accessToken: string, newHours: string) => {
  const range = "Settings!B1";
  const url = \`https://sheets.googleapis.com/v4/spreadsheets/\${SHEET_ID}/values/\${range}?valueInputOption=USER_ENTERED\`;
  
  const res = await fetch(url, {
    method: 'PUT',
    headers: {
      Authorization: \`Bearer \${accessToken}\`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      values: [[newHours]] // Mengisi cell B1
    })
  });
  return await res.json();
};`
      }
    ]
  }
};
