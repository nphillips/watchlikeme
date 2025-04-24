import { google, Auth } from "googleapis";

const {
  NEXT_PUBLIC_BACKEND_URL,
  GOOGLE_CLIENT_ID,
  GOOGLE_CLIENT_SECRET,
  NEXT_PUBLIC_SITE_URL,
} = process.env;

export async function getAuthenticatedClient(
  request: Request
): Promise<Auth.OAuth2Client | null> {
  const cookie = request.headers.get("cookie") || "";

  // 1) Fetch saved Google tokens from your backend
  const jwtToken = cookie
    .split(";")
    .map((c) => c.trim())
    .find((c) => c.startsWith("token="))
    ?.split("=")[1];

  // Debug log to verify token extraction
  console.log(
    `[google-client] Extracted JWT token: ${jwtToken ? "Found" : "Not Found"}`
  );

  const backendUrl = `${NEXT_PUBLIC_BACKEND_URL}/api/users/me/google-tokens`;
  console.log(`[google-client] Fetching tokens from: ${backendUrl}`);

  // Use global RequestInit type
  const fetchOptions: RequestInit = {
    // Type assertion is still needed for the non-standard 'cookie' header property
    headers: {
      cookie: cookie,
      ...(jwtToken ? { Authorization: `Bearer ${jwtToken}` } : {}),
    } as any,
  };

  console.log(
    `[google-client] Fetch options:`,
    JSON.stringify({
      has_cookie_header: !!(fetchOptions.headers as any)?.cookie,
      has_auth_header: !!(fetchOptions.headers as any)?.Authorization,
    })
  );

  const resp = await fetch(backendUrl, fetchOptions);

  console.log(
    `[google-client] Fetched stored Google tokens status: ${resp.status}`
  );

  if (!resp.ok) {
    console.error(
      `[google-client] Failed to fetch tokens, status: ${resp.status}`
    );
    return null;
  }

  const tokens: {
    access_token: string;
    refresh_token?: string | null;
    expiry_date?: number | null;
  } = await resp.json();

  if (!tokens.access_token) {
    console.error(
      "[google-client] No access_token found in response from backend"
    );
    return null;
  }

  // 2) Instantiate the OAuth2 client
  const oauth2Client = new google.auth.OAuth2(
    GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET,
    `${NEXT_PUBLIC_SITE_URL}/api/auth/google/callback`
  );
  oauth2Client.setCredentials({
    access_token: tokens.access_token,
    refresh_token: tokens.refresh_token,
  });

  // 3) Check expiry and refresh if needed (Simplified check)
  // The googleapis library often handles expiry checks internally when making requests,
  // but an explicit refresh might be needed if the token is known to be expired *before* the first call.
  // Let's rely on the library's handling for now unless specific issues arise.
  // --- Refresh logic removed for simplification, can be added back if needed ---

  // Let's test if credentials are set
  if (!oauth2Client.credentials.access_token) {
    console.error("[google-client] Failed to set credentials on OAuth2 client");
    return null;
  }

  console.log("[google-client] OAuth2 client created successfully.");
  return oauth2Client;
}
