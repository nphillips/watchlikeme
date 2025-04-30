import express, { Request, Response } from "express";
import { authenticateToken, AuthenticatedUserInfo } from "../middleware/auth";
import { prisma } from "../lib/prisma";
import { youtube } from "../lib/youtube"; // Import youtube client
import { google } from "googleapis"; // Import googleapis for types
import { ParamsDictionary } from "express-serve-static-core"; // Import ParamsDictionary
import { Prisma, Collection, CollectionAccess, User } from "@prisma/client"; // Import Prisma namespace and types

const router = express.Router();

// Define the expected request body structure
interface AddItemRequestBody {
  itemType: "channel" | "video";
  youtubeId: string;
  title: string;
  thumbnail?: string;
}

// No custom AuthenticatedRequest needed, rely on module augmentation

// Get the authenticated user's collections (owned and shared)
router.get("/", authenticateToken, async (req, res) => {
  const authInfo = req.watchLikeMeAuthInfo;
  if (!authInfo) {
    return res.status(401).json({ error: "User not authenticated" });
  }

  try {
    // 1. Fetch collections owned by the user
    const ownedCollections = await prisma.collection.findMany({
      where: {
        userId: authInfo.id,
      },
      include: {
        owner: { select: { username: true } }, // Correct: Use owner
        // Include who it's shared with
        accessGrants: {
          select: {
            grantedToUser: { select: { username: true, id: true } },
          },
        },
        _count: { select: { likes: true } }, // Include like count for display
      },
      orderBy: { createdAt: "desc" },
    });

    // 2. Fetch collections shared with the user
    const sharedCollectionAccess = await prisma.collectionAccess.findMany({
      where: { grantedToUserId: authInfo.id },
      include: {
        collection: {
          // Include the actual collection details
          include: {
            owner: { select: { username: true } }, // Correct: Use owner
            _count: { select: { likes: true } }, // Include like count
            // Don't need items or accessGrants for the list view of shared items
          },
        },
      },
    });

    // Transform owned collections
    const transformedOwned = ownedCollections.map((collection: any) => ({
      id: collection.id,
      slug: collection.slug,
      name: collection.name,
      description: collection.description,
      isPublic: collection.isPublic,
      likeCount: collection._count?.likes ?? 0, // Add likeCount
      // Flatten accessGrants for easier consumption
      sharedWith: collection.accessGrants.map(
        (grant: { grantedToUser: { username: string } }) => grant.grantedToUser,
      ),
    }));

    // Transform shared collections
    const transformedShared = sharedCollectionAccess.map((access: any) => ({
      id: access.collection.id,
      slug: access.collection.slug,
      name: access.collection.name,
      description: access.collection.description,
      ownerUsername: access.collection.owner.username, // Correct: Use owner
      likeCount: access.collection._count?.likes ?? 0, // Add likeCount
      isPublic: access.collection.isPublic, // Pass isPublic for shared collections too
    }));

    // Return both lists
    res.json({
      ownedCollections: transformedOwned,
      sharedCollections: transformedShared,
    });
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
    res: Response,
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
      const newItem = await prisma.$transaction(
        async (tx: Prisma.TransactionClient) => {
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
                "[Add Item] Cannot fetch YouTube details: User is not authenticated with Google.",
              );
              throw new Error("GOOGLE_AUTH_REQUIRED");
            }

            // Check if video already exists
            let video = await tx.video.findUnique({
              where: { youtubeId: youtubeId },
            });

            if (!video) {
              console.log(
                `[Add Item] Video ${youtubeId} not found locally. Fetching from YouTube API...`,
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
                    `[Add Item] YouTube API found channelId: ${videoChannelIdFromApi} for video ${youtubeId}`,
                  );
                } else {
                  console.error(
                    `[Add Item] YouTube API did not find video ${youtubeId}`,
                  );
                  throw new Error(
                    `Video with YouTube ID ${youtubeId} not found on YouTube.`,
                  );
                }
              } catch (apiError) {
                console.error(
                  `[Add Item] YouTube API error fetching video ${youtubeId}:`,
                  apiError,
                );
                throw new Error(
                  `Failed to fetch video details from YouTube API: ${
                    apiError instanceof Error ? apiError.message : apiError
                  }`,
                );
              }

              if (!videoChannelIdFromApi) {
                throw new Error(
                  `Could not determine channel for YouTube video ${youtubeId}`,
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
                  `[Add Item] Fetching details for newly referenced channel ${videoChannelIdFromApi}`,
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
                    const channelSnippet =
                      channelResponse.data.items[0].snippet;
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
                      `[Add Item] Updated details for channel ${videoChannelIdFromApi}`,
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
                    channelApiError,
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
                `[Add Item] Created video record ${video.id} for YT ID ${youtubeId}`,
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
                ...(itemType === "channel"
                  ? [{ channelId: { not: null } }]
                  : []),
                ...(itemType === "video" ? [{ videoId: { not: null } }] : []),
              ],
            },
          });

          if (existingItem) {
            console.log(
              `[Add Item] Duplicate detected: Item (Type: ${itemType}, ID: ${
                itemType === "channel" ? channelIdToAdd : videoIdToAdd
              }) already exists in collection ${collection.id}.`,
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
            `[Add Item] Created collection item ${createdItem.id} linking to ${itemType} ${youtubeId} in collection ${collection.id}`,
          );
          return createdItem;
        },
      );

      // If transaction succeeded (no duplicate error thrown), return 201
      res.status(201).json(newItem);
    } catch (error) {
      console.error(
        `[Add Item] Error adding item to collection ${collectionSlug}:`,
        error,
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
  },
);

