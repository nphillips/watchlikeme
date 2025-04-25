import express, { Request, Response } from "express";
import { authenticateToken, AuthenticatedUserInfo } from "../middleware/auth";
import { prisma } from "../lib/prisma";
import { youtube } from "../lib/youtube"; // Import youtube client
import { google } from "googleapis"; // Import googleapis for types
import { ParamsDictionary } from "express-serve-static-core"; // Import ParamsDictionary

const router = express.Router();

// Define the expected request body structure
interface AddItemRequestBody {
  itemType: "channel" | "video";
  youtubeId: string;
  title: string;
  thumbnail?: string;
}

// No custom AuthenticatedRequest needed, rely on module augmentation

// Get the authenticated user's collections
router.get("/", authenticateToken, async (req, res) => {
  const authInfo = req.watchLikeMeAuthInfo; // Use the specific property

  if (!authInfo) {
    return res.status(401).json({ error: "User not authenticated" });
  }
  // No casting needed now

  try {
    const collections = await prisma.collection.findMany({
      where: {
        userId: authInfo.id, // Use authInfo
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
      userSlug: collection.user.username, // Assuming user.username is the slug
    }));

    res.json(transformedCollections);
  } catch (error) {
    console.error("Error fetching collections:", error);
    res.status(500).json({ error: "Failed to fetch collections" });
  }
});

// --- Add Item to Collection ---
router.post(
  "/:collectionSlug/items",
  authenticateToken,
  // Define Params and ReqBody types directly for Request
  async (
    req: Request<{ collectionSlug: string }, any, AddItemRequestBody>,
    res: Response
  ) => {
    const authInfo = req.watchLikeMeAuthInfo; // Use the specific property
    const { collectionSlug } = req.params;
    // Cast body type
    const { itemType, youtubeId, title, thumbnail } =
      req.body as AddItemRequestBody;

    if (!authInfo) {
      return res.status(401).json({ error: "User not authenticated" });
    }

    if (!itemType || !youtubeId || !title) {
      return res.status(400).json({ error: "Missing required item fields" });
    }

    try {
      // 1. Find the collection by slug and user ID
      const collection = await prisma.collection.findUnique({
        where: {
          userId_slug: {
            userId: authInfo.id, // Use authInfo
            slug: collectionSlug,
          },
        },
      });

      if (!collection) {
        return res
          .status(404)
          .json({ error: "Collection not found or not owned by user" });
      }

      // 2. Perform database operations within a transaction
      const newItem = await prisma.$transaction(async (tx) => {
        let channelIdToAdd: string | null = null;
        let videoIdToAdd: string | null = null;

        if (itemType === "channel") {
          // Upsert channel
          const channel = await tx.channel.upsert({
            where: { youtubeId: youtubeId },
            update: {
              title: title,
              thumbnail: thumbnail || null,
            },
            create: {
              youtubeId: youtubeId,
              title: title,
              thumbnail: thumbnail || null,
            },
          });
          channelIdToAdd = channel.id;
        } else if (itemType === "video") {
          // Check if video already exists
          let video = await tx.video.findUnique({
            where: { youtubeId: youtubeId },
          });

          if (!video) {
            // Video doesn't exist, need to find its channel and create both
            console.log(
              `[Add Item] Video ${youtubeId} not found locally. Fetching from YouTube API...`
            );

            let videoChannelIdFromApi: string | null = null;
            let videoPublishedAt: Date | null = null;
            try {
              const videoResponse = await youtube.videos.list({
                part: ["snippet"],
                id: [youtubeId],
                // Use non-null assertion after guard clause
                auth: authInfo.oauth2Client,
              });

              if (
                videoResponse.data.items &&
                videoResponse.data.items.length > 0
              ) {
                const videoSnippet = videoResponse.data.items[0].snippet;
                videoChannelIdFromApi = videoSnippet?.channelId ?? null;
                videoPublishedAt = videoSnippet?.publishedAt
                  ? new Date(videoSnippet.publishedAt)
                  : null;
                console.log(
                  `[Add Item] YouTube API found channelId: ${videoChannelIdFromApi} for video ${youtubeId}`
                );
              } else {
                console.error(
                  `[Add Item] YouTube API did not find video ${youtubeId}`
                );
                throw new Error(
                  `Video with YouTube ID ${youtubeId} not found on YouTube.`
                );
              }
            } catch (apiError) {
              console.error(
                `[Add Item] YouTube API error fetching video ${youtubeId}:`,
                apiError
              );
              throw new Error(
                `Failed to fetch video details from YouTube API: ${
                  apiError instanceof Error ? apiError.message : apiError
                }`
              );
            }

            if (!videoChannelIdFromApi) {
              throw new Error(
                `Could not determine channel for YouTube video ${youtubeId}`
              );
            }

            // Now find or create the parent channel
            const parentChannel = await tx.channel.upsert({
              where: { youtubeId: videoChannelIdFromApi },
              update: {},
              create: {
                youtubeId: videoChannelIdFromApi,
                title: "Fetching...",
                thumbnail: null,
              },
            });

            if (parentChannel.title === "Fetching...") {
              console.log(
                `[Add Item] Fetching details for newly referenced channel ${videoChannelIdFromApi}`
              );
              try {
                const channelResponse = await youtube.channels.list({
                  part: ["snippet"],
                  id: [videoChannelIdFromApi],
                  // Use non-null assertion after guard clause
                  auth: authInfo.oauth2Client,
                });
                if (
                  channelResponse.data.items &&
                  channelResponse.data.items.length > 0
                ) {
                  const channelSnippet = channelResponse.data.items[0].snippet;
                  await tx.channel.update({
                    where: { id: parentChannel.id },
                    data: {
                      title: channelSnippet?.title ?? "Unknown Channel",
                      thumbnail:
                        channelSnippet?.thumbnails?.default?.url ?? null,
                      thumbnailUpdatedAt: new Date(),
                    },
                  });
                  console.log(
                    `[Add Item] Updated details for channel ${videoChannelIdFromApi}`
                  );
                } else {
                  // Handle case where channel details couldn't be fetched
                  await tx.channel.update({
                    where: { id: parentChannel.id },
                    data: { title: "Unknown Channel" },
                  });
                }
              } catch (channelApiError) {
                console.error(
                  `[Add Item] YouTube API error fetching channel ${videoChannelIdFromApi}:`,
                  channelApiError
                );
                await tx.channel.update({
                  where: { id: parentChannel.id },
                  data: { title: "Unknown Channel" },
                });
              }
            }

            video = await tx.video.create({
              data: {
                youtubeId: youtubeId,
                title: title,
                thumbnail: thumbnail || null,
                publishedAt: videoPublishedAt,
                channelId: parentChannel.id,
              },
            });
            console.log(
              `[Add Item] Created video record ${video.id} for YT ID ${youtubeId}`
            );
          }

          videoIdToAdd = video.id;
        } else {
          throw new Error(`Invalid itemType: ${itemType}`);
        }

        // 3. Check if item already exists in the collection to prevent duplicates
        const existingItem = await tx.collectionItem.findFirst({
          where: {
            collectionId: collection.id,
            OR: [{ channelId: channelIdToAdd }, { videoId: videoIdToAdd }],
          },
        });

        if (existingItem) {
          console.log(
            `[Add Item] Item (Channel: ${channelIdToAdd}, Video: ${videoIdToAdd}) already exists in collection ${collection.id}.`
          );
          return tx.collectionItem.findUnique({
            where: { id: existingItem.id },
            include: { channel: true, video: true },
          });
        }

        // 4. Create the CollectionItem to link the channel/video to the collection
        const createdItem = await tx.collectionItem.create({
          data: {
            collectionId: collection.id,
            channelId: channelIdToAdd,
            videoId: videoIdToAdd,
          },
          include: { channel: true, video: true },
        });

        console.log(
          `[Add Item] Created collection item ${createdItem.id} linking to ${itemType} ${youtubeId} in collection ${collection.id}`
        );
        return createdItem;
      });

      // 5. Return the newly created (or existing) collection item
      res.status(201).json(newItem);
    } catch (error) {
      console.error(
        `[Add Item] Error adding item to collection ${collectionSlug}:`,
        error
      );
      if (error instanceof Error && error.message.includes("already exists")) {
        return res
          .status(409)
          .json({ error: "Item already exists in this collection." });
      }
      // Specific check for YouTube API errors potentially thrown
      if (
        error instanceof Error &&
        (error.message.includes("not found on YouTube") ||
          error.message.includes("Could not determine channel"))
      ) {
        return res.status(404).json({
          error: "YouTube resource not found or invalid.",
          details: error.message,
        });
      }
      if (
        error instanceof Error &&
        error.message.includes("Failed to fetch video details")
      ) {
        return res.status(502).json({
          error: "Failed communication with YouTube API.",
          details: error.message,
        });
      }
      res.status(500).json({
        error: `Failed to add item to collection`,
        details: error instanceof Error ? error.message : String(error),
      });
    }
  }
);

