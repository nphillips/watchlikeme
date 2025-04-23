"use client";

import { useState } from "react";
import { ImageIcon } from "@radix-ui/react-icons";

interface YouTubeThumbnailProps {
  url: string;
  alt: string;
  className?: string;
  size?: "sm" | "md" | "lg";
}

const sizeClasses = {
  sm: "h-8 w-8",
  md: "h-10 w-10",
  lg: "h-12 w-12",
};

export function YouTubeThumbnail({
  url,
  alt,
  className = "",
  size = "md",
}: YouTubeThumbnailProps) {
  const [error, setError] = useState(false);

  if (error || !url) {
    return (
      <div
        className={`${sizeClasses[size]} rounded bg-gray-100 flex items-center justify-center ${className}`}
      >
        <ImageIcon className="h-4 w-4 text-gray-400" />
      </div>
    );
  }

  return (
    <img
      src={url}
      alt={alt}
      className={`${sizeClasses[size]} rounded object-cover ${className}`}
      onError={() => setError(true)}
    />
  );
}
