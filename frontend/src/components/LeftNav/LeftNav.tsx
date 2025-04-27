"use client";

import { Collection } from "@/interfaces/index";
import LeftNavContent from "./LeftNavContent";

interface LeftNavProps {
  ownedCollections: Collection[];
  sharedCollections: Collection[];
  isLoading: boolean;
  error: string | null;
  currentUser: { username: string } | null;
}

const LeftNav = (props: LeftNavProps) => {
  return (
    <div
      data-component="left-nav"
      className="fixed top-[var(--height-nav)] bottom-0 left-0 z-40 w-[var(--width-left-nav)] flex-col border-r border-slate-300 dark:border-slate-700"
    >
      <div className="px-4 py-8 md:px-6">
        <LeftNavContent {...props} />
      </div>
    </div>
  );
};

export default LeftNav;
