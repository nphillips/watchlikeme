import express, { Request, Response, Router } from "express";
import { authenticateToken } from "../middleware/auth";
import { setUserCredentials } from "../lib/youtube";
import { updateSubscriptionDetails } from "../lib/youtube-utils";
import { prisma } from "../lib/prisma";
import { google } from "googleapis";

const router = Router();

router.get("/", authenticateToken, async (req, res: Response) => {
  console.log("[Channels Route] Incoming request:", {
    path: req.path,
    method: req.method,
    originalUrl: req.originalUrl,
    baseUrl: req.baseUrl,
  });

  try {
    const authInfo = req.watchLikeMeAuthInfo;

    if (!authInfo) {
      console.error(
        "[Channels Route] Authentication info missing after middleware."
      );
      return res
        .status(401)
        .json({ error: "Authentication information not found." });
    }

    const accessToken = authInfo.accessToken;
    const userId = authInfo.id;
    const youtubeClient = authInfo.oauth2Client;

    console.log("[Channels Route] Starting request with:", {
      hasAccessToken: !!accessToken,
      accessTokenLength: accessToken?.length,
      userId,
    });

    if (!accessToken) {
      console.error(
        "[Channels Route] No Google access token found in auth info"
      );
      return res.status(401).json({ error: "No Google access token found" });
    }

    console.log("[Channels Route] Using OAuth2 client from middleware");
    const youtube = google.youtube({ version: "v3", auth: youtubeClient });

    console.log("[Channels Route] Fetching subscriptions from YouTube API...");
    try {
      const response = await youtube.subscriptions.list({
        part: ["snippet"],
        mine: true,
        maxResults: 50,
      });

      console.log("[Channels Route] YouTube API response:", {
        status: response.status,
        hasItems: !!response.data.items,
        itemCount: response.data.items?.length,
      });

      if (!response.data.items) {
        console.log("[Channels Route] No channels found in response");
        return res.json([]);
      }

      const channels = response.data.items.map((item) => ({
        youtubeId: item.snippet?.resourceId?.channelId,
        title: item.snippet?.title,
        thumbnail: item.snippet?.thumbnails?.default?.url,
        subscriberCount: 0,
      }));

      console.log(`Processing ${channels.length} channels`);

      if (userId) {
        for (const channelData of channels) {
          if (!channelData.youtubeId || !channelData.title) continue;

          const channel = await prisma.channel.upsert({
            where: { youtubeId: channelData.youtubeId },
            update: {
              title: channelData.title,
              thumbnail: channelData.thumbnail || null,
              subscriberCount: channelData.subscriberCount,
            },
            create: {
              youtubeId: channelData.youtubeId,
              title: channelData.title,
              thumbnail: channelData.thumbnail || null,
              subscriberCount: channelData.subscriberCount,
            },
          });

          await prisma.user.update({
            where: { id: userId },
            data: {
              subscriptions: {
                connect: { id: channel.id },
              },
            },
          });
        }

        console.log(
          `Saved ${channels.length} channels to database for user ${userId}`
        );
      } else {
        console.log("No user ID found in request, skipping database mirroring");
      }

      const formattedChannels = channels.map((channel) => ({
        id: channel.youtubeId,
        title: channel.title,
        thumbnailUrl: channel.thumbnail,
        subscriberCount: channel.subscriberCount || 0,
      }));

      console.log(`Returning ${formattedChannels.length} channels`);
      res.json(formattedChannels);
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
      throw youtubeError;
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
        "[Refresh Route] Authentication info missing after middleware."
      );
      return res.status(401).json({ error: "Authentication required" });
    }

    const accessToken = authInfo.accessToken;
    const userId = authInfo.id;

    const result = await updateSubscriptionDetails(userId, accessToken);

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
