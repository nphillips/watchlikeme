import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { OAuth2Client } from "google-auth-library";
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
  // Define baseUrl and redirectTo at the top level of the GET handler
  const baseUrl = env.ORIGIN || "http://localhost:3000";
  const backendUrl = env.BACKEND_URL || "http://localhost:8888";

  const redirectTo = (path: string) => {
    const fullUrl = new URL(path, baseUrl);
    console.log("Redirecting to:", fullUrl.toString());
    return NextResponse.redirect(fullUrl);
  };

  try {
    const url = new URL(request.url);

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

    const isLinkingAccount = state === "link_account";

    if (error) {
      console.error("OAuth error:", error);
      return redirectTo(
        isLinkingAccount ? "/" : `/?error=${encodeURIComponent(error)}`,
      );
    }

    if (!code) {
      console.error("No code received");
      return redirectTo(
        isLinkingAccount
          ? "/"
          : `/?error=${encodeURIComponent("no_code_received")}`,
      );
    }

    const updatedOauth2Client = new OAuth2Client(
      env.GOOGLE_CLIENT_ID,
      env.GOOGLE_CLIENT_SECRET,
      `${baseUrl}/api/auth/google/callback`,
    );

    try {
      const { tokens } = await updatedOauth2Client.getToken(code);

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

      // Remove unused 'name' and 'picture' from destructuring
      // const { sub: googleId, email, name, picture } = payload;
      const { sub: googleId, email } = payload;

      if (isLinkingAccount) {
        const cookieStore = await cookies();
        const token = cookieStore.get("token")?.value;

        if (!token) {
          console.error("No JWT token found for account linking");
          return redirectTo("/login?error=auth_required");
        }

        console.log("Using backend URL for account linking:", backendUrl);

        try {
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
            return redirectTo(
              `/?error=${encodeURIComponent(
                errorData.message || "Failed to link account",
              )}`,
            );
          }

          const redirectUrl = new URL("/?success=account_linked", baseUrl);
          const redirectResponse = redirectTo(redirectUrl.toString());

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
            maxAge: 30 * 24 * 60 * 60,
          });

          return redirectResponse;
        } catch (linkError) {
          console.error("Account linking error:", linkError);
          return redirectTo(
            `/login?error=${encodeURIComponent("failed_to_link_account")}`,
          );
        }
      }

      console.log("Using backend URL for normal auth flow:", backendUrl);

      try {
        const checkUserResponse = await fetch(
          `${backendUrl}/api/users/by-email?email=${encodeURIComponent(
            email!,
          )}`,
          {
            method: "GET",
            headers: {
              "Content-Type": "application/json",
            },
          },
        );

        const userData = await checkUserResponse.json();

        const redirectResponse = NextResponse.redirect(
          new URL(userData.exists ? "/" : "/register?fromGoogle=true", baseUrl),
        );

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
          maxAge: 30 * 24 * 60 * 60,
        });

        redirectResponse.cookies.set("auth_success", "true", {
          secure: process.env.NODE_ENV === "production",
          httpOnly: true,
          path: "/",
          maxAge: 5 * 60,
        });

        return redirectResponse;
      } catch (error) {
        console.error("Error in normal auth flow:", error);
        return redirectTo(
          `/?error=${encodeURIComponent("authentication_failed")}`,
        );
      }
    } catch (error) {
      console.error("Token exchange error:", error);
      return redirectTo(
        `/?error=${encodeURIComponent("token_exchange_failed")}`,
      );
    }
  } catch (error) {
    console.error("Callback error:", error);
    // Now redirectTo is accessible here
    return redirectTo(`/?error=${encodeURIComponent("authentication_failed")}`);
  }
}
