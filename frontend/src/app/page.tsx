"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { YouTubeSubscriptions } from "@/components/youtube-subscriptions";

export default function Home() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const router = useRouter();

  useEffect(() => {
    // Check for auth_success cookie
    const authSuccess = document.cookie.includes("auth_success=true");
    setIsAuthenticated(authSuccess);

    if (authSuccess) {
      console.log("User is authenticated");
    }
  }, []);

  return (
    <div className="min-h-screen p-4">
      <h1 className="text-2xl font-bold mb-4">WatchLikeMe</h1>
      {isAuthenticated ? (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <p className="text-green-500">You are signed in!</p>
            <button
              onClick={() => {
                // Clear cookies and refresh
                document.cookie =
                  "google_tokens=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT;";
                document.cookie =
                  "auth_success=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT;";
                router.refresh();
              }}
              className="text-blue-500 hover:text-blue-700"
            >
              Sign Out
            </button>
          </div>
          <div className="mt-8">
            <h2 className="text-xl font-semibold mb-4">
              Your YouTube Subscriptions
            </h2>
            <YouTubeSubscriptions />
          </div>
        </div>
      ) : (
        <p>
          <a
            href="/api/auth/google"
            className="text-blue-500 hover:text-blue-700"
          >
            Sign in with Google
          </a>
        </p>
      )}
    </div>
  );
}
