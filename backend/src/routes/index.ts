import { Router } from "express";
import authRoutes from "./auth";
import userRoutes from "./users";
import channelRoutes from "./channels";
import collectionsRouter from "./collections";
import healthRouter from "./health";

const router = Router();

// Mount routes
router.use("/auth", authRoutes);
router.use("/users", userRoutes);
router.use("/channels", channelRoutes);
router.use("/collections", collectionsRouter);
router.use("/health", healthRouter);

export default router;
