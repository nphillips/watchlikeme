"use client";

import Nav from "@/components/Nav";
import { useAuth } from "@/hooks/useAuth";
import { useState } from "react";
import Link from "next/link";

export default function Home() {
  const { loading } = useAuth();
  const [addedItems, setAddedItems] = useState<any[]>([]);

  const handleAddItem = (item: any) => {
    setAddedItems((prev) => [...prev, item]);
  };

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
        <h3 className="text-lg font-bold mb-4">Collection items:</h3>
        <Link href="/collections" className="text-blue-500 hover:text-blue-700">
          View Collections
        </Link>
      </div>
    </div>
  );
}
