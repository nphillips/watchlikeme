import { NextRequest, NextResponse } from "next/server";

const BACKEND_URL =
  process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8888";

export async function GET(
  request: NextRequest,
  { params }: { params: { path: string[] } }
) {
  const pathArray = await Promise.resolve(params.path);
  const path = pathArray.join("/");
  console.log(`Proxying GET request to ${BACKEND_URL}/${path}`);

  try {
    const response = await fetch(`${BACKEND_URL}/${path}`, {
      headers: {
        Cookie: request.headers.get("cookie") || "",
      },
      credentials: "include",
    });

    if (!response.headers.get("content-type")?.includes("application/json")) {
      const text = await response.text();
      return new Response(text, {
        status: response.status,
        headers: response.headers,
      });
    }

    const data = await response.json().catch(() => ({}));

    return NextResponse.json(data, {
      status: response.status,
    });
  } catch (error) {
    console.error(`Error proxying to ${BACKEND_URL}/${path}:`, error);
    return NextResponse.json(
      { error: "Failed to proxy request to backend" },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { path: string[] } }
) {
  const pathArray = await Promise.resolve(params.path);
  const path = pathArray.join("/");
  console.log(`Proxying POST request to ${BACKEND_URL}/${path}`);

  try {
    const body = await request.json().catch(() => ({}));

    const response = await fetch(`${BACKEND_URL}/${path}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: request.headers.get("cookie") || "",
      },
      body: JSON.stringify(body),
      credentials: "include",
    });

    if (!response.headers.get("content-type")?.includes("application/json")) {
      const text = await response.text();
      return new Response(text, {
        status: response.status,
        headers: response.headers,
      });
    }

    const data = await response.json().catch(() => ({}));

    return NextResponse.json(data, {
      status: response.status,
    });
  } catch (error) {
    console.error(`Error proxying to ${BACKEND_URL}/${path}:`, error);
    return NextResponse.json(
      { error: "Failed to proxy request to backend" },
      { status: 500 }
    );
  }
}

// Add support for other HTTP methods as needed
