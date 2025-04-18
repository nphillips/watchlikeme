import express from "express";
import { Handler, HandlerEvent, HandlerContext } from "@netlify/functions";

const router = express.Router();

router.get("/", (req, res) => {
  res.json({ message: "Collection items list endpoint" });
});

const handler: Handler = async (
  event: HandlerEvent,
  context: HandlerContext
) => {
  return {
    statusCode: 200,
    body: JSON.stringify({ message: "Collection items endpoint" }),
  };
};

export default router;
export { handler };
