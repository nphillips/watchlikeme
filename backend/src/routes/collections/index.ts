import express from "express";
import { Handler, HandlerEvent, HandlerContext } from "@netlify/functions";

const router = express.Router();

router.get("/", (req, res) => {
  res.json({ message: "Collections list endpoint" });
});

router.post("/", (req, res) => {
  res.json({ message: "Collection creation endpoint" });
});

router.get("/:id", (req, res) => {
  res.json({ message: "Collection retrieval endpoint" });
});

router.patch("/:id", (req, res) => {
  res.json({ message: "Collection update endpoint" });
});

router.delete("/:id", (req, res) => {
  res.json({ message: "Collection deletion endpoint" });
});

const handler: Handler = async (
  event: HandlerEvent,
  context: HandlerContext
) => {
  return {
    statusCode: 200,
    body: JSON.stringify({ message: "Collections endpoint" }),
  };
};

export default router;
export { handler };
