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

console.log("OAuth2 Client Configuration:", {
  clientId: env.GOOGLE_CLIENT_ID,
  redirectUri: `${
    env.ORIGIN || "http://localhost:3000"
  }/api/auth/google/callback`,
  siteUrl: env.NEXT_PUBLIC_SITE_URL,
});

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const error = searchParams.get("error");
  const origin = env.ORIGIN || "http://localhost:3000";

  console.log("OAuth callback received:", {
    code: !!code,
    error,
    origin,
    url: request.url,
  });

  if (error) {
    console.error("OAuth error:", error);
    return NextResponse.redirect(`${origin}/login?error=${error}`);
  }

  if (!code) {
    console.error("No code received in callback");
    return NextResponse.redirect(`${origin}/login?error=no_code`);
  }

  try {
    console.log("Attempting to exchange code for tokens");
    const { tokens } = await oauth2Client.getToken(code);
    console.log("Successfully obtained tokens");
    oauth2Client.setCredentials(tokens);

    const oauth2 = google.oauth2({ version: "v2", auth: oauth2Client });
    const { data } = await oauth2.userinfo.get();
    console.log("Successfully obtained user info:", {
      email: data.email,
      id: data.id,
    });

    if (!data.email || !data.id) {
      throw new Error("Missing required user data");
    }

    try {
      // Set the tokens in an HTTP-only cookie
      const response = NextResponse.redirect(origin);

      // Log the tokens (without sensitive data) for debugging
      console.log("Setting tokens in cookie:", {
        hasAccessToken: !!tokens.access_token,
        hasRefreshToken: !!tokens.refresh_token,
        expiryDate: tokens.expiry_date,
      });

      response.cookies.set("google_tokens", JSON.stringify(tokens), {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: 7 * 24 * 60 * 60, // 7 days in seconds
      });

      // Also set a simple flag cookie to verify cookie setting works
      response.cookies.set("auth_success", "true", {
        httpOnly: false,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: 7 * 24 * 60 * 60,
      });

      console.log("Successfully set cookies, redirecting to:", origin);
      return response;
    } catch (cookieError) {
      console.error("Error setting cookies:", cookieError);
      throw cookieError;
    }
  } catch (err) {
    console.error("Error during Google OAuth callback:", err);
    return NextResponse.redirect(`${origin}/login?error=auth_failed`);
  }
}
