import express from "express";
import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import cookieParser from "cookie-parser";
import cors from "cors";
import jwt from "jsonwebtoken";
import serverless from "serverless-http";
import { PrismaClient } from "@prisma/client";
import slugify from "slugify";
import path from "path";
import router from "./routes";
import userRouter from "./routes/users";
import authRoutes from "./routes/auth";
import { env } from "./env";
import { getGoogleTokensForUser } from "./lib/google";
import { RequestHandler } from "express";

// User type definition for TypeScript since we can't import it directly from Prisma
type User = {
  id: string;
  email: string;
  name?: string | null;
  googleId?: string | null;
  role: "USER" | "ADMIN";
};

const prisma = new PrismaClient();

async function initPrisma() {
  try {
    await prisma.$connect();
    console.log("Successfully connected to the database");
  } catch (error) {
    console.error("Failed to connect to the database:", error);
    process.exit(1);
  }
}

initPrisma();

const app = express();

// Middleware
app.use(express.json());
app.use(cookieParser());
// Revert to single cors middleware application
app.use(
  cors({
    origin: env.ORIGIN,
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "Cookie"],
  })
);

// @ts-ignore // Keep ignore for persistent type error
app.use(passport.initialize());

// Mount routes
app.use("/api", router);
app.use("/api/auth", authRoutes);
app.use("/api/users", userRouter);

// Log after importing
console.log("[index.ts] Imported userRouter. Type:", typeof userRouter);

// Google OAuth strategy that only checks for user existence
// The frontend will handle registration if the user doesn't exist
passport.use(
  new GoogleStrategy(
    {
      clientID: env.GOOGLE_CLIENT_ID,
      clientSecret: env.GOOGLE_CLIENT_SECRET,
      callbackURL: `${env.ORIGIN}/api/auth/google/callback`,
    },
    async (_, __, profile, done) => {
      try {
        const email = profile.emails?.[0].value;
        const googleIdFromProfile = profile.id;

        if (!email) {
          return done(new Error("No email found in Google profile."));
        }
        // Keep basic logging
        console.log(
          `[Passport Strategy] Profile received: ID=${googleIdFromProfile}, Email=${email}`
        );

        // Check by Google ID
        let userById = await prisma.user.findUnique({
          where: { googleId: googleIdFromProfile },
        });
        if (userById) {
          console.log(
            `[Passport Strategy] Found user by Google ID: ${userById.id}`
          );
          return done(null, userById);
        }

        // Check by Email
        let userByEmail = await prisma.user.findUnique({
          where: { email: email },
        });
        if (userByEmail) {
          console.log(
            `[Passport Strategy] Found user by Email: ${userByEmail.id}`
          );
          // Link Google ID if missing
          if (!userByEmail.googleId) {
            console.log(
              `[Passport Strategy] Linking Google ID ${googleIdFromProfile} to user ${userByEmail.id}`
            );
            try {
              userByEmail = await prisma.user.update({
                where: { id: userByEmail.id },
                data: { googleId: googleIdFromProfile },
              });
            } catch (updateError) {
              console.error(
                `[Passport Strategy] Error linking Google ID:`,
                updateError
              );
              // Proceed with user found by email even if linking failed
            }
          } else if (userByEmail.googleId !== googleIdFromProfile) {
            console.warn(
              `[Passport Strategy] User ${userByEmail.id} email ${email} matched, but Google ID differs.`
            );
          }
          return done(null, userByEmail);
        }

        // New User
        console.log(
          `[Passport Strategy] No existing user found. Returning temp user.`
        );
        const tempUser = {
          id: "temp",
          email,
          name: profile.displayName,
          googleId: googleIdFromProfile,
          role: "USER",
        } as User;
        return done(null, tempUser);
      } catch (error) {
        console.error("[Passport Strategy] Error:", error);
        return done(error as Error);
      }
    }
  )
);

// Auth routes
app.get(
  "/api/auth/google",
  passport.authenticate("google", {
    scope: [
      "profile",
      "email",
      "https://www.googleapis.com/auth/youtube.readonly",
    ],
  })
);

// Define handler separately (optional, but keeps code cleaner)
const googleCallbackHandler: RequestHandler = (req, res, next) => {
  // Log the user object received from Passport *before* any checks
  console.log(
    "[Google Callback Handler] User object received from Passport:",
    req.user
  );

  const user = req.user as User;
  if (!user) {
    console.error("Google callback missing user object!");
    return res.redirect("/login?error=googleAuthFailed");
  }
  if (user.id === "temp") {
    console.log(
      "Google auth successful, but no WLM account linked. Redirecting to registration."
    );
    return res.redirect("/register?fromGoogle=true");
  }
  console.log(
    `Google auth successful for existing WLM user: ${user.id} (${user.email}). Logging in.`
  );
  const token = jwt.sign(
    { sub: user.id, email: user.email, role: user.role },
    env.JWT_SECRET!,
    { expiresIn: "7d" }
  );
  res.cookie("token", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });
  res.cookie("auth_success", "true", {
    maxAge: 60 * 1000,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });
  res.redirect("/");
};

// @ts-ignore // Ignore persistent type error on this specific route definition
app.get(
  "/api/auth/google/callback",
  passport.authenticate("google", {
    session: false,
    failureRedirect: "/login?error=googleAuthFailed",
  }),
  googleCallbackHandler // Use the typed handler
);

// Start the server if we're not in a serverless environment
if (!process.env.NETLIFY) {
  const PORT = process.env.PORT || 8888;
  app.listen(PORT, () => {
    console.log(`Backend server running at http://localhost:${PORT}`);
  });
}

export const handler = serverless(app);
