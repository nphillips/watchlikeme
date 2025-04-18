import express from "express";
import authRouter from "./auth/index";
import usersRouter from "./users/index";
import channelsRouter from "./channels/index";
import collectionsRouter from "./collections/index";
import healthRouter from "./health";

const router = express.Router();

router.use("/auth", authRouter);
router.use("/users", usersRouter);
router.use("/channels", channelsRouter);
router.use("/collections", collectionsRouter);
router.use("/public", collectionsRouter.public); // or import a publicCollectionsRouter
router.use("/health", healthRouter);

export default router;
