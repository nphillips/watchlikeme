import dotenv from "dotenv";
import path from "path";

// Load environment variables from the root .env file
dotenv.config({ path: path.resolve(__dirname, "../../.env") });

// Log environment loading
console.log(
  "Loading environment variables from:",
  path.resolve(__dirname, "../../.env")
);

// Define environment variables with fallbacks
export const env = {
  // Database
  DATABASE_URL:
    process.env.DATABASE_URL || "postgresql://localhost:5432/watchlikeme_db",

  // Auth
  JWT_SECRET: process.env.JWT_SECRET || "development_jwt_secret",
  GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID || "",
  GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET || "",

  // API Keys
  YOUTUBE_API_KEY: process.env.YOUTUBE_API_KEY || "",

  // URLs
  ORIGIN: process.env.ORIGIN || "http://localhost:3000",
  NEXT_PUBLIC_SITE_URL:
    process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000",
} as const;

// Log environment variables that are loaded
console.log("Environment variables loaded in backend/env.ts:", {
  DATABASE_URL: env.DATABASE_URL ? "set" : "not set",
  JWT_SECRET: env.JWT_SECRET ? "set" : "development_jwt_secret",
  GOOGLE_CLIENT_ID: env.GOOGLE_CLIENT_ID ? "set" : "not set",
  GOOGLE_CLIENT_SECRET: env.GOOGLE_CLIENT_SECRET ? "set" : "not set",
  YOUTUBE_API_KEY: env.YOUTUBE_API_KEY ? "set" : "not set",
  ORIGIN: env.ORIGIN,
  NEXT_PUBLIC_SITE_URL: env.NEXT_PUBLIC_SITE_URL,
});
