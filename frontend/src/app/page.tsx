"use client";

import Nav from "@/components/Nav";
import { useAuth } from "@/hooks/useAuth";
import Link from "next/link";

export default function Home() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="h-8 w-8 animate-spin rounded-full border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col">
      <Nav />
      <div className="flex flex-1 flex-col items-center py-10">
        <div className="container w-full px-4 md:px-6">
          {user ? (
            <div>
              <h3 className="mb-4 text-lg font-bold">
                Welcome, {user.username || user.email}!
              </h3>
              <Link
                href="/collections"
                className="text-blue-500 hover:text-blue-700"
              >
                View Your Collections
              </Link>
            </div>
          ) : (
            <div className="text-center">
              <h2 className="mb-4 text-2xl font-semibold">
                Welcome to WatchLikeMe
              </h2>
              <p className="mb-6 text-balance text-gray-600 dark:text-gray-400">
                Organize and share your favorite YouTube content.
              </p>
              <div className="flex justify-center gap-4">
                <Link
                  href="/login"
                  className="inline-flex items-center justify-center rounded-md bg-blue-600 px-4 py-2 text-sm font-medium whitespace-nowrap text-white shadow-sm hover:bg-blue-700"
                >
                  Log In
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
