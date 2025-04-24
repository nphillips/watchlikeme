"use client"; // Mark as client component if using hooks like SWR/React Query later, but for simple async fetch, server component is fine.
// For now, let's make it a server component for simplicity.

import Link from "next/link";
// Fall back to relative paths
import { getCollections } from "@/lib/api/collections";
import { Collection } from "@/interfaces/index"; // Explicit index might still be needed with relative path
import { useEffect, useState } from "react";

// Let's make this a client component to handle loading/error states easily
export default function CollectionsPage() {
  const [collections, setCollections] = useState<Collection[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

  return (
    <div>
      <h1>Your Collections</h1>

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
                  <h3>{collection.name}</h3>
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
