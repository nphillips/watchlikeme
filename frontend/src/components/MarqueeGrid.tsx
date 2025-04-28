// frontend/components/MarqueeGrid.tsx

import { useMemo } from "react";
import Image from "next/image";
import channelThumbnails from "@/components/images";
import { generateMarqueeRows } from "@/components/utils/marquee";

const ROW_COUNT = 5;
const ROW_SIZES = [150, 100, 75, 120, 150];

export default function MarqueeGrid() {
  // 1) Shuffle original thumbnails into ROW_COUNT rows
  const rows = useMemo(
    () => generateMarqueeRows(channelThumbnails, ROW_COUNT),
    [],
  );

  // 2) Triple-repeat each row for seamless -33.333% loop
  const repeatedRows = useMemo(
    () => rows.map((images) => [...images, ...images, ...images]),
    [rows],
  );

  return (
    <div>
      {repeatedRows.map((looped, rowIdx) => {
        const baseLength = rows[rowIdx].length;
        const duration = 200 + rowIdx * 80;
        const size = ROW_SIZES[rowIdx]; // size in px
        const sizeClass = `w-[${size}px] h-[${size}px]`; // Tailwind arbitrary

        return (
          <div key={rowIdx} className="relative overflow-hidden py-2">
            <div
              className="marquee-track flex"
              style={{ animationDuration: `${duration}s` }}
            >
              {looped.map((src, idx) => {
                const isEnd = idx === baseLength - 1;
                const margin = isEnd ? "mr-0" : "mr-4";

                return (
                  <Image
                    key={idx}
                    src={src}
                    alt=""
                    width={size}
                    height={size}
                    className={`marquee-thumb rounded-full object-cover shadow-[0_0_0_1px_white] ${sizeClass} ${margin} `}
                  />
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
