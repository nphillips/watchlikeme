import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { OAuth2Client } from "google-auth-library";
import { env } from "@/env";

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

    // Make sure we have a base URL for redirects
    const baseUrl = env.ORIGIN || "http://localhost:3000";
    const backendUrl = env.BACKEND_URL || "http://localhost:8888";

    // Create a helper function for redirects
    const redirectTo = (path: string) => {
      const fullUrl = new URL(path, baseUrl);
      console.log("Redirecting to:", fullUrl.toString());
      return NextResponse.redirect(fullUrl);
    };

    // Parse the state parameter to extract actions and other data
    let stateData = { action: "login" };
    try {
      if (state) {
        // State could be a simple string or JSON
        if (state === "link_account") {
          stateData.action = "link_account";
        } else if (state === "refresh_tokens") {
          stateData.action = "refresh_tokens";
        } else {
          // Try to parse as JSON
          try {
            stateData = JSON.parse(state);
          } catch (e) {
            // Not JSON, use as is
            stateData = { action: state };
          }
        }
      }
    } catch (e) {
      console.error("Failed to parse state parameter:", e);
    }

    const isLinkingAccount = stateData.action === "link_account";
    const isRefreshingTokens = stateData.action === "refresh_tokens";

    console.log("Auth action:", stateData.action);

    // Handle errors
    if (error) {
      console.error("OAuth error:", error);
      if (isRefreshingTokens) {
        return redirectTo("/autoclose?error=refresh_failed");
      }
      return redirectTo(
        isLinkingAccount ? "/" : "/login?error=google_auth_failed"
      );
    }

    if (!code) {
      console.error("No code received");
      if (isRefreshingTokens) {
        return redirectTo("/autoclose?error=refresh_failed");
      }
      return redirectTo(
        isLinkingAccount ? "/" : "/login?error=no_code_received"
      );
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

      // Handle token refresh scenario - just set tokens and redirect to autoclose
      if (isRefreshingTokens) {
        console.log("Refreshing tokens, skipping verification");
        // Create response with refreshed Google cookies
        const redirectResponse = NextResponse.redirect(
          `${baseUrl}/autoclose?success=true`
        );

        // Store Google tokens in a single cookie as JSON
        const googleTokensJson = JSON.stringify({
          ...tokens,
          // Add the current timestamp + expiry for easier checking
          acquired_at: Date.now(),
          expiry_date: Date.now() + (tokens.expiry_date || 3600 * 1000),
        });

        redirectResponse.cookies.set("google_tokens", googleTokensJson, {
          secure: process.env.NODE_ENV === "production",
          httpOnly: true,
          path: "/",
          maxAge: 30 * 24 * 60 * 60, // 30 days
        });

        return redirectResponse;
      }

      // If we're linking an account, we need to check for a JWT token
      if (isLinkingAccount) {
        // Get JWT token from cookies
        const cookieStore = await cookies();
        const token = cookieStore.get("token")?.value;

        if (!token) {
          console.error("No JWT token found for account linking");
          return redirectTo("/login?error=auth_required");
        }

        console.log("Using backend URL for account linking:", backendUrl);

        try {
          // Call backend to link the account
          const response = await fetch(`${backendUrl}/api/auth/link-google`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ googleId, googleEmail: email }),
          });

          if (!response.ok) {
            const errorData = await response.json();
            console.error("Failed to link account:", errorData);
            return redirectTo(
              `/?error=${encodeURIComponent(
                errorData.message || "Failed to link account"
              )}`
            );
          }

          // Create response with cookies
          const redirectUrl = new URL("/?success=account_linked", baseUrl);
          const redirectResponse = redirectTo(redirectUrl.toString());

          // Store Google tokens in a single cookie as JSON
          const googleTokensJson = JSON.stringify({
            ...tokens,
            // Add the current timestamp + expiry for easier checking
            acquired_at: Date.now(),
            expiry_date: Date.now() + (tokens.expiry_date || 3600 * 1000),
          });

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
          return redirectTo(
            `/login?error=${encodeURIComponent("failed_to_link_account")}`
          );
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

        // If user doesn't exist, create them
        if (!checkUserResponse.ok || !userData.exists) {
          // Create user
          const createUserResponse = await fetch(`${backendUrl}/api/users`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              email,
              name,
              googleId,
              username: email?.split("@")[0] || `user_${Date.now()}`,
            }),
          });

          if (!createUserResponse.ok) {
            console.error("Failed to create user");
            return redirectTo("/login?error=user_creation_failed");
          }
        }

        // Login with Google ID
        const loginResponse = await fetch(
          `${backendUrl}/api/auth/google-login`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ googleId }),
          }
        );

        if (!loginResponse.ok) {
          console.error("Failed to login with Google");
          return redirectTo("/login?error=google_login_failed");
        }

        const { token } = await loginResponse.json();

        // Create response with cookies
        const redirectUrl = new URL("/", baseUrl);
        const redirectResponse = redirectTo(redirectUrl.toString());

        // Store the Google tokens as a JSON string
        const googleTokensJson = JSON.stringify({
          ...tokens,
          // Add the current timestamp + expiry for easier checking
          acquired_at: Date.now(),
          expiry_date: Date.now() + (tokens.expiry_date || 3600 * 1000),
        });

        redirectResponse.cookies.set("google_tokens", googleTokensJson, {
          secure: process.env.NODE_ENV === "production",
          httpOnly: true,
          path: "/",
          maxAge: 30 * 24 * 60 * 60, // 30 days
        });

        // Set cookies
        redirectResponse.cookies.set("token", token, {
          secure: process.env.NODE_ENV === "production",
          httpOnly: true,
          path: "/",
          maxAge: 7 * 24 * 60 * 60, // 7 days
        });

        redirectResponse.cookies.set("auth_success", "true", {
          secure: process.env.NODE_ENV === "production",
          path: "/",
          maxAge: 30, // 30 seconds, just to show a success message
        });

        // Return response with cookies
        return redirectResponse;
      } catch (authFlowError) {
        console.error("Auth flow error:", authFlowError);
        return redirectTo(
          `/login?error=${encodeURIComponent("auth_flow_error")}`
        );
      }
    } catch (oauthError) {
      console.error("OAuth token exchange error:", oauthError);
      return redirectTo(
        `/login?error=${encodeURIComponent("google_auth_token_error")}`
      );
    }
  } catch (error) {
    console.error("Google callback error:", error);
    // Use our helper function for the final error redirect
    const baseUrl = env.ORIGIN || "http://localhost:3000";
    const redirectUrl = new URL("/login?error=google_auth_error", baseUrl);
    return NextResponse.redirect(redirectUrl);
  }
}
