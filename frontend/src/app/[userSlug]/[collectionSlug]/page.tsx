"use client";

import { CommandPalette } from "@/components/CommandPalette";
import Nav from "@/components/Nav";
import { YouTubeThumbnail } from "@/components/YouTubeThumbnail";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import {
  getCollectionItems,
  addCollectionItem,
  removeCollectionItem,
} from "@/lib/api/collections";
import {
  PopulatedCollectionItem,
  AddItemRequestBody,
  CollectionWithItems,
  Collection,
} from "@/interfaces";
import { useParams } from "next/navigation";
import { useState, useEffect, useMemo } from "react";
import useSWR, { mutate } from "swr";
import { X } from "lucide-react";

// SWR fetcher function
const fetcher = (url: string) => fetch(url).then((res) => res.json());

// Define a type for the item passed from CommandPalette
// This needs to accommodate both subscription items and search results
interface PaletteItem {
  id: string | { videoId?: string; channelId?: string }; // Search results have object ID
  title?: string; // Subscription items have direct title
  thumbnailUrl?: string; // Subscription items have direct thumbnail
  snippet?: {
    // Search results have snippet
    title: string;
    thumbnails: {
      default: { url: string };
    };
    channelId?: string; // For videos from search
  };
  // Add any other fields that might be present
}

