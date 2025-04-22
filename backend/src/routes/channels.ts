import express, { Request, Response, Router } from "express";
import { authenticateToken } from "../middleware/auth";
import { setUserCredentials } from "../lib/youtube";
import { updateSubscriptionDetails } from "../lib/youtube-utils";
import { prisma } from "../lib/prisma";

const router = Router();

// Define the User interface to match what's expected from the middleware
interface User {
  id: string;
  email: string;
  accessToken: string;
}

declare module "express" {
  interface Request {
    user?: User;
  }
}

// Get user's subscribed channels
router.get("/", authenticateToken, async (req: Request, res: Response) => {
  try {
    const accessToken = req.user?.accessToken;
    const userId = req.user?.id;

    if (!accessToken) {
      console.error("No access token found in request");
      return res.status(401).json({ error: "No access token found" });
    }

    console.log("Attempting to fetch channels with access token:", {
      hasToken: !!accessToken,
      tokenLength: accessToken.length,
    });

    const youtube = setUserCredentials(accessToken);

    console.log("Fetching subscriptions from YouTube API...");
    const response = await youtube.subscriptions.list({
      part: ["snippet"],
      mine: true,
      maxResults: 50,
    });

    console.log("YouTube API response:", {
      status: response.status,
      hasItems: !!response.data.items,
      itemCount: response.data.items?.length,
    });

    if (!response.data.items) {
      console.log("No channels found in response");
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
  } catch (error) {
    console.error("Error in channels route:", {
      error: error instanceof Error ? error.message : "Unknown error",
      stack: error instanceof Error ? error.stack : undefined,
    });
    res.status(500).json({
      error: "Failed to fetch channels",
      details: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

// Get liked videos
router.get("/liked", (req, res) => {
  res.json({ message: "Liked videos endpoint" });
});

// Refresh channel details
router.post(
  "/refresh",
  authenticateToken,
  async (req: Request, res: Response) => {
    try {
      const accessToken = req.user?.accessToken;
      const userId = req.user?.id;

      if (!accessToken || !userId) {
        return res.status(401).json({ error: "Authentication required" });
      }

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
  }
);

export default router;
