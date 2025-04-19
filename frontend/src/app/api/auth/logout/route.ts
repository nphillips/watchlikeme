import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function GET() {
  try {
    // Access the cookie jar
    const cookieStore = await cookies();

    // Log available cookies before clearing
    const allCookies = cookieStore.getAll();
    console.log(
      "Logout: Clearing cookies. Available cookies:",
      allCookies.map((cookie: { name: string }) => cookie.name).join(", ")
    );

    // Clear all authentication-related cookies
    cookieStore.delete("token");
    cookieStore.delete("auth_token");
    cookieStore.delete("google_tokens");
    cookieStore.delete("auth_success");
    cookieStore.delete("auth_debug");

    // Create response
    const response = NextResponse.json({
      success: true,
      message: "Logged out successfully",
    });

    // Also clear cookies from the response to be extra safe
    response.cookies.delete("token");
    response.cookies.delete("auth_token");
    response.cookies.delete("google_tokens");
    response.cookies.delete("auth_success");
    response.cookies.delete("auth_debug");

    return response;
  } catch (error) {
    console.error("Error during logout:", error);
    return NextResponse.json({ error: "Logout failed" }, { status: 500 });
  }
}
