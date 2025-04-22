import { Request, Response, NextFunction, RequestHandler } from "express";
import jwt from "jsonwebtoken";
import { env } from "../env";

interface User {
  id: string;
  email: string;
  accessToken: string;
}

declare module "express" {
  interface Request {
    user?: User;
  }
}

export const authenticateToken: RequestHandler<{}, any, {}, { user?: User }> = (
  req,
  res,
  next
) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
    return res.status(401).json({ error: "No token provided" });
  }

  try {
    const decoded = jwt.verify(token, env.JWT_SECRET!) as User;
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(403).json({ error: "Invalid token" });
  }
};
