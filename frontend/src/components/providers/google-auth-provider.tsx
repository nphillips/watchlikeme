"use client";

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";

// Define Google auth status types
export type GoogleAuthStatus = "linked" | "not-linked" | "expired" | "unknown";

// Define the shape of our context state
interface GoogleAuthContextType {
  status: GoogleAuthStatus;
  isLoading: boolean;
  linkGoogleAccount: () => void;
  refreshTokens: () => void;
  error: string | null;
}

// Create the context with a default value
const GoogleAuthContext = createContext<GoogleAuthContextType>({
  status: "unknown",
  isLoading: false,
  linkGoogleAccount: () => {},
  refreshTokens: () => {},
  error: null,
});

// Export the hook for using this context
export const useGoogleAuth = () => useContext(GoogleAuthContext);

// For external updates to the Google Auth status
let contextSetter: ((s: GoogleAuthStatus) => void) | null = null;

// Function to update Google Auth status based on user profile
export const updateGoogleAuthInfo = (hasGoogleAuth: boolean) => {
  if (contextSetter) {
    contextSetter(hasGoogleAuth ? "linked" : "not-linked");
    console.log(
      `External Google Auth status update: ${
        hasGoogleAuth ? "linked" : "not-linked"
      }`
    );
  } else {
    console.warn("Google Auth context not yet initialized");
  }
};

// The provider component
export function GoogleAuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<GoogleAuthStatus>("unknown");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Store the setter function for external updates
  useEffect(() => {
    contextSetter = setStatus;

    // Check if we already have Google auth tokens when component mounts
    const checkExistingAuth = async () => {
      try {
        // Try to get Google status from the backend
        const response = await fetch(`/api/google/status`, {
          credentials: "include",
        });

        if (response.ok) {
          const data = await response.json();
          if (data.isLinked) {
            setStatus("linked");
          } else {
            setStatus("not-linked");
          }
          console.log(
            "Initial Google Auth status check:",
            data.isLinked ? "linked" : "not-linked"
          );
        } else {
          // If the backend API fails, fall back to cookie-based detection
          const hasGoogleTokens = document.cookie.includes("google_tokens=");
          setStatus(hasGoogleTokens ? "linked" : "not-linked");
          console.log(
            "Fallback Google Auth status check:",
            hasGoogleTokens ? "linked" : "not-linked"
          );
        }
      } catch (error) {
        console.error("Error checking initial Google auth status:", error);
        setStatus("not-linked");
      }
    };

    checkExistingAuth();

    return () => {
      contextSetter = null;
    };
  }, []);

  // Function to trigger linking a Google account
  const linkGoogleAccount = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Request auth URL from backend via API proxy
      console.log("Using frontend API proxy for backend requests");
      const response = await fetch(`/api/google/auth-url`, {
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error(`Failed to get auth URL: ${response.statusText}`);
      }

      const data = await response.json();
      console.log("Redirecting to Google OAuth URL");
      window.location.href = data.url;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      console.error("Failed to link Google account:", errorMessage);
      setError(errorMessage);
      setStatus("not-linked");
    } finally {
      setIsLoading(false);
    }
  };

  // Function to refresh expired tokens
  const refreshTokens = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Call refresh endpoint
      const response = await fetch(`/api/google/refresh-token`, {
        method: "POST",
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error(`Failed to refresh tokens: ${response.statusText}`);
      }

      // Refresh was successful, update status
      setStatus("linked");

      console.log("Google tokens refreshed successfully");
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      console.error("Failed to refresh Google tokens:", errorMessage);
      setError(errorMessage);
      // Keep status as expired since we couldn't refresh
    } finally {
      setIsLoading(false);
    }
  };

  // Provide the context value to children
  return (
    <GoogleAuthContext.Provider
      value={{
        status,
        isLoading,
        linkGoogleAccount,
        refreshTokens,
        error,
      }}
    >
      {children}
    </GoogleAuthContext.Provider>
  );
}
