import { youtube, setUserCredentials } from "./youtube";
import { prisma } from "./prisma";

/**
 * Fetch channel details including subscriber count
 * @param channelIds Array of YouTube channel IDs
 * @param accessToken User's Google/YouTube access token
 */
export async function fetchChannelDetails(
  channelIds: string[],
  accessToken: string,
) {
  if (!channelIds.length) return [];

  // Set up YouTube client with user credentials
  setUserCredentials(accessToken);

  // Limit to 50 channel IDs per request (YouTube API limit)
  const chunkedChannelIds = [];
  for (let i = 0; i < channelIds.length; i += 50) {
    chunkedChannelIds.push(channelIds.slice(i, i + 50));
  }

  const allChannelDetails = [];

  // Process each chunk
  for (const chunk of chunkedChannelIds) {
    try {
      const response = await youtube.channels.list({
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
      console.error("Error fetching channel details:", error);
      // Continue with other chunks even if one fails
    }
  }

  return allChannelDetails;
}

/**
 * Refresh channel thumbnails if they're older than the specified threshold
 * @param channelIds Array of YouTube channel IDs
 * @param accessToken User's Google/YouTube access token
 * @param thresholdDays Number of days after which thumbnails should be refreshed (default: 7)
 */
export async function refreshStaleChannelThumbnails(
  channelIds: string[],
  accessToken: string,
  thresholdDays: number = 7,
) {
  if (!channelIds.length) return { updated: 0 };

  // Get channels with stale thumbnails
  const now = new Date();
  const thresholdDate = new Date(now);
  thresholdDate.setDate(now.getDate() - thresholdDays);

  // Find channels with stale or missing thumbnails
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

  // Get fresh data from YouTube API
  const staleChannelIds = channels.map((c) => c.youtubeId);
  const channelDetails = await fetchChannelDetails(
    staleChannelIds,
    accessToken,
  );

  // Update each channel
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
 * @param accessToken User's Google/YouTube access token
 */
export async function updateSubscriptionDetails(
  userId: string,
  accessToken: string,
) {
  try {
    // Get user's subscribed channels from database
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        subscriptions: true,
      },
    });

    if (!user?.subscriptions.length) {
      return { updated: 0 };
    }

    // Get YouTube IDs for API call
    const channelIds = user.subscriptions.map((sub) => sub.youtubeId);

    // Fetch latest details from YouTube API
    const channelDetails = await fetchChannelDetails(channelIds, accessToken);

    // Update channels in database
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

    // Also check for and refresh stale thumbnails
    await refreshStaleChannelThumbnails(channelIds, accessToken);

    return { updated: updatedCount };
  } catch (error) {
    console.error("Error updating subscription details:", error);
    throw error;
  }
}
