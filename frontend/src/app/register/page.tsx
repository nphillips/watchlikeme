"use client";

// import { RegisterForm } from "@/components/auth/register-form";
import Nav from "@/components/Nav";
import { Suspense } from "react";
import { RegisterPageContent } from "./RegisterPageContent";

export default function RegisterPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <Nav
        isAuthenticated={false}
        user={null}
        handleLinkGoogle={() => {}}
        onMenuClick={() => {}}
      />
      <div className="flex flex-1 flex-col items-center py-10">
        <h1 className="mb-6 text-center text-2xl font-bold">Register</h1>
        <Suspense
          fallback={
            <div className="flex justify-center">
              <div className="h-8 w-8 animate-spin rounded-full border-t-2 border-b-2 border-blue-500"></div>
            </div>
          }
        >
          <RegisterPageContent />
        </Suspense>
      </div>
    </div>
  );
}