export default function CollectionPage() {
  const { user, loading: authLoading } = useAuth();
  const { userSlug, collectionSlug } = useParams();

  const swrKey = collectionSlug
    ? `/api/collections/${collectionSlug}/items`
    : null;

  // Update SWR hook to expect CollectionWithItems
  const {
    data, // data will be { collection: Collection, items: PopulatedCollectionItem[] } | undefined
    error: itemsError,
    isLoading: itemsLoading,
    mutate: mutateItems,
  } = useSWR<CollectionWithItems>(
    swrKey,
    () => {
      if (!collectionSlug || typeof collectionSlug !== "string") {
        throw new Error("Invalid collection identifier.");
      }
      // getCollectionItems now returns CollectionWithItems
      return getCollectionItems(collectionSlug);
    },
    {
      revalidateOnFocus: false,
    }
  );

  // Extract collection and items from data when available
  const collection: Collection | null = data?.collection ?? null;
  const items: PopulatedCollectionItem[] = data?.items ?? [];

  useEffect(() => {
    // Update log to show structure
    console.log("[CollectionPage] SWR data updated:", data);
  }, [data]);

  // State for Add Item operation feedback
  const [isAdding, setIsAdding] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);
  const [removingItemId, setRemovingItemId] = useState<string | null>(null);
  const [removeError, setRemoveError] = useState<string | null>(null);

  // Calculate existingItemYoutubeIds based on extracted items
  const existingItemYoutubeIds = useMemo(() => {
    const idSet = new Set<string>();
    items.forEach((item) => {
      // Use extracted items array
      if (item.channel?.youtubeId) {
        idSet.add(item.channel.youtubeId);
      } else if (item.video?.youtubeId) {
        idSet.add(item.video.youtubeId);
      }
    });
    console.log("[CollectionPage] Recalculated existingItemYoutubeIds:", idSet);
    return idSet;
  }, [items]); // Dependency is now the extracted items array

  // Function to handle adding an item
  const handleAddItem = async (item: PaletteItem) => {
    if (!collectionSlug || typeof collectionSlug !== "string") return;
    setIsAdding(true);
    setAddError(null);
    let itemType: "channel" | "video";
    let youtubeId: string;
    let title: string;
    let thumbnail: string | undefined;
    try {
      if (
        typeof item.id === "object" &&
        (item.id.videoId || item.id.channelId)
      ) {
        itemType = item.id.videoId ? "video" : "channel";
        youtubeId = item.id.videoId || item.id.channelId!;
        title = item.snippet?.title || "Untitled";
        thumbnail = item.snippet?.thumbnails?.default?.url;
      } else if (typeof item.id === "string") {
        itemType = "channel";
        youtubeId = item.id;
        title = item.title || "Untitled";
        thumbnail = item.thumbnailUrl;
      } else {
        throw new Error("Unrecognized item structure from Command Palette");
      }
      const requestBody: AddItemRequestBody = {
        itemType,
        youtubeId,
        title,
        thumbnail,
      };
      console.log("Attempting to add item:", requestBody);
      // Pass the correct mutation key or options if needed,
      // but default mutate() should refetch the same swrKey
      await addCollectionItem(collectionSlug, requestBody);
      console.log("Item added successfully, revalidating list...");
      mutateItems();
    } catch (err) {
      console.error("Error adding collection item:", err);
      if (err instanceof Error && err.message.includes("Item already exists")) {
        setAddError("This item is already in the collection.");
      } else {
        setAddError(err instanceof Error ? err.message : "Failed to add item");
      }
      setTimeout(() => setAddError(null), 5000);
    } finally {
      setIsAdding(false);
    }
  };

  const handleRemoveItem = async (collectionItemId: string) => {
    if (!collectionSlug || typeof collectionSlug !== "string") return;
    setRemovingItemId(collectionItemId);
    setRemoveError(null);
    try {
      await removeCollectionItem(collectionSlug, collectionItemId);
      console.log(`Item ${collectionItemId} removed, revalidating list...`);
      // SWR will automatically refetch the data for the key after mutateItems()
      mutateItems();
    } catch (err) {
      console.error(`Error removing item ${collectionItemId}:`, err);
      setRemoveError(
        err instanceof Error ? err.message : "Failed to remove item"
      );
      setTimeout(() => setRemoveError(null), 5000);
    } finally {
      setRemovingItemId(null);
    }
  };

  if (authLoading || (itemsLoading && !data)) {
    // Show loading if auth or initial data fetch is happening
    return (
      <div className="min-h-screen p-4 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  // Handle fetch errors after initial loading state
  if (itemsError) {
    return (
      <div className="min-h-screen p-4">
        <Nav />
        <div className="text-center text-red-500 mt-10">
          <p>
            Error loading collection:{" "}
            {itemsError.message || "An unknown error occurred"}
          </p>
        </div>
      </div>
    );
  }

  // Handle case where collection itself wasn't found (even if items array is empty)
  if (!collection) {
    return (
      <div className="min-h-screen p-4">
        <Nav />
        <div className="text-center text-gray-500 mt-10">
          <p>Collection not found.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4">
      <Nav />
      <h1 className="text-2xl font-bold my-4">
        {/* Use collection name from fetched data */}
        {collection.name}
      </h1>
      {/* Display Collection Note/Description */}
      {(collection.note || collection.description) && (
        <div className="mb-4 p-3 bg-gray-50 rounded border border-gray-200">
          <h3 className="font-semibold mb-1">Notes:</h3>
          {/* TODO: Render markdown if we support it later */}
          <p className="text-gray-700 whitespace-pre-wrap">
            {collection.note || collection.description}
          </p>
        </div>
      )}

      <div className="my-4">
        {/* Command Palette remains the same */}
        <CommandPalette
          onAddItem={handleAddItem}
          existingItemYoutubeIds={existingItemYoutubeIds}
        />
        {/* ... (Add/Remove operation feedback) ... */}
        {isAdding && (
          <p className="text-sm text-blue-500 mt-2">Adding item...</p>
        )}
        {addError && (
          <p className="text-sm text-red-500 mt-2">Error adding: {addError}</p>
        )}
        {removeError && (
          <p className="text-sm text-red-500 mt-2">
            Error removing: {removeError}
          </p>
        )}
      </div>

      <h2 className="text-lg font-bold my-4">Items in Collection</h2>

      {/* Use extracted items array for rendering list */}
      {/* Loading indicator specifically for items *after* initial page load can use itemsLoading */}
      {itemsLoading && items.length === 0 && (
        <div className="flex justify-center items-center">
          <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      )}

      {!itemsLoading && items.length === 0 && (
        <div className="text-center text-gray-500">
          No items in this collection yet.
        </div>
      )}

      {items.length > 0 && (
        <ul className="space-y-2">
          {/* Use extracted items array */}
          {items.map((item) => {
            const displayItem = item.channel || item.video;
            const channelInfo = item.channel || item.video?.channel;
            const isVideo = !!item.video;
            const isCurrentlyRemoving = removingItemId === item.id;

            if (!displayItem || !channelInfo) {
              console.warn(
                "Skipping rendering item without display data:",
                item
              );
              return null;
            }
            return (
              <li
                key={item.id}
                className={`flex items-center gap-3 p-2 border rounded-md ${
                  isCurrentlyRemoving ? "opacity-50" : ""
                }`}
              >
                {displayItem.thumbnail ? (
                  <YouTubeThumbnail
                    url={displayItem.thumbnail}
                    alt={displayItem.title}
                    size="sm"
                  />
                ) : (
                  <div className="w-10 h-10 bg-gray-200 rounded flex items-center justify-center text-gray-400 text-xs">
                    No Img
                  </div>
                )}
                <span className="flex-1 flex flex-col">
                  <span className="font-medium line-clamp-1">
                    {displayItem.title}
                  </span>
                  {isVideo && channelInfo && (
                    <span className="text-sm text-gray-500 line-clamp-1">
                      Channel: {channelInfo.title}
                    </span>
                  )}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleRemoveItem(item.id)}
                  disabled={isCurrentlyRemoving}
                  aria-label="Remove item"
                >
                  {isCurrentlyRemoving ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-gray-500"></div>
                  ) : (
                    <X className="h-4 w-4" />
                  )}
                </Button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
