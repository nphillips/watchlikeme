import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { z } from "zod";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { env } from "@/env";

const registerSchema = z.object({
  username: z.string().min(3),
  email: z.string().email(),
  password: z.string().min(8),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();

    // Validate request body
    const result = registerSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        { message: "Invalid input data", errors: result.error.flatten() },
        { status: 400 }
      );
    }

    const { username, email, password } = result.data;

    // 1. First, check if the user already exists by email
    // We'll handle Google OAuth users differently than duplicate registrations
    const checkUserResponse = await fetch(
      `${env.BACKEND_URL}/api/users/check`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      }
    );

    const userData = await checkUserResponse.json();

    if (userData.exists) {
      // Check if this is a Google OAuth user without a password
      const getUserResponse = await fetch(
        `${env.BACKEND_URL}/api/users/by-email`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email }),
        }
      );

      if (getUserResponse.ok) {
        const existingUser = await getUserResponse.json();

        // If this is a Google OAuth user without a password, we'll update their account
        if (existingUser.googleId && !existingUser.password) {
          // Hash the password
          const hashedPassword = await bcrypt.hash(password, 10);

          // Update the user with the password and username if needed
          const updateUserResponse = await fetch(
            `${env.BACKEND_URL}/api/users/${existingUser.id}`,
            {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                password: hashedPassword,
                username:
                  username !== existingUser.username ? username : undefined,
              }),
            }
          );

          if (updateUserResponse.ok) {
            const updatedUser = await updateUserResponse.json();

            // Generate JWT token
            const token = jwt.sign(
              {
                sub: updatedUser.id,
                email: updatedUser.email,
                role: updatedUser.role,
              },
              env.JWT_SECRET!,
              { expiresIn: "7d" }
            );

            // Set JWT token in a cookie
            const response = NextResponse.json(
              {
                message: "Google account linked to WatchLikeMe successfully",
                user: { id: updatedUser.id, email: updatedUser.email },
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
          }
        }
      }

      // If we got here, it's a duplicate email that's not a Google-only user
      return NextResponse.json(
        { message: "User with this email already exists" },
        { status: 409 }
      );
    }

    // 2. Normal flow - create a new user
    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create the user
    const createUserResponse = await fetch(`${env.BACKEND_URL}/api/users`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username,
        email,
        password: hashedPassword,
        // If there's a Google ID in the cookies, include it
        googleId: null, // This will be set by the backend if needed
      }),
    });

    if (!createUserResponse.ok) {
      const error = await createUserResponse.json();
      throw new Error(error.message || "Failed to create user");
    }

    const newUser = await createUserResponse.json();

    // For users who registered via Google OAuth first,
    // we'll set their JWT token now
    let googleTokensCookie;

    try {
      // Access cookies in a try-catch to handle potential errors
      const cookieStore = await cookies();
      googleTokensCookie = cookieStore.get("google_tokens");
    } catch (e) {
      console.error("Error accessing cookies:", e);
      // Continue without the Google token
    }

    // Generate JWT token (for all new users, not just Google ones)
    const token = jwt.sign(
      {
        sub: newUser.id,
        email: newUser.email,
        role: newUser.role,
      },
      env.JWT_SECRET!,
      { expiresIn: "7d" }
    );

    // Set JWT token in a cookie
    const response = NextResponse.json(
      {
        message: "User registered successfully",
        user: { id: newUser.id, email: newUser.email },
        autoLogin: true,
      },
      { status: 201 }
    );

    // Log token setting
    console.log("Setting token cookie for user:", newUser.id);

    // Set the token cookie with more explicit settings
    response.cookies.set("token", token, {
      httpOnly: true,
      secure: false, // Set to false for development
      sameSite: "lax",
      path: "/",
      maxAge: 7 * 24 * 60 * 60, // 7 days
    });

    // Also set a non-httpOnly version of the token for debugging
    response.cookies.set("auth_token", token, {
      httpOnly: false,
      secure: false,
      sameSite: "lax",
      path: "/",
      maxAge: 7 * 24 * 60 * 60, // 7 days
    });

    // Also set a non-httpOnly cookie for debugging
    response.cookies.set("auth_debug", "true", {
      httpOnly: false,
      secure: false,
      sameSite: "lax",
      path: "/",
      maxAge: 7 * 24 * 60 * 60, // 7 days
    });

    // Always return the response with the token set
    return response;
  } catch (error) {
    console.error("Registration error:", error);
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "An error occurred" },
      { status: 500 }
    );
  }
}
