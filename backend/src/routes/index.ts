import { Router } from "express";
import authRoutes from "./auth";
// Remove the default import for users, as it's handled in index.ts now
// import userRoutes from "./users";
import channelRoutes from "./channels";
import collectionsRouter from "./collections";
import healthRouter from "./health";

const router = Router();

// Mount routes
router.use("/auth", authRoutes);
// Remove this line - user routes mounted directly in ../index.ts
// router.use("/users", userRoutes);
router.use("/channels", channelRoutes);
router.use("/collections", collectionsRouter);
router.use("/health", healthRouter);

export default router;
