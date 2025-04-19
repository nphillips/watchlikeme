import express from "express";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();
const router = express.Router();

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
        password: true, // Just checking if it exists, not returning the value
        role: true,
      },
    });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Don't send the password hash to the client
    return res.json({
      ...user,
      password: user.password ? true : false, // Just indicate if password exists
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

    // Build update data
    const updateData: any = {};
    if (username) updateData.username = username;
    if (password) updateData.password = password;
    if (googleId) updateData.googleId = googleId;
    if (name) updateData.name = name;
    if (image) updateData.image = image;

    // Update the user
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

    // Check if email already exists
    const existingEmail = await prisma.user.findUnique({
      where: { email },
      select: { id: true },
    });

    if (existingEmail) {
      return res.status(409).json({ message: "Email already in use" });
    }

    // Check if username already exists
    const existingUsername = await prisma.user.findUnique({
      where: { username },
      select: { id: true },
    });

    if (existingUsername) {
      return res.status(409).json({ message: "Username already in use" });
    }

    // Create the user
    const newUser = await prisma.user.create({
      data: {
        email,
        username,
        password,
        googleId,
      },
    });

    // Return the user without sensitive information
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

export default router;
