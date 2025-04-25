"use client"; // Mark as client component if using hooks like SWR/React Query later, but for simple async fetch, server component is fine.
// For now, let's make it a server component for simplicity.

import Link from "next/link";
// Fall back to relative paths
import { getCollections } from "@/lib/api/collections";
import { Collection } from "@/interfaces/index"; // Explicit index might still be needed with relative path
import { useEffect, useState } from "react";
import Nav from "@/components/Nav";
import { useAuth } from "@/hooks/useAuth";

// Let's make this a client component to handle loading/error states easily
export default function CollectionsPage() {
  const [collections, setCollections] = useState<Collection[]>([]);
  const [collectionsLoading, setCollectionsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user, loading: authLoading } = useAuth();

  useEffect(() => {
    if (!authLoading && user) {
      async function loadCollections() {
        setCollectionsLoading(true);
        setError(null);
        try {
          const fetchedCollections = await getCollections();
          setCollections(fetchedCollections);
        } catch (err) {
          console.error("Failed to load collections:", err);
          setError(
            err instanceof Error ? err.message : "An unknown error occurred"
          );
        } finally {
          setCollectionsLoading(false);
        }
      }
      loadCollections();
    } else if (!authLoading && !user) {
      setCollectionsLoading(false);
      setError(null);
      setCollections([]);
    }
  }, [authLoading, user]);

  if (authLoading) {
    return (
      <div className="min-h-screen p-4 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen p-4">
        <Nav />
        <div className="text-center mt-10">
          <p>Please log in to view your collections.</p>
          <Link
            href="/login"
            className="mt-4 inline-block bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
          >
            Log In
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4">
      <Nav />

      <h1 className="text-2xl font-bold my-4">My Collections</h1>

      {collectionsLoading && <p>Loading collections...</p>}

      {error && (
        <div>
          <p style={{ color: "red" }}>Error loading collections:</p>
          <pre>{error}</pre>
        </div>
      )}

      {!collectionsLoading && !error && (
        <>
          {collections.length === 0 ? (
            <p>You haven't created any collections yet.</p>
          ) : (
            <ul>
              {collections.map((collection) => (
                <li key={collection.id}>
                  <Link
                    href={`/${collection.userSlug || user.username}/${
                      collection.slug
                    }`}
                    className="text-blue-500 hover:text-blue-700"
                  >
                    {collection.name}
                  </Link>
                  {collection.description && <p>{collection.description}</p>}
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  );
}
