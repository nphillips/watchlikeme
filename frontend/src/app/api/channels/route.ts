import { NextResponse } from "next/server";
import { google } from "googleapis";
import { cookies } from "next/headers";

export async function GET() {
  try {
    // Get the tokens from the cookie
    const cookieStore = await cookies();
    const tokensCookie = cookieStore.get("google_tokens")?.value;

    console.log("Google tokens cookie exists:", !!tokensCookie);
    console.log(
      "Available cookies:",
      cookieStore
        .getAll()
        .map((c) => c.name)
        .join(", ")
    );

    if (!tokensCookie) {
      console.log(
        "No Google tokens found in cookies. User has not linked Google account."
      );
      return NextResponse.json(
        {
          error: "Google account not linked",
          message: "Please link your Google account to view your subscriptions",
          code: "GOOGLE_NOT_LINKED",
        },
        { status: 403 }
      );
    }

    // Parse the tokens
    let tokens;
    try {
      tokens = JSON.parse(tokensCookie);
      console.log(
        "Successfully parsed Google tokens, access_token exists:",
        !!tokens.access_token
      );

      if (tokens.expiry_date) {
        console.log(
          "Token expiry:",
          new Date(tokens.expiry_date).toISOString()
        );
        console.log("Current time:", new Date().toISOString());
        console.log("Token expired:", Date.now() >= tokens.expiry_date);
      }
    } catch (e) {
      console.error("Failed to parse Google tokens:", e);
      return NextResponse.json(
        {
          error: "Invalid Google tokens",
          message:
            "Your Google session has expired. Please re-link your account.",
          code: "GOOGLE_TOKEN_INVALID",
        },
        { status: 401 }
      );
    }

    // Check token expiration
    if (tokens.expiry_date && Date.now() >= tokens.expiry_date) {
      console.log("Google tokens have expired:", {
        expiryDate: new Date(tokens.expiry_date).toISOString(),
        now: new Date().toISOString(),
      });

      return NextResponse.json(
        {
          error: "Google tokens expired",
          message:
            "Your Google session has expired. Please refresh your authorization.",
          code: "GOOGLE_TOKEN_EXPIRED",
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

    try {
      // Fetch subscriptions
      console.log("Calling YouTube API with tokens...");
      const response = await youtube.subscriptions.list({
        auth: oauth2Client,
        part: ["snippet"],
        mine: true,
        maxResults: 50,
      });

      console.log(
        "YouTube API response successful, items:",
        !!response.data.items
      );

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
    } catch (apiError: any) {
      console.error("YouTube API error:", apiError);
      console.error(
        "Error details:",
        apiError.response?.data || apiError.message
      );

      // Check for specific Google auth errors
      if (
        apiError.message?.includes("invalid_grant") ||
        apiError.message?.includes("Invalid Credentials") ||
        apiError.message?.includes("token") ||
        apiError.response?.data?.error?.status === "UNAUTHENTICATED"
      ) {
        return NextResponse.json(
          {
            error: "Authentication failed",
            message:
              "Your Google session has expired. Please refresh your authorization.",
            code: "GOOGLE_AUTH_FAILED",
            details: apiError.message,
          },
          { status: 401 }
        );
      }

      // Return a generic error for other API issues
      return NextResponse.json(
        {
          error: "API error",
          message: "Error fetching YouTube data. Please try again later.",
          code: "YOUTUBE_API_ERROR",
          details: apiError.message,
        },
        { status: 500 }
      );
    }
  } catch (error: any) {
    console.error("Error fetching YouTube subscriptions:", error);

    return NextResponse.json(
      {
        error: "Failed to fetch subscriptions",
        message: "An error occurred while fetching your YouTube subscriptions.",
        code: "UNKNOWN_ERROR",
        details: error.message,
      },
      { status: 500 }
    );
  }
}
