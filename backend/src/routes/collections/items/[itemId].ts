import express from "express";
import { Handler, HandlerEvent, HandlerContext } from "@netlify/functions";

const router = express.Router();

router.delete("/:itemId", (req, res) => {
  res.json({ message: "Collection item deletion endpoint" });
});

const handler: Handler = async (
  event: HandlerEvent,
  context: HandlerContext
) => {
  return {
    statusCode: 200,
    body: JSON.stringify({ message: "Collection item deletion endpoint" }),
  };
};

export default router;
export { handler };
