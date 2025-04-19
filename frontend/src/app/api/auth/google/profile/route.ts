import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { google } from "googleapis";
import { env } from "@/env";

const oauth2Client = new google.auth.OAuth2(
  env.GOOGLE_CLIENT_ID,
  env.GOOGLE_CLIENT_SECRET,
  `${env.ORIGIN || "http://localhost:3000"}/api/auth/google/callback`
);

export async function GET() {
  try {
    let googleTokensCookie;

    try {
      // Access cookies in a try-catch to handle potential errors
      googleTokensCookie = cookies().get("google_tokens");
    } catch (e) {
      console.error("Error accessing cookies:", e);
      return NextResponse.json(
        { message: "Error accessing cookie store" },
        { status: 500 }
      );
    }

    if (!googleTokensCookie) {
      return NextResponse.json(
        { message: "No Google tokens found" },
        { status: 401 }
      );
    }

    // Parse the tokens from the cookie
    const tokens = JSON.parse(googleTokensCookie.value);
    oauth2Client.setCredentials(tokens);

    // Get user profile data
    const oauth2 = google.oauth2({ version: "v2", auth: oauth2Client });
    const { data } = await oauth2.userinfo.get();

    if (!data.email) {
      return NextResponse.json(
        { message: "Failed to retrieve email from Google profile" },
        { status: 400 }
      );
    }

    // Return the profile data
    return NextResponse.json({
      email: data.email,
      name: data.name || "",
      picture: data.picture || "",
    });
  } catch (error) {
    console.error("Error fetching Google profile:", error);
    return NextResponse.json(
      { message: "Failed to fetch Google profile" },
      { status: 500 }
    );
  }
}
