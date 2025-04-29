"use client";

import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import Nav from "@/components/Nav/Nav";
import LeftNavOverlay from "@/components/LeftNav/LeftNavOverlay";
import LeftNav from "@/components/LeftNav/LeftNav";
import { useAuth } from "@/hooks/useAuth";
import { getCollections } from "@/lib/api/collections";
import { Collection } from "@/interfaces/index";
import { CollectionsContext } from "@/context/CollectionsContext";
import { cn } from "@/lib/utils";

interface AppLayoutProps {
  children: React.ReactNode;
}

const AppLayout = ({ children }: AppLayoutProps) => {
  const pathname = usePathname();
  const [isSheetOpen, setIsSheetOpen] = useState(false);

  const {
    user,
    loading: authLoading,
    isAuthenticated,
    handleLinkGoogle,
  } = useAuth();
  const [ownedCollections, setOwnedCollections] = useState<Collection[]>([]);
  const [sharedCollections, setSharedCollections] = useState<Collection[]>([]);
  const [collectionsLoading, setCollectionsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
          console.error("[AppLayout] Failed to load collections:", err);
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

  useEffect(() => {
    console.log("AppLayout: isSheetOpen state changed to:", isSheetOpen);
  }, [isSheetOpen]);

  const handleMenuClick = () => {
    console.log(
      "AppLayout: handleMenuClick called, setting isSheetOpen to true",
    );
    setIsSheetOpen(true);
  };

  const isLoading = collectionsLoading || authLoading;

  const collectionsContextValue = {
    ownedCollections,
    sharedCollections,
    isLoading,
    error,
    currentUser: user,
  };

  return (
    <CollectionsContext.Provider value={collectionsContextValue}>
      <div
        className={cn(
          "nav-bg fixed top-0 right-0 left-0 z-1 min-h-[var(--height-nav)] bg-blue-950/90 dark:border-b dark:border-slate-600 dark:bg-slate-800/90",
        )}
      ></div>
      <Nav
        onMenuClick={handleMenuClick}
        isAuthenticated={isAuthenticated}
        user={user}
        handleLinkGoogle={handleLinkGoogle}
        topNudge={pathname === "/" && !isAuthenticated ? false : true}
      />

      <LeftNavOverlay
        isOpen={isSheetOpen}
        onOpenChange={setIsSheetOpen}
        ownedCollections={ownedCollections}
        sharedCollections={sharedCollections}
        isLoading={isLoading}
        error={error}
        currentUser={user}
      />

      {user && (
        <div className="hidden md:flex">
          <LeftNav
            ownedCollections={ownedCollections}
            sharedCollections={sharedCollections}
            isLoading={isLoading}
            error={error}
            currentUser={user}
          />
        </div>
      )}

      <main
        data-container="main"
        className={`${user ? "md:pl-[var(--width-left-nav)]" : ""}`.trim()}
      >
        {children}
      </main>
    </CollectionsContext.Provider>
  );
};

export default AppLayout;