// --- Get Items and Details for a Specific Collection (Requires Auth & Access) ---
router.get("/:collectionSlug/items", authenticateToken, async (req, res) => {
  const authInfo = req.watchLikeMeAuthInfo;
  const { collectionSlug } = req.params;

  if (!authInfo) {
    return res.status(401).json({ error: "User not authenticated" });
  }

  try {
    // 1. Find the collection by slug first (need its ID and owner ID)
    const collection = await prisma.collection.findFirst({
      where: {
        slug: collectionSlug,
        // We need to know the owner regardless of who is asking
        // So we find the collection by slug first
      },
      select: { id: true, userId: true }, // Select needed fields
    });

    if (!collection) {
      console.log(
        `[Get Collection Items] Collection with slug '${collectionSlug}' not found.`,
      );
      return res.status(404).json({ error: "Collection not found" });
    }

    // 2. Check Permissions: Owner or Granted Access?
    const isOwner = authInfo.id === collection.userId;
    let hasGrantedAccess = false;
    if (!isOwner) {
      console.log(
        `[Get Collection Items] User ${authInfo.id} is not owner. Checking granted access for collection ${collection.id}.`,
      );
      const accessGrant = await prisma.collectionAccess.findUnique({
        where: {
          grantedToUserId_collectionId: {
            grantedToUserId: authInfo.id,
            collectionId: collection.id,
          },
        },
        select: { id: true }, // Only need to check existence
      });
      hasGrantedAccess = !!accessGrant;
      console.log(
        `[Get Collection Items] Granted access found: ${hasGrantedAccess}`,
      );
    }

    // 3. If not owner and no granted access, deny
    if (!isOwner && !hasGrantedAccess) {
      console.log(
        `[Get Collection Items] Access denied for user ${authInfo.id} on collection ${collection.id}`,
      );
      return res
        .status(403)
        .json({ error: "You do not have permission to view this collection" });
    }

    // 4. Permission granted! Fetch full collection details and items.
    console.log(
      `[Get Collection Items] Access granted for user ${authInfo.id} on collection ${collection.id}. Fetching details.`,
    );
    const collectionDetails = await prisma.collection.findUnique({
      where: { id: collection.id },
      include: {
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
          orderBy: { createdAt: "asc" },
        },
        owner: {
          select: { username: true },
        },
        accessGrants: {
          select: {
            grantedToUser: {
              select: { username: true, id: true },
            },
          },
        },
      },
    });

    if (!collectionDetails) {
      // Should not happen if previous checks passed, but safety check
      console.error(
        `[Get Collection Items] Failed to fetch collection details for ID ${collection.id} after access check.`,
      );
      return res.status(404).json({
        error: "Collection found initially but failed to refetch details",
      });
    }

    // 5. Process and return result
    const items = collectionDetails.items ?? [];
    const likeCount = collectionDetails._count?.likes ?? 0;
    const currentUserHasLiked = (collectionDetails.likes?.length ?? 0) > 0;
    const ownerUsername = collectionDetails.owner?.username;

    // ---> START CHANGE: Map accessGrants to sharedWith
    const sharedWith = (collectionDetails.accessGrants ?? []).map(
      (grant: { grantedToUser: { username: string } }) => grant.grantedToUser,
    );
    // ---> END CHANGE

    const {
      items: _,
      likes: __,
      _count: ___,
      owner: ____,
      accessGrants: _____, // Exclude original accessGrants from rest
      ...collectionData
    } = collectionDetails;

    return res.json({
      collection: {
        ...collectionData,
        likeCount,
        currentUserHasLiked,
        ownerUsername,
        sharedWith: sharedWith, // <-- Return sharedWith instead of accessGrants
      },
      items: items,
    });
  } catch (error) {
    console.error(
      `Error fetching data for collection ${collectionSlug}:`,
      error,
    );
    res.status(500).json({ error: "Failed to fetch collection data" });
  }
});

