import express, { RequestHandler } from "express";
import passport from "passport";
import {
  Strategy as GoogleStrategy,
  Profile as GoogleProfile,
} from "passport-google-oauth20";
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

// --- Remove Temporary Debugging Route ---
// app.get("/api/channels", (req, res, next) => {
//   if (req.query.q) {
//     console.log(`[DEBUG] Received GET /api/channels with q=${req.query.q}`);
//     return res.status(200).json({ debug: true, query: req.query.q });
//   } else {
//     // If no query param, pass to the next route (the main router)
//     console.log("[DEBUG] Received GET /api/channels without q, passing to main router.");
//     next();
//   }
// });
// --- End Remove Temporary Debugging Route ---

// Mount routes
app.use("/api", router);
app.use("/api/auth", authRoutes);
app.use("/api/users", userRouter);

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
          // Check if this user also has a password
          if (userById.password) {
            console.log(
              `[Passport Strategy] User ${userById.id} found by Google ID also has password. Prompting password.`
            );
            return done(null, { ...userById, promptPassword: true });
          } else {
            console.log(
              `[Passport Strategy] User ${userById.id} found by Google ID has NO password. Proceeding with login.`
            );
            return done(null, userById);
          }
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

          // Check if this user also has a password
          if (userByEmail.password) {
            console.log(
              `[Passport Strategy] User ${userByEmail.id} found by email also has password. Prompting password.`
            );
            return done(null, { ...userByEmail, promptPassword: true });
          } else {
            console.log(
              `[Passport Strategy] User ${userByEmail.id} found by email has NO password. Proceeding with login.`
            );
            return done(null, userByEmail);
          }
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

// Define an interface for the authInfo object passed from the Google strategy
interface GoogleAuthInfo {
  accessToken: string;
  refreshToken: string;
  expires?: Date | number;
  profile: GoogleProfile;
}

// Define handler separately and mark it async
const googleCallbackHandler: RequestHandler = async (req, res, next) => {
  console.log(
    "[Google Callback Handler] User object received from Passport:",
    req.user
  );
  // Log authInfo to see if tokens are present
  console.log(
    "[Google Callback Handler] AuthInfo object received from Passport:",
    // @ts-ignore - req.authInfo is not strongly typed by default
    req.authInfo
  );

  // Cast needed because Passport types req.user loosely
  const user = req.user as User & { promptPassword?: boolean };

  if (!user) {
    console.error("Google callback missing user object!");
    return res.redirect("/login?error=googleAuthFailed");
  }

  // Check for registration needed
  if (user.id === "temp") {
    console.log(
      "Google auth successful, but no WLM account linked. Redirecting to registration."
    );
    return res.redirect("/register?fromGoogle=true");
  }

  // Check if password prompt is needed (existing user with password)
  if (user.promptPassword) {
    console.log(
      `Google auth successful for existing WLM user ${user.id}, but password exists. Redirecting to login.`
    );
    const redirectUrl = `/login?email=${encodeURIComponent(
      user.email
    )}&message=passwordRequired`;
    return res.redirect(redirectUrl);
  }

  // Otherwise: Existing user found, no password OR strategy decided auto-login is ok
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

  // Get Google tokens from authInfo and set google_tokens cookie
  const authInfo = req.authInfo as GoogleAuthInfo | undefined;
  if (authInfo && authInfo.accessToken && authInfo.refreshToken) {
    console.log(
      `[Google Callback Handler] Setting google_tokens cookie and saving tokens for user ${user.id}`
    );

    // Prepare data for DB and cookie
    const { accessToken, refreshToken, expires } = authInfo;
    // Extract scope and token_type from the credentials/profile if available
    // Note: These might not always be directly in authInfo, adjust as needed based on passport strategy results
    const scope = authInfo.profile?.provider; // Example: Trying to get scope from profile
    const token_type = "Bearer"; // Typically Bearer for Google OAuth

    const expiryDate = expires
      ? typeof expires === "number"
        ? new Date(expires) // Assume it's a timestamp if number
        : new Date(expires).toString() !== "Invalid Date"
        ? new Date(expires)
        : new Date(Date.now() + 3600 * 1000) // Use current time + 1 hour if expires is invalid/missing
      : new Date(Date.now() + 3600 * 1000);

    const googleTokensForCookie = {
      access_token: accessToken,
      refresh_token: refreshToken,
      expiry_date: expiryDate.getTime(), // Use timestamp for cookie
      // Optionally include scope/type in cookie if needed client-side, but keep it minimal
    };

    // Save tokens to database (now directly awaited)
    try {
      await prisma.googleToken.upsert({
        where: { userId: user.id },
        update: {
          accessToken: accessToken,
          refreshToken: refreshToken,
          expiryDate: expiryDate, // Save Date object
          scope: scope, // Save scope
          tokenType: token_type, // Save token_type
        },
        create: {
          userId: user.id,
          accessToken: accessToken,
          refreshToken: refreshToken,
          expiryDate: expiryDate, // Save Date object
          scope: scope, // Save scope
          tokenType: token_type, // Save token_type
        },
      });
      console.log(
        `[Google Callback Handler] Google tokens saved to database for user ${user.id}`
      );
    } catch (error) {
      console.error(
        "[Google Callback Handler] Error saving Google tokens to database:",
        error
      );
      // Decide if you want to proceed without saving tokens or return an error
    }

    // Set cookie
    res.cookie("google_tokens", JSON.stringify(googleTokensForCookie), {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });
  } else {
    console.log("[Google Callback Handler] No Google tokens found in authInfo");
  }

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
