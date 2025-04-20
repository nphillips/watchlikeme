import { redirect } from "next/navigation";
import { OAuth2Client } from "google-auth-library";
import { env } from "@/env";

// Ensure we have a base URL for redirects
const baseUrl =
  env.NEXT_PUBLIC_SITE_URL || env.ORIGIN || "http://localhost:3000";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const linkAccount = url.searchParams.get("linkAccount") === "true";
  const refreshTokens = url.searchParams.get("refresh") === "true";

  // Set up OAuth client
  const oauth2Client = new OAuth2Client(
    env.GOOGLE_CLIENT_ID,
    env.GOOGLE_CLIENT_SECRET,
    `${env.ORIGIN || "http://localhost:3000"}/api/auth/google/callback`
  );

  // Set the appropriate scopes
  const scopes = [
    "https://www.googleapis.com/auth/userinfo.email",
    "https://www.googleapis.com/auth/userinfo.profile",
    "https://www.googleapis.com/auth/youtube.readonly",
  ];

  // Set the state parameter
  let state = "login";
  if (linkAccount) {
    state = "link_account";
  } else if (refreshTokens) {
    state = "refresh_tokens";
  }

  // Generate auth URL
  const authUrl = oauth2Client.generateAuthUrl({
    access_type: "offline",
    scope: scopes,
    state,
    prompt: "consent", // Always prompt for consent to ensure we get a refresh token
  });

  // Log for debugging
  console.log("Redirecting to Google OAuth URL:", authUrl);

  // Redirect to Google's OAuth flow
  return redirect(authUrl);
}
