import { NextResponse } from "next/server";

const BACKEND_URL =
  process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8888";

export async function GET(request: Request) {
  try {
    // Forward the request to the backend
    const response = await fetch(`${BACKEND_URL}/google/status`, {
      headers: {
        Cookie: request.headers.get("cookie") || "",
      },
      credentials: "include",
    });

    if (response.ok) {
      const data = await response.json();
      return NextResponse.json(data);
    } else {
      // If the backend API doesn't exist yet, we'll try to determine status from cookies
      const cookies = request.headers.get("cookie") || "";
      const hasGoogleTokens = cookies.includes("google_tokens=");

      return NextResponse.json({
        isLinked: hasGoogleTokens,
        message: "Status determined from cookies (fallback)",
      });
    }
  } catch (error) {
    console.error("Error checking Google auth status:", error);

    // Return a default response even if there's an error
    return NextResponse.json(
      { isLinked: false, error: "Failed to check Google auth status" },
      { status: 500 }
    );
  }
}
