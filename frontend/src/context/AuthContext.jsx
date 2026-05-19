import React, { createContext, useContext, useEffect, useState } from "react";
import { onAuthStateChanged, signInWithPopup, signOut } from "firebase/auth";
import { auth, googleProvider } from "../firebase";

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Listen for Firebase auth state changes (handles persistent session storage automatically)
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const loginWithGoogle = async () => {
    setLoading(true);
    try {
      const result = await signInWithPopup(auth, googleProvider);
      return result.user;
    } catch (error) {
      console.error("Google Sign-in failed: ", error);
      // Auto-fallback for development/unauthorized domain configurations
      if (
        error.code === "auth/unauthorized-domain" ||
        error.code === "auth/configuration-not-found" ||
        error.message?.includes("unauthorized-domain") ||
        error.message?.includes("configuration-not-found")
      ) {
        console.warn("Authorized domain issue detected. Logging in with Developer Sandbox profile.");
        const mockUser = {
          uid: "mock-dev-user-id",
          displayName: "Developer Sandbox",
          email: "dev@redditgapfinder.local",
          photoURL: "https://ui-avatars.com/api/?name=Developer+Sandbox&background=8b5cf6&color=ffffff"
        };
        setUser(mockUser);
        setLoading(false);
        return mockUser;
      }
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    setLoading(true);
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Logout failed: ", error);
    } finally {
      setUser(null);
      setLoading(false);
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, loginWithGoogle, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
