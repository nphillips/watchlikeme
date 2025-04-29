// frontend/src/components/CommandPalette.tsx
"use client";

import { useEffect, useState } from "react";
import useSWR from "swr";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "@/components/ui/popover";
import {
  Command,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
} from "@/components/ui/command";
import { Search } from "lucide-react";
import { CpItem } from "./CpItem";
import { YouTubeThumbnail } from "@/components/YouTubeThumbnail";

interface Channel {
  id: string;
  title: string;
  thumbnailUrl: string;
  subscriberCount: number;
}

interface CommandPaletteProps {
  onAddItem: (item: any) => void;
  existingItemYoutubeIds?: Set<string> | null;
}

const fetcher = async (url: string) => {
  const res = await fetch(url);
  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(errorText || `Fetch error: ${res.status}`);
  }
  return res.json();
};

export function CommandPalette({
  onAddItem,
  existingItemYoutubeIds,
}: CommandPaletteProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  // Fetch subscriptions only when open & blank query
  const { data: subs } = useSWR<Channel[]>(
    () => (open && query === "" ? "/api/channels" : null),
    fetcher,
  );

  // Fetch YouTube search when open & query non‑empty
  const { data: ytResults = [], error: ytError } = useSWR<Array<any>>(
    () =>
      open && query.length > 0
        ? `/api/channels?q=${encodeURIComponent(query)}`
        : null,
    fetcher,
  );

  // Toggle on ⌘K / Ctrl+K, close on Esc
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

  const addItem = (item: any) => {
    onAddItem(item);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" className="w-full justify-start space-x-2">
          <Search className="h-4 w-4" />
          <span>Search YouTube or subscriptions…</span>
          <kbd className="bg-muted ml-auto rounded border px-1 font-sans text-[10px]">
            ⌘K
          </kbd>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[600px] p-0">
        <Command>
          <CommandInput
            placeholder="Type to search YouTube or add from your subscriptions…"
            value={query}
            onValueChange={setQuery}
            className="border-0 outline-none"
          />
          <CommandList>
            <CommandEmpty>No results found.</CommandEmpty>

            {query === "" && (
              <CommandGroup heading="Your Subscriptions">
                {subs?.slice(0, 10).map((ch) => {
                  const isAdded = existingItemYoutubeIds?.has(ch.id) ?? false;
                  return (
                    <CommandItem key={ch.id}>
                      <CpItem
                        id={ch.id}
                        title={ch.title}
                        thumbnailUrl={ch.thumbnailUrl}
                        subscriberCount={ch.subscriberCount}
                        isAdded={isAdded}
                      >
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => addItem(ch)}
                          disabled={isAdded}
                        >
                          {isAdded ? "Added" : "+Add"}
                        </Button>
                      </CpItem>
                    </CommandItem>
                  );
                })}
              </CommandGroup>
            )}

            {query.length > 0 && (
              <CommandGroup heading="YouTube Search Results">
                {ytError && (
                  <div className="p-4 text-center text-red-500">
                    Error searching YouTube
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

                    const isAdded =
                      existingItemYoutubeIds?.has(youtubeId) ?? false;

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
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => addItem(item)}
                            disabled={isAdded}
                          >
                            {isAdded ? "Added" : "+Add"}
                          </Button>
                        </div>
                      </CommandItem>
                    );
                  })}
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
