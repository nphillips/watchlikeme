import express from "express";
import {
  getCollections,
  getCollection,
  createCollection,
  updateCollection,
  deleteCollection,
  getPublicCollection,
  getCollectionItems,
  addCollectionItem,
  removeCollectionItem,
} from "../controllers/collections";
import { authenticateToken } from "../middleware/auth";

const router = express.Router();

// Collection CRUD operations
router.get("/", authenticateToken, getCollections);
router.post("/", authenticateToken, createCollection);
router.get("/:id", authenticateToken, getCollection);
router.patch("/:id", authenticateToken, updateCollection);
router.delete("/:id", authenticateToken, deleteCollection);

// Public collection routes
router.get("/:userSlug/:collectionSlug", getPublicCollection);

// Collection items operations
router.get("/:collectionId/items", authenticateToken, getCollectionItems);
router.post("/:collectionId/items", authenticateToken, addCollectionItem);
router.delete(
  "/:collectionId/items/:itemId",
  authenticateToken,
  removeCollectionItem
);

export default router;
