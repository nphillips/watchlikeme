import { RegisterForm } from "@/components/auth/register-form";

export default function RegisterPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-md mx-auto">
        <h1 className="text-2xl font-bold mb-6 text-center">
          Create a WatchLikeMe Account
        </h1>
        <RegisterForm />
      </div>
    </div>
  );
}
