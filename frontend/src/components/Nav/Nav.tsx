import { Button } from "../ui/button";
import { removeCookie } from "@/lib/cookies";
import Link from "next/link";
import { ModeToggle } from "../mode-toggle";
import { usePathname } from "next/navigation";
import { Menu } from "lucide-react";
import Logo from "../Logo";
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";

interface NavProps {
  topNudge?: boolean;
  onMenuClick: () => void;
  isAuthenticated: boolean;
  user: {
    id: string;
    email: string;
    username: string;
    hasGoogleAuth: boolean;
  } | null;
  handleLinkGoogle: () => void;
}

const Nav = ({
  topNudge = true,
  onMenuClick,
  isAuthenticated,
  user,
  handleLinkGoogle,
}: NavProps) => {
  const pathname = usePathname();

  console.log("[Nav] Rendering - Pathname:", pathname);
  console.log("[Nav] Rendering - Received isAuthenticated:", isAuthenticated);
  console.log(
    "[Nav] Rendering - Should show Login button?",
    !isAuthenticated && pathname !== "/login",
  );

  const handleSignOut = async () => {
    try {
      removeCookie("google_tokens");
      removeCookie("auth_success");
      removeCookie("token");
      removeCookie("auth_token");
      removeCookie("auth_debug");

      console.log("Signing out, clearing cookies client-side");

      await fetch("/api/auth/logout");

      console.log("Logout API called, reloading page");

      window.location.href = "/";
    } catch (error) {
      console.error("Error during sign out:", error);
      window.location.href = "/";
    }
  };

  return (
    <>
      {topNudge && <div className="h-[var(--height-nav)]"></div>}
      <div
        className={cn(
          "dark fixed top-0 right-0 left-0 z-50 flex h-[var(--height-nav)] flex-[0_0_auto] items-center justify-between text-slate-50",
        )}
      >
        <div className="flex w-full items-center justify-between px-4 md:px-6">
          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              size="icon"
              className="md:hidden"
              onClick={onMenuClick}
            >
              <Menu />
            </Button>
            <Logo />
          </div>
          <div>
            <div className="flex items-center gap-4">
              {isAuthenticated ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="hidden md:block">
                      {user ? `${user.email}` : "Signed in"}
                    </div>
                    <div className="flex gap-2">
                      {user && !user.hasGoogleAuth && (
                        <button
                          onClick={handleLinkGoogle}
                          className="flex items-center gap-1 rounded bg-blue-500 px-3 py-1 text-sm text-white hover:bg-blue-600"
                        >
                          <svg
                            viewBox="0 0 24 24"
                            width="16"
                            height="16"
                            className="inline-block"
                          >
                            <path
                              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                              fill="#ffffff"
                            />
                            <path
                              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                              fill="#ffffff"
                            />
                            <path
                              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                              fill="#ffffff"
                            />
                            <path
                              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                              fill="#ffffff"
                            />
                          </svg>
                          Link Google Account
                        </button>
                      )}
                      <div className="ml-4">
                        <Button variant="outline" onClick={handleSignOut}>
                          Sign Out
                        </Button>
                      </div>
                      <div className="ml-2">
                        <ModeToggle />
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-4">
                  {pathname !== "/login" && (
                    <Link
                      href="/login"
                      className={cn(
                        buttonVariants({ variant: "default", size: "sm" }),
                      )}
                    >
                      Log in
                    </Link>
                  )}
                  <div className="ml-2">
                    <ModeToggle />
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default Nav;
