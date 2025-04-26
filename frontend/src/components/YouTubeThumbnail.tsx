"use client";

import { useState } from "react";
import Image from "next/image";
import { ImageIcon } from "@radix-ui/react-icons";
import { cn } from "@/lib/utils";

interface YouTubeThumbnailProps {
  url: string | null | undefined;
  alt: string;
  className?: string;
  size?: "sm" | "md" | "lg" | "xl" | "2xl";
}

const sizeClasses = {
  sm: "h-8 w-8",
  md: "h-10 w-10",
  lg: "h-12 w-12",
  xl: "h-24 w-24",
  "2xl": "h-[136px] w-[136px]",
};

const fallbackImage = "/images/placeholder-image.svg";

export function YouTubeThumbnail({
  url,
  alt,
  className = "",
  size = "md",
}: YouTubeThumbnailProps) {
  const [imageError, setImageError] = useState(false);
  const [isImageLoaded, setIsImageLoaded] = useState(false);
  const effectiveSize = sizeClasses[size];

  const srcUrl = imageError || !url ? fallbackImage : url;

  return (
    <div className={cn("relative rounded", effectiveSize, className)}>
      {!isImageLoaded && !imageError && url && (
        <div
          className={cn(
            "absolute inset-0 bg-gray-200 rounded animate-pulse",
            effectiveSize
          )}
        />
      )}

      {(imageError || !url) && (
        <div
          className={cn(
            "absolute inset-0 bg-gray-100 rounded flex items-center justify-center",
            effectiveSize
          )}
        >
          <ImageIcon className="h-4 w-4 text-gray-400" />
        </div>
      )}

      {url && (
        <Image
          key={srcUrl}
          src={srcUrl}
          alt={alt}
          fill
          sizes={effectiveSize.split(" ")[1]}
          className={cn(
            "rounded-full object-cover transition-opacity duration-300 ",
            isImageLoaded ? "opacity-100" : "opacity-0"
          )}
          onLoad={() => {
            if (!imageError) {
              setIsImageLoaded(true);
            }
          }}
          onError={() => {
            console.warn(`Failed to load image: ${url}`);
            setImageError(true);
            setIsImageLoaded(true);
          }}
        />
      )}
    </div>
  );
}
