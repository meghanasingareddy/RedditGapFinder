export const CONFIG = {
  API_BASE_URL: import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000',
  FIREBASE: {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyCqvoOFFZoFI-J808EWyfz-CcWJom026cU",
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "redditgapfinder-meghna.firebaseapp.com",
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "redditgapfinder-meghna",
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "redditgapfinder-meghna.firebasestorage.app",
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "820516565104",
    appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:820516565104:web:f9917b15748e767b2484b5"
  }
};
