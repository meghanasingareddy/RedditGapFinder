import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyCqvoOFFZoFI-J808EWyfz-CcWJom026cU",
  authDomain: "redditgapfinder-meghna.firebaseapp.com",
  projectId: "redditgapfinder-meghna",
  storageBucket: "redditgapfinder-meghna.firebasestorage.app",
  messagingSenderId: "820516565104",
  appId: "1:820516565104:web:f9917b15748e767b2484b5"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Expose Auth and Google Auth Provider
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

// Custom parameters to force account selection dialog
googleProvider.setCustomParameters({
  prompt: "select_account"
});
