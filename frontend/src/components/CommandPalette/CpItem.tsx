"use client";

import { cn } from "@/lib/utils";
import { Button } from "../ui/button";

interface CpItemProps {
  id: string;
  title: string;
  thumbnailUrl: string;
  subscriberCount: number;
  children?: React.ReactNode;
}

export function CpItem({ id, title, children }: CpItemProps) {
  return (
    <div
      className={cn(
        "flex justify-between px-4 gap-2 border border-gray-200 rounded-md"
      )}
    >
      <div className="flex-1 flex">{title}</div>
      {children}
    </div>
  );
}
