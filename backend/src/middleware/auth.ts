import { Request, Response, NextFunction, RequestHandler } from "express";
import jwt from "jsonwebtoken";
import { env } from "../env";
import { google, Auth } from "googleapis"; // Import googleapis and Auth namespace

// Export the interface so it can be imported elsewhere
export interface AuthenticatedUserInfo {
  id: string; // WatchLikeMe User ID
  email: string;
  // These are now optional as they depend on google_tokens cookie
  accessToken?: string | null; // Google Access Token
  oauth2Client?: Auth.OAuth2Client | null;
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
function createOAuth2Client(tokens: any): Auth.OAuth2Client {
  console.log(
    "[Auth Middleware - createOAuth2Client] Tokens received for client init:",
    tokens // Log the full tokens object received
  );
  const client = new google.auth.OAuth2(
    env.GOOGLE_CLIENT_ID,
    env.GOOGLE_CLIENT_SECRET,
    `${env.ORIGIN}/api/auth/google/callback`
  );

  // Set credentials using all available fields from the cookie/DB
  client.setCredentials({
    refresh_token: tokens.refresh_token,
    access_token: tokens.access_token,
    scope: tokens.scope,
    token_type: tokens.token_type,
    expiry_date: tokens.expiry_date ? Number(tokens.expiry_date) : undefined,
    // id_token is usually not needed for client credentials but include if present
    id_token: tokens.id_token,
  });
  console.log(
    "[Auth Middleware - createOAuth2Client] Credentials set on client:",
    client.credentials
  );

  return client;
}

export const authenticateToken: RequestHandler = async (req, res, next) => {
  console.log("[Auth Middleware] Incoming cookies:", req.cookies);
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
  console.log("[Auth Middleware] Starting WLM JWT check:", {
    tokenSource: token ? tokenSource : "none",
    hasToken: !!token,
  });
  if (!token) {
    console.error("[Auth Middleware] No WLM token found.");
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
      accessToken: null, // Default to null
      oauth2Client: null, // Default to null
    };

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

        console.log(
          "[Auth Middleware] Parsed googleTokens from cookie:",
          googleTokens
        );

        if (googleTokens.access_token || googleTokens.refresh_token) {
          // Check for either token
          console.log(
            "[Auth Middleware] Found access_token or refresh_token in parsed tokens."
          );
          const oauth2Client = createOAuth2Client(googleTokens); // Pass the full object
          // Enhance authInfo
          authInfo.accessToken = googleTokens.access_token || null; // Store access token if present
          authInfo.oauth2Client = oauth2Client;
        } else {
          console.warn(
            "[Auth Middleware] google_tokens cookie present but missing access_token or refresh_token."
          );
        }
      } catch (e) {
        console.error(
          "[Auth Middleware] Error parsing google_tokens cookie:",
          e
        );
        // Don't fail the request here, just proceed without Google auth info
      }
    }

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
