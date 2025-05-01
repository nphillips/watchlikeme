import { Request, Response, NextFunction, RequestHandler } from "express";
import jwt from "jsonwebtoken";
import { env } from "../env";
import { google } from "googleapis"; // Import googleapis
import { OAuth2Client } from "google-auth-library"; // Import OAuth2Client type
import { getGoogleTokensForUser } from "../lib/google"; // Import the DB token fetcher

// Export the interface so it can be imported elsewhere
export interface AuthenticatedUserInfo {
  id: string; // WatchLikeMe User ID
  email: string;
  // These are now optional as they depend on google_tokens cookie
  accessToken?: string | null; // Google Access Token
  oauth2Client?: OAuth2Client | null;
}

// Augment Express Request type with a unique property
declare global {
  namespace Express {
    interface Request {
      watchLikeMeAuthInfo?: AuthenticatedUserInfo;
    }
  }
}

// Helper to create an OAuth2Client
function createOAuth2Client(tokens: any): OAuth2Client {
  const client = new google.auth.OAuth2(
    env.GOOGLE_CLIENT_ID,
    env.GOOGLE_CLIENT_SECRET,
    `${env.ORIGIN}/api/auth/google/callback`, // Use origin from env
  );
  // Ensure we pass the correct structure to setCredentials
  // It expects { access_token, refresh_token, expiry_date, token_type }
  client.setCredentials({
    access_token: tokens.access_token,
    refresh_token: tokens.refresh_token,
    expiry_date: tokens.expiry_date, // Assuming expiry_date is a timestamp number
    token_type: "Bearer", // Usually Bearer
  });
  return client;
}

export const authenticateToken: RequestHandler = async (req, res, next) => {
  // ---> New Log: Log all incoming cookies
  console.log("[Auth Middleware] Incoming Cookies:", req.cookies);
  // ---> New Log: Log Authorization header
  console.log(
    "[Auth Middleware] Authorization Header:",
    req.headers["authorization"],
  );

  // 1. Find WLM token (JWT)
  let token = req.cookies?.token;
  let tokenSource = "cookie";
  if (!token) {
    const authHeader = req.headers["authorization"];
    const headerToken = authHeader?.startsWith("Bearer ")
      ? authHeader.split(" ")[1]
      : null;
    if (headerToken) {
      token = headerToken;
      tokenSource = "header";
    }
  }

  // ---> New Log: Log the found token (or lack thereof)
  console.log(
    `[Auth Middleware] Token found via ${tokenSource}? : ${token ? "Yes (length: " + token.length + ")" : "No"}`,
  );

  console.log("[Auth Middleware] Starting WLM JWT check:", {
    tokenSource: token ? tokenSource : "none",
    hasToken: !!token,
  });

  if (!token) {
    console.error("[Auth Middleware] No WLM token found. Denying access."); // Added detail
    return res.status(401).json({ error: "No authentication token provided" });
  }

  let decodedJwtPayload: { sub: string; email: string };
  try {
    // 2. Verify WLM JWT
    decodedJwtPayload = jwt.verify(token, env.JWT_SECRET!) as {
      sub: string;
      email: string;
    };
    console.log("[Auth Middleware] WLM JWT verified:", {
      userId: decodedJwtPayload.sub,
      email: decodedJwtPayload.email,
      tokenSource,
    });

    // 3. Initialize partial auth info
    let authInfo: AuthenticatedUserInfo = {
      id: decodedJwtPayload.sub,
      email: decodedJwtPayload.email,
      accessToken: null,
      oauth2Client: null,
    };

    // --- New: 4. Attempt to get Google Tokens from DB ---
    try {
      const userId = decodedJwtPayload.sub;
      const googleTokens = await getGoogleTokensForUser(userId);
      console.log(
        `[Auth Middleware] Google tokens from DB for user ${userId}:`,
        {
          exists: !!googleTokens,
          hasAccessToken: !!googleTokens?.access_token,
          hasRefreshToken: !!googleTokens?.refresh_token,
          expiry: googleTokens?.expiry_date
            ? new Date(googleTokens.expiry_date)
            : null,
        },
      );

      if (googleTokens && googleTokens.access_token) {
        // TODO: Implement token expiry check and refresh logic
        // const now = Date.now();
        // if (googleTokens.expiry_date && googleTokens.expiry_date < now) {
        //   console.log('[Auth Middleware] Google access token expired. Attempting refresh...');
        //   // Add refresh logic here using googleTokens.refresh_token
        //   // If refresh fails, clear tokens and proceed without Google auth
        // } else {
        console.log("[Auth Middleware] Found valid Google tokens in DB.");
        const oauth2Client = createOAuth2Client(googleTokens);
        authInfo.accessToken = googleTokens.access_token;
        authInfo.oauth2Client = oauth2Client;
        // }
      } else {
        console.log("[Auth Middleware] No valid Google tokens found in DB.");
      }
    } catch (dbError) {
      console.error(
        "[Auth Middleware] Error fetching Google tokens from DB:",
        dbError,
      );
      // Proceed without Google auth info if DB fetch fails
    }
    // --- End New DB Token Fetch Logic ---

    /* --- Remove Old Cookie Logic ---
    // 4. Attempt to get Google Tokens
    const googleTokensCookie = req.cookies?.google_tokens;
    console.log("[Auth Middleware] Google tokens cookie check:", {
      exists: !!googleTokensCookie,
    });

    if (googleTokensCookie) {
      try {
        const googleTokens =
          typeof googleTokensCookie === "string"
            ? JSON.parse(googleTokensCookie)
            : googleTokensCookie;

        if (googleTokens.access_token) {
          console.log("[Auth Middleware] Found valid Google access token.");
          const oauth2Client = createOAuth2Client(googleTokens);
          // Enhance authInfo with Google details
          authInfo.accessToken = googleTokens.access_token;
          authInfo.oauth2Client = oauth2Client;
        } else {
          console.warn(
            "[Auth Middleware] google_tokens cookie present but missing access_token.",
          );
        }
      } catch (e) {
        console.error(
          "[Auth Middleware] Error parsing google_tokens cookie:",
          e,
        );
        // Don't fail the request here, just proceed without Google auth info
      }
    }
    */

    // 5. Attach the potentially partial authInfo to the request
    req.watchLikeMeAuthInfo = authInfo;
    console.log("[Auth Middleware] Attached watchLikeMeAuthInfo:", {
      userId: authInfo.id,
      hasGoogleAuth: !!authInfo.oauth2Client,
    });
    next(); // Proceed even if Google tokens were missing/invalid
  } catch (error) {
    // Handle JWT errors specifically
    console.error("[Auth Middleware] JWT verification error:", error);
    if (error instanceof jwt.JsonWebTokenError) {
      // Clear potentially invalid cookies
      res.clearCookie("token");
      res.clearCookie("auth_success");
      return res.status(403).json({ error: "Invalid or expired token" });
    }
    // Handle other unexpected errors
    return res.status(500).json({ error: "Authentication process error" });
  }
};
