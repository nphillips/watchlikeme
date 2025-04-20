import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function GET() {
  try {
    const cookieStore = await cookies();
    const googleTokensCookie = cookieStore.get("google_tokens");

    if (!googleTokensCookie) {
      return NextResponse.json(
        { error: "No Google tokens found" },
        { status: 401 }
      );
    }

    // Parse the Google tokens from the cookie
    const tokens = JSON.parse(decodeURIComponent(googleTokensCookie.value));

    // Use the access token to fetch the user's profile from Google
    const response = await fetch(
      "https://www.googleapis.com/oauth2/v2/userinfo",
      {
        headers: {
          Authorization: `Bearer ${tokens.access_token}`,
        },
      }
    );

    if (!response.ok) {
      return NextResponse.json(
        { error: "Failed to fetch Google profile" },
        { status: response.status }
      );
    }

    const profile = await response.json();

    // Create the response with the profile data
    const nextResponse = NextResponse.json({
      email: profile.email,
      name: profile.name,
    });

    return nextResponse;
  } catch (error) {
    console.error("Error fetching Google profile:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
