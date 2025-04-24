import { AuthRequest } from "../types";
import { Response } from "express";
import { prisma } from "../lib/prisma";

export const getCollections = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    const collections = await prisma.collection.findMany({
      where: { userId },
      include: { items: true },
    });

    res.json(collections);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch collections" });
  }
};

export const getCollection = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    const collection = await prisma.collection.findFirst({
      where: { id, userId },
      include: { items: true },
    });

    if (!collection)
      return res.status(404).json({ error: "Collection not found" });
    res.json(collection);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch collection" });
  }
};

export const createCollection = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    const collection = await prisma.collection.create({
      data: { ...req.body, userId },
    });

    res.status(201).json(collection);
  } catch (error) {
    res.status(500).json({ error: "Failed to create collection" });
  }
};

export const updateCollection = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    const collection = await prisma.collection.update({
      where: { id },
      data: req.body,
    });

    res.json(collection);
  } catch (error) {
    res.status(500).json({ error: "Failed to update collection" });
  }
};

export const deleteCollection = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    await prisma.collection.delete({ where: { id } });
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: "Failed to delete collection" });
  }
};

export const getCollectionItems = async (req: AuthRequest, res: Response) => {
  try {
    const { collectionId } = req.params;
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    const items = await prisma.collectionItem.findMany({
      where: { collectionId },
    });

    res.json(items);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch collection items" });
  }
};

export const addCollectionItem = async (req: AuthRequest, res: Response) => {
  try {
    const { collectionId } = req.params;
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    const item = await prisma.collectionItem.create({
      data: { ...req.body, collectionId },
    });

    res.status(201).json(item);
  } catch (error) {
    res.status(500).json({ error: "Failed to add collection item" });
  }
};

export const removeCollectionItem = async (req: AuthRequest, res: Response) => {
  try {
    const { collectionId, itemId } = req.params;
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    await prisma.collectionItem.delete({
      where: { id: itemId },
    });

    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: "Failed to remove collection item" });
  }
};

export const getPublicCollection = async (req: AuthRequest, res: Response) => {
  try {
    const { userSlug, collectionSlug } = req.params;

    const collection = await prisma.collection.findFirst({
      where: {
        slug: collectionSlug,
        isPublic: true,
        user: {
          username: userSlug,
        },
      },
      include: {
        items: true,
        user: {
          select: {
            username: true,
            name: true,
          },
        },
      },
    });

    if (!collection) {
      return res.status(404).json({ error: "Collection not found" });
    }

    res.json(collection);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch public collection" });
  }
};
