// src/middleware/loadFullUser.ts
import type { RequestHandler } from "express";
import { prisma } from "../lib/prisma";

/**
 * After authenticateToken has populated req.user (the AuthUser),
 * this middleware looks up the full Prisma User record and attaches it.
 */
export const loadFullUser: RequestHandler = async (req, res, next) => {
  try {
    const auth = req.user!; // AuthUser, with .id
    const fullUser = await prisma.user.findUniqueOrThrow({
      where: { id: auth.id },
    });
    // Attach for downstream handlers:
    (req as any).fullUser = fullUser;
    next();
  } catch (err) {
    return res.status(404).json({ error: "User not found" });
  }
};
