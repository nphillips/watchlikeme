import express from "express";
import { Handler, HandlerEvent, HandlerContext } from "@netlify/functions";

const router = express.Router();

router.get("/google/callback", (req, res) => {
  res.json({ message: "Google auth callback endpoint" });
});

const handler: Handler = async (
  event: HandlerEvent,
  context: HandlerContext
) => {
  return {
    statusCode: 200,
    body: JSON.stringify({ message: "Auth callback endpoint" }),
  };
};

export default router;
export { handler };
