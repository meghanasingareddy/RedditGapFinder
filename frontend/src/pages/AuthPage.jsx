import React from "react";
import { motion } from "framer-motion";
import { useAuth } from "../context/AuthContext";
import { Compass, Sparkles, TrendingUp } from "lucide-react";

function AuthPage() {
  const { loginWithGoogle } = useAuth();

  return (
    <div
      style={{
        minHeight: "100vh",
        width: "100vw",
        background: "#090a0f",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        position: "fixed",
        top: 0,
        left: 0,
        zIndex: 9999,
        overflow: "hidden",
        fontFamily: "'Outfit', 'Inter', sans-serif"
      }}
    >
      {/* Sleek Glowing Background Orbs */}
      <div
        style={{
          position: "absolute",
          width: "500px",
          height: "500px",
          background: "radial-gradient(circle, rgba(139, 92, 246, 0.15) 0%, rgba(0,0,0,0) 70%)",
          top: "-10%",
          left: "-10%",
          zIndex: 1
        }}
      />
      <div
        style={{
          position: "absolute",
          width: "600px",
          height: "600px",
          background: "radial-gradient(circle, rgba(59, 130, 246, 0.12) 0%, rgba(0,0,0,0) 70%)",
          bottom: "-10%",
          right: "-10%",
          zIndex: 1
        }}
      />

      {/* Main Glassmorphic Panel */}
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        style={{
          width: "450px",
          padding: "3rem 2.5rem",
          background: "rgba(17, 18, 27, 0.65)",
          backdropFilter: "blur(16px)",
          border: "1px solid rgba(255, 255, 255, 0.08)",
          borderRadius: "16px",
          boxShadow: "0 20px 50px rgba(0, 0, 0, 0.5)",
          textAlign: "center",
          zIndex: 2,
          position: "relative"
        }}
      >
        {/* Sleek Logo Area */}
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            gap: "0.5rem",
            marginBottom: "1.5rem"
          }}
        >
          <div
            style={{
              background: "linear-gradient(135deg, #8b5cf6 0%, #3b82f6 100%)",
              padding: "0.6rem",
              borderRadius: "12px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 8px 20px rgba(139, 92, 246, 0.3)"
            }}
          >
            <Compass color="#fff" size={24} />
          </div>
          <span
            style={{
              fontSize: "1.6rem",
              fontWeight: 800,
              background: "linear-gradient(to right, #fff 30%, rgba(255,255,255,0.7) 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              letterSpacing: "-0.5px"
            }}
          >
            RedditGapFinder
          </span>
        </div>

        {/* Headline */}
        <h2
          style={{
            fontSize: "1.2rem",
            color: "#fff",
            fontWeight: 600,
            marginBottom: "0.75rem",
            letterSpacing: "-0.2px",
            lineHeight: 1.4
          }}
        >
          Discover lucrative product gaps hiding in plain sight
        </h2>

        {/* Subtitle */}
        <p
          style={{
            fontSize: "0.85rem",
            color: "rgba(255, 255, 255, 0.5)",
            lineHeight: "1.5",
            marginBottom: "2.5rem",
            padding: "0 0.5rem"
          }}
        >
          AI-driven market scanning that filters noise, clusters user pain points, and drafts comprehensive startup blueprints directly from public feed data.
        </p>

        {/* Feature Checkmarks (Aesthetic) */}
        <div
          style={{
            background: "rgba(255, 255, 255, 0.02)",
            border: "1px solid rgba(255, 255, 255, 0.04)",
            borderRadius: "10px",
            padding: "1rem",
            textAlign: "left",
            marginBottom: "2.5rem",
            display: "flex",
            flexDirection: "column",
            gap: "0.75rem"
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
            <Sparkles size={16} color="#8b5cf6" />
            <span style={{ fontSize: "0.8rem", color: "rgba(255,255,255,0.85)" }}>
              AI-Powered Problem & Idea Mapping
            </span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
            <TrendingUp size={16} color="#3b82f6" />
            <span style={{ fontSize: "0.8rem", color: "rgba(255,255,255,0.85)" }}>
              Real-time Subreddit & Custom RSS Crawling
            </span>
          </div>
        </div>

        {/* Google Login Button */}
        <motion.button
          whileHover={{ scale: 1.02, boxShadow: "0 8px 24px rgba(255,255,255,0.06)" }}
          whileTap={{ scale: 0.98 }}
          onClick={loginWithGoogle}
          style={{
            width: "100%",
            height: "46px",
            background: "#fff",
            color: "#11121b",
            border: "none",
            borderRadius: "8px",
            fontSize: "0.9rem",
            fontWeight: 600,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "0.75rem",
            transition: "background 0.2s",
            boxShadow: "0 4px 12px rgba(0, 0, 0, 0.15)"
          }}
        >
          {/* SVG Google Icon */}
          <svg width="18" height="18" viewBox="0 0 18 18">
            <path
              fill="#EA4335"
              d="M9 3.58c1.12 0 2.12.39 2.92 1.15l2.17-2.17C12.78.88 11.02 0 9 0 5.48 0 2.52 2.02 1.12 4.96l2.76 2.14C4.54 4.88 6.58 3.58 9 3.58z"
            />
            <path
              fill="#4285F4"
              d="M17.64 9.2c0-.59-.05-1.17-.16-1.73H9v3.26h4.84c-.21 1.1-.83 2.03-1.76 2.66l2.73 2.13c1.6-1.48 2.53-3.66 2.53-6.32z"
            />
            <path
              fill="#FBBC05"
              d="M3.88 10.78A5.36 5.36 0 0 1 3.5 9c0-.62.11-1.22.3-1.78L1.04 5.08A8.99 8.99 0 0 0 0 9c0 1.45.35 2.82.96 4.04l2.92-2.26z"
            />
            <path
              fill="#34A853"
              d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.73-2.13c-.76.51-1.73.82-2.93.82-2.42 0-4.46-1.3-5.19-3.52L1.12 13.1C2.52 16.02 5.48 18 9 18z"
            />
          </svg>
          Sign In with Google
        </motion.button>

        {/* Footer info */}
        <div style={{ marginTop: "2.5rem", fontSize: "0.7rem", color: "rgba(255, 255, 255, 0.3)" }}>
          Secure Authentication powered by Firebase OAuth 2.0.
        </div>
      </motion.div>
    </div>
  );
}

export default AuthPage;
