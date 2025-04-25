// frontend/src/interfaces/index.ts

// Corresponds to Prisma Channel model subset potentially included in CollectionItem
export interface Channel {
  id: string;
  youtubeId: string;
  title: string;
  thumbnail: string | null;
  // Add fields that might be relevant from backend includes
  subscriberCount?: number | null;
  thumbnailUpdatedAt?: string | null; // Serialized date
  createdAt?: string;
  updatedAt?: string;
}

// Corresponds to Prisma Video model subset potentially included in CollectionItem
export interface Video {
  id: string;
  youtubeId: string;
  title: string;
  thumbnail: string | null;
  publishedAt: string | null; // Dates are often serialized as strings
  channelId: string;
  // Add fields that might be relevant from backend includes
  createdAt?: string;
  updatedAt?: string;
  // The backend includes the parent channel for videos in CollectionItem
  channel?: Channel;
}

// Corresponds to Prisma CollectionItem model
// This represents the structure returned by GET /api/collections/:slug/items
export interface PopulatedCollectionItem {
  id: string;
  collectionId: string;
  channelId: string | null;
  videoId: string | null;
  createdAt: string;
  // Based on backend include: { channel: true, video: { include: { channel: true } } }
  channel: Channel | null; // Full channel if channelId is set
  video: Video | null; // Full video (including its channel) if videoId is set
}

// Corresponds to Prisma Collection model
export interface Collection {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  isPublic: boolean;
  userId: string;
  userSlug: string;
  createdAt: string; // Dates are often serialized as strings
  updatedAt: string; // Dates are often serialized as strings
  // Use the detailed type if items are included (e.g., for a specific collection view)
  items?: PopulatedCollectionItem[];
}

// Request body for adding an item to a collection
export interface AddItemRequestBody {
  itemType: "channel" | "video";
  youtubeId: string;
  title: string;
  thumbnail?: string; // Optional thumbnail URL from client
}
