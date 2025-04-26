import express, { Request, Response } from "express";
import { authenticateToken, AuthenticatedUserInfo } from "../middleware/auth";
import { prisma } from "../lib/prisma";
import { youtube } from "../lib/youtube"; // Import youtube client
import { google } from "googleapis"; // Import googleapis for types
import { ParamsDictionary } from "express-serve-static-core"; // Import ParamsDictionary
import { Prisma } from "@prisma/client"; // Import Prisma namespace

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
          // Check for Google Auth BEFORE trying to use the API client
          if (!authInfo?.oauth2Client) {
            console.error(
              "[Add Item] Cannot fetch YouTube details: User is not authenticated with Google."
            );
            throw new Error("GOOGLE_AUTH_REQUIRED");
          }

          // Check if video already exists
          let video = await tx.video.findUnique({
            where: { youtubeId: youtubeId },
          });

          if (!video) {
            console.log(
              `[Add Item] Video ${youtubeId} not found locally. Fetching from YouTube API...`
            );

            let videoChannelIdFromApi: string | null = null;
            let videoPublishedAt: Date | null = null;
            try {
              // Use the guaranteed client here
              const videoResponse = await youtube.videos.list({
                part: ["snippet"],
                id: [youtubeId],
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
                // Check for client again (though it should exist if we got here)
                if (!authInfo?.oauth2Client)
                  throw new Error("GOOGLE_AUTH_REQUIRED");
                // Use the guaranteed client here
                const channelResponse = await youtube.channels.list({
                  part: ["snippet"],
                  id: [videoChannelIdFromApi],
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
      // Catch the specific Google Auth error
      if (error instanceof Error && error.message === "GOOGLE_AUTH_REQUIRED") {
        return res.status(403).json({
          error:
            "Google authentication is required to add YouTube videos directly.",
          details: error.message,
        });
      }
      // Catch other specific errors
      if (error instanceof Error && error.message === "DUPLICATE_ITEM") {
        return res
          .status(409)
          .json({ error: "Item already exists in this collection." });
      }
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
router.get("/:collectionSlug/items", authenticateToken, async (req, res) => {
  const authInfo = req.watchLikeMeAuthInfo;
  const { collectionSlug } = req.params;

  if (!authInfo) {
    return res.status(401).json({ error: "User not authenticated" });
  }

  // Define Prisma include arguments
  const includeArgs = {
    _count: { select: { likes: true } },
    likes: {
      where: { userId: authInfo.id },
      select: { id: true },
    },
    items: {
      include: {
        channel: true,
        video: { include: { channel: true } },
      },
      orderBy: { createdAt: Prisma.SortOrder.asc }, // Use Prisma enum
    },
  };

  try {
    // 1. Try finding owned collection
    let collectionResult = await prisma.collection.findUnique({
      where: { userId_slug: { userId: authInfo.id, slug: collectionSlug } },
      include: includeArgs,
    });

    // 2. If not found owned, check for public
    if (!collectionResult) {
      console.log(
        `[Get Collection] Collection ${collectionSlug} not found for user ${authInfo.id}. Checking public.`
      );
      collectionResult = await prisma.collection.findFirst({
        where: { slug: collectionSlug, isPublic: true },
        include: includeArgs,
      });
    }

    // 3. Handle not found
    if (!collectionResult) {
      console.log(
        `[Get Collection] Collection ${collectionSlug} not found or not accessible by user ${authInfo.id}`
      );
      return res
        .status(404)
        .json({ error: "Collection not found or not accessible" });
    }

    // 4. Process and return result (Type safety with checks)
    console.log(
      `[Get Collection] Returning collection ${collectionResult.id} (${collectionResult.name}) for user ${authInfo.id}`
    );

    // Safely access potentially included fields
    const items = collectionResult.items ?? [];
    const likeCount = (collectionResult as any)._count?.likes ?? 0; // Use type assertion for _count
    const currentUserHasLiked =
      ((collectionResult as any).likes?.length ?? 0) > 0; // Use type assertion for likes

    // Exclude potentially undefined relations from the base object safely
    const {
      items: _,
      likes: __,
      _count: ___,
      ...collectionData
    } = collectionResult;

    return res.json({
      collection: {
        ...collectionData,
        likeCount,
        currentUserHasLiked,
      },
      items: items,
    });
  } catch (error) {
    console.error(
      `Error fetching data for collection ${collectionSlug}:`,
      error
    );
    res.status(500).json({ error: "Failed to fetch collection data" });
  }
});

// Collection CRUD operations
router.post("/", (req, res) => {
  res.json({ message: "Collection creation endpoint" });
});

router.get("/:id", (req, res) => {
  res.json({ message: "Collection retrieval endpoint" });
});

// --- Update Collection Details (e.g., Note, isPublic) ---
router.put("/:collectionSlug", authenticateToken, async (req, res) => {
  const authInfo = req.watchLikeMeAuthInfo;
  const { collectionSlug } = req.params;
  // Expecting { note?: string | null, isPublic?: boolean } in the body
  const { note, isPublic } = req.body as {
    note?: string | null;
    isPublic?: boolean;
  };

  if (!authInfo) {
    return res.status(401).json({ error: "User not authenticated" });
  }

  // Validate input - at least one field must be provided for update
  if (note === undefined && isPublic === undefined) {
    return res
      .status(400)
      .json({ error: "Missing 'note' or 'isPublic' field in request body" });
  }

  // Construct update data object conditionally
  const updateData: { note?: string | null; isPublic?: boolean } = {};
  if (note !== undefined) {
    updateData.note = note; // Allow setting null to clear
  }
  if (isPublic !== undefined) {
    // Ensure profile collection cannot be made private?
    if (collectionSlug === "profile" && isPublic === false) {
      return res
        .status(400)
        .json({ error: "The profile collection cannot be made private." });
    }
    updateData.isPublic = isPublic;
  }

  try {
    // 1. Find the collection first to ensure ownership
    const collection = await prisma.collection.findUnique({
      where: { userId_slug: { userId: authInfo.id, slug: collectionSlug } },
      select: { id: true },
    });

    if (!collection) {
      console.log(
        `[Put Collection] Collection ${collectionSlug} not found for user ${authInfo.id}`
      );
      return res
        .status(404)
        .json({ error: "Collection not found or not owned by user" });
    }

    // 2. Update the collection
    const updatedCollection = await prisma.collection.update({
      where: { id: collection.id },
      data: updateData, // Apply the conditional updates
    });

    console.log(
      `[Put Collection] Updated fields for collection ${collectionSlug} (ID: ${collection.id})`
    );
    res.json(updatedCollection);
  } catch (error) {
    console.error(
      `[Put Collection] Error updating collection ${collectionSlug}:`,
      error
    );
    res.status(500).json({ error: "Failed to update collection" });
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

// --- Like a Collection ---
router.post("/:collectionSlug/like", authenticateToken, async (req, res) => {
  const authInfo = req.watchLikeMeAuthInfo;
  const { collectionSlug } = req.params;

  if (!authInfo) {
    return res.status(401).json({ error: "Authentication required to like" });
  }

  try {
    // 1. Find the collection (must exist, can be public or owned)
    const collection = await prisma.collection.findFirst({
      where: {
        slug: collectionSlug,
        OR: [
          { isPublic: true }, // Allow liking public collections
          { userId: authInfo.id }, // Allow liking own collections
        ],
      },
      select: { id: true, userId: true }, // Select ID for like creation and userId for info
    });

    if (!collection) {
      console.log(
        `[Like Collection] Collection ${collectionSlug} not found or not accessible by user ${authInfo.id}`
      );
      return res
        .status(404)
        .json({ error: "Collection not found or inaccessible" });
    }

    // 2. Create the like record
    const newLike = await prisma.collectionLike.create({
      data: {
        userId: authInfo.id,
        collectionId: collection.id,
      },
    });

    console.log(
      `[Like Collection] User ${authInfo.id} liked collection ${collection.id}`
    );
    // Return the new like record (or just success status)
    res.status(201).json(newLike);
  } catch (error: any) {
    console.error(
      `[Like Collection] Error liking collection ${collectionSlug} for user ${authInfo.id}:`,
      error
    );
    // Handle potential unique constraint violation (already liked)
    if (error.code === "P2002") {
      // Prisma unique constraint violation code
      return res
        .status(409)
        .json({ error: "Collection already liked by this user." });
    }
    res.status(500).json({ error: "Failed to like collection" });
  }
});

// --- Unlike a Collection ---
router.delete("/:collectionSlug/like", authenticateToken, async (req, res) => {
  const authInfo = req.watchLikeMeAuthInfo;
  const { collectionSlug } = req.params;

  if (!authInfo) {
    return res.status(401).json({ error: "Authentication required to unlike" });
  }

  try {
    // 1. Find the collection (needed to find the like by userId+collectionId)
    // We don't strictly need to check visibility here, as the like existence is tied to the user
    const collection = await prisma.collection.findFirst({
      where: { slug: collectionSlug }, // Find any collection with this slug
      select: { id: true },
    });

    if (!collection) {
      // If collection doesn't exist, the like can't exist
      return res.status(404).json({ error: "Collection not found" });
    }

    // 2. Attempt to delete the like record based on user and collection ID
    const deleteResult = await prisma.collectionLike.deleteMany({
      where: {
        userId: authInfo.id,
        collectionId: collection.id,
      },
    });

    // 3. Check if a record was actually deleted
    if (deleteResult.count === 0) {
      // This means the user hadn't liked this collection
      console.log(
        `[Unlike Collection] Like not found for user ${authInfo.id} on collection ${collection.id}`
      );
      return res
        .status(404)
        .json({ error: "Like not found for this user and collection" });
    }

    console.log(
      `[Unlike Collection] User ${authInfo.id} unliked collection ${collection.id}`
    );
    // Return success (204 No Content)
    res.status(204).send();
  } catch (error) {
    console.error(
      `[Unlike Collection] Error unliking collection ${collectionSlug} for user ${authInfo.id}:`,
      error
    );
    res.status(500).json({ error: "Failed to unlike collection" });
  }
});

export default router;
