import { NextResponse } from "next/server";
import { env } from "@/env";

export async function POST() {
  const response = NextResponse.redirect(`${env.NEXT_PUBLIC_SITE_URL}/`);

  response.cookies.set("token", "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });

  return response;
}
