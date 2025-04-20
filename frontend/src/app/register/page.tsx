"use client";

import { RegisterForm } from "@/components/auth/register-form";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

export default function RegisterPage() {
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
      // Fetch the Google profile data from the session
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
          // If we can't get the profile data, redirect to regular registration
          window.location.href = "/register";
        })
        .finally(() => {
          setIsLoading(false);
        });
    }
  }, [searchParams]);

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-md mx-auto">
        <h1 className="text-2xl font-bold mb-6 text-center">
          Create a WatchLikeMe Account
        </h1>
        {isLoading ? (
          <div className="flex justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
          </div>
        ) : (
          <>
            {googleData.email && (
              <p className="text-center mb-4 text-gray-600">
                Complete your registration using your Google account
              </p>
            )}
            <RegisterForm
              googleEmail={googleData.email}
              googleName={googleData.name}
            />
          </>
        )}
      </div>
    </div>
  );
}
