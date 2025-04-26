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

// Represents the base Collection data
export interface Collection {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  note: string | null;
  isPublic: boolean;
  userId: string;
  userSlug?: string;
  createdAt: string;
  updatedAt: string;
  likeCount?: number;
  currentUserHasLiked?: boolean;
  ownerUsername?: string; // Username of the owner (useful for shared collections)
  // List of users this collection is shared with (only relevant for owner view)
  sharedWith?: { id: string; username: string }[];
  // Add accessGrants if needed directly from API response (might be nested differently)
  accessGrants?: { grantedToUser: { id: string; username: string } }[];
}

// Represents the structure returned by GET /api/collections/:slug/items
// The collection object here ALREADY includes fields added above
export interface CollectionWithItems {
  collection: Collection;
  items: PopulatedCollectionItem[];
}

// Represents the structure returned by GET /api/collections
export interface UserCollectionsResponse {
  ownedCollections: Collection[]; // Includes sharedWith
  sharedCollections: Collection[]; // Includes ownerUsername
}

// Request body for adding an item to a collection
export interface AddItemRequestBody {
  itemType: "channel" | "video";
  youtubeId: string;
  title: string;
  thumbnail?: string; // Optional thumbnail URL from client
}
