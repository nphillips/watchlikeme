import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import jwt from "jsonwebtoken";
import { env } from "@/env";

export async function GET() {
  try {
    // Get token from cookies
    const cookieStore = await cookies();
    const token =
      cookieStore.get("token")?.value || cookieStore.get("auth_token")?.value;

    console.log("Token from cookie:", token ? "exists" : "missing");
    console.log(
      "Available cookies:",
      (await cookies())
        .getAll()
        .map((cookie) => cookie.name)
        .join(", ")
    );

    if (!token) {
      return NextResponse.json(
        { message: "Not authenticated" },
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

      console.log("JWT verification successful. User ID:", payload.sub);

      // Get user details from the backend
      const response = await fetch(
        `${env.BACKEND_URL}/api/users/${payload.sub}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            // Forward all cookies to the backend so it can read google_tokens
            cookie: cookieStore
              .getAll()
              .map((cookie) => `${cookie.name}=${cookie.value}`)
              .join("; "),
          },
        }
      );

      console.log("Backend API response status:", response.status);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error("Error fetching user data:", errorData);
        return NextResponse.json(
          { message: "User not found" },
          { status: 404 }
        );
      }

      const userData = await response.json();

      // Return user data
      return NextResponse.json({
        id: userData.id,
        email: userData.email,
        username: userData.username,
        hasGoogleAuth: !!userData.googleId,
      });
    } catch (jwtError) {
      console.error("JWT verification error:", jwtError);
      return NextResponse.json(
        { message: "Invalid authentication token" },
        { status: 401 }
      );
    }
  } catch (error) {
    console.error("User authentication error:", error);
    return NextResponse.json(
      { message: "Authentication failed" },
      { status: 401 }
    );
  }
}
