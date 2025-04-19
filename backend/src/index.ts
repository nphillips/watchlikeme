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
import authRoutes from "./routes/auth";
import usersRoutes from "./routes/users";
import { env } from "./env";

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
app.use(cors({ origin: process.env.ORIGIN, credentials: true }));
app.use(passport.initialize());
app.use("/api", router);
// Register new routes
app.use("/api/auth", authRoutes);
app.use("/api/users", usersRoutes);

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
        const email = profile.emails?.[0].value!;

        // Check if a user with this Google ID already exists
        let user = await prisma.user.findUnique({
          where: { googleId: profile.id },
        });

        if (user) {
          // If user exists, return it
          return done(null, user);
        }

        // Check if a user with this email already exists
        user = await prisma.user.findUnique({
          where: { email },
        });

        if (user) {
          // If user exists but doesn't have googleId, update it
          if (!user.googleId) {
            user = await prisma.user.update({
              where: { id: user.id },
              data: { googleId: profile.id },
            });
          }
          return done(null, user);
        }

        // Return a temporary user object for authentication
        // The actual user will be created during registration
        return done(null, {
          id: "temp",
          email,
          name: profile.displayName,
          googleId: profile.id,
          role: "USER",
        } as User);
      } catch (error) {
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

app.get(
  "/api/auth/google/callback",
  passport.authenticate("google", { session: false, failureRedirect: "/" }),
  (req, res) => {
    const user = req.user! as User;

    // If it's a temporary user (no WatchLikeMe account yet)
    if (user.id === "temp") {
      // Redirect to frontend registration completion page
      res.redirect("/complete-registration");
      return;
    }

    // Otherwise proceed with normal login flow
    const token = jwt.sign(
      { sub: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET!,
      { expiresIn: "7d" }
    );
    res.cookie("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
    });
    res.redirect("/");
  }
);

app.get("/api/users/me", async (req, res) => {
  const token = req.cookies.token || "";
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET!) as {
      sub: string;
    };
    const user = await prisma.user.findUnique({ where: { id: payload.sub } });
    return res.json(user);
  } catch {
    return res.status(401).json({ error: "Not authenticated" });
  }
});

// Start the server if we're not in a serverless environment
if (!process.env.NETLIFY) {
  const PORT = process.env.PORT || 8888;
  app.listen(PORT, () => {
    console.log(`Backend server running at http://localhost:${PORT}`);
  });
}

export const handler = serverless(app);
