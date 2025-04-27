import express, { Request, Response, Router } from "express";
import { authenticateToken } from "../middleware/auth";
import { setUserCredentials } from "../lib/youtube";
import {
  updateSubscriptionDetails,
  fetchChannelDetails,
} from "../lib/youtube-utils";
import { prisma } from "../lib/prisma";
import { google, youtube_v3 } from "googleapis";
import { GaxiosResponse } from "gaxios";
import { OAuth2Client } from "google-auth-library";

const router = Router();

// --- Handler for GET /api/channels (Subscriptions Only) ---
router.get("/", authenticateToken, async (req, res: Response) => {
  console.log("[Channels Route - Subscriptions] Incoming request");

  try {
    const authInfo = req.watchLikeMeAuthInfo;
    if (!authInfo) {
      console.error("[Channels Route - Subscriptions] Auth info missing.");
      return res.status(401).json({ error: "Auth info not found." });
    }
    const accessToken = authInfo.accessToken;
    const userId = authInfo.id;
    const youtubeClient = authInfo.oauth2Client;

    if (!accessToken || !youtubeClient) {
      console.error("[Channels Route - Subscriptions] Google auth missing.");
      return res.status(401).json({ error: "Google auth required" });
    }

    const youtube = google.youtube({ version: "v3", auth: youtubeClient });

    console.log("[Channels Route - Subscriptions] Fetching subscriptions...");
    try {
      const response = await youtube.subscriptions.list({
        part: ["snippet"],
        mine: true,
        maxResults: 50,
      });

      console.log(
        "[Channels Route - Subscriptions] YouTube Subs API response status:",
        response.status
      );

      const subscriptionItems = response.data.items || [];
      const channelIds = subscriptionItems
        .map((item) => item.snippet?.resourceId?.channelId)
        .filter((id): id is string => typeof id === "string");

      if (!channelIds.length) {
        console.log(
          "[Channels Route - Subscriptions] No valid channel IDs found."
        );
        return res.json([]);
      }

      console.log(
        `[Channels Route - Subscriptions] Fetching details for ${channelIds.length} channels...`
      );
      const detailedChannels = await fetchChannelDetails(
        channelIds,
        accessToken
      );

      // --- Database Mirroring (Keep as is) ---
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
          await prisma.user.update({
            where: { id: userId },
            data: { subscriptions: { connect: { id: channel.id } } },
          });
          savedChannelData.push(channel);
        }
        console.log(
          `[Channels Route - Subscriptions] Saved/Updated ${savedChannelData.length} channels for user ${userId}`
        );
      }
      // --- End Database Mirroring ---

      const formattedChannels = detailedChannels.map((channel) => ({
        id: channel.youtubeId,
        title: channel.title,
        thumbnailUrl: channel.thumbnail,
        subscriberCount: channel.subscriberCount || 0,
      }));

      console.log(
        `[Channels Route - Subscriptions] Returning ${formattedChannels.length} channels.`
      );
      res.json(formattedChannels);
    } catch (youtubeError) {
      // --- Subscription API Error Handling (Keep as is, update console logs) ---
      console.error("[Channels Route - Subscriptions] YouTube API error:", {
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
        return res.status(429).json({ error: "YouTube API quota exceeded." });
      }
      if (
        youtubeError instanceof Error &&
        (youtubeError.message.includes("invalid credential") ||
          youtubeError.message.includes("invalid grant"))
      ) {
        return res.status(403).json({ error: "Google authentication failed." });
      }
      throw youtubeError;
      // --- End Subscription API Error Handling ---
    }
  } catch (error) {
    // --- Outer Error Handling (Keep as is, update console logs) ---
    console.error("[Channels Route - Subscriptions] Error:", {
      error: error instanceof Error ? error.message : "Unknown error",
      stack: error instanceof Error ? error.stack : undefined,
      name: error instanceof Error ? error.name : undefined,
    });
    res.status(500).json({ error: "Failed to fetch subscriptions" });
    // --- End Outer Error Handling ---
  }
});

