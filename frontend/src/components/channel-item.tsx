"use client";

import { useState } from "react";
import Image from "next/image";

interface ChannelItemProps {
  id: string;
  title: string;
  thumbnailUrl: string;
  subscriberCount: number;
}

export function ChannelItem({
  id,
  title,
  thumbnailUrl,
  subscriberCount,
}: ChannelItemProps) {
  const [imageError, setImageError] = useState(false);
  const [isImageLoaded, setIsImageLoaded] = useState(false);

  // Placeholder SVG for failed or loading images
  const placeholderImage = `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='64' height='64' viewBox='0 0 64 64'%3E%3Crect width='64' height='64' fill='%23f0f0f0'/%3E%3Ctext x='50%25' y='50%25' font-family='Arial' font-size='24' text-anchor='middle' dominant-baseline='middle' fill='%23999'%3E${title.charAt(
    0
  )}%3C/text%3E%3C/svg%3E`;

  // Generic channel icon as fallback
  const fallbackImage = "/images/channel-placeholder.svg";

  return (
    <div className="border rounded-lg p-4">
      <div className="relative w-16 h-16 mx-auto mb-2">
        {/* Show loading skeleton until image is loaded */}
        {!isImageLoaded && !imageError && (
          <div className="absolute inset-0 bg-gray-200 rounded-full animate-pulse" />
        )}

        {/* The actual image */}
        <Image
          src={imageError ? fallbackImage : thumbnailUrl}
          alt={title}
          width={64}
          height={64}
          className={`rounded-full object-cover transition-opacity duration-300 ${
            isImageLoaded ? "opacity-100" : "opacity-0"
          }`}
          onLoad={() => setIsImageLoaded(true)}
          onError={() => {
            setImageError(true);
            setIsImageLoaded(true);
          }}
          placeholder="blur"
          blurDataURL={placeholderImage}
        />
      </div>
      <h3 className="text-lg font-semibold text-center truncate" title={title}>
        {title}
      </h3>
      <p className="text-sm text-gray-500 text-center">
        {subscriberCount.toLocaleString()} subscribers
      </p>
    </div>
  );
}
