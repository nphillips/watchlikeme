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
  console.log("[Register API] Function execution started.");
  // Explicitly log required env vars
  console.log(`[Register API] Runtime BACKEND_URL set: ${!!env.BACKEND_URL}`);
  console.log(`[Register API] Runtime JWT_SECRET set: ${!!env.JWT_SECRET}`);

  if (!env.BACKEND_URL || !env.JWT_SECRET) {
    console.error(
      "[Register API] CRITICAL: Backend URL or JWT Secret is missing at runtime!",
    );
    // Return an error response immediately if critical env vars are missing
    return NextResponse.json(
      { message: "Server configuration error." },
      { status: 500 },
    );
  }

  try {
    console.log("[Register API] Inside try block."); // New Log 1

    const body = await request.json();
    console.log("[Register API] Request body parsed."); // New Log 2

    const result = registerSchema.safeParse(body);
    console.log(`[Register API] Schema validation success: ${result.success}`); // New Log 3
    if (!result.success) {
      console.log(
        "[Register API] Schema validation failed:",
        result.error.flatten(),
      );
      return NextResponse.json(
        { message: "Invalid input data", errors: result.error.flatten() },
        { status: 400 },
      );
    }

    const { username, email, password } = result.data;
    console.log("[Register API] Data destructured."); // New Log 4

    // ---> Log before first fetch
    console.log(
      `[Register API] Checking user existence at: ${env.BACKEND_URL}/api/users/check`,
    );
    const checkUserResponse = await fetch(
      `${env.BACKEND_URL}/api/users/check`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      },
    );
    console.log(
      `[Register API] Check user response status: ${checkUserResponse.status}`,
    ); // New Log 5

    const userData = await checkUserResponse.json();
    console.log(`[Register API] User exists: ${userData.exists}`); // New Log 6

    if (userData.exists) {
      console.log("[Register API] User exists branch started.");
      // ---> Log before second fetch (if applicable)
      console.log(
        `[Register API] Fetching existing user from: ${env.BACKEND_URL}/api/users/by-email`,
      );
      const getUserResponse = await fetch(
        `${env.BACKEND_URL}/api/users/by-email`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email }),
        },
      );
      console.log(
        `[Register API] Get existing user status: ${getUserResponse.status}`,
      );

      if (getUserResponse.ok) {
        const existingUser = await getUserResponse.json();
        console.log(
          `[Register API] Existing user googleId: ${existingUser.googleId}, password set: ${!!existingUser.password}`,
        );

        if (existingUser.googleId && !existingUser.password) {
          console.log(
            "[Register API] Attempting to link Google account by adding password...",
          );
          // ---> Log before PATCH request
          console.log(
            `[Register API] Patching user at: ${env.BACKEND_URL}/api/users/${existingUser.id}`,
          );
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
          console.log(
            `[Register API] Patch user response status: ${updateUserResponse.status}`,
          );

          if (updateUserResponse.ok) {
            const updatedUser = await updateUserResponse.json();
            console.log(
              "[Register API] User patched successfully. Signing JWT for linked account...",
            );

            // ---> Log before JWT sign (in existing user branch)
            console.log("[Register API] Signing JWT for linked account...");
            const token = jwt.sign(
              {
                sub: updatedUser.id,
                email: updatedUser.email,
                role: updatedUser.role,
              },
              env.JWT_SECRET!, // Check was done at start
              { expiresIn: "7d" },
            );
            console.log("[Register API] JWT signed for linked account.");

            const response = NextResponse.json(
              {
                message: "Google account linked to WatchLikeMe successfully",
                user: { id: updatedUser.id, email: updatedUser.email },
              },
              { status: 200 },
            );
            console.log("[Register API] Setting cookie for linked account...");
            response.cookies.set("token", token, {
              httpOnly: true,
              secure: process.env.NODE_ENV === "production",
              sameSite: "lax",
              path: "/",
            });
            console.log(
              "[Register API] Returning response for linked account.",
            );
            return response;
          } else {
            console.error(
              `[Register API] Failed to patch user. Status: ${updateUserResponse.status}`,
            );
          }
        } else {
          console.log(
            "[Register API] Existing user does not fit linking criteria (no googleId or has password).",
          );
        }
      } else {
        console.error(
          `[Register API] Failed to get existing user details. Status: ${getUserResponse.status}`,
        );
      }
      // If any checks above failed or didn't result in linking, return conflict
      console.log("[Register API] Returning 409 User already exists.");
      return NextResponse.json(
        { message: "User already exists" },
        { status: 409 },
      );
    }

    // ---> Log before create user fetch
    console.log(
      `[Register API] Creating user at: ${env.BACKEND_URL}/api/users`,
    );
    const createUserResponse = await fetch(`${env.BACKEND_URL}/api/users`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username,
        email,
        password,
      }),
    });
    console.log(
      `[Register API] Create user response status: ${createUserResponse.status}`,
    ); // New Log 8

    if (!createUserResponse.ok) {
      const error = await createUserResponse
        .json()
        .catch(() => ({ message: "Failed to parse backend error" }));
      console.error(
        `[Register API] Failed to create user. Status: ${createUserResponse.status}, Backend message: ${error.message}`,
      );
      return NextResponse.json(
        { message: error.message || "Failed to create user" },
        { status: createUserResponse.status },
      );
    }

    const newUser = await createUserResponse.json();
    console.log("[Register API] New user data parsed."); // New Log 9

    // ---> Log before JWT sign
    console.log("[Register API] Signing JWT for new user...");
    const token = jwt.sign(
      { sub: newUser.id, email: newUser.email, role: newUser.role },
      env.JWT_SECRET!, // Check was done at start
      { expiresIn: "7d" },
    );
    console.log("[Register API] JWT signed successfully for new user."); // New Log 10

    const response = NextResponse.json(
      {
        message: "User created successfully",
        user: { id: newUser.id, email: newUser.email },
      },
      { status: 201 },
    );
    console.log("[Register API] Setting cookies for new user..."); // New Log 11
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
    console.log("[Register API] Returning success response for new user."); // New Log 12
    return response;
  } catch (error) {
    // This log should now definitely appear if an error happens *after* the initial checks
    console.error("[Register API] Registration error in CATCH block:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 },
    );
  }
}
