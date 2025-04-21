import express from "express";
import { verifyToken } from "../auth";
import { getGoogleTokensForUser } from "../../db";

const router = express.Router();

router.get("/me", verifyToken, (req, res) => {
  res.json({ id: req.user.id });
});

// GET /api/users/me/google-tokens
router.get("/me/google-tokens", verifyToken, async (req, res, next) => {
  try {
    const tokens = await getGoogleTokensForUser(req.user.id);
    if (!tokens) {
      return res.status(404).json({ error: "No Google tokens found" });
    }
    res.json(tokens);
  } catch (err) {
    next(err);
  }
});

console.log("→ google‑tokens fetch status:", resp.status, await resp.text());

export default router;
