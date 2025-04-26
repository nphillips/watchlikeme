"use client";

// Similar imports to the specific collection page
import Nav from "@/components/Nav";
import { YouTubeThumbnail } from "@/components/YouTubeThumbnail";
import { useAuth } from "@/hooks/useAuth"; // To know if the viewer is the owner
import { getCollectionItems } from "@/lib/api/collections";
import {
  CollectionWithItems,
  Collection,
  PopulatedCollectionItem,
} from "@/interfaces";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react"; // Keep useEffect for logging, maybe, and useState for Liking
import useSWR, { mutate } from "swr";
import Link from "next/link"; // For linking to specific items if needed
import { Heart } from "lucide-react"; // Import Heart icon
import { Button } from "@/components/ui/button"; // Import Button component
import { likeCollection, unlikeCollection } from "@/lib/api/collections";

// SWR fetcher (can be shared)
// const fetcher = (url: string) => fetch(url).then((res) => res.json());

export default function UserProfilePage() {
  const { user: loggedInUser, loading: authLoading } = useAuth();
  const { userSlug } = useParams();
  const profileCollectionSlug = "profile"; // Use the special slug
  const router = useRouter(); // Initialize router

  // Use the public API route structure - acknowledge it might 404 for now
  const swrKey =
    userSlug && typeof userSlug === "string"
      ? `/api/users/${userSlug}/collections/${profileCollectionSlug}`
      : null;

  const {
    data,
    error: profileError,
    isLoading: profileLoading,
    mutate: mutateProfileData,
  } = useSWR<CollectionWithItems>(
    swrKey,
    async (key) => {
      // Fetcher uses the generated key
      console.log(`[UserProfilePage] SWR Fetcher called with key: ${key}`);
      // Use fetch directly for this unauthenticated route
      const res = await fetch(key);
      if (!res.ok) {
        let errorBody = `Failed fetch: ${res.statusText}`;
        try {
          const body = await res.json();
          errorBody = body.error || body.message || errorBody;
        } catch (e) {}
        throw new Error(`${errorBody} (Status: ${res.status})`);
      }
      return res.json();
    },
    {
      revalidateOnFocus: false,
      shouldRetryOnError: false,
    }
  );

  // Extract data (currentUserHasLiked will be undefined)
  const collection: Collection | null = data?.collection ?? null;
  const items: PopulatedCollectionItem[] = data?.items ?? [];

  // --- State for Liking on Profile Page ---
  const [isLiking, setIsLiking] = useState(false);
  const [likeError, setLikeError] = useState<string | null>(null);

  useEffect(() => {
    console.log(`[UserProfilePage ${userSlug}] SWR data updated:`, data);
  }, [data, userSlug]);

  // Calculate like state
  const likeCount = useMemo(
    () => collection?.likeCount ?? 0,
    [collection?.likeCount]
  );
  // TODO: We need a way to fetch the *viewer's* like status for this collection
  // For now, assume false, button logic will handle API calls
  const currentUserHasLiked = false;
  const isOwner = useMemo(
    () => loggedInUser?.username === userSlug,
    [loggedInUser?.username, userSlug]
  );

  // --- Like/Unlike Handler for Profile Page ---
  const handleLikeToggle = async () => {
    // Need the actual collection slug, which is hardcoded here as profileCollectionSlug
    // Ensure collection exists before allowing like
    if (!collection || !profileCollectionSlug) return;
    const slugToLike = collection.slug; // Use slug from the fetched collection data

    if (!loggedInUser) {
      router.push(`/login?redirect=/${userSlug}`); // Redirect to login
      return;
    }

    setIsLiking(true);
    setLikeError(null);

    try {
      // We don't have the viewer's current like status reliably here yet.
      // Let's *attempt* to like first. If it fails with 409 (already liked),
      // then we try to unlike. This isn't ideal UX but works for MVP without extra fetch.
      try {
        console.log(`[Profile Like] Attempting LIKE for ${slugToLike}`);
        await likeCollection(slugToLike);
      } catch (likeError: any) {
        if (
          likeError instanceof Error &&
          likeError.message.includes("(Status: 409)")
        ) {
          console.log(
            `[Profile Like] Already liked, attempting UNLIKE for ${slugToLike}`
          );
          await unlikeCollection(slugToLike);
        } else {
          // Rethrow other errors (like 404, 500, etc.)
          throw likeError;
        }
      }

      console.log("Profile Like/Unlike successful, revalidating...");
      // Revalidate the profile data to get the updated like count
      mutateProfileData();
    } catch (err) {
      console.error("Error toggling like on profile:", err);
      setLikeError(
        err instanceof Error ? err.message : "Failed to update like status"
      );
      setTimeout(() => setLikeError(null), 5000);
    } finally {
      setIsLiking(false);
    }
  };

  // Loading state
  if (authLoading || (profileLoading && !data && !profileError)) {
    return (
      <div className="min-h-screen p-4 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  // Handle fetch errors
  if (profileError) {
    return (
      <div className="min-h-screen p-4">
        <Nav />
        <div className="text-center text-red-500 mt-10">
          <p>
            Error loading profile:{" "}
            {profileError.message || "User profile not found or inaccessible"}
          </p>
        </div>
      </div>
    );
  }

  // Handle collection not found (data is null/empty after loading&no error)
  if (!collection) {
    return (
      <div className="min-h-screen p-4">
        <Nav />
        <div className="text-center text-gray-500 mt-10">
          <p>User profile collection not found.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4">
      <Nav />
      {/* Profile Header */}
      <h1 className="text-3xl font-bold my-4">{userSlug}'s Profile</h1>

      {/* Profile Collection Details */}
      <div className="mb-4 flex justify-between items-start">
        <div>
          <h2 className="text-xl font-semibold mt-6 mb-2">{collection.name}</h2>
        </div>
        <div className="flex items-center space-x-2 mt-6">
          <Button
            variant="outline"
            size="sm"
            onClick={handleLikeToggle}
            title={loggedInUser ? "Like/Unlike" : "Log in to like"}
            disabled={!loggedInUser || isLiking}
          >
            {isLiking ? (
              <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-gray-500 mr-2"></div>
            ) : (
              <Heart className={`mr-2 h-4 w-4`} />
            )}
            Like
          </Button>
          <span className="text-sm text-gray-600">
            {likeCount} {likeCount === 1 ? "like" : "likes"}
          </span>
        </div>
      </div>

      {/* Display Like Error */}
      {likeError && (
        <p className="text-sm text-red-500 mb-2 -mt-2 text-right">
          Error: {likeError}
        </p>
      )}

      {/* Note/Description */}
      {(collection.note || collection.description) && (
        <div className="mb-4 p-3 bg-gray-50 rounded border border-gray-200">
          <p className="text-gray-700 whitespace-pre-wrap">
            {collection.note || collection.description}
          </p>
        </div>
      )}
      {/* Edit button only if owner */}
      {isOwner && (
        <div className="mb-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              /* TODO: Implement Edit profile collection */
            }}
          >
            Edit Profile Collection
          </Button>
        </div>
      )}

      {/* Items List */}
      <h3 className="text-lg font-bold my-4">Shared Items</h3>
      {items.length === 0 && (
        <div className="text-center text-gray-500">
          No items shared on this profile yet.
        </div>
      )}
      {items.length > 0 && (
        <ul className="space-y-2">
          {items.map((item) => {
            // ... item rendering logic ...
            const displayItem = item.channel || item.video;
            const channelInfo = item.channel || item.video?.channel;
            const isVideo = !!item.video;
            if (!displayItem || !channelInfo) return null;
            return (
              <li
                key={item.id}
                className={`flex items-center gap-3 p-2 border rounded-md`}
              >
                {displayItem.thumbnail ? (
                  <YouTubeThumbnail
                    url={displayItem.thumbnail}
                    alt={displayItem.title}
                    size="sm"
                  />
                ) : (
                  <div>No Img</div>
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
