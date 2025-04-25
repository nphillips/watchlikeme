"use client";

import Nav from "@/components/Nav";
import { useAuth } from "@/hooks/useAuth";
import Link from "next/link";

export default function Home() {
  const { user, loading } = useAuth();

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
      <div className="mt-8">
        {user ? (
          <div>
            <h3 className="text-lg font-bold mb-4">
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
            <h2 className="text-2xl font-semibold mb-4">
              Welcome to WatchLikeMe
            </h2>
            <p className="mb-6 text-gray-600">
              Organize and share your favorite YouTube content.
            </p>
            <div className="flex justify-center gap-4">
              <Link
                href="/login"
                className="inline-flex items-center justify-center whitespace-nowrap rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700"
              >
                Log In
              </Link>
              <Link
                href="/register"
                className="inline-flex items-center justify-center whitespace-nowrap rounded-md border border-blue-600 px-4 py-2 text-sm font-medium text-blue-600 shadow-sm hover:bg-blue-50"
              >
                Register
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
