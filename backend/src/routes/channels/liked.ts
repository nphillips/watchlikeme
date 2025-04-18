import express from "express";
import { Handler, HandlerEvent, HandlerContext } from "@netlify/functions";

const router = express.Router();

router.get("/liked", (req, res) => {
  res.json({ message: "Liked videos endpoint" });
});

const handler: Handler = async (
  event: HandlerEvent,
  context: HandlerContext
) => {
  return {
    statusCode: 200,
    body: JSON.stringify({ message: "Liked videos endpoint" }),
  };
};

export default router;
export { handler };
