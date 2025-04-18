import express from "express";
import { Handler, HandlerEvent, HandlerContext } from "@netlify/functions";

const router = express.Router();

router.get("/me", (req, res) => {
  res.json({ message: "Current user info endpoint" });
});

const handler: Handler = async (
  event: HandlerEvent,
  context: HandlerContext
) => {
  return {
    statusCode: 200,
    body: JSON.stringify({ message: "Current user info endpoint" }),
  };
};

export default router;
export { handler };
