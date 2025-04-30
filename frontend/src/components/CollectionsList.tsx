"use client";

import { Collection } from "@/interfaces/index";
import Link from "next/link";
import { NewColTrigger } from "./NewCol";

interface CollectionsListProps {
  ownedCollections: Collection[];
  sharedCollections: Collection[];
  isLoading: boolean;
  error: string | null;
  currentUser: { username: string } | null;
}

const CollectionsList = ({
  ownedCollections,
  sharedCollections,
  isLoading,
  error,
  currentUser,
}: CollectionsListProps) => {
  if (isLoading) {
    return <p>Loading collections...</p>;
  }

  if (error) {
    return (
      <div>
        <p style={{ color: "red" }}>Error loading collections:</p>
        <pre>{error}</pre>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <div className="mb-6">
          <NewColTrigger />
        </div>
        <div className="flex items-center justify-between">
          <h2 className="mb-2 text-lg font-semibold">My Collections</h2>
          <div className="text-xs text-gray-500 dark:text-gray-400">
            created:
          </div>
        </div>
        {ownedCollections.length === 0 ? (
          <p className="text-sm text-gray-500 dark:text-gray-400">
            You haven&apos;t created any collections yet.
          </p>
        ) : (
          <ul className="space-y-1">
            {ownedCollections.map((collection) => {
              const formattedDate = collection.createdAt
                ? new Date(collection.createdAt).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                  })
                : "";

              // Check if shared - ensure sharedWith exists before accessing length/map
              const isShared = !!(
                collection.sharedWith && collection.sharedWith.length > 0
              );
              const sharedWithUsernames =
                isShared && collection.sharedWith // Check again before mapping
                  ? collection.sharedWith.map((u) => u.username).join(", ")
                  : "";

              return (
                <li
                  key={collection.id}
                  // Use flex-col for the main content area to stack link and shared info
                  className="flex items-start justify-between py-1"
                >
                  {/* Left side: Link and Shared With Info */}
                  <div className="flex-1 overflow-hidden pr-2">
                    {" "}
                    {/* Allow shrinking/truncation */}
                    <Link
                      href={`/${collection.userSlug || currentUser?.username}/${collection.slug}`}
                      className="block truncate text-blue-500 hover:underline dark:text-blue-400"
                      title={collection.name} // Add title for full name on hover
                    >
                      {isShared && <span className="mr-1">★</span>}
                      {/* Add star if shared */}
                      {collection.name}
                    </Link>
                    {/* Add Shared With line below the link if shared */}
                    {isShared && (
                      <div className="mt-0.5 truncate text-xs text-gray-500 dark:text-gray-400">
                        Shared with: {sharedWithUsernames}
                      </div>
                    )}
                  </div>

                  {/* Right side: Date */}
                  {formattedDate && (
                    <span className="mt-1 ml-2 flex-shrink-0 text-xs whitespace-nowrap text-gray-400 dark:text-gray-500">
                      {formattedDate}
                    </span>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <div>
        <div className="flex items-center justify-between">
          <h2 className="mb-2 text-lg font-semibold">Shared With Me</h2>
          <div className="text-xs text-gray-500 dark:text-gray-400">from:</div>
        </div>
        {sharedCollections.length === 0 ? (
          <p className="text-sm text-gray-500 dark:text-gray-400">
            No collections have been shared with you yet.
          </p>
        ) : (
          <ul className="space-y-1">
            {sharedCollections.map((collection) => {
              const formattedDate = collection.createdAt
                ? new Date(collection.createdAt).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                  })
                : "";

              return (
                <li
                  key={collection.id}
                  className="flex items-center justify-between"
                >
                  <div className="flex-1 truncate overflow-hidden pr-2">
                    <Link
                      href={`/${collection.ownerUsername}/${collection.slug}`}
                      className="text-blue-500 hover:underline dark:text-blue-400"
                    >
                      {collection.name}
                    </Link>
                  </div>
                  {formattedDate && (
                    <div className="ml-2 text-xs whitespace-nowrap text-gray-400 dark:text-gray-500">
                      {collection.ownerUsername}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
};

export default CollectionsList;
