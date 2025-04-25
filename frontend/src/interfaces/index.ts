// frontend/src/interfaces/index.ts

// Corresponds to Prisma Channel model subset potentially included in CollectionItem
export interface Channel {
  id: string;
  youtubeId: string;
  title: string;
  thumbnail: string | null;
}

// Corresponds to Prisma Video model subset potentially included in CollectionItem
export interface Video {
  id: string;
  youtubeId: string;
  title: string;
  thumbnail: string | null;
  publishedAt: string | null; // Dates are often serialized as strings
  channelId: string;
}

// Corresponds to Prisma CollectionItem model
export interface CollectionItem {
  id: string;
  collectionId: string;
  channelId: string | null;
  videoId: string | null;
  channel?: Channel;
  video?: Video;
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
  items?: CollectionItem[]; // Assuming backend won't include items by default for the list view
}
