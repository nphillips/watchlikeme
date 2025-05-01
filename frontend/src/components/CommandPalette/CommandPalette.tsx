"use client";

import { useEffect, useState, useRef } from "react";
import useSWRInfinite from "swr/infinite";
import useSWR from "swr";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Command,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
} from "@/components/ui/command";
import { CpItem } from "./CpItem";
import { YouTubeThumbnail } from "@/components/YouTubeThumbnail";
import { Loader2 } from "lucide-react";

interface Channel {
  id: string;
  title: string;
  thumbnailUrl: string;
  subscriberCount: number;
}

interface SubscriptionPage {
  items: Channel[];
  nextPageToken: string | null;
}

interface CommandPaletteProps {
  onAddItem: (item: any) => void;
  onRemoveItem: (youtubeId: string) => void;
  existingItemsMap?: Map<string, string> | null;
}

const fetcher = async (url: string) => {
  const res = await fetch(url);
  if (!res.ok) {
    const errorText = await res.text();
    console.error(`[Fetcher] Error fetching ${url}: ${errorText}`);
    throw new Error(errorText || `Fetch error: ${res.status}`);
  }
  try {
    return await res.json();
  } catch (e) {
    console.error(`[Fetcher] Error parsing JSON from ${url}:`, e);
    throw new Error(`Invalid JSON response from ${url}`);
  }
};

const SUBS_PAGE_LIMIT = 15;

