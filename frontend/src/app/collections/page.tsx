"use client";

import Link from "next/link";
import { getCollections } from "@/lib/api/collections";
import { UserCollectionsResponse, Collection } from "@/interfaces/index";
import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";

export default function CollectionsPage() {
  const [ownedCollections, setOwnedCollections] = useState<Collection[]>([]);
  const [sharedCollections, setSharedCollections] = useState<Collection[]>([]);
  const [collectionsLoading, setCollectionsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user, loading: authLoading } = useAuth();

  useEffect(() => {
    if (!authLoading && user) {
      async function loadCollections() {
        setCollectionsLoading(true);
        setError(null);
        try {
          const {
            ownedCollections: fetchedOwned,
            sharedCollections: fetchedShared,
          } = await getCollections();
          setOwnedCollections(fetchedOwned);
          setSharedCollections(fetchedShared);
        } catch (err) {
          console.error("Failed to load collections:", err);
          setError(
            err instanceof Error ? err.message : "An unknown error occurred",
          );
        } finally {
          setCollectionsLoading(false);
        }
      }
      loadCollections();
    } else if (!authLoading && !user) {
      setCollectionsLoading(false);
      setError(null);
      setOwnedCollections([]);
      setSharedCollections([]);
    }
  }, [authLoading, user]);

  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="h-8 w-8 animate-spin rounded-full border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex min-h-screen flex-col">
        <div className="flex flex-1 flex-col items-center py-10">
          <p>Please log in to view your collections.</p>
          <Link
            href="/login"
            className="mt-4 inline-block rounded bg-blue-500 px-4 py-2 text-white hover:bg-blue-600"
          >
            Log In
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col">
      <div className="flex flex-1 flex-col items-center py-10">
        <div className="container w-full px-4 md:px-6">
          <h1 className="my-4 text-2xl font-bold">Collections</h1>

          {collectionsLoading && <p>Loading collections...</p>}

          {error && (
            <div>
              <p style={{ color: "red" }}>Error loading collections:</p>
              <pre>{error}</pre>
            </div>
          )}

          {!collectionsLoading && !error && (
            <div className="space-y-6">
              <div>
                <h2 className="mb-2 text-xl font-semibold">My Collections</h2>
                {ownedCollections.length === 0 ? (
                  <p className="text-gray-500">
                    You haven't created any collections yet.
                  </p>
                ) : (
                  <ul className="space-y-1">
                    {ownedCollections.map((collection) => (
                      <li key={collection.id}>
                        <Link
                          href={`/${collection.userSlug || user.username}/${
                            collection.slug
                          }`}
                          className="text-blue-500 hover:text-blue-700"
                        >
                          {collection.name}
                        </Link>
                        {collection.sharedWith &&
                          collection.sharedWith.length > 0 && (
                            <span className="ml-2 text-xs text-gray-400">
                              (Shared with:{" "}
                              {collection.sharedWith
                                .map((u) => u.username)
                                .join(", ")}
                              )
                            </span>
                          )}
                        {!collection.isPublic &&
                          (!collection.sharedWith ||
                            collection.sharedWith.length === 0) && (
                            <span className="ml-2 text-xs text-gray-400">
                              (Private)
                            </span>
                          )}
                        {collection.description && (
                          <p className="pl-2 text-sm text-gray-600">
                            {collection.description}
                          </p>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div>
                <h2 className="mb-2 text-xl font-semibold">Shared With Me</h2>
                {sharedCollections.length === 0 ? (
                  <p className="text-gray-500">
                    No collections have been shared with you yet.
                  </p>
                ) : (
                  <ul className="space-y-1">
                    {sharedCollections.map((collection) => (
                      <li key={collection.id}>
                        <Link
                          href={`/${collection.ownerUsername}/${collection.slug}`}
                          className="text-blue-500 hover:text-blue-700"
                        >
                          {collection.name}
                        </Link>
                        <span className="ml-2 text-xs text-gray-400">
                          (Shared by: {collection.ownerUsername})
                        </span>
                        {collection.description && (
                          <p className="pl-2 text-sm text-gray-600">
                            {collection.description}
                          </p>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
