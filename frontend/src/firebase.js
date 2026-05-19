import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { CONFIG } from "./config";

// Initialize Firebase
const app = initializeApp(CONFIG.FIREBASE);

// Expose Auth and Google Auth Provider
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

// Custom parameters to force account selection dialog
googleProvider.setCustomParameters({
  prompt: "select_account"
});
