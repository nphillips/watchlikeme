import express from "express";
import { Handler, HandlerEvent, HandlerContext } from "@netlify/functions";

const router = express.Router();

router.get("/google", (req, res) => {
  res.json({ message: "Google auth endpoint" });
});

const handler: Handler = async (
  event: HandlerEvent,
  context: HandlerContext
) => {
  return {
    statusCode: 200,
    body: JSON.stringify({ message: "Auth endpoint" }),
  };
};

export default router;
export { handler };
