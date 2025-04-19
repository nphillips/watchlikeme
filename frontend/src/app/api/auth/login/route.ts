import { NextResponse } from "next/server";
import { z } from "zod";
import { env } from "@/env";

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();

    // Validate request body
    const result = loginSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        { message: "Invalid credentials" },
        { status: 400 }
      );
    }

    const { email, password } = result.data;

    // Send login request to backend
    const loginResponse = await fetch(`${env.BACKEND_URL}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    // Handle special case: Google-only account
    if (loginResponse.status === 401) {
      const errorData = await loginResponse.json();

      if (errorData.authMethod === "google") {
        return NextResponse.json(
          {
            message: errorData.message,
            authMethod: "google",
          },
          { status: 401 }
        );
      }

      return NextResponse.json(
        { message: "Invalid credentials" },
        { status: 401 }
      );
    }

    if (!loginResponse.ok) {
      return NextResponse.json(
        { message: "Invalid credentials" },
        { status: 401 }
      );
    }

    // Get the JWT token and user data from the response
    const { token, user } = await loginResponse.json();

    // Set JWT token in a cookie
    const response = NextResponse.json(
      {
        message: "Logged in successfully",
        user: {
          id: user.id,
          email: user.email,
          hasGoogleAuth: user.hasGoogleAuth,
        },
      },
      { status: 200 }
    );

    response.cookies.set("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 7 * 24 * 60 * 60, // 7 days
    });

    return response;
  } catch (error) {
    console.error("Login error:", error);
    return NextResponse.json(
      { message: "An error occurred during login" },
      { status: 500 }
    );
  }
}
