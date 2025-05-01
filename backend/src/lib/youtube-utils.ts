import { youtube } from "./youtube";
import { prisma } from "./prisma";
import { Channel } from "@prisma/client";
import { OAuth2Client } from "google-auth-library";
import { google } from "googleapis";

/**
 * Fetch channel details including subscriber count
 * @param channelIds Array of YouTube channel IDs
 * @param oauth2Client Authenticated Google OAuth2 client instance
 */
export async function fetchChannelDetails(
  channelIds: string[],
  oauth2Client: OAuth2Client,
) {
  if (!channelIds.length) return [];

  const localYoutube = google.youtube({ version: "v3", auth: oauth2Client });

  const chunkedChannelIds = [];
  for (let i = 0; i < channelIds.length; i += 50) {
    chunkedChannelIds.push(channelIds.slice(i, i + 50));
  }

  const allChannelDetails = [];

  for (const chunk of chunkedChannelIds) {
    try {
      const response = await localYoutube.channels.list({
        part: ["snippet", "statistics"],
        id: chunk,
      });

      if (response.data.items && response.data.items.length > 0) {
        const channelDetails = response.data.items.map((channel) => ({
          youtubeId: channel.id,
          title: channel.snippet?.title,
          thumbnail:
            channel.snippet?.thumbnails?.high?.url ||
            channel.snippet?.thumbnails?.medium?.url ||
            channel.snippet?.thumbnails?.default?.url,
          subscriberCount: parseInt(
            channel.statistics?.subscriberCount || "0",
            10,
          ),
        }));

        allChannelDetails.push(...channelDetails);
      }
    } catch (error) {
      console.error("Error fetching channel details chunk:", error);
      if (
        error instanceof Error &&
        (error.message.includes("Invalid Credentials") ||
          error.message.includes("invalid grant"))
      ) {
        throw error;
      }
    }
  }

  return allChannelDetails;
}

/**
 * Refresh channel thumbnails if they're older than the specified threshold
 * @param channelIds Array of YouTube channel IDs
 * @param oauth2Client Authenticated Google OAuth2 client instance
 * @param thresholdDays Number of days after which thumbnails should be refreshed (default: 7)
 */
export async function refreshStaleChannelThumbnails(
  channelIds: string[],
  oauth2Client: OAuth2Client,
  thresholdDays: number = 7,
) {
  if (!channelIds.length) return { updated: 0 };

  const now = new Date();
  const thresholdDate = new Date(now);
  thresholdDate.setDate(now.getDate() - thresholdDays);

  const channels = await prisma.channel.findMany({
    where: {
      youtubeId: { in: channelIds },
      OR: [
        { thumbnailUpdatedAt: { lt: thresholdDate } },
        { thumbnailUpdatedAt: null },
      ],
    },
    select: {
      id: true,
      youtubeId: true,
    },
  });

  if (!channels.length) return { updated: 0 };

  const staleChannelIds = channels.map(
    (c: { youtubeId: string }) => c.youtubeId,
  );
  const channelDetails = await fetchChannelDetails(
    staleChannelIds,
    oauth2Client,
  );

  let updatedCount = 0;

  for (const details of channelDetails) {
    if (!details.youtubeId || !details.thumbnail) continue;

    await prisma.channel.update({
      where: { youtubeId: details.youtubeId },
      data: {
        thumbnail: details.thumbnail,
        thumbnailUpdatedAt: now,
      },
    });
    updatedCount++;
  }

  return { updated: updatedCount };
}

/**
 * Update the subscriber counts of channels in the database
 * @param userId User ID to update subscriptions for
 * @param oauth2Client Authenticated Google OAuth2 client instance
 */
export async function updateSubscriptionDetails(
  userId: string,
  oauth2Client: OAuth2Client,
) {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        subscriptions: true,
      },
    });

    if (!user?.subscriptions.length) {
      return { updated: 0 };
    }

    const channelIds = user.subscriptions.map((sub: Channel) => sub.youtubeId);

    const channelDetails = await fetchChannelDetails(channelIds, oauth2Client);

    let updatedCount = 0;
    const now = new Date();

    for (const details of channelDetails) {
      if (!details.youtubeId) continue;

      await prisma.channel.update({
        where: { youtubeId: details.youtubeId },
        data: {
          title: details.title ?? undefined,
          thumbnail: details.thumbnail || undefined,
          thumbnailUpdatedAt: details.thumbnail ? now : undefined,
          subscriberCount: details.subscriberCount,
          updatedAt: now,
        },
      });
      updatedCount++;
    }

    await refreshStaleChannelThumbnails(channelIds, oauth2Client);

    return { updated: updatedCount };
  } catch (error) {
    console.error("Error updating subscription details:", error);
    throw error;
  }
}
