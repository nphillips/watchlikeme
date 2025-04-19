import { NextResponse } from "next/server";
import { google } from "googleapis";
import { env } from "@/env";

// Ensure we have a base URL for redirects
const baseUrl =
  env.NEXT_PUBLIC_SITE_URL || env.ORIGIN || "http://localhost:3000";

const oauth2Client = new google.auth.OAuth2(
  env.GOOGLE_CLIENT_ID,
  env.GOOGLE_CLIENT_SECRET,
  `${baseUrl}/api/auth/google/callback`
);

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const linkAccount = searchParams.get("linkAccount") === "true";

  // Include a state parameter to indicate if we're linking accounts
  const state = linkAccount ? "link_account" : "";

  const authUrl = oauth2Client.generateAuthUrl({
    access_type: "offline",
    scope: [
      "https://www.googleapis.com/auth/userinfo.profile",
      "https://www.googleapis.com/auth/userinfo.email",
      "https://www.googleapis.com/auth/youtube.readonly",
    ],
    prompt: "consent",
    state,
  });

  console.log("Generated auth URL:", {
    url: authUrl,
    clientId: env.GOOGLE_CLIENT_ID,
    redirectUri: `${baseUrl}/api/auth/google/callback`,
  });

  return NextResponse.redirect(authUrl);
}
