import { NextResponse } from "next/server";
import { google } from "googleapis";
import { env } from "@/env";

const oauth2Client = new google.auth.OAuth2(
  env.GOOGLE_CLIENT_ID,
  env.GOOGLE_CLIENT_SECRET,
  `${env.NEXT_PUBLIC_ORIGIN}/api/auth/google/callback`
);

export async function GET() {
  const authUrl = oauth2Client.generateAuthUrl({
    access_type: "offline",
    scope: [
      "https://www.googleapis.com/auth/userinfo.profile",
      "https://www.googleapis.com/auth/userinfo.email",
      "https://www.googleapis.com/auth/youtube.readonly",
    ],
    prompt: "consent",
  });

  return NextResponse.redirect(authUrl);
}
