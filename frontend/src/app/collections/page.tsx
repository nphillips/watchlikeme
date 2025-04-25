"use client"; // Mark as client component if using hooks like SWR/React Query later, but for simple async fetch, server component is fine.
// For now, let's make it a server component for simplicity.

import Link from "next/link";
// Fall back to relative paths
import { getCollections } from "@/lib/api/collections";
import { Collection } from "@/interfaces/index"; // Explicit index might still be needed with relative path
import { useEffect, useState } from "react";
import Nav from "@/components/Nav";
import { useAuth } from "@/hooks/useAuth";
import { useParams } from "next/navigation";

// Let's make this a client component to handle loading/error states easily
export default function CollectionsPage() {
  const [collections, setCollections] = useState<Collection[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { loading } = useAuth();
  const { userSlug } = useParams();
  useEffect(() => {
    async function loadCollections() {
      setIsLoading(true);
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
        setIsLoading(false);
      }
    }

    loadCollections();
  }, []); // Empty dependency array ensures this runs once on mount

  if (loading) {
    return (
      <div className="min-h-screen p-4 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }
  return (
    <div className="min-h-screen p-4">
      <Nav />

      <h1 className="text-2xl font-bold my-4">My Collections</h1>

      {isLoading && <p>Loading collections...</p>}

      {error && (
        <div>
          <p style={{ color: "red" }}>Error loading collections:</p>
          <pre>{error}</pre>
        </div>
      )}

      {!isLoading && !error && (
        <>
          {collections.length === 0 ? (
            <p>You haven't created any collections yet.</p>
          ) : (
            <ul>
              {collections.map((collection) => (
                <li key={collection.id}>
                  {/* TODO: Update link when individual collection page exists */}
                  {/* <Link href={`/collections/${collection.slug}`}> */}
                  <Link
                    href={`/${collection.userSlug}/${collection.slug}`}
                    className="text-blue-500 hover:text-blue-700"
                  >
                    {collection.name}
                  </Link>
                  {/* </Link> */}
                  {collection.description && <p>{collection.description}</p>}
                  {/* Optionally display item count or previews later */}
                  {/* <p>{collection.items?.length ?? 0} items</p> */}
                </li>
              ))}
            </ul>
          )}
          {/* TODO: Add a button/link to create a new collection */}
        </>
      )}
    </div>
  );
}
