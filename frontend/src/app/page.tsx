"use client";

import { CommandPalette } from "@/components/CommandPalette";
import Nav from "@/components/Nav";
import { useAuth } from "@/hooks/useAuth";
import { useState } from "react";

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

      <div>
        <h3>Added items:</h3>
        <ul>
          {addedItems.map((item, index) => (
            <li key={index}>{item.snippet?.title || item.title}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}
