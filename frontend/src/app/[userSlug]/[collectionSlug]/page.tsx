"use client";
import { CommandPalette } from "@/components/CommandPalette";
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
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import CollectionItems from "@/components/CollectionItems/CollectionItems";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

interface PaletteItem {
  id: string | { videoId?: string; channelId?: string };
  title?: string;
  thumbnailUrl?: string;
  snippet?: {
    title: string;
    thumbnails: {
      default: { url: string };
    };
    channelId?: string;
  };
}

export default function CollectionPage() {
  const { user: loggedInUser, loading: authLoading } = useAuth();
  const { userSlug, collectionSlug } = useParams();
  const router = useRouter();

  const swrKey = collectionSlug
    ? `/api/collections/${collectionSlug}/items`
    : null;

  const {
    data,
    error: itemsError,
    isLoading: itemsLoading,
    mutate: mutateItems,
  } = useSWR<CollectionWithItems>(
    swrKey,
    () => {
      if (!collectionSlug || typeof collectionSlug !== "string") {
        throw new Error("Invalid collection identifier.");
      }
      return getCollectionItems(collectionSlug);
    },
    {
      revalidateOnFocus: false,
    },
  );

  const collection: Collection | null = data?.collection ?? null;
  const items: PopulatedCollectionItem[] = data?.items ?? [];

  useEffect(() => {
    console.log("[CollectionPage] SWR data updated:", data);
  }, [data]);

  const [isAdding, setIsAdding] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);
  const [removingItemId, setRemovingItemId] = useState<string | null>(null);
  const [removeError, setRemoveError] = useState<string | null>(null);

  const existingItemYoutubeIds = useMemo(() => {
    const idSet = new Set<string>();
    items.forEach((item) => {
      if (item.channel?.youtubeId) {
        idSet.add(item.channel.youtubeId);
      } else if (item.video?.youtubeId) {
        idSet.add(item.video.youtubeId);
      }
    });
    console.log("[CollectionPage] Recalculated existingItemYoutubeIds:", idSet);
    return idSet;
  }, [items]);

  const [isEditing, setIsEditing] = useState(false);
  const [editableNote, setEditableNote] = useState<string>("");
  const [editableIsPublic, setEditableIsPublic] = useState<boolean>(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    if (collection?.note) {
      setEditableNote(collection.note);
    } else {
      setEditableNote("");
    }
    setEditableIsPublic(collection?.isPublic ?? true);
  }, [collection?.note, collection?.isPublic]);

  const [isLiking, setIsLiking] = useState(false);
  const [likeError, setLikeError] = useState<string | null>(null);

  const likeCount = useMemo(
    () => collection?.likeCount ?? 0,
    [collection?.likeCount],
  );
  const currentUserHasLiked = useMemo(
    () => collection?.currentUserHasLiked ?? false,
    [collection?.currentUserHasLiked],
  );
  const isOwner = useMemo(
    () => loggedInUser?.id === collection?.userId,
    [loggedInUser?.id, collection?.userId],
  );

  const [isSharing, setIsSharing] = useState(false);
  const [targetUsername, setTargetUsername] = useState("");
  const [isGrantingAccess, setIsGrantingAccess] = useState(false);
  const [grantAccessError, setGrantAccessError] = useState<string | null>(null);
  const [grantAccessSuccess, setGrantAccessSuccess] = useState(false);

  const ownerUsername = collection?.ownerUsername;
  const sharedWithList = useMemo(
    () => collection?.sharedWith ?? [],
    [collection?.sharedWith],
  );

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
      mutateItems();
    } catch (err) {
      console.error(`Error removing item ${collectionItemId}:`, err);
      setRemoveError(
        err instanceof Error ? err.message : "Failed to remove item",
      );
      setTimeout(() => setRemoveError(null), 5000);
    } finally {
      setRemovingItemId(null);
    }
  };

  const handleOpenEditDialog = () => {
    setEditableNote(collection?.note || "");
    setEditableIsPublic(collection?.isPublic ?? true);
    setSaveError(null);
    setIsEditing(true);
  };

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
        err instanceof Error ? err.message : "Failed to save changes",
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handleLikeToggle = async () => {
    if (!collectionSlug || typeof collectionSlug !== "string") return;

    if (!loggedInUser) {
      router.push(`/login?redirect=/${userSlug}/${collectionSlug}`);
      return;
    }

    setIsLiking(true);
    setLikeError(null);

    const currentLikedStatus = currentUserHasLiked;
    const currentLikeCount = likeCount;

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

    if (optimisticData) {
      mutateItems(optimisticData, false);
    }

    try {
      if (currentLikedStatus) {
        await unlikeCollection(collectionSlug);
      } else {
        await likeCollection(collectionSlug);
      }
      console.log("Like/Unlike successful");
      mutateItems();
    } catch (err) {
      console.error("Error liking/unliking collection:", err);
      setLikeError(
        err instanceof Error ? err.message : "Failed to update like status",
      );
      mutateItems(data, false);
      setTimeout(() => setLikeError(null), 5000);
    } finally {
      setIsLiking(false);
    }
  };

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
        `Access granted to ${targetUsername}, revalidating collection data...`,
      );
      setGrantAccessSuccess(true);
      setTargetUsername("");

      mutateItems();

      setTimeout(() => {
        setIsSharing(false);
        setGrantAccessSuccess(false);
      }, 2000);
    } catch (err) {
      console.error("Error granting access:", err);
      setGrantAccessError(
        err instanceof Error ? err.message : "Failed to grant access",
      );
      setGrantAccessSuccess(false);
    } finally {
      setIsGrantingAccess(false);
    }
  };

  if (authLoading || (itemsLoading && !data)) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="h-8 w-8 animate-spin rounded-full border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (itemsError) {
    const isForbidden = itemsError.message?.includes("(Status: 403)");
    return (
      <div className="min-h-screen p-4">
        <div className="mt-10 text-center text-red-500">
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

  if (!collection) {
    return (
      <div className="flex min-h-screen flex-col">
        <div className="flex flex-1 flex-col items-center py-10">
          <div className="container w-full px-4 md:px-6">
            <p>Collection not found.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col">
      <div className="flex flex-1 flex-col items-center py-10">
        <div className="container w-full px-4 md:px-6">
          <div>
            <div>
              <h1 className="font-display text-5xl font-bold text-slate-700 dark:text-slate-200">
                {collection.name}
              </h1>
              {!isOwner && ownerUsername && (
                <span className="text-sm text-gray-500">
                  Shared by {ownerUsername}
                </span>
              )}
              {isOwner && sharedWithList.length > 0 && (
                <span className="text-sm text-gray-500">
                  Shared with:{" "}
                  {sharedWithList.map((u) => u.username).join(", ")}
                </span>
              )}
              {isOwner && sharedWithList.length === 0 && (
                <span className="text-sm text-gray-500">
                  Private (Not shared)
                </span>
              )}
            </div>
            <div className="mt-1 flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleLikeToggle}
                disabled={isLiking || isOwner}
                className={cn("bg-white", isOwner && "hidden")}
                title={
                  isOwner
                    ? "You cannot like your own collection"
                    : currentUserHasLiked
                      ? "Unlike"
                      : "Like"
                }
              >
                {isLiking ? (
                  <div className="mr-2 h-4 w-4 animate-spin rounded-full border-t-2 border-b-2 border-gray-500"></div>
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
            <p className="-mt-2 mb-2 text-right text-sm text-red-500">
              Error: {likeError}
            </p>
          )}

          <div className="mb-4 flex space-x-2">
            {isOwner && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleOpenEditDialog}
                className="bg-white"
              >
                Edit Details
              </Button>
            )}
            {isOwner && (
              <Button
                className="bg-white"
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
            <div className="mb-4 rounded border border-gray-200 bg-gray-50 p-3 text-gray-700 dark:border-gray-700 dark:bg-gray-900 dark:text-white">
              <h3 className="mb-1 font-semibold">Notes:</h3>
              <p className="whitespace-pre-wrap">
                {collection.note || collection.description}
              </p>
            </div>
          )}

          {isOwner && (
            <div className="my-4">
              <CommandPalette
                onAddItem={handleAddItem}
                existingItemYoutubeIds={existingItemYoutubeIds}
              />
              {isAdding && (
                <p className="mt-2 text-sm text-blue-500">Adding item...</p>
              )}
              {addError && (
                <p className="mt-2 text-sm text-red-500">
                  Error adding: {addError}
                </p>
              )}
              {removeError && (
                <p className="mt-2 text-sm text-red-500">
                  Error removing: {removeError}
                </p>
              )}
            </div>
          )}

          <h2 className="my-4 text-lg font-bold">Items in Collection</h2>
          <CollectionItems
            items={items}
            isLoading={itemsLoading}
            isOwner={isOwner}
            onRemoveItem={handleRemoveItem}
            removingItemId={removingItemId}
          />

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
                    <span className="text-muted-foreground text-sm">
                      {editableIsPublic
                        ? "Visible to everyone."
                        : "Only visible to you."}
                    </span>
                  </div>
                </div>
                {saveError && (
                  <p className="col-span-4 text-center text-sm text-red-500">
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
                    className="col-span-3 bg-white"
                    disabled={isGrantingAccess}
                  />
                </div>
                {grantAccessSuccess && (
                  <p className="col-span-4 text-center text-sm text-green-600">
                    Access granted successfully!
                  </p>
                )}
                {grantAccessError && (
                  <p className="col-span-4 text-center text-sm text-red-500">
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
      </div>
    </div>
  );
}
