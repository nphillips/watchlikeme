"use client";

import { CommandPalette } from "@/components/CommandPalette";
import Nav from "@/components/Nav";
import { useAuth } from "@/hooks/useAuth";

export default function Home() {
  const { loading } = useAuth();

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
      <CommandPalette />
    </div>
  );
}
