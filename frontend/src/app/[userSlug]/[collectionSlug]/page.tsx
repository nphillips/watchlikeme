"use client";

import { CommandPalette } from "@/components/CommandPalette";
import Nav from "@/components/Nav";
import { YouTubeThumbnail } from "@/components/YouTubeThumbnail";
import { useAuth } from "@/hooks/useAuth";
import { getCollectionItems, addCollectionItem } from "@/lib/api/collections";
import { PopulatedCollectionItem, AddItemRequestBody } from "@/interfaces";
import { useParams } from "next/navigation";
import { useState, useEffect } from "react";
import useSWR, { mutate } from "swr";

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

  // Construct the SWR key. It should depend on collectionSlug.
  const swrKey = collectionSlug
    ? `/api/collections/${collectionSlug}/items`
    : null;

  // Use SWR to fetch collection items
  const {
    data: items = [], // Default to empty array
    error: itemsError,
    isLoading: itemsLoading, // SWR provides isLoading
    mutate: mutateItems, // Function to trigger revalidation
  } = useSWR<PopulatedCollectionItem[]>(
    swrKey,
    () => {
      if (!collectionSlug || typeof collectionSlug !== "string") {
        throw new Error("Invalid collection identifier.");
      }
      return getCollectionItems(collectionSlug); // Use our API function
    },
    {
      revalidateOnFocus: false, // Optional: prevent revalidating on window focus
    }
  );

  // Add this useEffect to log items when they change
  useEffect(() => {
    console.log("[CollectionPage] Items state updated:", items);
  }, [items]); // Dependency array watches the items data from SWR

  // State for Add Item operation feedback
  const [isAdding, setIsAdding] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);

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
      // Determine type and extract data based on item structure
      if (
        typeof item.id === "object" &&
        (item.id.videoId || item.id.channelId)
      ) {
        // YouTube search result
        itemType = item.id.videoId ? "video" : "channel";
        youtubeId = item.id.videoId || item.id.channelId!;
        title = item.snippet?.title || "Untitled";
        thumbnail = item.snippet?.thumbnails?.default?.url;
      } else if (typeof item.id === "string") {
        // Likely a subscription item from /api/channels
        // Assuming subscription items are always channels for now
        // This might need adjustment based on what /api/channels actually returns
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

      // Call the API
      await addCollectionItem(collectionSlug, requestBody);

      // On success, trigger a refetch of the items list
      console.log("Item added successfully, revalidating list...");
      mutateItems(); // Re-runs the SWR fetcher
    } catch (err) {
      console.error("Error adding collection item:", err);
      // Check for the specific duplicate error message from the 409 response
      if (err instanceof Error && err.message.includes("Item already exists")) {
        setAddError("This item is already in the collection.");
      } else {
        // Handle other errors
        setAddError(err instanceof Error ? err.message : "Failed to add item");
      }
      // Optionally clear the error after a few seconds
      setTimeout(() => setAddError(null), 5000);
    } finally {
      setIsAdding(false);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen p-4 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4">
      <Nav />
      <h1 className="text-2xl font-bold my-4">
        {decodeURIComponent(userSlug as string)} /{" "}
        {decodeURIComponent(collectionSlug as string)}
      </h1>
      <div className="my-4">
        <CommandPalette onAddItem={handleAddItem} />
        {isAdding && (
          <p className="text-sm text-blue-500 mt-2">Adding item...</p>
        )}
        {addError && (
          <p className="text-sm text-red-500 mt-2">Error: {addError}</p>
        )}
      </div>
      <h2 className="text-lg font-bold my-4">Items in Collection</h2>

      {itemsLoading && (
        <div className="flex justify-center items-center">
          <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      )}

      {itemsError && (
        <div className="text-center text-red-500">
          <p>
            Error loading items:{" "}
            {itemsError.message || "An unknown error occurred"}
          </p>
        </div>
      )}

      {!itemsLoading && !itemsError && items.length === 0 && (
        <div className="text-center text-gray-500">
          No items in this collection yet.
        </div>
      )}

      {!itemsLoading && !itemsError && items.length > 0 && (
        <ul className="space-y-2">
          {items.map((item) => {
            const displayItem = item.channel || item.video;
            const channelInfo = item.channel || item.video?.channel;
            const isVideo = !!item.video;

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
                className="flex items-center gap-3 p-2 border rounded-md"
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
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
