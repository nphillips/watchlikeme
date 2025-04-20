import { cookies } from "next/headers";
import { OAuth2Client } from "google-auth-library";
import { env } from "@/env";

// Initialize the OAuth2Client
const createOAuthClient = () =>
  new OAuth2Client(
    env.GOOGLE_CLIENT_ID,
    env.GOOGLE_CLIENT_SECRET,
    `${
      env.ORIGIN || env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"
    }/api/auth/google/callback`
  );

/**
 * Gets tokens from cookies, refreshes if expired, and updates the cookie
 * @returns The valid tokens or null if no tokens are found
 */
export async function getAndRefreshTokens() {
  const cookieStore = await cookies();
  const tokensCookie = cookieStore.get("google_tokens");

  if (!tokensCookie?.value) {
    console.log("No Google tokens found in cookies");
    return null;
  }

  try {
    // Parse the tokens
    const tokens = JSON.parse(tokensCookie.value);

    // Check if the tokens might be expired (or will expire soon)
    const expiryDate = tokens.expiry_date ?? 0;
    const now = Date.now();

    // If token is still valid with more than 5 minutes left, return it
    if (expiryDate && expiryDate > now + 5 * 60 * 1000) {
      return tokens;
    }

    console.log("Access token expired or will expire soon, refreshing...");

    // Create a new OAuth client to handle the refresh
    const oauth2Client = createOAuthClient();

    // Set the credentials including the refresh token
    oauth2Client.setCredentials(tokens);

    // Refresh the token
    const { credentials: newTokens } = await oauth2Client.refreshAccessToken();

    // Update the tokens in the cookie store
    cookieStore.set("google_tokens", JSON.stringify(newTokens), {
      secure: process.env.NODE_ENV === "production",
      httpOnly: true,
      path: "/",
      maxAge: 30 * 24 * 60 * 60, // 30 days
    });

    console.log("Access token refreshed successfully");

    return newTokens;
  } catch (error) {
    console.error("Error refreshing Google tokens:", error);
    // If refresh fails, clear the invalid token
    cookieStore.delete("google_tokens");
    return null;
  }
}

/**
 * Creates an OAuth2Client with refreshed credentials
 * @returns Authenticated OAuth2Client or null if authentication fails
 */
export async function getAuthenticatedClient() {
  const tokens = await getAndRefreshTokens();

  if (!tokens) {
    return null;
  }

  const oauth2Client = createOAuthClient();
  oauth2Client.setCredentials(tokens);

  return oauth2Client;
}
