import express, { Router } from "express";
import { PrismaClient, Prisma } from "@prisma/client";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { env } from "../env";
import { authenticateToken } from "../middleware/auth";
import { getGoogleTokensForUser } from "../lib/google";

const prisma = new PrismaClient();
const router = Router(); // Use single router

// === Authenticated /me Routes ===
router.get("/me", authenticateToken, async (req, res) => {
  const authInfo = req.watchLikeMeAuthInfo;
  if (!authInfo) {
    return res.status(401).json({ error: "Not authenticated" });
  }
  try {
    const user = await prisma.user.findUnique({
      where: { id: authInfo.id },
      select: {
        id: true,
        email: true,
        username: true,
        googleId: true,
        name: true,
        image: true,
        role: true,
      },
    });
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }
    const userResponse = { ...user, hasGoogleAuth: !!user.googleId };
    res.json(userResponse);
  } catch (error) {
    console.error("Error fetching user details for /me:", error);
    res.status(500).json({ error: "Failed to fetch user details" });
  }
});

router.get("/me/google-tokens", authenticateToken, async (req, res, next) => {
  const authInfo = req.watchLikeMeAuthInfo;
  if (!authInfo) {
    return res.status(401).json({ error: "Not authenticated" });
  }
  try {
    const tokens = await getGoogleTokensForUser(authInfo.id);
    if (!tokens) {
      return res.status(404).json({ error: "No Google tokens found" });
    }
    res.json(tokens);
  } catch (err) {
    next(err);
  }
});

router.delete("/me/google-tokens", authenticateToken, async (req, res) => {
  const authInfo = req.watchLikeMeAuthInfo;
  if (!authInfo) {
    return res.status(401).json({ error: "Not authenticated" });
  }
  try {
    console.log(`[Delete Tokens] Attempting delete for user: ${authInfo.id}`);
    await prisma.$transaction(async (tx) => {
      const deleteResult = await tx.googleToken.deleteMany({
        where: { userId: authInfo.id },
      });
      console.log(
        `[Delete Tokens] GoogleToken delete result count: ${deleteResult.count}`
      );
      await tx.user.update({
        where: { id: authInfo.id },
        data: { googleId: null },
      });
      console.log(
        `[Delete Tokens] Set User.googleId to null for user: ${authInfo.id}`
      );
    });
    res.status(204).send();
  } catch (error) {
    console.error(
      `[Delete Tokens] Error unlinking Google account for user ${authInfo.id}:`,
      error
    );
    res.status(500).json({ error: "Failed to unlink Google account" });
  }
});

// === Public Profile Collection Endpoint (Commented out - Known Routing Issue) ===
/*
router.get("/:userSlug/collections/:collectionSlug", async (req, res) => { 
    // ... implementation ...
});
*/

// === Other User Operations ===
router.post("/oauth", async (req, res) => {
  try {
    const { email, name, googleId, accessToken } = req.body;

    if (!email) {
      return res.status(400).json({ error: "Email is required" });
    }

    if (!accessToken) {
      return res.status(400).json({ error: "Access token is required" });
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
        accessToken,
      },
      env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    return res.json({ token, user });
  } catch (error) {
    console.error("Error in OAuth user management:", error);
    return res.status(500).json({ message: "Server error" });
  }
});

router.post("/check", async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ message: "Email is required" });
    }

    const user = await prisma.user.findUnique({
      where: { email },
      select: { id: true },
    });

    return res.json({ exists: !!user });
  } catch (error) {
    console.error("Error checking user:", error);
    return res.status(500).json({ message: "Server error" });
  }
});

router.post("/by-email", async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ message: "Email is required" });
    }

    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        username: true,
        googleId: true,
        password: true,
        role: true,
      },
    });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    return res.json({
      ...user,
      password: user.password ? true : false,
    });
  } catch (error) {
    console.error("Error fetching user by email:", error);
    return res.status(500).json({ message: "Server error" });
  }
});

router.post("/check-google", async (req, res) => {
  try {
    const { googleId } = req.body;

    if (!googleId) {
      return res.status(400).json({ message: "Google ID is required" });
    }

    const user = await prisma.user.findUnique({
      where: { googleId },
      select: { id: true },
    });

    return res.json({ exists: !!user });
  } catch (error) {
    console.error("Error checking user by Google ID:", error);
    return res.status(500).json({ message: "Server error" });
  }
});

router.patch("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { username, password, googleId, name, image } = req.body;

    const updateData: any = {};
    if (username) updateData.username = username;
    if (password) {
      // Hash new password if provided
      updateData.password = await bcrypt.hash(password, 10);
    }
    if (googleId) updateData.googleId = googleId;
    if (name) updateData.name = name;
    if (image) updateData.image = image;

    const updatedUser = await prisma.user.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        email: true,
        username: true,
        googleId: true,
        name: true,
        image: true,
        role: true,
      },
    });

    return res.json(updatedUser);
  } catch (error) {
    console.error("Error updating user:", error);
    if ((error as any).code === "P2025") {
      return res.status(404).json({ message: "User not found" });
    }
    return res.status(500).json({ message: "Server error" });
  }
});

router.post("/", async (req, res) => {
  try {
    const { username, email, password, googleId } = req.body;

    const existingEmail = await prisma.user.findUnique({
      where: { email },
      select: { id: true },
    });

    if (existingEmail) {
      return res.status(409).json({ message: "Email already in use" });
    }

    const existingUsername = await prisma.user.findUnique({
      where: { username },
      select: { id: true },
    });

    if (existingUsername) {
      return res.status(409).json({ message: "Username already in use" });
    }

    // Hash password if provided
    const hashedPassword = password ? await bcrypt.hash(password, 10) : null;

    const newUser = await prisma.user.create({
      data: {
        email,
        username,
        password: hashedPassword,
        googleId,
      },
    });

    return res.status(201).json({
      id: newUser.id,
      email: newUser.email,
      username: newUser.username,
      role: newUser.role,
    });
  } catch (error) {
    console.error("Error creating user:", error);
    return res.status(500).json({ message: "Server error" });
  }
});

router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        username: true,
        googleId: true,
        name: true,
        image: true,
        role: true,
      },
    });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    return res.json(user);
  } catch (error) {
    console.error("Error fetching user by ID:", error);
    return res.status(500).json({ message: "Server error" });
  }
});

// Export the single router as default
export default router;
