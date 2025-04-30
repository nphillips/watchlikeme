"use client";
// Remove direct import of LoginForm
// import { LoginForm } from "@/components/auth/login-form";
import Nav from "@/components/Nav";
import { Suspense } from "react"; // Import Suspense
import { LoginPageContent } from "./LoginPageContent"; // Import new component

export default function LoginPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <Nav
        isAuthenticated={false}
        user={null}
        handleLinkGoogle={() => {}}
        onMenuClick={() => {}}
      />
      <div className="flex flex-1 flex-col items-center py-10">
        <div className="container w-full px-6">
          <h1 className="mb-6 text-center text-2xl font-bold">Log in</h1>
          {/* Wrap content in Suspense */}
          <Suspense
            fallback={
              <div className="flex justify-center">
                <p>Loading form...</p>
              </div>
            }
          >
            <LoginPageContent />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
