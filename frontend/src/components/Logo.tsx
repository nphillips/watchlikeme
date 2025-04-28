import Link from "next/link";

const Logo = () => {
  return (
    <div>
      <Link
        href="/"
        className="mb-4 text-xl font-bold text-slate-300 md:text-2xl dark:text-slate-100"
      >
        WatchLikeMe
      </Link>
    </div>
  );
};

export default Logo;
