"use client";

import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import Nav from "@/components/Nav/Nav";
import LeftNavOverlay from "@/components/LeftNav/LeftNavOverlay";
import LeftNav from "@/components/LeftNav/LeftNav"; // Desktop version
import { useAuth } from "@/hooks/useAuth"; // Import useAuth
import { getCollections } from "@/lib/api/collections"; // Import API function
import { Collection } from "@/interfaces/index"; // Import Collection type
import { CollectionsContext } from "@/context/CollectionsContext"; // Import the context
import { cn } from "@/lib/utils";

interface AppLayoutProps {
  children: React.ReactNode;
}

const AppLayout = ({ children }: AppLayoutProps) => {
  const pathname = usePathname();
  // Sheet state
  const [isSheetOpen, setIsSheetOpen] = useState(false);

  // Collections state (moved from LeftNav)
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

  // Effect to fetch collections (moved from LeftNav)
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

  // Log state changes (optional)
  useEffect(() => {
    console.log("AppLayout: isSheetOpen state changed to:", isSheetOpen);
  }, [isSheetOpen]);

  const handleMenuClick = () => {
    console.log(
      "AppLayout: handleMenuClick called, setting isSheetOpen to true",
    );
    setIsSheetOpen(true);
  };

  // Combine loading states for props
  const isLoading = collectionsLoading || authLoading;

  // Prepare context value
  const collectionsContextValue = {
    ownedCollections,
    sharedCollections,
    isLoading,
    error,
    currentUser: user,
  };

  return (
    <CollectionsContext.Provider value={collectionsContextValue}>
      {/* Pass auth state down to Nav */}
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

      {/* Render LeftNavOverlay (Mobile Sheet), passing collections data */}
      <LeftNavOverlay
        isOpen={isSheetOpen}
        onOpenChange={setIsSheetOpen}
        ownedCollections={ownedCollections}
        sharedCollections={sharedCollections}
        isLoading={isLoading}
        error={error}
        currentUser={user}
      />

      {/* Render Desktop LeftNav conditionally ONLY IF user is logged in */}
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

      {/* Main content area - padding conditional on user */}
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
