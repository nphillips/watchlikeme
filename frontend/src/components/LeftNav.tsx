import { Link, Menu } from "lucide-react";
import { Button } from "./ui/button";

const LeftNav = () => {
  return (
    <div
      data-component="left-nav"
      className="fixed top-0 left-0 z-10 h-full w-[var(--width-left-nav)] flex-col items-center justify-between border-r border-gray-700 bg-slate-800 text-slate-50 dark:bg-slate-900"
    >
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon">
          <Menu />
        </Button>
        <div>
          <Link
            href="/"
            className="mb-4 text-2xl font-bold text-slate-300 dark:text-slate-100"
          >
            WatchLikeMe
          </Link>
        </div>
      </div>
      LeftNav
    </div>
  );
};

export default LeftNav;
