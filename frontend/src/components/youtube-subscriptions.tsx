"use client";

import { useEffect, useState } from "react";
import { RefreshSubscriptionsButton } from "./refresh-subscriptions-button";
import { ChannelItem } from "./channel-item";

interface Channel {
  id: string;
  title: string;
  thumbnailUrl: string;
  subscriberCount: number;
}

interface ErrorResponse {
  error: string;
  message: string;
}

interface User {
  hasGoogleAuth: boolean;
}

export function YouTubeSubscriptions() {
  const [channels, setChannels] = useState<Channel[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [needsRelink, setNeedsRelink] = useState(false);

  useEffect(() => {
    async function checkGoogleAuth() {
      try {
        const response = await fetch("/api/users/me");
        if (response.ok) {
          const userData = await response.json();
          setUser(userData);
        }
      } catch (err) {
        console.error("Error checking Google auth status:", err);
      } finally {
        setLoading(false);
      }
    }

    checkGoogleAuth();
  }, []);

  useEffect(() => {
    if (!loading && user?.hasGoogleAuth) {
      async function fetchSubscriptions() {
        try {
          const response = await fetch("/api/channels");

          if (!response.ok) {
            const data = (await response.json()) as ErrorResponse;

            if (
              response.status === 403 &&
              (data.error === "Google account not linked" ||
                data.error?.includes("Google") ||
                data.message?.includes("link your Google account"))
            ) {
              setError("Google connection needs to be refreshed");
              setErrorMessage("Please re-link your Google account to continue");
              setNeedsRelink(true);
              return;
            }

            setError(data.error || "Failed to fetch subscriptions");
            setErrorMessage(data.message || "Please try again later");
            return;
          }

          const data = await response.json();
          setChannels(data);
        } catch (err) {
          console.error("Error fetching subscriptions:", err);
          setError(
            err instanceof Error
              ? err.message
              : "Failed to fetch subscriptions",
          );
        }
      }

      fetchSubscriptions();
    }
  }, [loading, user]);

  if (loading) {
    return (
      <div className="flex items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (!user?.hasGoogleAuth) {
    return (
      <div className="rounded-md border border-blue-200 bg-blue-50 p-4 text-center">
        <p className="mb-2 text-blue-800">
          To see your YouTube subscriptions, please link your Google account
        </p>
        <button
          onClick={() =>
            (window.location.href = "/api/auth/google?linkAccount=true")
          }
          className="mt-2 inline-flex items-center justify-center rounded-md border border-transparent bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:outline-none"
        >
          <svg
            viewBox="0 0 24 24"
            width="20"
            height="20"
            className="mr-2 inline-block"
          >
            <path
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              fill="#ffffff"
            />
            <path
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              fill="#ffffff"
            />
            <path
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              fill="#ffffff"
            />
            <path
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              fill="#ffffff"
            />
          </svg>
          Link Google Account
        </button>
      </div>
    );
  }

  if (needsRelink) {
    return (
      <div className="rounded-md border border-yellow-200 bg-yellow-50 p-4 text-center">
        <p className="mb-2 text-yellow-800">{error}</p>
        {errorMessage && (
          <p className="mb-4 text-sm text-yellow-700">{errorMessage}</p>
        )}
        <button
          onClick={() =>
            (window.location.href = "/api/auth/google?linkAccount=true")
          }
          className="mt-2 inline-flex items-center justify-center rounded-md border border-transparent bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:outline-none"
        >
          <svg
            viewBox="0 0 24 24"
            width="20"
            height="20"
            className="mr-2 inline-block"
          >
            <path
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              fill="#ffffff"
            />
            <path
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              fill="#ffffff"
            />
            <path
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              fill="#ffffff"
            />
            <path
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              fill="#ffffff"
            />
          </svg>
          Re-link Google Account
        </button>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center text-red-500">
        <p>Error: {error}</p>
        {errorMessage && <p className="mt-2 text-sm">{errorMessage}</p>}
      </div>
    );
  }

  if (channels.length === 0) {
    return <div className="text-center">No subscriptions found</div>;
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-xl font-semibold">Subscriptions</h2>
        <RefreshSubscriptionsButton />
      </div>
      <div className="flex flex-col gap-4">
        {channels.map((channel) => (
          <ChannelItem key={channel.id} id={channel.id} title={channel.title}>
            <div>{/* Corresponding youtube videos here */}</div>
          </ChannelItem>
        ))}
      </div>
    </div>
  );
}
