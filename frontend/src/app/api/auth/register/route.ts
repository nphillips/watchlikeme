import { NextResponse } from "next/server";
import { z } from "zod";
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

    const result = registerSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        { message: "Invalid input data", errors: result.error.flatten() },
        { status: 400 },
      );
    }

    const { username, email, password } = result.data;

    const checkUserResponse = await fetch(
      `${env.BACKEND_URL}/api/users/check`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      },
    );

    const userData = await checkUserResponse.json();

    if (userData.exists) {
      const getUserResponse = await fetch(
        `${env.BACKEND_URL}/api/users/by-email`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email }),
        },
      );

      if (getUserResponse.ok) {
        const existingUser = await getUserResponse.json();

        if (existingUser.googleId && !existingUser.password) {
          const updateUserResponse = await fetch(
            `${env.BACKEND_URL}/api/users/${existingUser.id}`,
            {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                password: password,
                username:
                  username !== existingUser.username ? username : undefined,
              }),
            },
          );

          if (updateUserResponse.ok) {
            const updatedUser = await updateUserResponse.json();

            const token = jwt.sign(
              {
                sub: updatedUser.id,
                email: updatedUser.email,
                role: updatedUser.role,
              },
              env.JWT_SECRET!,
              { expiresIn: "7d" },
            );

            const response = NextResponse.json(
              {
                message: "Google account linked to WatchLikeMe successfully",
                user: { id: updatedUser.id, email: updatedUser.email },
              },
              { status: 200 },
            );

            response.cookies.set("token", token, {
              httpOnly: true,
              secure: process.env.NODE_ENV === "production",
              sameSite: "lax",
              path: "/",
            });

            return response;
          }
        }
      }
      return NextResponse.json(
        { message: "User already exists" },
        { status: 409 },
      );
    }

    const createUserResponse = await fetch(`${env.BACKEND_URL}/api/users`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username,
        email,
        password,
      }),
    });

    if (!createUserResponse.ok) {
      const error = await createUserResponse.json();
      return NextResponse.json(
        { message: error.message || "Failed to create user" },
        { status: createUserResponse.status },
      );
    }

    const newUser = await createUserResponse.json();

    const token = jwt.sign(
      {
        sub: newUser.id,
        email: newUser.email,
        role: newUser.role,
      },
      env.JWT_SECRET!,
      { expiresIn: "7d" },
    );

    const response = NextResponse.json(
      {
        message: "User created successfully",
        user: { id: newUser.id, email: newUser.email },
      },
      { status: 201 },
    );

    response.cookies.set("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 7 * 24 * 60 * 60,
    });

    response.cookies.set("auth_token", token, {
      httpOnly: false,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 7 * 24 * 60 * 60,
    });

    return response;
  } catch (error) {
    console.error("Registration error:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 },
    );
  }
}
