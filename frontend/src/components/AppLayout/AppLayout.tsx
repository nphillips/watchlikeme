"use client";

import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import Nav from "@/components/Nav/Nav";
import LeftNavOverlay from "@/components/LeftNav/LeftNavOverlay";
import LeftNav from "@/components/LeftNav/LeftNav";
import { useAuth } from "@/hooks/useAuth";
import { getCollections } from "@/lib/api/collections";
import { Collection, UserCollectionsResponse } from "@/interfaces/index";
import { CollectionsContext } from "@/context/CollectionsContext";
import { cn } from "@/lib/utils";
import useSWR from "swr";

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

  const swrKey = !authLoading && user ? "/api/collections" : null;

  const {
    data: collectionsData,
    error: collectionsError,
    isLoading: swrLoading,
  } = useSWR<UserCollectionsResponse>(swrKey, getCollections, {
    revalidateOnFocus: false,
    shouldRetryOnError: false,
  });

  useEffect(() => {
    console.log("AppLayout: isSheetOpen state changed to:", isSheetOpen);
  }, [isSheetOpen]);

  const handleMenuClick = () => {
    console.log(
      "AppLayout: handleMenuClick called, setting isSheetOpen to true",
    );
    setIsSheetOpen(true);
  };

  const isLoading = swrLoading || authLoading;

  const ownedCollections = collectionsData?.ownedCollections ?? [];
  const sharedCollections = collectionsData?.sharedCollections ?? [];
  const error = collectionsError
    ? collectionsError.message || "Failed to load collections"
    : null;

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
