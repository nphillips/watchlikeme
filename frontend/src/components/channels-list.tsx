"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";

interface Channel {
  id: string;
  title: string;
  thumbnailUrl: string;
  subscriberCount: number;
}

export function ChannelsList() {
  const [channels, setChannels] = useState<Channel[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchChannels() {
      try {
        const response = await fetch("/api/channels");
        if (!response.ok) {
          const data = await response.json();
          if (data.details === "Insufficient Permission") {
            setError(
              "YouTube access not authorized. Please sign in again with YouTube permissions."
            );
            return;
          }
          throw new Error(data.error || "Failed to fetch channels");
        }
        const data = await response.json();
        setChannels(data);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to fetch channels"
        );
      } finally {
        setLoading(false);
      }
    }

    fetchChannels();
  }, []);

  if (loading) {
    return <div className="text-center">Loading channels...</div>;
  }

  if (error) {
    return (
      <div className="text-center space-y-4">
        <div className="text-red-500">{error}</div>
        <Button
          variant="outline"
          onClick={() => (window.location.href = "/api/auth/google")}
        >
          Sign in with YouTube
        </Button>
      </div>
    );
  }

  if (channels.length === 0) {
    return <div className="text-center">No channels found</div>;
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {channels.map((channel) => (
        <div
          key={channel.id}
          className="border rounded-lg p-4 hover:shadow-md transition-shadow"
        >
          <div className="flex items-center gap-4">
            <Image
              src={channel.thumbnailUrl}
              alt={channel.title}
              width={48}
              height={48}
              className="rounded-full"
            />
            <div>
              <h4 className="font-semibold">{channel.title}</h4>
              <p className="text-sm text-gray-500">
                {channel.subscriberCount.toLocaleString()} subscribers
              </p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
