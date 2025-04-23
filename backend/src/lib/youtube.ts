import { google } from "googleapis";
import { env } from "../env";

console.log("Initializing YouTube client with config:", {
  hasClientId: !!env.GOOGLE_CLIENT_ID,
  hasClientSecret: !!env.GOOGLE_CLIENT_SECRET,
  redirectUri: `${env.ORIGIN}/api/auth/google/callback`,
});

// Initialize the OAuth2 client
const oauth2Client = new google.auth.OAuth2(
  env.GOOGLE_CLIENT_ID,
  env.GOOGLE_CLIENT_SECRET,
  `${env.ORIGIN}/api/auth/google/callback`
);

// Create YouTube client
export const youtube = google.youtube({ version: "v3", auth: oauth2Client });

// Helper function to set credentials for a specific user
export const setUserCredentials = (accessToken: string) => {
  console.log("Setting user credentials for YouTube API with token:", {
    tokenLength: accessToken.length,
    tokenStart: accessToken.substring(0, 10) + "...",
  });

  try {
    oauth2Client.setCredentials({
      access_token: accessToken,
      token_type: "Bearer",
    });

    // Verify the credentials are set
    const credentials = oauth2Client.credentials;
    console.log("OAuth2 client credentials set:", {
      hasAccessToken: !!credentials.access_token,
      accessTokenLength: credentials.access_token?.length,
      tokenType: credentials.token_type,
    });

    return youtube;
  } catch (error) {
    console.error("Error setting YouTube credentials:", error);
    throw error;
  }
};
