import { NextResponse } from "next/server";
import { getAndRefreshTokens } from "@/lib/google-auth";
import { cookies } from "next/headers";

export async function GET() {
  try {
    const cookieStore = await cookies();
    const currentTokensCookie = cookieStore.get("google_tokens");

    if (!currentTokensCookie?.value) {
      return NextResponse.json(
        {
          status: "error",
          message: "No Google tokens found",
        },
        { status: 401 },
      );
    }

    const currentTokens = JSON.parse(currentTokensCookie.value);

    const modifiedTokens = {
      ...currentTokens,
      expiry_date: Date.now() - 1000 * 60,
    };

    cookieStore.set("google_tokens", JSON.stringify(modifiedTokens), {
      secure: process.env.NODE_ENV === "production",
      httpOnly: true,
      path: "/",
      maxAge: 30 * 24 * 60 * 60,
    });

    const refreshedTokens = await getAndRefreshTokens();

    if (!refreshedTokens) {
      return NextResponse.json(
        {
          status: "error",
          message: "Failed to refresh tokens",
        },
        { status: 500 },
      );
    }

    return NextResponse.json({
      status: "success",
      message: "Tokens refreshed successfully",
      originalExpiry: new Date(modifiedTokens.expiry_date).toISOString(),
      newExpiry: new Date(refreshedTokens.expiry_date).toISOString(),
      tokenRefreshed:
        refreshedTokens.access_token !== currentTokens.access_token,
    });
  } catch (error) {
    console.error("Error in token refresh test:", error);
    return NextResponse.json(
      {
        status: "error",
        message: "Error testing token refresh",
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  }
}
