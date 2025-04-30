"use client";

import { cn } from "@/lib/utils";
import { YouTubeThumbnail } from "../YouTubeThumbnail";

interface CpItemProps {
  id: string;
  title: string;
  thumbnailUrl: string;
  subscriberCount: number;
  children?: React.ReactNode;
  isAdded?: boolean;
}

export function CpItem({ title, thumbnailUrl, children }: CpItemProps) {
  return (
    <div
      className={cn(
        "flex w-full justify-between gap-2 rounded-md border-gray-200 px-4",
      )}
    >
      <div className="flex flex-1 items-center gap-3">
        <YouTubeThumbnail url={thumbnailUrl} alt={title} size="sm" />
        <span className="line-clamp-1">{title}</span>
      </div>
      {children}
    </div>
  );
}

export default CpItem;
