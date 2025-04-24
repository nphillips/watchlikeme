// src/middleware/auth.ts

import { Request, Response, NextFunction, RequestHandler } from "express";
import jwt from "jsonwebtoken";
import { env } from "../env";

/** Only the JWT + cookie data we care about */
export interface AuthUser {
  id: string;
  email: string;
  accessToken: string;
}

declare module "express-serve-static-core" {
  interface Request {
    /** Populated by authenticateToken */
    user?: AuthUser;
  }
}

/**
 * Verifies the Bearer JWT, parses Google tokens from a cookie,
 * and attaches { id, email, accessToken } to req.user.
 */
export const authenticateToken: RequestHandler = async (req, res, next) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader?.startsWith("Bearer ")
    ? authHeader.slice(7)
    : undefined;

  console.log("[Auth Middleware] hasHeader:", !!authHeader, "token:", !!token);
  if (!token) {
    return res.status(401).json({ error: "No token provided" });
  }

  try {
    const decoded = jwt.verify(token, env.JWT_SECRET!) as {
      sub: string;
      email: string;
    };
    console.log("[Auth Middleware] JWT OK:", decoded.sub, decoded.email);

    const cookie = req.cookies?.google_tokens;
    if (!cookie) {
      return res.status(401).json({ error: "Missing Google tokens cookie" });
    }

    let googleTokens: any;
    try {
      googleTokens = typeof cookie === "string" ? JSON.parse(cookie) : cookie;
    } catch {
      return res.status(401).json({ error: "Bad Google tokens format" });
    }

    if (!googleTokens.access_token) {
      return res
        .status(401)
        .json({ error: "Google access token not found in cookie" });
    }

    // Attach our minimal AuthUser
    req.user = {
      id: decoded.sub,
      email: decoded.email,
      accessToken: googleTokens.access_token,
    };

    next();
  } catch (err) {
    console.error("[Auth Middleware] verify error:", err);
    return res.status(403).json({ error: "Invalid token" });
  }
};
