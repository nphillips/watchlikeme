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

// Represents a single item within a collection, including populated relations
export interface PopulatedCollectionItem {
  id: string;
  collectionId: string;
  channelId: string | null;
  videoId: string | null;
  createdAt: string;
  channel: Channel | null;
  video: Video | null;
}

// Represents the base Collection data (without items initially)
export interface Collection {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  note: string | null; // Added note field based on schema check
  isPublic: boolean;
  userId: string;
  // userSlug might not be directly on the model, confirm if needed
  userSlug?: string; // Making optional, might be added via transformation
  createdAt: string;
  updatedAt: string;
  // Add fields returned by the updated GET endpoint
  likeCount?: number;
  currentUserHasLiked?: boolean;
  // Removed items from base interface
}

// Represents the structure returned by GET /api/collections/:slug/items
export interface CollectionWithItems {
  collection: Collection; // The parent collection's details
  items: PopulatedCollectionItem[]; // The list of items
}

// Request body for adding an item to a collection
export interface AddItemRequestBody {
  itemType: "channel" | "video";
  youtubeId: string;
  title: string;
  thumbnail?: string; // Optional thumbnail URL from client
}
