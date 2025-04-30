"use client";

import { LoginForm } from "@/components/auth/login-form";

// This component now contains the part that uses useSearchParams (via LoginForm)
export function LoginPageContent() {
  return <LoginForm />;
}
