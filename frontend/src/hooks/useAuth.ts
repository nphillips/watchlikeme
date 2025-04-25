import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
// Remove hasCookie import if no longer needed, or keep if used elsewhere
// import { hasCookie } from "@/lib/cookies";

export function useAuth() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<{
    id: string; // Add id if returned by /api/users/me
    email: string;
    // Add other relevant fields like username, name, image, role etc.
    // hasGoogleAuth?: boolean; // This likely needs to be derived on the backend
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter(); // Keep router if needed for redirects like authSuccess

  useEffect(() => {
    async function checkAuth() {
      setLoading(true); // Ensure loading is true at the start
      try {
        // Directly attempt to fetch user data.
        // The backend will handle validating the httpOnly 'token' cookie.
        console.log("[useAuth] Attempting to fetch /api/users/me");
        const response = await fetch("/api/users/me");
        console.log(
          `[useAuth] /api/users/me response status: ${response.status}`
        );

        if (response.ok) {
          const userData = await response.json();
          console.log("[useAuth] User data received:", userData);
          setUser(userData); // Store the user data
          setIsAuthenticated(true);
        } else {
          // 401 or other errors mean not authenticated
          const errorData = await response
            .json()
            .catch(() => ({ message: "Failed to parse error response" }));
          console.log(
            "[useAuth] Not authenticated:",
            errorData.message || `Status ${response.status}`
          );
          setUser(null); // Clear user data
          setIsAuthenticated(false);
        }
      } catch (error) {
        console.error("[useAuth] Error during auth check:", error);
        setUser(null); // Clear user data on error
        setIsAuthenticated(false);
      } finally {
        setLoading(false);
      }
    }

    checkAuth();
    // Dependency array might need adjustment if other state triggers re-check
  }, []); // Empty array: check only on initial mount

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
  };
}
