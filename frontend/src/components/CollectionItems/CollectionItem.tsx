import { PopulatedCollectionItem } from "@/interfaces";
import { YouTubeThumbnail } from "@/components/YouTubeThumbnail";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";

interface CollectionItemProps {
  item: PopulatedCollectionItem;
  isOwner: boolean;
  onRemove: () => void;
  isRemoving: boolean;
}

const CollectionItem = ({
  item,
  isOwner,
  onRemove,
  isRemoving,
}: CollectionItemProps) => {
  const displayItem = item.channel || item.video;
  const channelInfo = item.channel || item.video?.channel;
  const isVideo = !!item.video;

  if (!displayItem) {
    console.warn("Skipping rendering item without display data:", item);
    return null;
  }

  const displayChannelInfo = channelInfo || {
    title: "Unknown Channel",
    youtubeId: "",
  };

  return (
    <li
      key={item.id}
      className={`flex flex-col items-center justify-center gap-3 rounded-md border p-2 ${isRemoving ? "opacity-50" : ""}`}
    >
      {displayItem.thumbnail ? (
        <YouTubeThumbnail
          url={displayItem.thumbnail}
          alt={displayItem.title}
          size="2xl"
        />
      ) : (
        <div className="flex h-24 w-24 items-center justify-center rounded bg-gray-200 text-xs text-gray-400">
          No Img
        </div>
      )}
      <span className="flex flex-1 flex-col text-center">
        {item.channel ? (
          <a
            href={`https://www.youtube.com/channel/${item.channel.youtubeId}`}
            target="_blank"
            rel="noopener noreferrer"
            className="line-clamp-1 font-medium hover:underline"
            title={displayItem.title}
          >
            {displayItem.title}
          </a>
        ) : (
          <span className="line-clamp-1 font-medium" title={displayItem.title}>
            {displayItem.title}
          </span>
        )}
        {isVideo && (
          <span
            className="line-clamp-1 text-sm text-gray-500"
            title={displayChannelInfo.title}
          >
            Channel:{" "}
            {displayChannelInfo.youtubeId ? (
              <a
                href={`https://www.youtube.com/channel/${displayChannelInfo.youtubeId}`}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:underline"
              >
                {displayChannelInfo.title}
              </a>
            ) : (
              <span>{displayChannelInfo.title}</span>
            )}
          </span>
        )}
      </span>
      {isOwner && (
        <Button
          variant="ghost"
          size="sm"
          onClick={onRemove}
          disabled={isRemoving}
          aria-label="Remove item"
          className="mt-auto"
        >
          {isRemoving ? (
            <div className="h-4 w-4 animate-spin rounded-full border-t-2 border-b-2 border-gray-500"></div>
          ) : (
            <X className="h-4 w-4" />
          )}
        </Button>
      )}
    </li>
  );
};

export default CollectionItem;
