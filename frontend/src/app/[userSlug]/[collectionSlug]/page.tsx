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
  updateCollectionDetails,
  likeCollection,
  unlikeCollection,
  grantCollectionAccess,
} from "@/lib/api/collections";
import {
  PopulatedCollectionItem,
  AddItemRequestBody,
  CollectionWithItems,
  Collection,
} from "@/interfaces";
import { useParams, useRouter } from "next/navigation";
import { useState, useEffect, useMemo } from "react";
import useSWR, { mutate } from "swr";
import { X, Heart, Share2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";

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
  const { user: loggedInUser, loading: authLoading } = useAuth();
  const { userSlug, collectionSlug } = useParams();
  const router = useRouter();

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

  // --- State for Editing Note ---
  const [isEditing, setIsEditing] = useState(false);
  const [editableNote, setEditableNote] = useState<string>("");
  const [editableIsPublic, setEditableIsPublic] = useState<boolean>(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Update editableNote when collection data loads or changes
  useEffect(() => {
    if (collection?.note) {
      setEditableNote(collection.note);
    } else {
      setEditableNote(""); // Reset if note is null or collection is null
    }
    setEditableIsPublic(collection?.isPublic ?? true);
  }, [collection?.note, collection?.isPublic]);

  // --- State for Liking ---
  const [isLiking, setIsLiking] = useState(false);
  const [likeError, setLikeError] = useState<string | null>(null);

  // Memoized values derived from SWR data
  const likeCount = useMemo(
    () => collection?.likeCount ?? 0,
    [collection?.likeCount]
  );
  const currentUserHasLiked = useMemo(
    () => collection?.currentUserHasLiked ?? false,
    [collection?.currentUserHasLiked]
  );
  const isOwner = useMemo(
    () => loggedInUser?.id === collection?.userId,
    [loggedInUser?.id, collection?.userId]
  );

  // --- State for Sharing ---
  const [isSharing, setIsSharing] = useState(false); // Share dialog open state
  const [targetUsername, setTargetUsername] = useState("");
  const [isGrantingAccess, setIsGrantingAccess] = useState(false);
  const [grantAccessError, setGrantAccessError] = useState<string | null>(null);
  const [grantAccessSuccess, setGrantAccessSuccess] = useState(false);

  // Get owner username and shared list from collection data
  const ownerUsername = collection?.ownerUsername;
  const sharedWithList = useMemo(
    () => collection?.sharedWith ?? [],
    [collection?.sharedWith]
  );

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

  // Handler to open the edit dialog
  const handleOpenEditDialog = () => {
    setEditableNote(collection?.note || "");
    setEditableIsPublic(collection?.isPublic ?? true);
    setSaveError(null);
    setIsEditing(true);
  };

  // Handler to save the edited note
  const handleSaveChanges = async () => {
    if (!collectionSlug || typeof collectionSlug !== "string") return;

    setIsSaving(true);
    setSaveError(null);

    const updates: { note?: string | null; isPublic?: boolean } = {
      note: editableNote.trim(),
      isPublic: editableIsPublic,
    };

    try {
      await updateCollectionDetails(collectionSlug, updates);
      console.log("Collection details updated successfully, revalidating...");
      mutateItems();
      setIsEditing(false);
    } catch (err) {
      console.error("Error updating collection details:", err);
      setSaveError(
        err instanceof Error ? err.message : "Failed to save changes"
      );
    } finally {
      setIsSaving(false);
    }
  };

  // --- Like/Unlike Handler ---
  const handleLikeToggle = async () => {
    if (!collectionSlug || typeof collectionSlug !== "string") return;

    // 1. Check if logged in
    if (!loggedInUser) {
      // Redirect to login, potentially passing redirect back URL
      router.push(`/login?redirect=/${userSlug}/${collectionSlug}`);
      return;
    }

    setIsLiking(true);
    setLikeError(null);

    // Current state before optimistic update
    const currentLikedStatus = currentUserHasLiked;
    const currentLikeCount = likeCount;

    // Optimistic UI Update Data
    const optimisticData: CollectionWithItems | undefined = data
      ? {
          ...data,
          collection: {
            ...data.collection,
            currentUserHasLiked: !currentLikedStatus,
            likeCount: currentLikedStatus
              ? currentLikeCount - 1
              : currentLikeCount + 1,
          },
        }
      : undefined;

    // Perform Optimistic Update via SWR Mutate
    // false means don't revalidate immediately, we'll do it after the API call
    if (optimisticData) {
      mutateItems(optimisticData, false);
    }

    try {
      // 2. Call the appropriate API function
      if (currentLikedStatus) {
        await unlikeCollection(collectionSlug);
      } else {
        await likeCollection(collectionSlug);
      }
      console.log("Like/Unlike successful");
      // 3. Trigger revalidation from server to confirm
      mutateItems();
    } catch (err) {
      console.error("Error liking/unliking collection:", err);
      setLikeError(
        err instanceof Error ? err.message : "Failed to update like status"
      );
      // Revert optimistic update on error
      mutateItems(data, false); // Revert to original data without revalidating yet
      // Optionally trigger a delayed revalidation after revert if needed
      // setTimeout(() => mutateItems(), 1000);

      // Clear error after a few seconds
      setTimeout(() => setLikeError(null), 5000);
    } finally {
      setIsLiking(false);
    }
  };

  // --- Share Handler ---
  const handleGrantAccess = async () => {
    if (
      !collectionSlug ||
      typeof collectionSlug !== "string" ||
      !targetUsername.trim()
    )
      return;

    setIsGrantingAccess(true);
    setGrantAccessError(null);
    setGrantAccessSuccess(false);

    try {
      await grantCollectionAccess(collectionSlug, targetUsername.trim());
      console.log(
        `Access granted to ${targetUsername}, revalidating collection data...`
      );
      setGrantAccessSuccess(true);
      setTargetUsername("");

      // Trigger SWR revalidation to update displayed shared list
      mutateItems();

      setTimeout(() => {
        setIsSharing(false);
        setGrantAccessSuccess(false);
      }, 2000);
    } catch (err) {
      console.error("Error granting access:", err);
      setGrantAccessError(
        err instanceof Error ? err.message : "Failed to grant access"
      );
      setGrantAccessSuccess(false);
    } finally {
      setIsGrantingAccess(false);
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
    // Check for specific permission error
    const isForbidden = itemsError.message?.includes("(Status: 403)");
    return (
      <div className="min-h-screen p-4">
        <Nav />
        <div className="text-center text-red-500 mt-10">
          {isForbidden ? (
            <p>
              Access Denied: You do not have permission to view this private
              collection.
            </p>
          ) : (
            <p>
              Error loading collection:{" "}
              {itemsError.message || "An unknown error occurred"}
            </p>
          )}
        </div>
      </div>
    );
  }

  // Handle collection not found (data is null/empty after loading&no error)
  // Note: A 404 from the API will also be caught by itemsError above
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
      <div className="mb-4 flex justify-between items-start flex-wrap gap-2">
        <div>
          <h1 className="text-2xl font-bold">{collection.name}</h1>
          {/* Show owner/shared status */}
          {!isOwner && ownerUsername && (
            <span className="text-sm text-gray-500">
              Shared by {ownerUsername}
            </span>
          )}
          {isOwner && sharedWithList.length > 0 && (
            <span className="text-sm text-gray-500">
              Shared with: {sharedWithList.map((u) => u.username).join(", ")}
            </span>
          )}
          {isOwner && sharedWithList.length === 0 && !collection.isPublic && (
            <span className="text-sm text-gray-500">Private (Not shared)</span>
          )}
          {isOwner && collection.isPublic && (
            <span className="text-sm text-gray-500">Public</span>
          )}
        </div>
        {/* Like Button Area */}
        <div className="flex items-center space-x-2 mt-1">
          <Button
            variant="outline"
            size="sm"
            onClick={handleLikeToggle}
            disabled={isLiking || isOwner} // Disable if owner OR liking
            title={
              isOwner
                ? "You cannot like your own collection"
                : currentUserHasLiked
                ? "Unlike"
                : "Like"
            }
          >
            {isLiking ? (
              <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-gray-500 mr-2"></div>
            ) : (
              <Heart
                className={`mr-2 h-4 w-4 ${
                  currentUserHasLiked ? "fill-red-500 text-red-500" : ""
                }`}
              />
            )}
            {currentUserHasLiked ? "Liked" : "Like"}
          </Button>
          <span className="text-sm text-gray-600">
            {likeCount} {likeCount === 1 ? "like" : "likes"}
          </span>
        </div>
      </div>

      {likeError && (
        <p className="text-sm text-red-500 mb-2 -mt-2 text-right">
          Error: {likeError}
        </p>
      )}

      {/* Edit/Share Buttons Row */}
      <div className="mb-4 flex space-x-2">
        {/* Edit Button (only for owner) */}
        {isOwner && (
          <Button variant="outline" size="sm" onClick={handleOpenEditDialog}>
            Edit Details
          </Button>
        )}
        {/* Share Button (only for owner) */}
        {isOwner && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setGrantAccessError(null);
              setGrantAccessSuccess(false);
              setTargetUsername("");
              setIsSharing(true);
            }}
          >
            <Share2 className="mr-2 h-4 w-4" />
            Share
          </Button>
        )}
      </div>

      {(collection.note || collection.description) && (
        <div className="mb-4 p-3 bg-gray-50 rounded border border-gray-200">
          <h3 className="font-semibold mb-1">Notes:</h3>
          <p className="text-gray-700 whitespace-pre-wrap">
            {collection.note || collection.description}
          </p>
        </div>
      )}

      <div className="my-4">
        <CommandPalette
          onAddItem={handleAddItem}
          existingItemYoutubeIds={existingItemYoutubeIds}
        />
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

      <Dialog open={isEditing} onOpenChange={setIsEditing}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Edit Collection Details</DialogTitle>
            <DialogDescription>
              Update the notes and visibility for this collection.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="note-textarea" className="text-right">
                Note
              </Label>
              <Textarea
                id="note-textarea"
                value={editableNote}
                onChange={(e) => setEditableNote(e.target.value)}
                placeholder="Add your notes here... Supports basic markdown maybe later?"
                className="col-span-3 h-32"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="public-switch" className="text-right">
                Public
              </Label>
              <div className="col-span-3 flex items-center space-x-2">
                <Switch
                  id="public-switch"
                  checked={editableIsPublic}
                  onCheckedChange={setEditableIsPublic}
                  disabled={collectionSlug === "profile"}
                />
                <span className="text-sm text-muted-foreground">
                  {editableIsPublic
                    ? "Visible to everyone."
                    : "Only visible to you."}
                </span>
              </div>
            </div>
            {saveError && (
              <p className="text-sm text-red-500 col-span-4 text-center">
                Error: {saveError}
              </p>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsEditing(false)}
              disabled={isSaving}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleSaveChanges}
              disabled={isSaving}
            >
              {isSaving ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* --- Share Dialog --- */}
      <Dialog open={isSharing} onOpenChange={setIsSharing}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Share Collection</DialogTitle>
            <DialogDescription>
              Grant access to another WatchLikeMe user by entering their
              username. They must be logged in to view.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="share-username" className="text-right">
                Username
              </Label>
              <Input
                id="share-username"
                value={targetUsername}
                onChange={(e) => setTargetUsername(e.target.value)}
                placeholder="Enter username..."
                className="col-span-3"
                disabled={isGrantingAccess}
              />
            </div>
            {grantAccessSuccess && (
              <p className="text-sm text-green-600 col-span-4 text-center">
                Access granted successfully!
              </p>
            )}
            {grantAccessError && (
              <p className="text-sm text-red-500 col-span-4 text-center">
                Error: {grantAccessError}
              </p>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsSharing(false)}
              disabled={isGrantingAccess}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleGrantAccess}
              disabled={isGrantingAccess || !targetUsername.trim()}
            >
              {isGrantingAccess ? "Granting..." : "Grant Access"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
