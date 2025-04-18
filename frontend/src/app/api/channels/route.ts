import { NextResponse } from "next/server";
import { google } from "googleapis";
import { cookies } from "next/headers";

export async function GET() {
  try {
    // Get the tokens from the cookie
    const cookieStore = await cookies();
    const tokensCookie = cookieStore.get("google_tokens")?.value;

    if (!tokensCookie) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const tokens = JSON.parse(tokensCookie);

    // Initialize the OAuth2 client
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      `${process.env.ORIGIN}/api/auth/google/callback`
    );

    // Set the credentials
    oauth2Client.setCredentials(tokens);

    // Initialize the YouTube API client
    const youtube = google.youtube("v3");

    // Fetch subscriptions
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
  } catch (error) {
    console.error("Error fetching YouTube subscriptions:", error);
    return NextResponse.json(
      { error: "Failed to fetch subscriptions" },
      { status: 500 }
    );
  }
}
