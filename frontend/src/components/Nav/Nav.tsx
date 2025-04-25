import { Button } from "../ui/button";
import { useRouter } from "next/navigation";
import { removeCookie } from "@/lib/cookies";
import { useAuth } from "@/hooks/useAuth";
import Link from "next/link";

const Nav = () => {
  const { isAuthenticated, user, loading, handleLinkGoogle } = useAuth();
  const router = useRouter();

  const handleSignOut = async () => {
    try {
      // Clear cookies using the utility
      removeCookie("google_tokens");
      removeCookie("auth_success");
      removeCookie("token");
      removeCookie("auth_token");
      removeCookie("auth_debug");

      console.log("Signing out, clearing cookies client-side");

      // Also clear cookies server-side via the logout API
      await fetch("/api/auth/logout");

      console.log("Logout API called, reloading page");

      // Force a full page reload
      window.location.href = "/";
    } catch (error) {
      console.error("Error during sign out:", error);
      // Force reload anyway
      window.location.href = "/";
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen p-4 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="flex justify-between items-center">
      <div>
        <Link href="/" className="text-2xl font-bold mb-4">
          WatchLikeMe
        </Link>
      </div>
      <div>
        <div>
          {isAuthenticated ? (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <div>{user ? `${user.email}` : "You are signed in!"}</div>
                <div className="flex gap-2">
                  {user && !user.hasGoogleAuth && (
                    <button
                      onClick={handleLinkGoogle}
                      className="flex items-center gap-1 text-white bg-blue-500 hover:bg-blue-600 px-3 py-1 rounded text-sm"
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
                </div>
              </div>
            </div>
          ) : (
            <div className="flex gap-4">
              <a
                href="/login"
                className="inline-flex items-center justify-center whitespace-nowrap rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700"
              >
                Log in
              </a>
              <a
                href="/register"
                className="inline-flex items-center justify-center whitespace-nowrap rounded-md border border-blue-600 px-4 py-2 text-sm font-medium text-blue-600 shadow-sm hover:bg-blue-50"
              >
                Register
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Nav;
