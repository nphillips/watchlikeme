import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";

export function useAuth() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<{
    id: string;
    email: string;
    username: string;
    hasGoogleAuth: boolean;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const checkAuth = useCallback(async () => {
    console.log("[useAuth] Running checkAuth...");
    setLoading(true);
    try {
      console.log("[useAuth] Attempting to fetch /api/users/me");
      const response = await fetch("/api/users/me");
      console.log(
        `[useAuth] /api/users/me response status: ${response.status}`,
      );

      if (response.ok) {
        const userData = await response.json();
        console.log("[useAuth] User data received:", userData);
        setUser(userData);
        setIsAuthenticated(true);
      } else {
        const errorData = await response
          .json()
          .catch(() => ({ message: "Failed to parse error response" }));
        console.log(
          "[useAuth] Not authenticated:",
          errorData.message || `Status ${response.status}`,
        );
        setUser(null);
        setIsAuthenticated(false);
      }
    } catch (error) {
      console.error("[useAuth] Error during auth check:", error);
      setUser(null);
      setIsAuthenticated(false);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  const revalidateAuth = checkAuth;

  const handleLinkGoogle = () => {
    window.location.href = "/api/auth/google?linkAccount=true";
  };

  return {
    isAuthenticated,
    user,
    loading,
    handleLinkGoogle,
    revalidateAuth,
  };
}
