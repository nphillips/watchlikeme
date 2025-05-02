import { NextResponse } from "next/server";
import { env } from "@/env";

if (!env.GOOGLE_CLIENT_ID || !env.GOOGLE_CLIENT_SECRET) {
  console.error("Missing required environment variables for Google OAuth");
}

// Remove unused oauth2Client definition here if not used later
/*
const oauth2Client = new OAuth2Client(
  env.GOOGLE_CLIENT_ID,
  env.GOOGLE_CLIENT_SECRET,
  `${env.ORIGIN || "http://localhost:3000"}/api/auth/google/callback`,
);
*/

export async function GET(request: Request) {
  const frontendBaseUrl =
    env.ORIGIN || env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
  const backendUrl = env.BACKEND_URL || "http://localhost:8888";
  const requestUrl = new URL(request.url);

  console.log("[Frontend Callback] Received request:", requestUrl.toString());

  // Forward all query parameters from the original request to the backend
  const backendCallbackUrl = new URL(
    `/api/auth/google/callback${requestUrl.search}`, // Append original search params (code, state, etc.)
    backendUrl,
  );

  console.log(
    "[Frontend Callback] Proxying to backend:",
    backendCallbackUrl.toString(),
  );

  try {
    // Make the request to the backend's callback endpoint.
    // We expect the backend to handle the code exchange, user lookup/creation,
    // JWT generation, setting the 'token' cookie, and issuing a redirect.
    // We set redirect: 'manual' so fetch doesn't automatically follow the redirect,
    // allowing us to capture the headers (like Set-Cookie) and the redirect location.
    const backendResponse = await fetch(backendCallbackUrl.toString(), {
      method: "GET", // Or match the method expected by your backend endpoint
      headers: {
        // Forward any necessary headers if needed, but usually none for this callback
      },
      redirect: "manual", // IMPORTANT: Do not follow redirects automatically
    });

    console.log(
      `[Frontend Callback] Backend response status: ${backendResponse.status}`,
    );
    console.log(
      "[Frontend Callback] Backend response headers:",
      JSON.stringify(Object.fromEntries(backendResponse.headers.entries())),
    );

    // Create a new response to send back to the browser
    // Use the status code from the backend response (usually 3xx for redirect)
    const responseHeaders = new Headers();
    // Copy essential headers from backend response to frontend response
    backendResponse.headers.forEach((value, key) => {
      // IMPORTANT: Especially copy 'Set-Cookie' and 'Location' headers
      if (
        key.toLowerCase() === "set-cookie" ||
        key.toLowerCase() === "location"
      ) {
        // For Set-Cookie, append might be safer if multiple cookies are set,
        // but usually the backend sets one auth cookie here.
        // Using set should be fine if the backend only sets the 'token' cookie here.
        responseHeaders.set(key, value);
        console.log(`[Frontend Callback] Forwarding header: ${key}=${value}`);
      }
      // You might need to forward other headers depending on your setup
    });

    // If backend sent a redirect (Location header), use that URL
    const redirectLocation = backendResponse.headers.get("location");
    let finalRedirectUrl: URL;

    if (redirectLocation) {
      // If backend provided a full URL, use it. If relative, resolve against frontend base.
      try {
        finalRedirectUrl = new URL(redirectLocation);
      } catch /* istanbul ignore next */ {
        // If backend sent a relative path (e.g., '/'), resolve it against the frontend base URL
        finalRedirectUrl = new URL(redirectLocation, frontendBaseUrl);
      }
      console.log(
        `[Frontend Callback] Redirecting browser to: ${finalRedirectUrl.toString()}`,
      );
    } else {
      // Fallback redirect if backend didn't provide one (shouldn't happen in normal flow)
      console.warn(
        "[Frontend Callback] Backend did not send a Location header. Falling back to root.",
      );
      finalRedirectUrl = new URL("/", frontendBaseUrl);
    }

    // Return a new Response object with the backend's status, proxied headers, and no body
    // The browser will follow the 'Location' header.
    return new Response(null, {
      status: backendResponse.status,
      headers: responseHeaders,
    });
  } catch (error) {
    console.error("[Frontend Callback] Error proxying to backend:", error);
    // Redirect to a generic error page on the frontend
    const errorRedirectUrl = new URL(
      `/?error=${encodeURIComponent("callback_proxy_failed")}`,
      frontendBaseUrl,
    );
    return NextResponse.redirect(errorRedirectUrl);
  }
}
