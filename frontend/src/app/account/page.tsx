"use client";

import { useState } from "react";
import Nav from "@/components/Nav";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { unlinkGoogleAccount } from "@/lib/api/users"; // Import the unlink function
import Link from "next/link";

export default function AccountPage() {
  const { user, loading, handleLinkGoogle } = useAuth();
  const [isUnlinking, setIsUnlinking] = useState(false);
  const [unlinkError, setUnlinkError] = useState<string | null>(null);

  const handleUnlink = async () => {
    setIsUnlinking(true);
    setUnlinkError(null);
    try {
      await unlinkGoogleAccount();
      // Success! Need to refresh user state or redirect?
      // For now, let's reload the page to refetch user state via useAuth
      // A more sophisticated approach might involve updating the useAuth state directly
      window.location.reload();
    } catch (err) {
      console.error("Error unlinking Google account:", err);
      setUnlinkError(
        err instanceof Error ? err.message : "Failed to unlink account"
      );
    } finally {
      setIsUnlinking(false);
    }
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
      <div className="max-w-xl mx-auto mt-8">
        <h1 className="text-2xl font-bold mb-6">Account Settings</h1>

        {!user ? (
          <div className="text-center">
            <p>Please log in to view your account settings.</p>
            <Link
              href="/login"
              className="mt-4 inline-block bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
            >
              Log In
            </Link>
          </div>
        ) : (
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-semibold mb-2">User Information</h2>
              <p>Email: {user.email}</p>
              <p>Username: {user.username}</p>
              {/* Add other user details as needed */}
            </div>

            <div>
              <h2 className="text-lg font-semibold mb-2">Google Account</h2>
              {user.hasGoogleAuth ? (
                <div>
                  <p className="text-green-600 mb-2">Google Account Linked</p>
                  <Button
                    variant="destructive"
                    onClick={handleUnlink}
                    disabled={isUnlinking}
                  >
                    {isUnlinking ? "Unlinking..." : "Unlink Google Account"}
                  </Button>
                  {unlinkError && (
                    <p className="text-sm text-red-500 mt-2">
                      Error: {unlinkError}
                    </p>
                  )}
                </div>
              ) : (
                <div>
                  <p className="text-gray-600 mb-2">No Google Account Linked</p>
                  {/* Use the handleLinkGoogle function from useAuth */}
                  <Button onClick={handleLinkGoogle}>
                    Link Google Account
                  </Button>
                </div>
              )}
            </div>
            {/* Add sections for password change, etc. later */}
          </div>
        )}
      </div>
    </div>
  );
}
