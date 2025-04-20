"use client";

import { ReactNode } from "react";
import { GoogleAuthProvider } from "@/components/providers/google-auth-provider";

export function ClientLayout({ children }: { children: ReactNode }) {
  return <GoogleAuthProvider>{children}</GoogleAuthProvider>;
}
