"use client";

import { cn } from "@/lib/utils";
import { Button } from "../ui/button";
import { YouTubeThumbnail } from "../YouTubeThumbnail";

interface CpItemProps {
  id: string;
  title: string;
  thumbnailUrl: string;
  subscriberCount: number;
  children?: React.ReactNode;
}

export function CpItem({ id, title, thumbnailUrl, children }: CpItemProps) {
  return (
    <div
      className={cn(
        "flex justify-between px-4 gap-2 border border-gray-200 rounded-md"
      )}
    >
      <div className="flex-1 flex items-center gap-3">
        <YouTubeThumbnail url={thumbnailUrl} alt={title} size="sm" />
        <span className="line-clamp-1">{title}</span>
      </div>
      {children}
    </div>
  );
}
