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
export const setUserCredentials = (
  accessToken: string,
  refreshToken?: string
) => {
  console.log("[YouTube Client] Setting credentials with token:", {
    tokenLength: accessToken.length,
    tokenStart: accessToken.substring(0, 10) + "...",
    hasRefreshToken: !!refreshToken,
  });

  try {
    oauth2Client.setCredentials({
      access_token: accessToken,
      refresh_token: refreshToken,
      token_type: "Bearer",
    });

    // Verify the credentials are set
    const credentials = oauth2Client.credentials;
    console.log("[YouTube Client] Credentials set successfully:", {
      hasAccessToken: !!credentials.access_token,
      accessTokenLength: credentials.access_token?.length,
      hasRefreshToken: !!credentials.refresh_token,
      tokenType: credentials.token_type,
    });

    return youtube;
  } catch (error) {
    console.error("[YouTube Client] Error setting credentials:", error);
    throw error;
  }
};
