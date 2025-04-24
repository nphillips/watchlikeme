import { Request, Response, NextFunction, RequestHandler } from "express";
import jwt from "jsonwebtoken";
import { env } from "../env";
import { User } from "../types";

declare module "express" {
  interface Request {
    user?: User;
  }
}

export const authenticateToken: RequestHandler<
  {},
  any,
  {},
  { user?: User }
> = async (req, res, next) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  console.log("[Auth Middleware] Starting authentication check:", {
    hasAuthHeader: !!authHeader,
    hasToken: !!token,
  });

  if (!token) {
    console.error("[Auth Middleware] No token provided");
    return res.status(401).json({ error: "No token provided" });
  }

  try {
    const decoded = jwt.verify(token, env.JWT_SECRET!) as {
      sub: string;
      email: string;
    };

    console.log("[Auth Middleware] JWT verified successfully:", {
      userId: decoded.sub,
      email: decoded.email,
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
    return res.status(403).json({ error: "Invalid token" });
  }
};
