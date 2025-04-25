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

        // Check for duplicates more specifically
        const existingItem = await tx.collectionItem.findFirst({
          where: {
            collectionId: collection.id,
            // Only check channelId if adding a channel, only videoId if adding a video
            ...(itemType === "channel" &&
              channelIdToAdd && { channelId: channelIdToAdd }),
            ...(itemType === "video" &&
              videoIdToAdd && { videoId: videoIdToAdd }),
            // Ensure we don't match null IDs from the spread
            AND: [
              ...(itemType === "channel" ? [{ channelId: { not: null } }] : []),
              ...(itemType === "video" ? [{ videoId: { not: null } }] : []),
            ],
          },
        });

        if (existingItem) {
          console.log(
            `[Add Item] Duplicate detected: Item (Type: ${itemType}, ID: ${
              itemType === "channel" ? channelIdToAdd : videoIdToAdd
            }) already exists in collection ${collection.id}.`
          );
          throw new Error("DUPLICATE_ITEM");
        }

        // Create new item if not a duplicate
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

      // If transaction succeeded (no duplicate error thrown), return 201
      res.status(201).json(newItem);
    } catch (error) {
      console.error(
        `[Add Item] Error adding item to collection ${collectionSlug}:`,
        error
      );
      // Catch the specific duplicate error
      if (error instanceof Error && error.message === "DUPLICATE_ITEM") {
        return res
          .status(409)
          .json({ error: "Item already exists in this collection." });
      }
      // Keep other specific error handlers
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
      // General error handler
      res.status(500).json({
        error: `Failed to add item to collection`,
        details: error instanceof Error ? error.message : String(error),
      });
    }
  }
);

