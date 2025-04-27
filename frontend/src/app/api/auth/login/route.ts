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
    const backendResponseData = await loginResponse.json();
    const { user } = backendResponseData;

    // Create the base JSON response for the browser
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

    // Forward Set-Cookie headers from the backend response
    const backendSetCookie = loginResponse.headers.get("set-cookie");
    if (backendSetCookie) {
      // We might receive multiple Set-Cookie headers, split them properly
      // Note: This basic split might need refinement if cookie values contain commas
      const cookies = backendSetCookie.split(/,(?=[^;]*=)/);
      cookies.forEach((cookie) => {
        const [nameValue, ...rest] = cookie.trim().split(";");
        const [name, value] = nameValue.split("=");
        // Reconstruct the cookie string for the header
        // IMPORTANT: `response.cookies.set` is for setting individual cookies,
        // to forward raw headers, we append to the 'set-cookie' header directly.
        response.headers.append("set-cookie", cookie.trim());
      });
      console.log(
        "Forwarded Set-Cookie headers from backend:",
        backendSetCookie
      );
    } else {
      console.log(
        "No Set-Cookie headers received from backend login response."
      );
    }

    return response;
  } catch (error) {
    console.error("Login error:", error);
    return NextResponse.json(
      { message: "An error occurred during login" },
      { status: 500 }
    );
  }
}
