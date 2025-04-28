import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
// Remove hasCookie import if no longer needed, or keep if used elsewhere
// import { hasCookie } from "@/lib/cookies";

export function useAuth() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<{
    id: string; // Add id if returned by /api/users/me
    email: string;
    username: string; // Add username
    hasGoogleAuth: boolean; // Add hasGoogleAuth
    // Add other relevant fields like name, image, role etc.
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter(); // Keep router if needed for redirects like authSuccess

  // Define the core auth check logic
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
  }, []); // useCallback with empty dependency array

  // Run the check on initial mount
  useEffect(() => {
    checkAuth();
  }, [checkAuth]); // Depend on the memoized checkAuth function

  // Expose the checkAuth function as revalidateAuth
  const revalidateAuth = checkAuth;

  // handleLinkGoogle might need adjustment depending on backend flow
  const handleLinkGoogle = () => {
    // Maybe fetch backend endpoint instead of direct redirect?
    window.location.href = "/api/auth/google?linkAccount=true";
  };

  return {
    isAuthenticated,
    user,
    loading,
    handleLinkGoogle,
    revalidateAuth, // Return the function
  };
}
