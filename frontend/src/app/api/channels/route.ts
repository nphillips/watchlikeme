import { NextResponse } from "next/server";
import { google } from "googleapis";
import { cookies } from "next/headers";

export async function GET() {
  try {
    // Get the tokens from the cookie
    const cookieStore = await cookies();
    const tokensCookie = cookieStore.get("google_tokens")?.value;

    console.log("Google tokens cookie exists:", !!tokensCookie);

    if (!tokensCookie) {
      console.log(
        "No Google tokens found in cookies. User has not linked Google account."
      );
      return NextResponse.json(
        {
          error: "Google account not linked",
          message: "Please link your Google account to view your subscriptions",
        },
        { status: 403 }
      );
    }

    // Parse the tokens
    let tokens;
    try {
      tokens = JSON.parse(tokensCookie);
    } catch (e) {
      console.error("Failed to parse Google tokens:", e);
      return NextResponse.json(
        {
          error: "Invalid Google tokens",
          message:
            "Your Google session has expired. Please re-link your account.",
        },
        { status: 401 }
      );
    }

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
  } catch (error: any) {
    console.error("Error fetching YouTube subscriptions:", error);

    // Check if this is an auth error
    if (
      error.message?.includes("invalid_grant") ||
      error.message?.includes("token")
    ) {
      return NextResponse.json(
        {
          error: "Authentication failed",
          message:
            "Your Google session has expired. Please re-link your account.",
        },
        { status: 401 }
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
