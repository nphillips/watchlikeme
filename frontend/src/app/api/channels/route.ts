import { NextResponse } from "next/server";
import { google } from "googleapis";
import { getAuthenticatedClient } from "@/lib/google-auth";
import { backendFetch } from "@/lib/backend-fetch";

export async function GET() {
  try {
    // Get authenticated client with fresh tokens
    const oauth2Client = await getAuthenticatedClient();

    if (!oauth2Client) {
      console.log("No authenticated Google client available");
      return NextResponse.json(
        {
          error: "Google account not linked",
          message: "Please link your Google account to view your subscriptions",
        },
        { status: 403 }
      );
    }

    // First try to get channels from our backend (which caches in the database)
    try {
      const response = await backendFetch("/channels");

      if (response.ok) {
        const channels = await response.json();
        console.log(
          `Retrieved ${channels.length} channels from database cache`
        );
        return NextResponse.json(channels);
      } else {
        console.error(
          "Error fetching from backend:",
          await response.text().catch(() => "")
        );
      }
    } catch (backendError) {
      console.error("Error fetching from backend:", backendError);
      // Fall back to direct YouTube API call
    }

    // Initialize the YouTube API client as fallback
    const youtube = google.youtube("v3");

    // Fetch subscriptions directly from YouTube API
    const response = await youtube.subscriptions.list({
      auth: oauth2Client,
      part: ["snippet"],
      mine: true,
      maxResults: 50,
    });

    if (!response.data.items) {
      return NextResponse.json([]);
    }

    // Format the channels data
    const channels = response.data.items.map((item) => ({
      id: item.snippet?.resourceId?.channelId,
      title: item.snippet?.title,
      thumbnailUrl: item.snippet?.thumbnails?.default?.url,
      subscriberCount: 0, // This would require an additional API call to get
    }));

    return NextResponse.json(channels);
  } catch (error: any) {
    console.error("Error fetching YouTube subscriptions:", error);

    // Check if this is a token-related error
    if (
      error.message?.includes("invalid_grant") ||
      error.message?.includes("token") ||
      error.message?.includes("Token has been expired or revoked")
    ) {
      return NextResponse.json(
        {
          error: "Google authentication failed",
          message:
            "Your Google session has expired. Please re-link your account.",
        },
        { status: 403 }
      );
    }

    return NextResponse.json(
      {
        error: "Failed to fetch subscriptions",
        message: "An error occurred while fetching your YouTube subscriptions.",
      },
      { status: 500 }
    );
  }
}
