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
    <div className="space-y-4">
      <div>
        <div className="mb-6">
          <NewColTrigger />
        </div>
        <h2 className="mb-2 text-lg font-semibold">My Collections</h2>
        {ownedCollections.length === 0 ? (
          <p className="text-sm text-gray-500 dark:text-gray-400">
            You haven't created any collections yet.
          </p>
        ) : (
          <ul className="space-y-1">
            {ownedCollections.map((collection) => (
              <li key={collection.id}>
                <Link
                  href={`/${collection.userSlug || currentUser?.username}/${collection.slug}`}
                  className="text-blue-500 hover:underline dark:text-blue-400"
                >
                  {collection.name}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div>
        <h2 className="mb-2 text-lg font-semibold">Shared With Me</h2>
        {sharedCollections.length === 0 ? (
          <p className="text-sm text-gray-500 dark:text-gray-400">
            No collections have been shared with you yet.
          </p>
        ) : (
          <ul className="space-y-1">
            {sharedCollections.map((collection) => (
              <li key={collection.id}>
                <Link
                  href={`/${collection.ownerUsername}/${collection.slug}`}
                  className="text-blue-500 hover:underline dark:text-blue-400"
                >
                  {collection.name}
                </Link>
                <span className="ml-2 text-xs text-gray-500 dark:text-gray-400">
                  (from {collection.ownerUsername})
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

export default CollectionsList;
