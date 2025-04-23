"use client";

import { CommandPalette } from "@/components/CommandPalette";
import Nav from "@/components/Nav";
import { useAuth } from "@/hooks/useAuth";
import { useState } from "react";
import { YouTubeThumbnail } from "@/components/YouTubeThumbnail";

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
      <CommandPalette onAddItem={handleAddItem} />
      <div className="mt-8">
        <h3 className="text-lg font-bold mb-4">Collection items:</h3>
        <ul className="space-y-2">
          {addedItems.map((item, index) => (
            <li
              key={index}
              className="flex items-center gap-3 p-2 border rounded-md"
            >
              <YouTubeThumbnail
                url={
                  item.snippet?.thumbnails?.default?.url || item.thumbnailUrl
                }
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
    </div>
  );
}