// --- Create Collection ---
interface CreateCollectionRequestBody {
  name: string;
  slug: string;
  // Add other fields like description, isPublic if needed
}

router.post(
  "/",
  authenticateToken,
  async (req: Request<{}, any, CreateCollectionRequestBody>, res: Response) => {
    const authInfo = req.watchLikeMeAuthInfo;
    if (!authInfo) {
      return res.status(401).json({ error: "User not authenticated" });
    }

    const { name, slug } = req.body;

    // Basic validation
    if (!name || !slug) {
      return res
        .status(400)
        .json({ error: "Missing required fields: name and slug" });
    }

    // Additional slug validation (ensure it matches generated format)
    if (
      !/^[a-z0-9-]+$/.test(slug) ||
      slug.startsWith("-") ||
      slug.endsWith("-")
    ) {
      return res.status(400).json({
        error:
          "Invalid slug format. Only lowercase letters, numbers, and hyphens allowed. Cannot start or end with hyphen.",
      });
    }

    try {
      // Create the collection
      const newCollection = await prisma.collection.create({
        data: {
          name: name,
          slug: slug,
          userId: authInfo.id,
          // Set default values if needed, e.g.:
          // isPublic: false,
          // note: "",
        },
        // Include owner's username for frontend redirect
        include: {
          owner: { select: { username: true } },
        },
      });

      console.log(
        `[Create Collection] User ${authInfo.id} created collection '${name}' (ID: ${newCollection.id}, Slug: ${slug})`,
      );

      // Return the new collection data (especially slug and owner username)
      res.status(201).json({
        ...newCollection,
        userSlug: newCollection.owner.username, // For frontend routing
      });
    } catch (error: any) {
      console.error(
        `[Create Collection] Error creating collection for user ${authInfo.id}:`,
        error,
      );

      // Handle specific Prisma error for unique constraint violation (userId + slug)
      if (error.code === "P2002") {
        return res.status(409).json({
          error: "A collection with this slug already exists for your account.",
          field: "slug", // Indicate which field caused the conflict
        });
      }

      // Generic error
      res.status(500).json({ error: "Failed to create collection" });
    }
  },
);

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
        `[Put Collection] Collection ${collectionSlug} not found for user ${authInfo.id}`,
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
      `[Put Collection] Updated fields for collection ${collectionSlug} (ID: ${collection.id})`,
    );
    res.json(updatedCollection);
  } catch (error) {
    console.error(
      `[Put Collection] Error updating collection ${collectionSlug}:`,
      error,
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
          `[Delete Item] Item ${collectionItemId} not found in collection ${collectionSlug} for user ${authInfo.id}`,
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
        `[Delete Item] Deleted item ${itemToDelete.id} from collection ${collectionSlug} for user ${authInfo.id}`,
      );

      // 4. Return success (204 No Content is appropriate for DELETE)
      res.status(204).send();
    } catch (error) {
      console.error(
        `[Delete Item] Error deleting item ${collectionItemId} from collection ${collectionSlug}:`,
        error,
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
  },
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
    // 1. Find the collection by slug first
    const collection = await prisma.collection.findFirst({
      where: { slug: collectionSlug },
      select: { id: true, userId: true }, // Need ID and owner ID
    });

    if (!collection) {
      console.log(
        `[Like Collection] Collection slug '${collectionSlug}' not found.`,
      );
      return res.status(404).json({ error: "Collection not found" });
    }

    // 2. Check if the current user has permission (Owner OR Granted Access)
    const isOwner = authInfo.id === collection.userId;
    let hasGrantedAccess = false;
    if (!isOwner) {
      const accessGrant = await prisma.collectionAccess.findUnique({
        where: {
          grantedToUserId_collectionId: {
            grantedToUserId: authInfo.id,
            collectionId: collection.id,
          },
        },
        select: { id: true },
      });
      hasGrantedAccess = !!accessGrant;
    }

    // Use the correct permission check
    if (!isOwner && !hasGrantedAccess) {
      console.log(
        `[Like Collection] Permission denied for user ${authInfo.id} on collection ${collection.id}`,
      );
      return res
        .status(403)
        .json({ error: "You do not have permission to like this collection" });
    }

    // 3. Permission granted, attempt to create the like
    console.log(
      `[Like Collection] User ${authInfo.id} attempting to like collection ${collection.id}`,
    );
    const newLike = await prisma.collectionLike.create({
      data: { userId: authInfo.id, collectionId: collection.id },
    });
    console.log(
      `[Like Collection] User ${authInfo.id} liked collection ${collection.id}`,
    );
    res.status(201).json(newLike);
  } catch (error: any) {
    // ... existing error handling ...
    console.error(
      `[Like Collection] Error liking collection ${collectionSlug} for user ${authInfo.id}:`,
      error,
    );
    if (error.code === "P2002") {
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
    // 1. Find the collection by slug first
    const collection = await prisma.collection.findFirst({
      where: { slug: collectionSlug },
      select: { id: true, userId: true },
    });

    if (!collection) {
      console.log(
        `[Unlike Collection] Collection slug '${collectionSlug}' not found.`,
      );
      return res.status(404).json({ error: "Collection not found" });
    }

    // 2. Check if the current user has permission (Owner OR Granted Access)
    // No need to check permissions here explicitly, because the delete operation
    // below is scoped to the authenticated user (authInfo.id).
    // If they don't own the like, deleteMany will just return count: 0.
    // We *do* need the collection.id though.

    // 3. Attempt to delete the like owned by the current user
    console.log(
      `[Unlike Collection] User ${authInfo.id} attempting to unlike collection ${collection.id}`,
    );
    const deleteResult = await prisma.collectionLike.deleteMany({
      where: {
        userId: authInfo.id, // Scoped to the authenticated user
        collectionId: collection.id,
      },
    });

    // 4. Check if a record was actually deleted
    if (deleteResult.count === 0) {
      console.log(
        `[Unlike Collection] Like not found for user ${authInfo.id} on collection ${collection.id}`,
      );
      // Return 404 Not Found, as the specific resource (the like) didn't exist for this user
      return res
        .status(404)
        .json({ error: "Like not found for this user and collection" });
    }

    console.log(
      `[Unlike Collection] User ${authInfo.id} unliked collection ${collection.id}`,
    );
    res.status(204).send();
  } catch (error) {
    // ... error handling ...
    console.error(
      `[Unlike Collection] Error unliking collection ${collectionSlug} for user ${authInfo.id}:`,
      error,
    );
    res.status(500).json({ error: "Failed to unlike collection" });
  }
});

