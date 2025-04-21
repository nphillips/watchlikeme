"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

interface ChannelItemProps {
  id: string;
  title: string;
  thumbnailUrl: string;
  subscriberCount: number;
  children?: React.ReactNode;
}

export function ChannelItem({
  id,
  title,
  thumbnailUrl,
  subscriberCount,
  children,
}: ChannelItemProps) {
  const [isSelected, setIsSelected] = useState(false);

  const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setIsSelected(e.target.checked);
  };

  return (
    <div className={cn("border rounded-lg p-4", isSelected && "bg-gray-100")}>
      <input
        type="checkbox"
        id={id}
        checked={isSelected}
        onChange={handleCheckboxChange}
      />
      <label htmlFor={id}>
        <div className="font-semibold text-center truncate" title={title}>
          {title}
        </div>
      </label>
      <div>{children}</div>
    </div>
  );
}
