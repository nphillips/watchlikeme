import { NextResponse, NextRequest } from "next/server";
import { backendFetch } from "@/lib/backend-fetch";

console.log(
  "Using getAuthenticatedClient from:",
  require.resolve("@/lib/google-client"),
);

export async function GET(request: NextRequest) {
  console.log("Channel route incoming cookies:", request.headers.get("cookie"));

  const url = request.nextUrl;
  const q = url.searchParams.get("q");
  const pageToken = url.searchParams.get("pageToken");
  const limit = url.searchParams.get("limit");

  if (q) {
    try {
      const backendSearchUrl = `/api/channels/search?q=${encodeURIComponent(q)}&type=channel,video`;
      console.log(`[API Route] Proxying search to: ${backendSearchUrl}`);
      const response = await backendFetch(backendSearchUrl, {
        headers: { cookie: request.headers.get("cookie") || "" },
      });
      if (response.ok) {
        const results = await response.json();
        return NextResponse.json(results);
      } else {
        const errorText = await response.text().catch(() => "");
        console.error(
          `[API Route] Error fetching search from backend (${response.status}): ${errorText}`,
        );
        return NextResponse.json(
          { error: "Search failed", details: errorText },
          { status: response.status },
        );
      }
    } catch (err) {
      console.error("[API Route] Error proxying search:", err);
      return NextResponse.json(
        { error: "Search proxy failed" },
        { status: 500 },
      );
    }
  }

  try {
    const backendApiBaseUrl = process.env.BACKEND_URL;
    if (!backendApiBaseUrl) {
      console.error(
        "[API Route] Error: BACKEND_URL environment variable is not set.",
      );
      return NextResponse.json(
        { error: "Backend API URL configuration error" },
        { status: 500 },
      );
    }

    const backendUrl = new URL(`${backendApiBaseUrl}/api/channels`);
    if (limit) backendUrl.searchParams.set("limit", limit);
    if (pageToken) backendUrl.searchParams.set("pageToken", pageToken);

    console.log(
      `[API Route] Fetching subscriptions from backend: ${backendUrl.toString()}`,
    );

    const cookies = request.headers.get("cookie") || "";
    const tokenMatch = cookies.match(/token=([^;]+)/);
    const authToken = tokenMatch ? tokenMatch[1] : null;

    const response = await backendFetch(
      backendUrl.pathname + backendUrl.search,
      {
        method: "GET",
        headers: {
          cookie: cookies,
          ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
          "Content-Type": "application/json",
        },
      },
    );

    const responseBody = await response.text();

    if (response.ok) {
      try {
        const data = JSON.parse(responseBody);
        console.log(
          `[API Route] Retrieved data from backend with status ${response.status}`,
        );
        return NextResponse.json(data);
      } catch (parseError) {
        console.error(
          "[API Route] Error parsing JSON from backend:",
          parseError,
          "Body:",
          responseBody,
        );
        return NextResponse.json(
          { error: "Invalid response from backend" },
          { status: 500 },
        );
      }
    } else {
      console.error(
        `[API Route] Error fetching from backend (${response.status}): ${responseBody}`,
      );
      let errorJson = { error: "Failed to fetch subscriptions from backend" };
      try {
        errorJson = JSON.parse(responseBody);
      } catch {}
      return NextResponse.json(errorJson, { status: response.status });
    }
  } catch (error: any) {
    console.error(
      "[API Route] Unexpected error fetching subscriptions:",
      error,
    );
    return NextResponse.json(
      {
        error: "Failed to fetch subscriptions",
        message: error.message || "An unexpected error occurred.",
      },
      { status: 500 },
    );
  }
}
