"use client";

import { useAuth } from "@/hooks/useAuth";
import { useCollections } from "@/context/CollectionsContext";
import CollectionsList from "@/components/CollectionsList";
import MarqueeGrid from "@/components/MarqueeGrid";
import { NewColTrigger } from "@/components/NewCol";

export default function Home() {
  const { user, loading: authLoading, handleLinkGoogle } = useAuth();
  const {
    ownedCollections,
    sharedCollections,
    isLoading: collectionsLoading,
    error,
    currentUser,
  } = useCollections();

  const isLoading = authLoading || collectionsLoading;

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="h-8 w-8 animate-spin rounded-full border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col pb-10">
      <div>
        {user ? (
          <div className="px-4 py-8 md:px-6">
            <h2 className="text-xl font-semibold">Home Page Content</h2>
            <p className="mt-2 text-gray-600 dark:text-gray-400">
              Welcome back, {user.username || user.email}!
            </p>

            <div className="mt-6 md:hidden">
              <CollectionsList
                ownedCollections={ownedCollections}
                sharedCollections={sharedCollections}
                isLoading={isLoading}
                error={error}
                currentUser={currentUser}
              />
            </div>

            {!user.hasGoogleAuth && (
              <button
                onClick={handleLinkGoogle}
                className="mt-4 flex items-center gap-1 rounded bg-blue-500 px-3 py-1 text-sm text-white hover:bg-blue-600"
              >
                <svg
                  viewBox="0 0 24 24"
                  width="16"
                  height="16"
                  className="inline-block"
                >
                  <path
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    fill="#ffffff"
                  />
                  <path
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    fill="#ffffff"
                  />
                  <path
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    fill="#ffffff"
                  />
                  <path
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    fill="#ffffff"
                  />
                </svg>
                Link Google Account
              </button>
            )}
          </div>
        ) : (
          <div>
            <div className="dark relative isolate flex h-screen flex-col items-center justify-center overflow-hidden bg-linear-to-t from-slate-900 to-indigo-500 text-slate-100 md:h-[42rem] md:min-h-[40rem]">
              {/* <Image
                src="/images/background-texture.jpeg"
                alt="Background"
                fill
                className="absolute inset-0 z-[-2] h-full w-full object-cover opacity-5"
              /> */}
              <div className="absolute top-1/2 left-0 z-[-1] -translate-y-1/2 opacity-25">
                <MarqueeGrid />
              </div>
              <div className="font-display text-clamp-h1 flex max-w-[20em] flex-col items-center justify-center px-4 text-center text-balance md:px-6">
                Discover, curate, and celebrate your YouTube channels.
              </div>
              <div className="text-clamp-h3 mt-[1em] max-w-[20em] text-center font-medium text-balance">
                YouTube channels are hidden gems—let’s give them the spotlight
                they deserve.
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
