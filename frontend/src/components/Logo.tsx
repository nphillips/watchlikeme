import Link from "next/link";

const Logo = () => {
  return (
    <div>
      <Link
        href="/"
        className="mb-4 text-2xl font-bold text-slate-300 dark:text-slate-100"
      >
        WatchLikeMe
      </Link>
    </div>
  );
};

export default Logo;
