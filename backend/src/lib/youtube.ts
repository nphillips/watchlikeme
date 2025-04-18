import { google } from "googleapis";
import { env } from "../env";

console.log("Initializing YouTube client with config:", {
  hasClientId: !!env.GOOGLE_CLIENT_ID,
  hasClientSecret: !!env.GOOGLE_CLIENT_SECRET,
  redirectUri: `${env.ORIGIN}/api/auth/google/callback`,
});

export const youtube = google.youtube("v3");

// Initialize the OAuth2 client
const oauth2Client = new google.auth.OAuth2(
  env.GOOGLE_CLIENT_ID,
  env.GOOGLE_CLIENT_SECRET,
  `${env.ORIGIN}/api/auth/google/callback`
);

// Set the default auth to the OAuth2 client
google.options({ auth: oauth2Client });

// Helper function to set credentials for a specific user
export const setUserCredentials = (accessToken: string) => {
  console.log("Setting user credentials for YouTube API");
  oauth2Client.setCredentials({ access_token: accessToken });
  return youtube;
};