// --- Get Items and Details for a Collection ---
router.get(
  "/:collectionSlug/items", // Keep endpoint name for now, but it returns more
  authenticateToken,
  async (req, res) => {
    const authInfo = req.watchLikeMeAuthInfo;
    const { collectionSlug } = req.params;

    if (!authInfo) {
      return res.status(401).json({ error: "User not authenticated" });
    }

    try {
      // 1. Find the collection, ensuring ownership or public status
      const collection = await prisma.collection.findUnique({
        where: {
          userId_slug: {
            userId: authInfo.id, // Need user ID for potential ownership check
            slug: collectionSlug,
          },
        },
        // Include items directly in this query
        include: {
          items: {
            include: {
              channel: true,
              video: { include: { channel: true } },
            },
            orderBy: { createdAt: "asc" },
          },
        },
      });

      // Check if collection exists AND if user is authorized to view it
      if (!collection) {
        // Maybe it exists but is private and owned by someone else?
        // Or it's public?
        // Let's try finding public one if the specific user one failed
        const publicCollection = await prisma.collection.findFirst({
          where: {
            slug: collectionSlug,
            isPublic: true,
          },
          include: {
            items: {
              include: {
                channel: true,
                video: { include: { channel: true } },
              },
              orderBy: { createdAt: "asc" },
            },
          },
        });

        if (!publicCollection) {
          console.log(
            `[Get Items] Collection ${collectionSlug} not found or not accessible by user ${authInfo.id}`
          );
          return res
            .status(404)
            .json({ error: "Collection not found or not accessible" });
        }
        // If found public collection, return that
        console.log(`[Get Items] Found public collection ${collectionSlug}`);
        // We don't need the user relation here, just the collection data and items
        const { items, ...collectionData } = publicCollection;
        return res.json({ collection: collectionData, items: items || [] });
      }

      // If we found the collection via userId_slug, it means the user owns it
      // (regardless of public status)
      console.log(
        `[Get Items] Found collection ${collectionSlug} owned by user ${authInfo.id}`
      );
      const { items, ...collectionData } = collection;
      return res.json({ collection: collectionData, items: items || [] });
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

// --- Update Collection Details (e.g., Note) ---
// Replace the placeholder PATCH route
router.patch("/:collectionSlug", authenticateToken, async (req, res) => {
  const authInfo = req.watchLikeMeAuthInfo;
  const { collectionSlug } = req.params;
  // Expecting { note: string | null } in the body
  const { note } = req.body as { note?: string | null };

  if (!authInfo) {
    return res.status(401).json({ error: "User not authenticated" });
  }

  // Validate input - check if 'note' was actually provided in the body
  // Allowing `null` to clear the note.
  if (note === undefined) {
    return res
      .status(400)
      .json({ error: "Missing 'note' field in request body" });
  }

  try {
    // 1. Find the collection first to ensure ownership
    const collection = await prisma.collection.findUnique({
      where: {
        userId_slug: {
          userId: authInfo.id,
          slug: collectionSlug,
        },
      },
      select: { id: true }, // Only need ID for verification
    });

    if (!collection) {
      console.log(
        `[Patch Collection] Collection ${collectionSlug} not found for user ${authInfo.id}`
      );
      return res
        .status(404)
        .json({ error: "Collection not found or not owned by user" });
    }

    // 2. Update the collection note
    const updatedCollection = await prisma.collection.update({
      where: {
        id: collection.id, // Use the verified ID
      },
      data: {
        note: note, // Update the note field
        // updatedAt is automatically handled by Prisma
      },
    });

    console.log(
      `[Patch Collection] Updated note for collection ${collectionSlug} (ID: ${collection.id})`
    );

    // 3. Return the updated collection (or just success status)
    // Returning the updated object might be useful for the client
    res.json(updatedCollection);
  } catch (error) {
    console.error(
      `[Patch Collection] Error updating note for collection ${collectionSlug}:`,
      error
    );
    // Handle potential Prisma errors
    res.status(500).json({ error: "Failed to update collection note" });
  }
});

// --- Delete Item from Collection ---
// Replace the placeholder DELETE route with this implementation
router.delete(
  "/:collectionSlug/items/:collectionItemId", // Renamed param for clarity
  authenticateToken,
  async (req, res) => {
    const authInfo = req.watchLikeMeAuthInfo;
    const { collectionSlug, collectionItemId } = req.params;

    if (!authInfo) {
      return res.status(401).json({ error: "User not authenticated" });
    }

    if (!collectionSlug || !collectionItemId) {
      return res
        .status(400)
        .json({ error: "Missing collection slug or item ID" });
    }

    try {
      // 1. Find the collection item ensuring it belongs to the user's collection
      const itemToDelete = await prisma.collectionItem.findFirst({
        where: {
          // Item ID must match
          id: collectionItemId,
          // Collection must match the slug and belong to the authenticated user
          collection: {
            slug: collectionSlug,
            userId: authInfo.id,
          },
        },
      });

      // 2. Check if item was found and belongs to the user/collection
      if (!itemToDelete) {
        console.log(
          `[Delete Item] Item ${collectionItemId} not found in collection ${collectionSlug} for user ${authInfo.id}`
        );
        return res.status(404).json({
          error: "Collection item not found or you do not own this collection",
        });
      }

      // 3. Delete the item
      await prisma.collectionItem.delete({
        where: {
          id: itemToDelete.id, // Use the found item ID for deletion
        },
      });

      console.log(
        `[Delete Item] Deleted item ${itemToDelete.id} from collection ${collectionSlug} for user ${authInfo.id}`
      );

      // 4. Return success (204 No Content is appropriate for DELETE)
      res.status(204).send();
    } catch (error) {
      console.error(
        `[Delete Item] Error deleting item ${collectionItemId} from collection ${collectionSlug}:`,
        error
      );
      // Handle potential Prisma errors (e.g., record not found if validation failed somehow)
      if (
        error instanceof Error &&
        error.message.includes("Record to delete does not exist")
      ) {
        return res.status(404).json({ error: "Collection item not found." });
      }
      res.status(500).json({ error: "Failed to delete collection item" });
    }
  }
);

// Public collection routes
router.get("/:userSlug/:collectionSlug", (req, res) => {
  res.json({ message: "Public collection endpoint" });
});

export default router;
