import { Request, Response, NextFunction, RequestHandler } from "express";
import jwt from "jsonwebtoken";
import { env } from "../env";

// Export the interface so it can be imported elsewhere
export interface AuthenticatedUserInfo {
  id: string;
  email: string;
  accessToken: string;
}

declare module "express" {
  interface Request {
    user?: AuthenticatedUserInfo;
  }
}

export const authenticateToken: RequestHandler<
  {},
  any,
  {},
  { user?: AuthenticatedUserInfo }
> = async (req, res, next) => {
  // 1. Try getting token from HttpOnly cookie first
  let token = req.cookies?.token;
  let tokenSource = "cookie";

  // 2. If not in cookie, try Authorization header
  if (!token) {
    const authHeader = req.headers["authorization"];
    const headerToken =
      authHeader && authHeader.startsWith("Bearer ")
        ? authHeader.split(" ")[1]
        : null;
    if (headerToken) {
      token = headerToken;
      tokenSource = "header";
    }
  }

  console.log("[Auth Middleware] Starting authentication check:", {
    tokenSource: token ? tokenSource : "none",
    hasToken: !!token,
  });

  if (!token) {
    console.error(
      "[Auth Middleware] No token found in cookies or Authorization header"
    );
    return res.status(401).json({ error: "No token provided" });
  }

  try {
    // Proceed with JWT verification using the found token
    const decoded = jwt.verify(token, env.JWT_SECRET!) as {
      sub: string;
      email: string;
    };

    console.log("[Auth Middleware] JWT verified successfully:", {
      userId: decoded.sub,
      email: decoded.email,
      tokenSource,
    });

    // Parse Google tokens from cookies
    const googleTokensCookie = req.cookies?.google_tokens;
    console.log("[Auth Middleware] Google tokens cookie:", {
      exists: !!googleTokensCookie,
      type: typeof googleTokensCookie,
    });

    if (!googleTokensCookie) {
      console.error("[Auth Middleware] No Google tokens found in cookies");
      return res
        .status(401)
        .json({ error: "No Google tokens found in cookies" });
    }

    let googleTokens;
    try {
      googleTokens =
        typeof googleTokensCookie === "string"
          ? JSON.parse(googleTokensCookie)
          : googleTokensCookie;

      console.log("[Auth Middleware] Parsed Google tokens:", {
        hasAccessToken: !!googleTokens.access_token,
        accessTokenLength: googleTokens.access_token?.length,
      });
    } catch (e) {
      console.error("[Auth Middleware] Error parsing Google tokens:", e);
      return res.status(401).json({ error: "Invalid Google tokens format" });
    }

    if (!googleTokens.access_token) {
      console.error("[Auth Middleware] No Google access token found");
      return res.status(401).json({ error: "No Google access token found" });
    }

    req.user = {
      id: decoded.sub,
      email: decoded.email,
      accessToken: googleTokens.access_token,
    };

    console.log("[Auth Middleware] User object set successfully");
    next();
  } catch (error) {
    console.error("[Auth Middleware] Auth error:", error);
    // Differentiate between bad token and other errors if needed
    if (error instanceof jwt.JsonWebTokenError) {
      return res.status(403).json({ error: "Invalid token" });
    }
    return res.status(500).json({ error: "Authentication error" });
  }
};
