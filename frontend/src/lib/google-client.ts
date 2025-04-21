import { google } from "googleapis";

const {
  NEXT_PUBLIC_BACKEND_URL,
  GOOGLE_CLIENT_ID,
  GOOGLE_CLIENT_SECRET,
  NEXT_PUBLIC_SITE_URL,
} = process.env;

export async function getAuthenticatedClient(
  request: Request
): Promise<google.auth.OAuth2 | null> {
  const cookie = request.headers.get("cookie") || "";
  // 1) Fetch saved Google tokens from your backend
  const jwtToken = cookie
    .split(";")
    .map((c) => c.trim())
    .find((c) => c.startsWith("auth_token="))
    ?.split("=")[1];
  const resp = await fetch(
    `${NEXT_PUBLIC_BACKEND_URL}/api/users/me/google-tokens`,
    {
      headers: {
        cookie,
        ...(jwtToken ? { Authorization: `Bearer ${jwtToken}` } : {}),
      },
    }
  );
  console.log("→ fetched stored Google tokens status:", resp.status);
  if (!resp.ok) return null;
  const tokens: {
    access_token: string;
    refresh_token: string;
    expiry_date: number;
  } = await resp.json();

  // 2) Instantiate the OAuth2 client
  const oauth2Client = new google.auth.OAuth2(
    GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET,
    `${NEXT_PUBLIC_SITE_URL}/api/auth/google/callback`
  );
  oauth2Client.setCredentials(tokens);

  // 3) If expired, refresh & persist new tokens
  if (tokens.expiry_date && tokens.expiry_date < Date.now()) {
    const { credentials } = await oauth2Client.refreshAccessToken();
    oauth2Client.setCredentials(credentials);

    // Persist the refreshed tokens back to your Express backend
    await fetch(`${NEXT_PUBLIC_BACKEND_URL}/api/users/me/google-tokens`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        cookie,
      },
      body: JSON.stringify({
        accessToken: credentials.access_token,
        refreshToken: credentials.refresh_token,
        expiryDate: new Date(credentials.expiry_date),
      }),
    });
  }

  return oauth2Client;
}
