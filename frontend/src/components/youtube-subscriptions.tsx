"use client";

import { useState, useEffect } from "react";
import {
  useGoogleAuth,
  GoogleAuthStatus,
} from "./providers/google-auth-provider";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { toast } from "sonner";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Loader2 } from "lucide-react";

// Define the schema for our form
const formSchema = z.object({
  channel: z.string({
    required_error: "Please select a channel to import.",
  }),
  enableNotifications: z.boolean().default(true).optional(),
});

// Define our channel type
interface Channel {
  id: string;
  title: string;
  thumbnail: string;
}

// Main component
export default function YouTubeSubscriptions() {
  const {
    status: googleAuthStatus,
    linkGoogleAccount,
    refreshTokens,
    isLoading: googleAuthLoading,
  } = useGoogleAuth();

  const [channels, setChannels] = useState<Channel[]>([]);
  const [isLoadingChannels, setIsLoadingChannels] = useState(false);
  const [submitLoading, setSubmitLoading] = useState(false);

  // Initialize form
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      channel: "",
      enableNotifications: true,
    },
  });

  // Load YouTube subscriptions when authenticated
  useEffect(() => {
    const fetchYouTubeSubscriptions = async () => {
      if (googleAuthStatus === "linked") {
        try {
          setIsLoadingChannels(true);
          const response = await fetch("/api/youtube/subscriptions", {
            credentials: "include",
          });

          if (!response.ok) {
            if (response.status === 401) {
              // Token expired, try to refresh
              refreshTokens();
              return;
            }

            throw new Error(
              `Failed to fetch subscriptions: ${response.statusText}`
            );
          }

          const data = await response.json();
          setChannels(data.items || []);
        } catch (error) {
          console.error("Error fetching YouTube subscriptions:", error);
          toast.error("Failed to load YouTube subscriptions", {
            description:
              error instanceof Error ? error.message : "Please try again later",
            action: {
              label: "Try again",
              onClick: () => fetchYouTubeSubscriptions(),
            },
          });
        } finally {
          setIsLoadingChannels(false);
        }
      }
    };

    fetchYouTubeSubscriptions();
  }, [googleAuthStatus, refreshTokens]);

  // Handle form submission
  async function onSubmit(values: z.infer<typeof formSchema>) {
    try {
      setSubmitLoading(true);

      // Submit selected channel to backend
      const response = await fetch("/api/youtube/subscribe", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          channelId: values.channel,
          enableNotifications: values.enableNotifications,
        }),
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error(`Failed to subscribe: ${response.statusText}`);
      }

      // Show success message
      toast.success("Channel added successfully", {
        description: "You will now receive updates from this channel",
      });

      // Reset form
      form.reset();
    } catch (error) {
      console.error("Error subscribing to channel:", error);
      toast.error("Failed to add channel", {
        description:
          error instanceof Error ? error.message : "Please try again later",
      });
    } finally {
      setSubmitLoading(false);
    }
  }

  // Render different content based on authentication status
  const renderContent = () => {
    switch (googleAuthStatus) {
      case "unknown":
        return (
          <div className="flex flex-col items-center justify-center p-4">
            <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
            <p>Checking YouTube connection status...</p>
          </div>
        );

      case "not-linked":
        return (
          <div className="flex flex-col items-center justify-center p-4">
            <p className="mb-4">
              Connect your YouTube account to import subscriptions
            </p>
            <Button onClick={linkGoogleAccount} disabled={googleAuthLoading}>
              {googleAuthLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Connecting...
                </>
              ) : (
                "Connect YouTube"
              )}
            </Button>
          </div>
        );

      case "expired":
        return (
          <div className="flex flex-col items-center justify-center p-4">
            <p className="mb-4">
              Your YouTube connection has expired. Please reconnect.
            </p>
            <Button onClick={refreshTokens} disabled={googleAuthLoading}>
              {googleAuthLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Reconnecting...
                </>
              ) : (
                "Reconnect YouTube"
              )}
            </Button>
          </div>
        );

      case "linked":
        return (
          <div>
            <h3 className="text-lg font-medium mb-4">Your YouTube Channels</h3>
            {isLoadingChannels ? (
              <div className="flex items-center justify-center p-4">
                <Loader2 className="h-6 w-6 animate-spin mr-2" />
                <p>Loading your YouTube subscriptions...</p>
              </div>
            ) : channels.length > 0 ? (
              <ul className="space-y-2">
                {channels.map((channel) => (
                  <li
                    key={channel.id}
                    className="p-2 border rounded flex items-center"
                  >
                    {channel.thumbnail && (
                      <img
                        src={channel.thumbnail}
                        alt={channel.title}
                        className="w-8 h-8 rounded-full mr-2"
                      />
                    )}
                    <span>{channel.title}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p>No YouTube subscriptions found.</p>
            )}
          </div>
        );
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>YouTube Subscriptions</CardTitle>
        <CardDescription>
          Import channels from your YouTube subscriptions
        </CardDescription>
      </CardHeader>
      <CardContent>{renderContent()}</CardContent>
    </Card>
  );
}
