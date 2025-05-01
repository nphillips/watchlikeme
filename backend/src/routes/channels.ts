import express, { Request, Response, Router } from "express";
import { authenticateToken } from "../middleware/auth";
import { setUserCredentials } from "../lib/youtube";
import {
  updateSubscriptionDetails,
  fetchChannelDetails,
} from "../lib/youtube-utils";
import { prisma } from "../lib/prisma";
import { google } from "googleapis";

const router = Router();

router.get("/", authenticateToken, async (req: Request, res: Response) => {
  const pageToken = req.query.pageToken as string | undefined;
  const limit = parseInt(req.query.limit as string, 10) || 15; // Default limit 15

  console.log("[Channels Route] Incoming request:", {
    path: req.path,
    method: req.method,
    originalUrl: req.originalUrl,
    baseUrl: req.baseUrl,
    query: req.query, // Log query params
  });

  try {
    const authInfo = req.watchLikeMeAuthInfo;

    if (!authInfo) {
      console.error(
        "[Channels Route] Authentication info missing after middleware.",
      );
      return res
        .status(401)
        .json({ error: "Authentication information not found." });
    }

    const oauth2Client = authInfo.oauth2Client;
    const accessTokenForLog = authInfo.accessToken;
    const userId = authInfo.id;

    console.log("[Channels Route] Starting request with:", {
      hasAccessToken: !!accessTokenForLog,
      accessTokenLength: accessTokenForLog?.length,
      userId,
      pageToken,
      limit,
    });

    if (!oauth2Client) {
      console.error(
        "[Channels Route] OAuth2 client is missing in auth info after middleware.",
      );
      return res.status(401).json({
        error: "Google authentication client could not be initialized",
      });
    }

    console.log("[Channels Route] Using OAuth2 client from middleware");
    const youtube = google.youtube({ version: "v3", auth: oauth2Client });

    console.log("[Channels Route] Fetching subscriptions from YouTube API...", {
      pageToken,
      limit,
    });
    try {
      const response = await youtube.subscriptions.list({
        part: ["snippet"],
        mine: true,
        maxResults: limit, // Use limit
        pageToken: pageToken, // Pass pageToken
      });

      console.log("[Channels Route] YouTube API response:", {
        status: response.status,
        hasItems: !!response.data.items,
        itemCount: response.data.items?.length,
        nextPageToken: response.data.nextPageToken, // Log nextPageToken
      });

      if (!response.data.items || response.data.items.length === 0) {
        console.log(
          "[Channels Route] No channels found in response for this page",
        );
        // Return empty items and no next token if no items
        return res.json({ items: [], nextPageToken: null });
      }

      const channelIds = response.data.items
        .map((item) => item.snippet?.resourceId?.channelId)
        .filter((id): id is string => typeof id === "string");

      if (!channelIds.length) {
        console.log(
          "[Channels Route] No valid channel IDs found in subscriptions for this page",
        );
        return res.json({
          items: [],
          nextPageToken: response.data.nextPageToken,
        });
      }

      console.log(
        `[Channels Route] Fetching details for ${channelIds.length} channels...`,
      );
      // NOTE: fetchChannelDetails might need adjustment if it relies on a fixed set,
      // but assuming it works per-batch based on IDs provided.
      const detailedChannels = await fetchChannelDetails(
        channelIds,
        oauth2Client,
      );

      console.log(
        `[Channels Route] Received details for ${detailedChannels.length} channels`,
      );

      // --- Database Upsert Logic (Keep as is for now) ---
      if (userId) {
        const savedChannelData = [];
        for (const channelData of detailedChannels) {
          if (!channelData.youtubeId || !channelData.title) continue;

          const channel = await prisma.channel.upsert({
            where: { youtubeId: channelData.youtubeId },
            update: {
              title: channelData.title,
              thumbnail: channelData.thumbnail || null,
              subscriberCount: channelData.subscriberCount || 0,
              thumbnailUpdatedAt: channelData.thumbnail
                ? new Date()
                : undefined,
            },
            create: {
              youtubeId: channelData.youtubeId,
              title: channelData.title,
              thumbnail: channelData.thumbnail || null,
              subscriberCount: channelData.subscriberCount || 0,
              thumbnailUpdatedAt: channelData.thumbnail
                ? new Date()
                : undefined,
            },
          });

          // Ensure user is connected to the channel subscription
          // Use connectOrCreate to handle potential race conditions or ensure connection exists
          await prisma.user.update({
            where: { id: userId },
            data: {
              subscriptions: {
                connect: { id: channel.id }, // Simplest way if upsert handles channel creation
              },
            },
          });
          savedChannelData.push(channel);
        }

        console.log(
          `Saved/Updated ${savedChannelData.length} channels to database for user ${userId}`,
        );
      } else {
        console.log(
          "[Channels Route] No user ID found, skipping database mirroring",
        );
      }
      // --- End Database Upsert Logic ---

      const formattedChannels = detailedChannels.map((channel) => ({
        id: channel.youtubeId,
        title: channel.title,
        thumbnailUrl: channel.thumbnail,
        subscriberCount: channel.subscriberCount || 0,
      }));

      console.log(
        `[Channels Route] Returning ${formattedChannels.length} formatted channels and token: ${response.data.nextPageToken}`,
      );
      // Return paginated structure
      res.json({
        items: formattedChannels,
        nextPageToken: response.data.nextPageToken || null, // Ensure null if undefined
      });
    } catch (youtubeError) {
      console.error("YouTube API error:", {
        error:
          youtubeError instanceof Error
            ? youtubeError.message
            : "Unknown error",
        stack: youtubeError instanceof Error ? youtubeError.stack : undefined,
        name: youtubeError instanceof Error ? youtubeError.name : undefined,
      });
      if (
        youtubeError instanceof Error &&
        youtubeError.message.includes("quota")
      ) {
        return res.status(429).json({
          error: "YouTube API quota exceeded.",
          details: youtubeError.message,
        });
      }
      if (
        youtubeError instanceof Error &&
        (youtubeError.message.includes("invalid credential") ||
          youtubeError.message.includes("invalid grant"))
      ) {
        return res.status(403).json({
          error: "Google authentication failed or token expired.",
          details: youtubeError.message,
        });
      }
      throw youtubeError; // Re-throw if not handled
    }
  } catch (error) {
    console.error("Error in channels route:", {
      error: error instanceof Error ? error.message : "Unknown error",
      stack: error instanceof Error ? error.stack : undefined,
      name: error instanceof Error ? error.name : undefined,
    });
    res.status(500).json({
      error: "Failed to fetch channels",
      details: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

router.get("/liked", (req, res) => {
  res.json({ message: "Liked videos endpoint" });
});

router.post("/refresh", authenticateToken, async (req, res: Response) => {
  try {
    const authInfo = req.watchLikeMeAuthInfo;

    if (!authInfo) {
      console.error(
        "[Refresh Route] Authentication info missing after middleware.",
      );
      return res.status(401).json({ error: "Authentication required" });
    }

    const oauth2Client = authInfo.oauth2Client;
    const userId = authInfo.id;

    if (!oauth2Client) {
      console.error("[Refresh Route] OAuth2 client missing in auth info.");
      return res.status(401).json({
        error: "Google authentication client setup failed or tokens missing.",
      });
    }

    const result = await updateSubscriptionDetails(userId, oauth2Client);

    res.json({
      success: true,
      message: `Updated ${result.updated} channels`,
    });
  } catch (error) {
    console.error("Error refreshing channel details:", {
      error: error instanceof Error ? error.message : "Unknown error",
      stack: error instanceof Error ? error.stack : undefined,
    });
    res.status(500).json({
      error: "Failed to refresh channel details",
      details: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

export default router;
