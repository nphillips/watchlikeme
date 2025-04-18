import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { env } from "@/env";

export async function GET() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("token")?.value;

    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const response = await fetch(`${env.BACKEND_URL}/api/channels`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error("Backend error:", errorData);
      return NextResponse.json(
        { error: "Failed to fetch channels", details: errorData },
        { status: response.status }
      );
    }

    const channels = await response.json();
    return NextResponse.json(channels);
  } catch (error) {
    console.error("Error in channels API route:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
