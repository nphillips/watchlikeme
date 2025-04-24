// src/types/express/index.d.ts
import "express";

import type { AuthUser } from "../auth";
import type { User as PrismaUser } from "@prisma/client";

declare module "express-serve-static-core" {
  interface Request {
    /** Populated by authenticateToken */
    user?: AuthUser;
    /** Populated by loadFullUser */
    fullUser?: PrismaUser;
  }
}
