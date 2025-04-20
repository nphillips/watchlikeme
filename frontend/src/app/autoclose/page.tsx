"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

export default function AutoClosePage() {
  const [closing, setClosing] = useState(false);
  const searchParams = useSearchParams();
  const success = searchParams.get("success") === "true";
  const error = searchParams.get("error");

  useEffect(() => {
    // Send message to the opener window with status
    if (window.opener) {
      const message = {
        type: success ? "google-auth-success" : "google-auth-error",
        error: error || undefined,
      };

      console.log("Sending message to opener:", message);
      window.opener.postMessage(message, "*");

      // Set closing state to show visual feedback
      setClosing(true);

      // Close this popup window after a short delay
      setTimeout(() => {
        window.close();
        // If window didn't close (due to browser security), redirect home
        window.location.href = "/";
      }, 1500);
    } else {
      // If no opener (e.g., user opened in new tab), redirect to home
      window.location.href = "/";
    }
  }, [success, error]);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center p-6 bg-white rounded-lg shadow-md max-w-md">
        {success ? (
          <>
            <h1 className="text-xl font-semibold mb-2 text-green-600">
              Authentication Successful
            </h1>
            <p className="text-gray-600 mb-4">
              Google authorization complete! Refreshing your subscriptions...
            </p>
          </>
        ) : (
          <>
            <h1 className="text-xl font-semibold mb-2 text-amber-600">
              {error ? "Authentication Error" : "Processing..."}
            </h1>
            <p className="text-gray-600 mb-4">
              {error
                ? `There was an issue with Google authorization: ${error}`
                : "Communicating with the main window..."}
            </p>
          </>
        )}

        {closing && (
          <div className="mt-3 text-sm text-gray-500">
            Closing this window automatically...
          </div>
        )}

        <div className="mt-4">
          <button
            onClick={() => window.close()}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
          >
            Close Window
          </button>
        </div>
      </div>
    </div>
  );
}
