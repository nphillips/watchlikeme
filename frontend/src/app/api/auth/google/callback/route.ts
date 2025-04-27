import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { OAuth2Client } from "google-auth-library";
import { env } from "@/env";

// Define baseUrl at the module scope
const baseUrl = env.ORIGIN || "http://localhost:3000";

// Check for required environment variables
if (!env.GOOGLE_CLIENT_ID || !env.GOOGLE_CLIENT_SECRET) {
  console.error("Missing required environment variables for Google OAuth");
}

// Set up OAuth2 client
const oauth2Client = new OAuth2Client(
  env.GOOGLE_CLIENT_ID,
  env.GOOGLE_CLIENT_SECRET,
  `${env.ORIGIN || "http://localhost:3000"}/api/auth/google/callback`
);

export async function GET(request: Request) {
  try {
    // Define backendUrl inside try block
    const backendUrl = env.BACKEND_URL || "http://localhost:8888";

    // Get URL from request
    const url = new URL(request.url);

    // Get query parameters
    const code = url.searchParams.get("code");
    const error = url.searchParams.get("error");
    const state = url.searchParams.get("state");

    console.log("Received callback with:", { code, error, state });
    console.log("OAuth client configuration:", {
      clientId: env.GOOGLE_CLIENT_ID ? "set" : "not set",
      clientSecret: env.GOOGLE_CLIENT_SECRET ? "set" : "not set",
      redirectUri: `${
        env.ORIGIN || "http://localhost:3000"
      }/api/auth/google/callback`,
    });

    // Check if we're linking an account
    const isLinkingAccount = state === "link_account";

    // Handle errors
    if (error) {
      console.error("OAuth error:", error);
      const redirectPath = isLinkingAccount
        ? "/"
        : `/?error=${encodeURIComponent(error)}`;
      return NextResponse.redirect(new URL(redirectPath, baseUrl));
    }

    if (!code) {
      console.error("No code received");
      const redirectPath = isLinkingAccount
        ? "/"
        : `/?error=${encodeURIComponent("no_code_received")}`;
      return NextResponse.redirect(new URL(redirectPath, baseUrl));
    }

    // Make sure the OAuth client has the correct redirect URI
    const updatedOauth2Client = new OAuth2Client(
      env.GOOGLE_CLIENT_ID,
      env.GOOGLE_CLIENT_SECRET,
      `${baseUrl}/api/auth/google/callback`
    );

    try {
      // Exchange code for tokens
      const { tokens } = await updatedOauth2Client.getToken(code);

      // Ensure the tokens have an expiry_date for our refresh logic
      const tokenData = tokens as any;
      if (tokenData.expiry_date === undefined && tokenData.expires_in) {
        tokenData.expiry_date = Date.now() + tokenData.expires_in * 1000;
      }

      updatedOauth2Client.setCredentials(tokens);

      const ticket = await updatedOauth2Client.verifyIdToken({
        idToken: tokens.id_token!,
        audience: env.GOOGLE_CLIENT_ID,
      });

      const payload = ticket.getPayload();

      if (!payload) {
        throw new Error("No payload received from Google");
      }

      const { sub: googleId, email, name, picture } = payload;

      // If we're linking an account, we need to check for a JWT token
      if (isLinkingAccount) {
        // Get JWT token from cookies
        const cookieStore = await cookies();
        const token = cookieStore.get("token")?.value;

        if (!token) {
          console.error("No JWT token found for account linking");
          return NextResponse.redirect(
            new URL("/login?error=auth_required", baseUrl)
          );
        }

        console.log("Using backend URL for account linking:", backendUrl);

        try {
          // Send request to link account
          const linkResult = await fetch(`${backendUrl}/api/auth/link-google`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
              googleId: googleId,
              googleEmail: email,
              googleTokens: tokens,
            }),
          });

          if (!linkResult.ok) {
            const errorData = await linkResult.json();
            console.error("Failed to link account:", errorData);
            const errorPath = `/?error=${encodeURIComponent(
              errorData.message || "Failed to link account"
            )}`;
            return NextResponse.redirect(new URL(errorPath, baseUrl));
          }

          // Create response with cookies
          const successPath = "/?success=account_linked";
          const redirectResponse = NextResponse.redirect(
            new URL(successPath, baseUrl)
          );

          // Store Google tokens in a single cookie as JSON
          const tokensWithExpiry = { ...tokens } as any;
          if (
            tokensWithExpiry.expiry_date === undefined &&
            tokensWithExpiry.expires_in
          ) {
            tokensWithExpiry.expiry_date =
              Date.now() + tokensWithExpiry.expires_in * 1000;
          }

          const googleTokensJson = JSON.stringify(tokensWithExpiry);
          redirectResponse.cookies.set("google_tokens", googleTokensJson, {
            secure: process.env.NODE_ENV === "production",
            httpOnly: true,
            path: "/",
            maxAge: 30 * 24 * 60 * 60, // 30 days
          });

          // Return response with cookies
          return redirectResponse;
        } catch (linkError) {
          console.error("Account linking error:", linkError);
          const errorPath = `/login?error=${encodeURIComponent(
            "failed_to_link_account"
          )}`;
          return NextResponse.redirect(new URL(errorPath, baseUrl));
        }
      }

      // Normal authentication flow
      console.log("Using backend URL for normal auth flow:", backendUrl);

      try {
        const checkUserResponse = await fetch(
          `${backendUrl}/api/users/by-email?email=${encodeURIComponent(
            email!
          )}`,
          {
            method: "GET",
            headers: {
              "Content-Type": "application/json",
            },
          }
        );

        const userData = await checkUserResponse.json();

        // Prepare redirect response using the helper
        const redirectUrlPath = userData.exists
          ? "/"
          : "/register?fromGoogle=true";
        const redirectResponse = NextResponse.redirect(
          new URL(redirectUrlPath, baseUrl)
        );

        // Store Google tokens cookie
        const tokensWithExpiry = { ...tokens } as any;
        if (
          tokensWithExpiry.expiry_date === undefined &&
          tokensWithExpiry.expires_in
        ) {
          tokensWithExpiry.expiry_date =
            Date.now() + tokensWithExpiry.expires_in * 1000;
        }
        const googleTokensJson = JSON.stringify(tokensWithExpiry);
        redirectResponse.cookies.set("google_tokens", googleTokensJson, {
          secure: process.env.NODE_ENV === "production",
          httpOnly: true,
          path: "/",
          maxAge: 30 * 24 * 60 * 60, // 30 days
        });

        // If registration is needed, set temporary cookie with googleId
        if (!userData.exists) {
          console.log(
            "Setting google_register_id cookie for registration flow."
          );
          redirectResponse.cookies.set("google_register_id", googleId, {
            secure: process.env.NODE_ENV === "production",
            httpOnly: true,
            path: "/",
            maxAge: 5 * 60, // 5 minutes validity
          });
        }

        // Set auth_success cookie
        redirectResponse.cookies.set("auth_success", "true", {
          secure: process.env.NODE_ENV === "production",
          httpOnly: true,
          path: "/",
          maxAge: 5 * 60, // 5 minutes, just enough to complete registration
        });

        return redirectResponse;
      } catch (error) {
        console.error("Error in normal auth flow:", error);
        const errorPath = `/?error=${encodeURIComponent(
          "authentication_failed"
        )}`;
        return NextResponse.redirect(new URL(errorPath, baseUrl));
      }
    } catch (error) {
      console.error("Token exchange error:", error);
      const errorPath = `/?error=${encodeURIComponent(
        "token_exchange_failed"
      )}`;
      return NextResponse.redirect(new URL(errorPath, baseUrl));
    }
  } catch (error) {
    console.error("Callback error:", error);
    const errorPath = `/?error=${encodeURIComponent("authentication_failed")}`;
    return NextResponse.redirect(new URL(errorPath, baseUrl));
  }
}
