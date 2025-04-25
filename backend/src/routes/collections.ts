import express from "express";
import { authenticateToken } from "../middleware/auth";
import { prisma } from "../lib/prisma";
import { AuthenticatedUserInfo } from "../middleware/auth";

const router = express.Router();

// Get the authenticated user's collections
router.get("/", authenticateToken, async (req, res) => {
  const user = req.user as AuthenticatedUserInfo | undefined;

  if (!user) {
    return res.status(401).json({ error: "User not authenticated" });
  }

  try {
    const collections = await prisma.collection.findMany({
      where: {
        userId: user.id,
      },
      include: {
        user: {
          select: {
            username: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    // Transform the response to include userSlug
    const transformedCollections = collections.map((collection) => ({
      ...collection,
      userSlug: collection.user.username,
    }));

    res.json(transformedCollections);
  } catch (error) {
    console.error("Error fetching collections:", error);
    res.status(500).json({ error: "Failed to fetch collections" });
  }
});

// Collection CRUD operations
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

// Public collection routes
router.get("/:userSlug/:collectionSlug", (req, res) => {
  res.json({ message: "Public collection endpoint" });
});

// Collection items operations
router.get("/:collectionId/items", (req, res) => {
  res.json({ message: "Collection items list endpoint" });
});

router.post("/:collectionId/items", (req, res) => {
  res.json({ message: "Collection item creation endpoint" });
});

router.delete("/:collectionId/items/:itemId", (req, res) => {
  res.json({ message: "Collection item deletion endpoint" });
});

export default router;
