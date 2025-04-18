import express from "express";
import { Handler, HandlerEvent, HandlerContext } from "@netlify/functions";
import { Router } from "express";
import { authenticateToken } from "../../middleware/auth";
import { setUserCredentials } from "../../lib/youtube";

const router = Router();

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

router.get("/", authenticateToken, async (req, res) => {
  try {
    // Get the user's access token from the request
    const accessToken = req.user?.accessToken;

    if (!accessToken) {
      console.error("No access token found in request");
      return res.status(401).json({ error: "No access token found" });
    }

    console.log("Attempting to fetch channels with access token:", {
      hasToken: !!accessToken,
      tokenLength: accessToken.length,
    });

    // Get YouTube client with user's credentials
    const youtube = setUserCredentials(accessToken);

    // Fetch the user's subscribed channels
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

    // Format the channels data
    const channels = response.data.items.map((item) => ({
      id: item.snippet?.resourceId?.channelId,
      title: item.snippet?.title,
      thumbnailUrl: item.snippet?.thumbnails?.default?.url,
      subscriberCount: 0, // This would require an additional API call to get
    }));

    console.log(`Returning ${channels.length} channels`);
    res.json(channels);
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

const handler: Handler = async (
  event: HandlerEvent,
  context: HandlerContext
) => {
  return {
    statusCode: 200,
    body: JSON.stringify({ message: "Channels list endpoint" }),
  };
};

export default router;
export { handler };
