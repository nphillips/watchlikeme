"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { RegisterForm } from "@/components/auth/register-form";

export default function CompleteRegistrationPage() {
  const [googleProfile, setGoogleProfile] = useState<{
    email: string;
    name: string;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    async function fetchGoogleProfile() {
      try {
        const response = await fetch("/api/auth/google/profile");
        if (!response.ok) {
          throw new Error("Failed to get Google profile");
        }

        const data = await response.json();
        if (data.email && data.name) {
          setGoogleProfile({ email: data.email, name: data.name });
        } else {
          throw new Error("Invalid profile data");
        }
      } catch (err) {
        setError(
          "Unable to retrieve Google profile information. Please try again."
        );
        console.error(err);
      } finally {
        setLoading(false);
      }
    }

    fetchGoogleProfile();
  }, []);

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8 flex justify-center items-center min-h-[60vh]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading your profile...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-md mx-auto bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          <p>{error}</p>
          <div className="mt-4">
            <button
              onClick={() => router.push("/login")}
              className="text-blue-500 hover:text-blue-700"
            >
              Back to login
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-md mx-auto">
        <h1 className="text-2xl font-bold mb-2 text-center">
          Complete Your Registration
        </h1>
        <p className="text-gray-600 mb-6 text-center">
          Please create a WatchLikeMe account to continue
        </p>

        {googleProfile && (
          <RegisterForm
            googleEmail={googleProfile.email}
            googleName={googleProfile.name}
          />
        )}
      </div>
    </div>
  );
}
