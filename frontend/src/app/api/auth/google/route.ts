import { NextRequest, NextResponse } from "next/server";
import { env } from "@/env";

export async function GET(request: NextRequest) {
  console.log("=== FRONTEND GOOGLE AUTH INITIATION ROUTE ===");
  
  const { searchParams } = new URL(request.url);
  const linkAccount = searchParams.get("linkAccount");
  
  // Determine backend URL
  const backendUrl = env.BACKEND_URL || process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8888";
  
  console.log("[Frontend Auth Route] Backend URL:", backendUrl);
  console.log("[Frontend Auth Route] Link account:", linkAccount);
  
  // Construct the backend Google auth URL
  const backendGoogleAuthUrl = `${backendUrl}/api/auth/google`;
  const finalUrl = linkAccount ? `${backendGoogleAuthUrl}?linkAccount=true` : backendGoogleAuthUrl;
  
  console.log("[Frontend Auth Route] Redirecting to:", finalUrl);
  
  // Redirect to backend Google auth endpoint
  return NextResponse.redirect(finalUrl);
}