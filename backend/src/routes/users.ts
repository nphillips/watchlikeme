import express from "express";
import { PrismaClient, Prisma } from "@prisma/client";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { env } from "../env";
import { authenticateToken } from "../middleware/auth";
import { getGoogleTokensForUser } from "../lib/google";

const prisma = new PrismaClient();
const router = express.Router();

// User profile and token management
router.get("/me", authenticateToken, async (req, res) => {
  const authInfo = req.watchLikeMeAuthInfo;
  if (!authInfo) {
    return res.status(401).json({ error: "Not authenticated" });
  }
  // Fetch full user details if needed, or return basic info from authInfo
  // Let's fetch full details for now, as the frontend might expect it
  try {
    const user = await prisma.user.findUnique({
      where: { id: authInfo.id },
      select: {
        id: true,
        email: true,
        username: true,
        googleId: true, // Needed to determine link status
        name: true,
        image: true,
        role: true,
        // googleToken: false // Don't return tokens
      },
    });
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }
    // Determine hasGoogleAuth based on googleId presence
    const userResponse = {
      ...user,
      hasGoogleAuth: !!user.googleId,
    };
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

// Google OAuth user management
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

// Check if a user exists by email
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

// Get a user by email
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

// Check if a user exists by Google ID
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

// Update a user
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

// Create a new user
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

// Get a user by ID
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

// Delete Google Tokens
router.delete("/me/google-tokens", authenticateToken, async (req, res) => {
  const authInfo = req.watchLikeMeAuthInfo;
  if (!authInfo) {
    return res.status(401).json({ error: "Not authenticated" });
  }

  try {
    console.log(`[Delete Tokens] Attempting delete for user: ${authInfo.id}`);

    // Use a transaction to delete token and nullify googleId on User
    await prisma.$transaction(async (tx) => {
      // Delete the token record
      // Use deleteMany as the relation is 1-to-1 based on unique userId
      const deleteResult = await tx.googleToken.deleteMany({
        where: { userId: authInfo.id },
      });
      console.log(
        `[Delete Tokens] GoogleToken delete result count: ${deleteResult.count}`
      );

      // Set User.googleId to null
      await tx.user.update({
        where: { id: authInfo.id },
        data: { googleId: null },
      });
      console.log(
        `[Delete Tokens] Set User.googleId to null for user: ${authInfo.id}`
      );
    });

    // Return success (204 No Content)
    res.status(204).send();
  } catch (error) {
    console.error(
      `[Delete Tokens] Error unlinking Google account for user ${authInfo.id}:`,
      error
    );
    res.status(500).json({ error: "Failed to unlink Google account" });
  }
});

// === Public Profile Collection Endpoint ===
router.get(
  "/:userSlug/collections/:collectionSlug",
  // No authentication middleware needed for public view
  async (req, res) => {
    const { userSlug, collectionSlug } = req.params;

    console.log(
      `[Public Collection] Attempting fetch for User: ${userSlug}, Collection: ${collectionSlug}`
    );

    // Define includes needed for response
    const includeArgs = {
      _count: { select: { likes: true } },
      // No user-specific like check needed here
      items: {
        include: {
          channel: true,
          video: { include: { channel: true } },
        },
        orderBy: { createdAt: Prisma.SortOrder.asc },
      },
    };

    try {
      // 1. Find the user by username
      const user = await prisma.user.findUnique({
        where: { username: userSlug },
        select: { id: true }, // Only need ID
      });

      if (!user) {
        console.log(`[Public Collection] User not found: ${userSlug}`);
        return res.status(404).json({ error: "User not found" });
      }

      // 2. Find the specific collection for that user, ensuring it's public
      const collectionResult = await prisma.collection.findFirst({
        where: {
          userId: user.id,
          slug: collectionSlug,
          isPublic: true, // MUST be public for this endpoint
        },
        include: includeArgs,
      });

      // 3. Handle collection not found or not public
      if (!collectionResult) {
        console.log(
          `[Public Collection] Public collection '${collectionSlug}' not found for user ${userSlug}`
        );
        return res.status(404).json({ error: "Public collection not found" });
      }

      // 4. Process and return data
      console.log(
        `[Public Collection] Returning public collection ${collectionResult.id} (${collectionResult.name})`
      );

      const items = collectionResult.items ?? [];
      const likeCount = (collectionResult as any)._count?.likes ?? 0;
      // No currentUserHasLiked for public view
      const { items: _, _count: ___, ...collectionData } = collectionResult;

      return res.json({
        collection: {
          ...collectionData,
          likeCount,
          // currentUserHasLiked will be undefined here
        },
        items: items,
      });
    } catch (error) {
      console.error(
        `[Public Collection] Error fetching collection ${collectionSlug} for user ${userSlug}:`,
        error
      );
      res.status(500).json({ error: "Failed to fetch public collection data" });
    }
  }
);

export default router;
