"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { RegisterForm } from "@/components/auth/register-form";

export function RegisterPageContent() {
  const searchParams = useSearchParams();
  const [googleData, setGoogleData] = useState<{
    email?: string;
    name?: string;
  }>({});
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!searchParams) return;

    const fromGoogle = searchParams.get("fromGoogle");

    if (fromGoogle === "true") {
      setIsLoading(true);
      fetch("/api/auth/google/profile")
        .then((res) => res.json())
        .then((data) => {
          if (data.error) {
            throw new Error(data.error);
          }
          setGoogleData({
            email: data.email,
            name: data.name,
          });
        })
        .catch((error) => {
          console.error("Error fetching Google profile:", error);
          // Instead of redirecting, maybe show an error message?
          // window.location.href = '/register';
        })
        .finally(() => {
          setIsLoading(false);
        });
    }
  }, [searchParams]);

  // Use the loading state from this component
  if (isLoading) {
    return (
      <div className="flex justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <>
      {googleData.email && (
        <p className="mb-4 text-center text-gray-600">
          Complete your registration using your Google account
        </p>
      )}
      <RegisterForm
        googleEmail={googleData.email}
        googleName={googleData.name}
      />
    </>
  );
}
