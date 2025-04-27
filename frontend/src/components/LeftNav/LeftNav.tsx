"use client"; // Needs to be a client component for hooks

import { useState, useEffect } from "react";
import { getCollections } from "@/lib/api/collections";
import { Collection } from "@/interfaces/index";
import { useAuth } from "@/hooks/useAuth";
import CollectionsList from "../CollectionsList"; // Import the new component
import LeftNavContent from "./LeftNavContent"; // Re-add this import

const LeftNav = () => {
  const { user, loading: authLoading } = useAuth();
  const [ownedCollections, setOwnedCollections] = useState<Collection[]>([]);
  const [sharedCollections, setSharedCollections] = useState<Collection[]>([]);
  const [collectionsLoading, setCollectionsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Fetch collections only if the user is logged in
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
          console.error("[LeftNav] Failed to load collections:", err);
          setError(
            err instanceof Error ? err.message : "An unknown error occurred",
          );
        } finally {
          setCollectionsLoading(false);
        }
      }
      loadCollections();
    } else if (!authLoading && !user) {
      // Clear data if user logs out or is not logged in
      setCollectionsLoading(false);
      setError(null);
      setOwnedCollections([]);
      setSharedCollections([]);
    }
  }, [authLoading, user]);

  return (
    <div
      data-component="left-nav"
      className="fixed top-[var(--height-nav)] bottom-0 left-0 z-40 w-[var(--width-left-nav)] flex-col border-r border-slate-300 bg-white dark:border-slate-700 dark:bg-slate-900"
    >
      <div className="px-4 py-8 md:px-6">
        {/* Render LeftNavContent and pass data down */}
        <LeftNavContent
          ownedCollections={ownedCollections}
          sharedCollections={sharedCollections}
          isLoading={collectionsLoading || authLoading}
          error={error}
          currentUser={user}
        />
      </div>
    </div>
  );
};

export default LeftNav;