// --- Handler for GET /api/channels/search ---
router.get("/search", authenticateToken, async (req, res: Response) => {
  console.log(
    "[Channels Route - Search] Incoming request with query:",
    req.query
  );

  try {
    const authInfo = req.watchLikeMeAuthInfo;
    if (!authInfo || !authInfo.oauth2Client) {
      console.error(
        "[Channels Route - Search] Auth info or OAuth2Client missing."
      );
      return res.status(401).json({ error: "Google authentication required." });
    }

    const youtubeClient = authInfo.oauth2Client;
    const searchQuery = req.query.q as string | undefined;

    if (!searchQuery || searchQuery.trim().length === 0) {
      console.log("[Channels Route - Search] Empty search query.");
      return res.status(400).json({ error: "Search query cannot be empty" });
    }

    const youtube = google.youtube({ version: "v3", auth: youtubeClient });

    console.log(
      `[Channels Route - Search] Performing YouTube search for: "${searchQuery}"`
    );
    try {
      // @ts-ignore - Suppress confusing overload/type error for search.list
      const searchResponse = await youtube.search.list({
        part: ["snippet"],
        q: searchQuery,
        type: "channel,video",
        maxResults: 10,
      });

      console.log(
        "[Channels Route - Search] YouTube Search API response status:",
        // @ts-ignore
        searchResponse.status
      );

      // @ts-ignore
      const searchResults = searchResponse.data.items || [];
      // --- Result Formatting (Keep as is) ---
      const formattedResults = searchResults
        .map((item: youtube_v3.Schema$SearchResult) => {
          const snippet = item.snippet;
          const idInfo = item.id;
          if (!snippet || !idInfo) return null;
          let youtubeId: string | undefined;
          let itemKind: "channel" | "video" | undefined;
          if (idInfo.kind === "youtube#channel" && idInfo.channelId) {
            youtubeId = idInfo.channelId;
            itemKind = "channel";
          } else if (idInfo.kind === "youtube#video" && idInfo.videoId) {
            youtubeId = idInfo.videoId;
            itemKind = "video";
          }
          if (!youtubeId || !itemKind || !snippet.title) return null;
          return {
            id: {
              kind: idInfo.kind,
              videoId: itemKind === "video" ? youtubeId : undefined,
              channelId: itemKind === "channel" ? youtubeId : undefined,
            },
            snippet: {
              title: snippet.title,
              channelTitle: snippet.channelTitle,
              thumbnails: {
                default: snippet.thumbnails?.default,
                medium: snippet.thumbnails?.medium,
                high: snippet.thumbnails?.high,
              },
              publishedAt: snippet.publishedAt,
              liveBroadcastContent: snippet.liveBroadcastContent,
            },
            kind: itemKind,
          };
        })
        .filter(Boolean);
      // --- End Result Formatting ---

      console.log(
        `[Channels Route - Search] Returning ${formattedResults.length} results.`
      );
      res.json(formattedResults);
    } catch (youtubeError) {
      // --- Search API Error Handling (Keep as is, update console logs) ---
      console.error("[Channels Route - Search] YouTube Search API error:", {
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
        return res.status(429).json({ error: "YouTube API quota exceeded." });
      }
      if (
        youtubeError instanceof Error &&
        (youtubeError.message.includes("invalid credential") ||
          youtubeError.message.includes("invalid grant"))
      ) {
        return res.status(403).json({ error: "Google authentication failed." });
      }
      throw youtubeError;
      // --- End Search API Error Handling ---
    }
  } catch (error) {
    // --- Outer Error Handling (Keep as is, update console logs) ---
    console.error("[Channels Route - Search] Error:", {
      error: error instanceof Error ? error.message : "Unknown error",
      stack: error instanceof Error ? error.stack : undefined,
      name: error instanceof Error ? error.name : undefined,
    });
    res.status(500).json({ error: "Failed to perform YouTube search" });
    // --- End Outer Error Handling ---
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

    if (!userId || !accessToken) {
      console.error(
        "[Refresh Route] Missing userId or accessToken for refresh."
      );
      return res
        .status(400)
        .json({ error: "User ID and access token are required." });
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
});

export default router;
