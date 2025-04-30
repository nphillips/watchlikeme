// Remove dotenv import and config call
// import dotenv from "dotenv";
// import path from "path";
// dotenv.config({ path: path.resolve(__dirname, "../../.env") });

// Define environment variables directly from process.env
export const env = {
  DATABASE_URL: process.env.DATABASE_URL,
  JWT_SECRET: process.env.JWT_SECRET,
  GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID,
  GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET,
  YOUTUBE_API_KEY: process.env.YOUTUBE_API_KEY,
  ORIGIN: process.env.ORIGIN,
  NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
} as const;

// Remove runtime checks that might cause startup crashes on Render
// Add them back selectively if needed and if Render confirms availability timing
// if (!env.DATABASE_URL) throw new Error("DATABASE_URL is not set");
// if (!env.JWT_SECRET) throw new Error("JWT_SECRET is not set");
// if (!env.GOOGLE_CLIENT_ID) throw new Error("GOOGLE_CLIENT_ID is not set");
// if (!env.GOOGLE_CLIENT_SECRET) throw new Error("GOOGLE_CLIENT_SECRET is not set");
// if (!env.YOUTUBE_API_KEY) throw new Error("YOUTUBE_API_KEY is not set");
// if (!env.ORIGIN) throw new Error("ORIGIN is not set");
// if (!env.NEXT_PUBLIC_SITE_URL) throw new Error("NEXT_PUBLIC_SITE_URL is not set");

// Remove or make conditional the verbose logging if desired
// console.log("Environment variables checked in backend/env.ts:", { ... });
