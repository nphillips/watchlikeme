import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import jwt from "jsonwebtoken";
import { env } from "@/env";
import { Button } from "@/components/ui/button";
import { ChannelsList } from "@/components/channels-list";
import Link from "next/link";

interface User {
  id: string;
  email: string;
  name: string | null;
  username: string;
  role: string;
}

interface JwtPayload {
  userId: string;
  email: string;
  role: string;
  name?: string | null;
}

export default async function DashboardPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get("token")?.value;

  if (!token) {
    redirect("/");
  }

  // Verify and decode the JWT
  const decoded = jwt.verify(token, env.JWT_SECRET!) as JwtPayload;

  // Create user object from JWT payload
  const user: User = {
    id: decoded.userId,
    email: decoded.email,
    name: decoded.name || null,
    username: decoded.email.split("@")[0],
    role: decoded.role,
  };

  return (
    <div>
      <header className="flex justify-between items-center p-4 border-b">
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <form action="/api/auth/signout" method="POST">
          <Button variant="outline" type="submit">
            Sign Out
          </Button>
        </form>
      </header>
      <main className="p-4">
        <div>
          <h2 className="text-xl mb-4">
            Welcome, {user.name || user.username}!
          </h2>

          <div className="space-y-8">
            <div>
              <h3 className="text-2xl font-bold mb-4">Your Profile</h3>
              <dl className="space-y-2">
                <div className="flex items-center gap-2">
                  <dt className="font-bold flex-[0_0_100px]">Email</dt>
                  <dd>{user.email}</dd>
                </div>
                <div className="flex items-center gap-2">
                  <dt className="font-bold flex-[0_0_100px]">Username</dt>
                  <dd>{user.username}</dd>
                </div>
                <div className="flex items-center gap-2">
                  <dt className="font-bold flex-[0_0_100px]">Role</dt>
                  <dd>{user.role.toLowerCase()}</dd>
                </div>
              </dl>
            </div>

            <div>
              <h3 className="text-2xl font-bold mb-4">Your Channels</h3>
              <ChannelsList />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
