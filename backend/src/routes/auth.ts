import express from "express";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { getGoogleTokensForUser } from "../lib/google";

const prisma = new PrismaClient();
const router = express.Router();

export const verifyToken: express.RequestHandler = (req, res, next) => {
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

    // Assign the specific type
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

router.get("/google", (req, res) => {
  res.json({ message: "Google auth endpoint" });
});

router.get("/google/callback", (req, res) => {
  res.json({ message: "Google auth callback endpoint" });
});

router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res
        .status(400)
        .json({ message: "Email and password are required" });
    }

    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    if (user.googleId && !user.password) {
      return res.status(401).json({
        message:
          "This account uses Google authentication. Please sign in with Google.",
        authMethod: "google",
      });
    }

    if (!user.password) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const token = jwt.sign(
      { sub: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET!,
      { expiresIn: "7d" }
    );

    // Set the token cookie
    res.cookie("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    // Check if user has Google tokens and set google_tokens cookie
    try {
      console.log(
        `[Login Route] Checking for Google tokens for user: ${user.id}`
      );
      const googleTokens = await getGoogleTokensForUser(user.id);
      console.log(
        `[Login Route] Result from getGoogleTokensForUser:`,
        googleTokens
      );
      if (googleTokens) {
        console.log(
          `[Login Route] Found Google tokens. Setting google_tokens cookie for user ${user.id}`
        );
        res.cookie("google_tokens", JSON.stringify(googleTokens), {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: "lax",
          path: "/",
          maxAge: 7 * 24 * 60 * 60 * 1000,
        });
      } else {
        console.log(
          `[Login Route] No Google tokens found in DB for user ${user.id}.`
        );
      }
    } catch (error) {
      console.error(
        `[Login Route] Error checking/setting google_tokens cookie for user ${user.id}:`,
        error
      );
    }

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

router.post("/google-login", async (req, res) => {
  try {
    const { googleId } = req.body;

    if (!googleId) {
      return res.status(400).json({ message: "Google ID is required" });
    }

    const user = await prisma.user.findUnique({
      where: { googleId },
    });

    if (!user) {
      return res.status(401).json({ message: "User not found" });
    }

    const token = jwt.sign(
      { sub: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET!,
      { expiresIn: "7d" }
    );

    // Set the token cookie
    res.cookie("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    // Check if user has Google tokens and set google_tokens cookie
    try {
      const googleTokens = await getGoogleTokensForUser(user.id);
      if (googleTokens) {
        console.log(`Setting google_tokens cookie for user ${user.id}`);
        res.cookie("google_tokens", JSON.stringify(googleTokens), {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: "lax",
          path: "/",
          maxAge: 7 * 24 * 60 * 60 * 1000,
        });
      }
    } catch (error) {
      console.error("Error setting google_tokens cookie:", error);
    }

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

router.post("/link-google", verifyToken, async (req, res) => {
  try {
    const { googleId, googleEmail, googleTokens } = req.body;
    // Add check for req.user
    if (!req.user) {
      return res.status(401).json({ message: "Authentication required" });
    }
    // Use type assertion to access id
    const userId = (req.user as { id: string }).id;

    if (!googleId) {
      return res.status(400).json({ message: "Google ID is required" });
    }

    const existingGoogle = await prisma.user.findUnique({
      where: { googleId },
      select: { id: true, email: true },
    });

    if (existingGoogle && existingGoogle.id !== userId) {
      return res.status(409).json({
        message: "This Google account is already linked to another user",
      });
    }

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

    if (googleTokens) {
      try {
        const parsedTokens =
          typeof googleTokens === "string"
            ? JSON.parse(googleTokens)
            : googleTokens;
        const { access_token, refresh_token, expiry_date, scope, token_type } =
          parsedTokens;

        await prisma.googleToken.upsert({
          where: { userId },
          update: {
            accessToken: access_token!,
            refreshToken: refresh_token!,
            expiryDate: new Date(expiry_date!),
            scope: scope,
            tokenType: token_type,
          },
          create: {
            userId,
            accessToken: access_token!,
            refreshToken: refresh_token!,
            expiryDate: new Date(expiry_date!),
            scope: scope,
            tokenType: token_type,
          },
        });

        console.log(`Google tokens saved for user ${userId}`);
      } catch (tokenError) {
        console.error("Error saving Google tokens:", tokenError);
      }
    }

    return res.json({
      message: "Google account linked successfully",
      user: updatedUser,
    });
  } catch (error) {
    console.error("Error linking Google account:", error);
    return res.status(500).json({ message: "Server error" });
  }
});

router.post("/logout", (req, res) => {
  res.json({ message: "Logout successful" });
});

export default router;
