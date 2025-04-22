import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { hasCookie } from "@/lib/cookies";

export function useAuth() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<{
    email: string;
    hasGoogleAuth?: boolean;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    async function checkAuth() {
      try {
        const authSuccess = hasCookie("auth_success");
        const hasJwt = hasCookie("token");
        const hasAuthToken = hasCookie("auth_token");

        console.log("Has JWT token:", hasJwt);
        console.log("Has auth_token:", hasAuthToken);

        if (hasJwt || hasAuthToken) {
          const response = await fetch("/api/users/me");
          console.log("/api/users/me response status:", response.status);

          if (response.ok) {
            const userData = await response.json();
            console.log("User data:", userData);
            setUser(userData);
            setIsAuthenticated(true);
          } else {
            const errorData = await response.json().catch(() => ({}));
            console.error("Auth error:", errorData);
            setIsAuthenticated(false);
          }
        } else if (authSuccess) {
          router.push("/register?fromGoogle=true");
          return;
        } else {
          setIsAuthenticated(false);
        }
      } catch (error) {
        console.error("Auth check error:", error);
        setIsAuthenticated(false);
      } finally {
        setLoading(false);
      }
    }

    checkAuth();
  }, [router]);

  const handleLinkGoogle = () => {
    window.location.href = "/api/auth/google?linkAccount=true";
  };

  return {
    isAuthenticated,
    user,
    loading,
    handleLinkGoogle,
  };
}
