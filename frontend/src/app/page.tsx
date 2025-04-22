"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { YouTubeSubscriptions } from "@/components/youtube-subscriptions";
import { CommandPalette } from "@/components/CommandPalette";
import Nav from "@/components/Nav";
import { hasCookie } from "@/lib/cookies";

export default function Home() {
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
        // Check for tokens using the cookie utility
        const authSuccess = hasCookie("auth_success");
        const hasJwt = hasCookie("token");
        const hasAuthToken = hasCookie("auth_token");

        // Debug logging
        console.log("Has JWT token:", hasJwt);
        console.log("Has auth_token:", hasAuthToken);

        if (hasJwt || hasAuthToken) {
          // Try to get user info
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
          // User has only authenticated with Google but doesn't have a WatchLikeMe account
          // Redirect them to registration with a parameter indicating they're coming from Google
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
    // Add a state param to indicate we're linking accounts
    window.location.href = "/api/auth/google?linkAccount=true";
  };

  if (loading) {
    return (
      <div className="min-h-screen p-4 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4">
      <Nav />
      <CommandPalette />
    </div>
  );
}
