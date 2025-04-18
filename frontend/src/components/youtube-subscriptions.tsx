"use client";

import { useEffect, useState } from "react";

interface Channel {
  id: string;
  title: string;
  thumbnailUrl: string;
  subscriberCount: number;
}

export function YouTubeSubscriptions() {
  const [channels, setChannels] = useState<Channel[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchSubscriptions() {
      try {
        console.log("Fetching YouTube subscriptions...");
        const response = await fetch("/api/channels");

        if (!response.ok) {
          const data = await response.json();
          console.error("Error fetching subscriptions:", data);
          setError(data.error || "Failed to fetch subscriptions");
          return;
        }

        const data = await response.json();
        console.log("Received subscriptions:", data);
        setChannels(data);
      } catch (err) {
        console.error("Error in fetchSubscriptions:", err);
        setError(
          err instanceof Error ? err.message : "Failed to fetch subscriptions"
        );
      } finally {
        setLoading(false);
      }
    }

    fetchSubscriptions();
  }, []);

  if (loading) {
    return <div className="text-center">Loading subscriptions...</div>;
  }

  if (error) {
    return <div className="text-center text-red-500">Error: {error}</div>;
  }

  if (channels.length === 0) {
    return <div className="text-center">No subscriptions found</div>;
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {channels.map((channel) => (
        <div key={channel.id} className="border rounded-lg p-4">
          <img
            src={channel.thumbnailUrl}
            alt={channel.title}
            className="w-16 h-16 rounded-full mx-auto mb-2"
          />
          <h3 className="text-lg font-semibold text-center">{channel.title}</h3>
          <p className="text-sm text-gray-500 text-center">
            {channel.subscriberCount.toLocaleString()} subscribers
          </p>
        </div>
      ))}
    </div>
  );
}
