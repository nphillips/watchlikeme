import { cookies } from "next/headers";
import { OAuth2Client } from "google-auth-library";
import { env } from "@/env";

const createOAuthClient = () =>
  new OAuth2Client(
    env.GOOGLE_CLIENT_ID,
    env.GOOGLE_CLIENT_SECRET,
    `${
      env.ORIGIN || env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"
    }/api/auth/google/callback`,
  );

export async function getAndRefreshTokens() {
  const cookieStore = await cookies();
  const tokensCookie = cookieStore.get("google_tokens");

  if (!tokensCookie?.value) {
    console.log("No Google tokens found in cookies");
    return null;
  }

  try {
    const tokens = JSON.parse(tokensCookie.value);

    const expiryDate = tokens.expiry_date ?? 0;
    const now = Date.now();

    if (expiryDate && expiryDate > now + 5 * 60 * 1000) {
      return tokens;
    }

    console.log("Access token expired or will expire soon, refreshing...");

    const oauth2Client = createOAuthClient();

    oauth2Client.setCredentials(tokens);

    const { credentials: newTokens } = await oauth2Client.refreshAccessToken();

    cookieStore.set("google_tokens", JSON.stringify(newTokens), {
      secure: process.env.NODE_ENV === "production",
      httpOnly: true,
      path: "/",
      maxAge: 30 * 24 * 60 * 60,
    });

    console.log("Access token refreshed successfully");

    return newTokens;
  } catch (error) {
    console.error("Error refreshing Google tokens:", error);
    cookieStore.delete("google_tokens");
    return null;
  }
}

export async function getAuthenticatedClient() {
  const tokens = await getAndRefreshTokens();

  if (!tokens) {
    return null;
  }

  const oauth2Client = createOAuthClient();
  oauth2Client.setCredentials(tokens);

  return oauth2Client;
}
