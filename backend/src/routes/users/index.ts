import express from "express";
import { Handler, HandlerEvent, HandlerContext } from "@netlify/functions";
import jwt from "jsonwebtoken";
import { env } from "../../env";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const router = express.Router();

// POST /api/users - Create or update user and return JWT
router.post("/", async (req, res) => {
  try {
    const { email, name, googleId } = req.body;

    if (!email) {
      return res.status(400).json({ error: "Email is required" });
    }

    // Generate a username from email if not provided
    const username = email.split("@")[0];

    // Upsert user in database
    const user = await prisma.user.upsert({
      where: { email },
      update: {
        name: name || undefined,
        googleId: googleId || undefined,
      },
      create: {
        email,
        name: name || undefined,
        username,
        googleId: googleId || undefined,
      },
    });

    // Create JWT token
    const token = jwt.sign(
      {
        userId: user.id,
        email: user.email,
        role: user.role,
        name: user.name,
      },
      env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        username: user.username,
        role: user.role,
      },
      token,
    });
  } catch (error) {
    console.error("Error in user creation:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/", (req, res) => {
  res.json({ message: "Admin users list endpoint" });
});

const handler: Handler = async (
  event: HandlerEvent,
  context: HandlerContext
) => {
  return {
    statusCode: 200,
    body: JSON.stringify({ message: "Admin users list endpoint" }),
  };
};

export default router;
export { handler };