// --- Grant Access to a Collection ---
router.post(
  "/:collectionSlug/grantAccess",
  authenticateToken,
  async (req, res) => {
    const authInfo = req.watchLikeMeAuthInfo;
    const { collectionSlug } = req.params;
    const { targetUsername } = req.body as { targetUsername?: string };

    if (!authInfo) {
      return res
        .status(401)
        .json({ error: "Authentication required to grant access" });
    }

    if (!targetUsername) {
      return res
        .status(400)
        .json({ error: "Missing 'targetUsername' in request body" });
    }

    try {
      // 1. Find the collection and verify ownership by the requesting user
      const collection = await prisma.collection.findUnique({
        where: {
          userId_slug: {
            userId: authInfo.id, // Requesting user MUST be the owner
            slug: collectionSlug,
          },
        },
        select: { id: true }, // Only need ID
      });

      if (!collection) {
        console.log(
          `[Grant Access] Collection ${collectionSlug} not found or not owned by user ${authInfo.id}`,
        );
        return res
          .status(404)
          .json({ error: "Collection not found or you do not own it" });
      }

      // 2. Find the target user by username
      const targetUser = await prisma.user.findUnique({
        where: { username: targetUsername },
        select: { id: true }, // Only need ID
      });

      if (!targetUser) {
        console.log(
          `[Grant Access] Target user '${targetUsername}' not found.`,
        );
        return res
          .status(404)
          .json({ error: `User '${targetUsername}' not found` });
      }

      // 3. Check if granting access to self
      if (authInfo.id === targetUser.id) {
        return res
          .status(400)
          .json({ error: "Cannot grant access to yourself" });
      }

      // 4. Create the CollectionAccess record
      // Using upsert is convenient here: if access already exists, do nothing.
      // If it doesn't exist, create it.
      const accessGrant = await prisma.collectionAccess.upsert({
        where: {
          grantedToUserId_collectionId: {
            grantedToUserId: targetUser.id,
            collectionId: collection.id,
          },
        },
        create: {
          grantedToUserId: targetUser.id,
          collectionId: collection.id,
        },
        update: {}, // No fields to update if it already exists
      });

      console.log(
        `[Grant Access] Access granted for user ${targetUser.id} to collection ${collection.id}`,
      );
      // Return the created/existing access grant record (or just success)
      res.status(201).json(accessGrant);
    } catch (error: any) {
      console.error(
        `[Grant Access] Error granting access for collection ${collectionSlug} to user ${targetUsername}:`,
        error,
      );
      // Handle other potential errors (e.g., database connection issues)
      res.status(500).json({ error: "Failed to grant access" });
    }
  },
);

export default router;
