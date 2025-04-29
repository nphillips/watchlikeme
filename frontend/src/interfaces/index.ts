export interface Channel {
  id: string;
  youtubeId: string;
  title: string;
  thumbnail: string | null;
  subscriberCount?: number | null;
  thumbnailUpdatedAt?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface Video {
  id: string;
  youtubeId: string;
  title: string;
  thumbnail: string | null;
  publishedAt: string | null;
  channelId: string;
  createdAt?: string;
  updatedAt?: string;
  channel?: Channel;
}

export interface PopulatedCollectionItem {
  id: string;
  collectionId: string;
  channelId: string | null;
  videoId: string | null;
  createdAt: string;
  channel: Channel | null;
  video: Video | null;
}

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
  ownerUsername?: string;
  sharedWith?: { id: string; username: string }[];
  accessGrants?: { grantedToUser: { id: string; username: string } }[];
}

export interface CollectionWithItems {
  collection: Collection;
  items: PopulatedCollectionItem[];
}

export interface UserCollectionsResponse {
  ownedCollections: Collection[];
  sharedCollections: Collection[];
}

export interface AddItemRequestBody {
  itemType: "channel" | "video";
  youtubeId: string;
  title: string;
  thumbnail?: string;
}
