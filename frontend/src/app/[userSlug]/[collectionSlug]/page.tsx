"use client";

import { CommandPalette } from "@/components/CommandPalette";
import Nav from "@/components/Nav";
import { YouTubeThumbnail } from "@/components/YouTubeThumbnail";
import { useAuth } from "@/hooks/useAuth";
import { useParams } from "next/navigation";
import { useState } from "react";

export default function CollectionPage() {
  const { loading } = useAuth();
  const [addedItems, setAddedItems] = useState<any[]>([]);
  const handleAddItem = (item: any) => {
    setAddedItems((prev) => [...prev, item]);
  };
  const { userSlug, collectionSlug } = useParams();

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
      <h1 className="text-2xl font-bold my-4">
        {userSlug} / {collectionSlug}
      </h1>
      <div className="my-4">
        <CommandPalette onAddItem={handleAddItem} />
      </div>
      <h2 className="text-lg font-bold my-4">Channels</h2>

      <ul className="space-y-2">
        {addedItems.map((item, index) => (
          <li
            key={index}
            className="flex items-center gap-3 p-2 border rounded-md"
          >
            <YouTubeThumbnail
              url={item.snippet?.thumbnails?.default?.url || item.thumbnailUrl}
              alt={item.snippet?.title || item.title}
              size="sm"
            />
            <span className="line-clamp-1">
              {item.snippet?.title || item.title}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
