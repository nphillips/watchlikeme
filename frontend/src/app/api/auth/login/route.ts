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

    const result = loginSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        { message: "Invalid credentials" },
        { status: 400 },
      );
    }

    const { email, password } = result.data;

    const loginResponse = await fetch(`${env.BACKEND_URL}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    if (loginResponse.status === 401) {
      const errorData = await loginResponse.json();

      if (errorData.authMethod === "google") {
        return NextResponse.json(
          {
            message: errorData.message,
            authMethod: "google",
          },
          { status: 401 },
        );
      }

      return NextResponse.json(
        { message: "Invalid credentials" },
        { status: 401 },
      );
    }

    if (!loginResponse.ok) {
      return NextResponse.json(
        { message: "Invalid credentials" },
        { status: 401 },
      );
    }

    const { token, user } = await loginResponse.json();

    const response = NextResponse.json(
      {
        message: "Logged in successfully",
        user: {
          id: user.id,
          email: user.email,
          hasGoogleAuth: user.hasGoogleAuth,
        },
      },
      { status: 200 },
    );

    console.log("Setting token cookie for user:", user.id);

    response.cookies.set("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 7 * 24 * 60 * 60,
    });

    response.cookies.set("auth_token", token, {
      httpOnly: false,
      secure: false,
      sameSite: "lax",
      path: "/",
      maxAge: 7 * 24 * 60 * 60,
    });

    response.cookies.set("auth_debug", "true", {
      httpOnly: false,
      secure: false,
      sameSite: "lax",
      path: "/",
      maxAge: 7 * 24 * 60 * 60,
    });

    if (user.hasGoogleAuth) {
      try {
        const tokensResponse = await fetch(
          `${env.BACKEND_URL}/api/users/${user.id}/google-tokens`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          },
        );

        if (tokensResponse.ok) {
          const { tokens } = await tokensResponse.json();

          if (tokens) {
            response.cookies.set("google_tokens", tokens, {
              httpOnly: true,
              secure: process.env.NODE_ENV === "production",
              sameSite: "lax",
              path: "/",
              maxAge: 30 * 24 * 60 * 60,
            });

            console.log("Restored Google tokens for linked account");
          }
        }
      } catch (tokenError) {
        console.error("Error retrieving Google tokens:", tokenError);
      }
    }

    return response;
  } catch (error) {
    console.error("Login error:", error);
    return NextResponse.json(
      { message: "An error occurred during login" },
      { status: 500 },
    );
  }
}
