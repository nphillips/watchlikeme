import { NextResponse } from "next/server";
import { google } from "googleapis";
import { env } from "@/env";
import { cookies } from "next/headers";

// Validate required environment variables
if (!env.GOOGLE_CLIENT_ID || !env.GOOGLE_CLIENT_SECRET) {
  throw new Error("Missing required Google OAuth credentials");
}

if (!env.NEXT_PUBLIC_SITE_URL) {
  throw new Error("Missing NEXT_PUBLIC_SITE_URL environment variable");
}

if (!env.BACKEND_URL) {
  throw new Error("Missing BACKEND_URL environment variable");
}

const redirectUri = `${env.NEXT_PUBLIC_SITE_URL}/api/auth/google/callback`;

const oauth2Client = new google.auth.OAuth2(
  env.GOOGLE_CLIENT_ID,
  env.GOOGLE_CLIENT_SECRET,
  `${env.ORIGIN || "http://localhost:3000"}/api/auth/google/callback`
);

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const error = searchParams.get("error");
  const origin = env.ORIGIN || "http://localhost:3000";

  if (error) {
    return NextResponse.redirect(`${origin}/login?error=${error}`);
  }

  if (!code) {
    return NextResponse.redirect(`${origin}/login?error=no_code`);
  }

  try {
    const { tokens } = await oauth2Client.getToken(code);
    oauth2Client.setCredentials(tokens);

    const oauth2 = google.oauth2({ version: "v2", auth: oauth2Client });
    const { data } = await oauth2.userinfo.get();

    if (!data.email || !data.id) {
      throw new Error("Missing required user data");
    }

    // Set the tokens in an HTTP-only cookie
    const response = NextResponse.redirect(origin);
    response.cookies.set("google_tokens", JSON.stringify(tokens), {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
    });

    return response;
  } catch (err) {
    console.error("Error during Google OAuth callback:", err);
    return NextResponse.redirect(`${origin}/login?error=auth_failed`);
  }
}
