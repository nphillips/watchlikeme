"use client";

import { useState } from "react";
import Image from "next/image";

interface ChannelThumbnailProps {
  title: string;
  thumbnailUrl: string;
}

export function ChannelThumbnail({
  title,
  thumbnailUrl,
}: ChannelThumbnailProps) {
  const [imageError, setImageError] = useState(false);
  const [isImageLoaded, setIsImageLoaded] = useState(false);

  const fallbackImage = "/images/channel-placeholder.svg";

  return (
    <div className="relative w-16 h-16 mx-auto mb-2">
      {!isImageLoaded && !imageError && (
        <div className="absolute inset-0 bg-gray-200 rounded-full animate-pulse" />
      )}

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
        blurDataURL={fallbackImage}
      />
    </div>
  );
}
