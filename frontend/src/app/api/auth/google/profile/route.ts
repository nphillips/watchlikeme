import { NextResponse } from "next/server";
import { google } from "googleapis";
import { getAuthenticatedClient } from "@/lib/google-auth";

export async function GET() {
  try {
    // Get authenticated client with fresh tokens
    const oauth2Client = await getAuthenticatedClient();

    if (!oauth2Client) {
      return NextResponse.json(
        { message: "No Google tokens found or tokens could not be refreshed" },
        { status: 401 }
      );
    }

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