// --- Get Items for a Collection ---
router.get(
  "/:collectionSlug/items",
  authenticateToken,
  // Define Params type directly for Request
  async (req: Request<{ collectionSlug: string }>, res: Response) => {
    const authInfo = req.watchLikeMeAuthInfo; // Use the specific property
    const { collectionSlug } = req.params;

    if (!authInfo) {
      return res.status(401).json({ error: "User not authenticated" });
    }

    try {
      // 1. Find the collection by slug and user ID
      const collection = await prisma.collection.findUnique({
        where: {
          userId_slug: {
            userId: authInfo.id, // Use authInfo
            slug: collectionSlug,
          },
        },
      });

      if (!collection) {
        return res
          .status(404)
          .json({ error: "Collection not found or not owned by user" });
      }

      // 2. Fetch collection items, including related channel and video data
      const items = await prisma.collectionItem.findMany({
        where: {
          collectionId: collection.id,
        },
        include: {
          channel: true,
          video: {
            include: {
              channel: true,
            },
          },
        },
        orderBy: {
          createdAt: "asc",
        },
      });

      // 3. Return the items
      res.json(items);
    } catch (error) {
      console.error(
        `Error fetching items for collection ${collectionSlug}:`,
        error
      );
      res.status(500).json({ error: "Failed to fetch collection items" });
    }
  }
);

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

// DELETE route placeholder
router.delete(
  "/:collectionSlug/items/:itemId",
  authenticateToken,
  async (
    req: Request<{ collectionSlug: string; itemId: string }>,
    res: Response
  ) => {
    // TODO: Implement deletion logic - ensure item belongs to collection owned by user
    const authInfo = req.watchLikeMeAuthInfo; // Use the specific property
    if (!authInfo) {
      return res.status(401).json({ error: "User not authenticated" });
    }
    console.log(
      `User ${authInfo.id} attempting to delete item ${req.params.itemId} from ${req.params.collectionSlug}`
    );
    res
      .status(501)
      .json({ message: "Not Implemented: Collection item deletion" });
  }
);

export default router;
