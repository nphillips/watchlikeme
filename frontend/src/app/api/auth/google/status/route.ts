import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import jwt from "jsonwebtoken";
import { env } from "@/env";

export async function GET() {
  try {
    // Check if the user is authenticated with WatchLikeMe
    const cookieStore = await cookies();
    const token =
      cookieStore.get("token")?.value || cookieStore.get("auth_token")?.value;

    if (!token) {
      return NextResponse.json(
        {
          status: "not-linked",
          message: "Not authenticated",
        },
        { status: 401 }
      );
    }

    try {
      // Verify JWT token
      const payload = jwt.verify(token, env.JWT_SECRET!) as {
        sub: string;
        email: string;
        role: string;
      };

      // Check if the user has linked their Google account
      const response = await fetch(
        `${env.BACKEND_URL}/api/users/${payload.sub}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        return NextResponse.json(
          {
            status: "unknown",
            message: "Failed to fetch user data",
          },
          { status: 500 }
        );
      }

      const userData = await response.json();
      const hasGoogleId = !!userData.googleId;

      // Check if the Google tokens cookie exists and is valid
      const googleTokensCookie = cookieStore.get("google_tokens");

      if (!googleTokensCookie) {
        return NextResponse.json({
          status: hasGoogleId ? "expired" : "not-linked",
          hasGoogleId: hasGoogleId,
          message: hasGoogleId
            ? "Google tokens have expired"
            : "Google account not linked",
        });
      }

      // Try to parse the tokens to check if they're valid JSON
      try {
        const tokens = JSON.parse(googleTokensCookie.value);

        // Check if the tokens include essential fields
        if (!tokens.access_token || !tokens.refresh_token) {
          return NextResponse.json({
            status: "expired",
            hasGoogleId: hasGoogleId,
            message: "Google tokens are incomplete or invalid",
          });
        }

        // Check token expiration if expiry_date exists
        if (tokens.expiry_date && Date.now() >= tokens.expiry_date) {
          return NextResponse.json({
            status: "expired",
            hasGoogleId: hasGoogleId,
            message: "Google tokens have expired",
          });
        }

        return NextResponse.json({
          status: "linked",
          hasGoogleId: hasGoogleId,
          message: "Google account is linked and tokens are valid",
        });
      } catch (e) {
        return NextResponse.json({
          status: "expired",
          hasGoogleId: hasGoogleId,
          message: "Invalid Google tokens format",
        });
      }
    } catch (jwtError) {
      return NextResponse.json(
        {
          status: "unknown",
          message: "Invalid authentication token",
        },
        { status: 401 }
      );
    }
  } catch (error) {
    console.error("Error checking Google auth status:", error);
    return NextResponse.json(
      {
        status: "unknown",
        message: "An error occurred",
      },
      { status: 500 }
    );
  }
}