export function CommandPalette({
  onAddItem,
  onRemoveItem,
  existingItemsMap,
}: CommandPaletteProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const listRef = useRef<HTMLDivElement>(null);
  const observerTargetRef = useRef<HTMLDivElement>(null);

  const getKey = (
    pageIndex: number,
    previousPageData: SubscriptionPage | null,
  ) => {
    if (!open || query !== "") return null;

    if (pageIndex === 0) return `/api/channels?limit=${SUBS_PAGE_LIMIT}`;

    if (!previousPageData) return null;

    if (!previousPageData.nextPageToken) return null;

    return `/api/channels?limit=${SUBS_PAGE_LIMIT}&pageToken=${previousPageData.nextPageToken}`;
  };

  const {
    data: subsPages,
    error: subsError,
    size,
    setSize,
    isValidating: subsLoadingNextPage,
    isLoading: subsLoadingInitial,
  } = useSWRInfinite<SubscriptionPage>(getKey, fetcher, {
    revalidateFirstPage: false,
  });

  const channels: Channel[] = subsPages
    ? subsPages.flatMap((page) => page.items)
    : [];
  const isLoadingMoreSubs = subsLoadingInitial || subsLoadingNextPage;
  const hasMoreSubs = !!(
    subsPages && subsPages[subsPages.length - 1]?.nextPageToken
  );

  const { data: ytResults = [], error: ytError } = useSWR<Array<any>>(
    () =>
      open && query.length > 0
        ? `/api/channels?q=${encodeURIComponent(query)}`
        : null,
    fetcher,
  );

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMoreSubs && !isLoadingMoreSubs) {
          console.log("[Observer] Load more triggered");
          setSize(size + 1);
        }
      },
      {
        root: listRef.current,
        threshold: 1.0,
      },
    );

    const target = observerTargetRef.current;
    if (target) {
      observer.observe(target);
    }

    return () => {
      if (target) {
        observer.unobserve(target);
      }
    };
  }, [hasMoreSubs, isLoadingMoreSubs, setSize, size]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((o) => !o);
      }
      if (e.key === "Escape") {
        setOpen(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    if (query === "" && channels.length > 0) {
      const ids = channels.map((ch) => ch.id);
      const duplicateIds = ids.filter((id, index) => ids.indexOf(id) !== index);
      if (duplicateIds.length > 0) {
        console.warn(
          "[CommandPalette] Duplicate IDs found in subscriptions list:",
          duplicateIds,
          ids,
        );
      } else {
        // console.log("[CommandPalette] Subscription IDs:", ids);
      }
    }
    if (query.length > 0 && ytResults.length > 0) {
      const ids = ytResults.map((item) => item.id.videoId || item.id.channelId);
      const duplicateIds = ids.filter((id, index) => ids.indexOf(id) !== index);
      if (duplicateIds.length > 0) {
        console.warn(
          "[CommandPalette] Duplicate IDs found in search results:",
          duplicateIds,
          ids,
        );
      } else {
        // console.log("[CommandPalette] Search Result IDs:", ids);
      }
    }
  }, [channels, ytResults, query]);

  const addItem = (item: any) => {
    onAddItem(item);
  };

  const removeItem = (youtubeId: string) => {
    onRemoveItem(youtubeId);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="bg-white">
          <span>Add to collection…</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="w-[600px] p-0 [&>button]:mt-[-.4rem]">
        <DialogHeader className="sr-only">
          <DialogTitle>Add to Collection</DialogTitle>
        </DialogHeader>
        <Command>
          <CommandInput
            placeholder="Type to search YouTube or add from your subscriptions…"
            value={query}
            onValueChange={setQuery}
            className="border-0 outline-none"
          />
          <CommandList ref={listRef}>
            <CommandEmpty>No results found.</CommandEmpty>

            {query === "" && (
              <CommandGroup heading="Your Subscriptions">
                {subsLoadingInitial && (
                  <div className="flex justify-center p-4">
                    <Loader2 className="h-5 w-5 animate-spin" />
                  </div>
                )}
                {subsError && (
                  <div className="p-4 text-center text-red-500">
                    Error loading subscriptions
                  </div>
                )}
                {channels.map((ch) => {
                  const youtubeId = ch.id;
                  const isAdded = existingItemsMap?.has(youtubeId) ?? false;
                  return (
                    <CommandItem key={youtubeId}>
                      <CpItem
                        id={ch.id}
                        title={ch.title}
                        thumbnailUrl={ch.thumbnailUrl}
                        subscriberCount={ch.subscriberCount}
                        isAdded={isAdded}
                      >
                        {isAdded ? (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="w-20 border border-slate-300 text-sm dark:border-slate-600"
                            onClick={() => removeItem(youtubeId)}
                          >
                            Remove
                          </Button>
                        ) : (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="w-20 border border-slate-300 text-sm dark:border-slate-600"
                            onClick={() => addItem(ch)}
                            disabled={isAdded}
                          >
                            +Add
                          </Button>
                        )}
                      </CpItem>
                    </CommandItem>
                  );
                })}
                <div ref={observerTargetRef} style={{ height: "1px" }} />
                {isLoadingMoreSubs && !subsLoadingInitial && (
                  <div className="flex justify-center p-4">
                    <Loader2 className="h-5 w-5 animate-spin" />
                  </div>
                )}
              </CommandGroup>
            )}

            {query.length > 0 && (
              <CommandGroup heading="YouTube Search Results">
                {ytError && (
                  <div className="p-4 text-center text-red-500">
                    Error searching YouTube: {ytError.message}
                  </div>
                )}
                {Array.isArray(ytResults) &&
                  ytResults.map((item) => {
                    const isVideo = Boolean(item.id.videoId);
                    const youtubeId = isVideo
                      ? item.id.videoId
                      : item.id.channelId;
                    const title = item.snippet.title;
                    const thumbnail = item.snippet.thumbnails?.default?.url;

                    const isAdded = existingItemsMap?.has(youtubeId) ?? false;

                    return (
                      <CommandItem key={youtubeId}>
                        <div className="flex w-full items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <YouTubeThumbnail
                              url={thumbnail}
                              alt={title}
                              size="md"
                            />
                            <span className="line-clamp-1">{title}</span>
                          </div>
                          {isAdded ? (
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => removeItem(youtubeId)}
                            >
                              Remove
                            </Button>
                          ) : (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => addItem(item)}
                              disabled={isAdded}
                            >
                              +Add
                            </Button>
                          )}
                        </div>
                      </CommandItem>
                    );
                  })}
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </DialogContent>
    </Dialog>
  );
}

export default CommandPalette;
