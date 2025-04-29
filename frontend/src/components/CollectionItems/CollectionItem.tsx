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
      className={`flex flex-col justify-start gap-3 rounded-md ${isRemoving ? "opacity-50" : ""}`}
    >
      <a
        href={`https://www.youtube.com/channel/${item.channel.youtubeId}`}
        target="_blank"
        rel="noopener noreferrer"
        className="line-clamp-1 flex w-full flex-col items-center justify-center gap-y-2 rounded-md bg-slate-300/50 py-4 font-medium transition-all hover:bg-slate-300 dark:bg-slate-700/50 hover:dark:bg-slate-700"
        title={displayItem.title}
      >
        {displayItem.thumbnail ? (
          <YouTubeThumbnail
            url={displayItem.thumbnail}
            alt={displayItem.title}
            size="xl"
          />
        ) : (
          <div className="flex h-24 w-24 items-center justify-center rounded bg-gray-200 text-xs text-gray-400">
            No Img
          </div>
        )}
        <span className="flex flex-1 flex-col text-center">
          {item.channel ? (
            <div>{displayItem.title}</div>
          ) : (
            <span
              className="line-clamp-1 font-medium"
              title={displayItem.title}
            >
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
      </a>
      {isOwner && (
        <Button
          variant="outline"
          size="sm"
          onClick={onRemove}
          disabled={isRemoving}
          aria-label="Remove item"
          className="bg-white"
        >
          {isRemoving ? (
            <div className="h-4 w-4 animate-spin rounded-full border-t-2 border-b-2 border-gray-500"></div>
          ) : (
            <div className="flex items-center gap-2">
              <X className="h-4 w-4" />
              <span>Remove</span>
            </div>
          )}
        </Button>
      )}
    </li>
  );
};

export default CollectionItem;
