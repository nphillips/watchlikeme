import express from "express";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

const prisma = new PrismaClient();
const router = express.Router();

// Middleware to verify JWT token
const verifyToken = (
  req: express.Request,
  res: express.Response,
  next: express.NextFunction
) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ message: "No token provided" });
  }

  const token = authHeader.split(" ")[1];

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET!) as {
      sub: string;
      email: string;
      role: string;
    };

    req.user = {
      id: payload.sub,
      email: payload.email,
      role: payload.role,
    };

    next();
  } catch (error) {
    return res.status(401).json({ message: "Invalid token" });
  }
};

// Link Google account to existing user
router.post("/link-google", verifyToken, async (req, res) => {
  try {
    const { googleId, googleEmail } = req.body;
    const userId = req.user.id;

    if (!googleId) {
      return res.status(400).json({ message: "Google ID is required" });
    }

    // Check if this Google ID is already linked to another account
    const existingGoogle = await prisma.user.findUnique({
      where: { googleId },
      select: { id: true, email: true },
    });

    if (existingGoogle && existingGoogle.id !== userId) {
      return res.status(409).json({
        message: "This Google account is already linked to another user",
      });
    }

    // Update the user with the Google ID
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { googleId },
      select: {
        id: true,
        email: true,
        username: true,
        googleId: true,
        name: true,
        role: true,
      },
    });

    return res.json({
      message: "Google account linked successfully",
      user: updatedUser,
    });
  } catch (error) {
    console.error("Error linking Google account:", error);
    return res.status(500).json({ message: "Server error" });
  }
});

// Login with email/password
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res
        .status(400)
        .json({ message: "Email and password are required" });
    }

    // Find the user by email
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    // If the user has a Google account but no password
    if (user.googleId && !user.password) {
      return res.status(401).json({
        message:
          "This account uses Google authentication. Please sign in with Google.",
        authMethod: "google",
      });
    }

    // If the user has a password, verify it
    if (!user.password) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    // Compare passwords
    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    // Generate JWT token
    const token = jwt.sign(
      { sub: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET!,
      { expiresIn: "7d" }
    );

    return res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        name: user.name,
        hasGoogleAuth: !!user.googleId,
      },
    });
  } catch (error) {
    console.error("Login error:", error);
    return res.status(500).json({ message: "Server error" });
  }
});

// Login with Google ID
router.post("/google-login", async (req, res) => {
  try {
    const { googleId } = req.body;

    if (!googleId) {
      return res.status(400).json({ message: "Google ID is required" });
    }

    // Find the user by Google ID
    const user = await prisma.user.findUnique({
      where: { googleId },
    });

    if (!user) {
      return res.status(401).json({ message: "User not found" });
    }

    // Generate JWT token
    const token = jwt.sign(
      { sub: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET!,
      { expiresIn: "7d" }
    );

    return res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        name: user.name,
        hasPasswordAuth: !!user.password,
      },
    });
  } catch (error) {
    console.error("Google login error:", error);
    return res.status(500).json({ message: "Server error" });
  }
});

export default router;
