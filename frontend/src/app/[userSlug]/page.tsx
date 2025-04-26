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
import { useParams } from "next/navigation";
import { useEffect, useMemo } from "react"; // Keep useEffect for logging, maybe
import useSWR from "swr";
import Link from "next/link"; // For linking to specific items if needed
import { Heart } from "lucide-react"; // Import Heart icon
import { Button } from "@/components/ui/button"; // Import Button component

// SWR fetcher (can be shared)
// const fetcher = (url: string) => fetch(url).then((res) => res.json());

export default function UserProfilePage() {
  const { user: loggedInUser, loading: authLoading } = useAuth();
  const { userSlug } = useParams();
  const profileCollectionSlug = "profile";

  // Use the new public API route structure
  const swrKey =
    userSlug && typeof userSlug === "string"
      ? `/api/users/${userSlug}/collections/${profileCollectionSlug}` // Use the new endpoint
      : null;

  // No change needed to SWR fetcher call itself, just the key
  const {
    data,
    error: profileError,
    isLoading: profileLoading,
  } = useSWR<CollectionWithItems>(
    swrKey,
    async (key) => {
      // Fetcher now uses the generated key
      console.log(`[UserProfilePage] SWR Fetcher called with key: ${key}`);
      // Need to use fetch directly or update backendFetch if it doesn't handle this structure
      // Let's use fetch for simplicity here, assuming backendFetch needs adjustment
      const res = await fetch(key); // Key IS the full URL to the backend API now
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

  useEffect(() => {
    console.log(`[UserProfilePage ${userSlug}] SWR data updated:`, data);
  }, [data, userSlug]);

  // Calculate like state (will be false if not logged in or data missing)
  const likeCount = useMemo(
    () => collection?.likeCount ?? 0,
    [collection?.likeCount]
  );
  // currentUserHasLiked needs to come from the *authenticated* check if we want to show
  // the correct state for the logged-in viewer on a public profile.
  // This requires fetching the user's like status separately or adding auth check to the public endpoint.
  // For MVP, let's assume it's always `false` on this public page for now.
  const currentUserHasLiked = false; // TODO: Revisit this for logged-in viewer's status on public pages

  const isOwner = useMemo(
    () => loggedInUser?.username === userSlug,
    [loggedInUser?.username, userSlug]
  );

  // Loading state: wait for auth check AND profile data fetch
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

  // Handle case where data comes back null/empty (user not found or profile collection missing)
  if (!collection) {
    return (
      <div className="min-h-screen p-4">
        <Nav />
        <div className="text-center text-gray-500 mt-10">
          <p>User profile not found.</p>
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
      {collection && (
        <>
          <div className="mb-4 flex justify-between items-start">
            <div>
              <h2 className="text-xl font-semibold mt-6 mb-2">
                {collection.name}
              </h2>
            </div>
            {/* Like Button Area */}
            <div className="flex items-center space-x-2 mt-6">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  /* TODO: Implement Like button logic for public page */
                  /* Needs to handle login prompt if not loggedInUser */
                }}
                title={
                  loggedInUser
                    ? currentUserHasLiked
                      ? "Unlike"
                      : "Like"
                    : "Log in to like"
                }
                disabled={!loggedInUser} // Disable if not logged in
              >
                <Heart
                  className={`mr-2 h-4 w-4 ${
                    currentUserHasLiked ? "fill-red-500 text-red-500" : ""
                  }`}
                />
                Like
              </Button>
              <span className="text-sm text-gray-600">
                {likeCount} {likeCount === 1 ? "like" : "likes"}
              </span>
            </div>
          </div>

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
                  /* TODO: Implement Edit functionality */
                }}
              >
                Edit Note/Settings
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
                    {/* No remove button on public profile view */}
                  </li>
                );
              })}
            </ul>
          )}
        </>
      )}
    </div>
  );
}
