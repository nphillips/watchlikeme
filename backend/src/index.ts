import express from "express";
import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import cookieParser from "cookie-parser";
import cors from "cors";
import jwt from "jsonwebtoken";
import serverless from "serverless-http";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const app = express();

// Middleware
app.use(cookieParser());
app.use(cors({ origin: process.env.ORIGIN, credentials: true }));
app.use(passport.initialize());

// Passport Google Strategy
passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      callbackURL: `${process.env.ORIGIN}/api/auth/google/callback`,
    },
    async (_, __, profile, done) => {
      // Extract email and name
      const email = profile.emails?.[0].value!;
      const name = profile.displayName;

      // Find or create user
      const user = await prisma.user.upsert({
        where: { email },
        update: { name, googleId: profile.id },
        create: {
          email,
          name,
          googleId: profile.id,
          username: slugify(name, { lower: true }),
        },
      });

      done(null, user);
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
    // @ts-ignore req.user is User
    const user = req.user!;
    // Create JWT
    const token = jwt.sign(
      { sub: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET!,
      { expiresIn: "7d" }
    );
    // Set cookie and redirect home
    res.cookie("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
    });
    res.redirect("/");
  }
);

// Optional: endpoint to get current user
app.get("/api/users/me", async (req, res) => {
  const token = req.cookies.token || "";
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET!);
    // @ts-ignore
    const user = await prisma.user.findUnique({ where: { id: payload.sub } });
    return res.json(user);
  } catch {
    return res.status(401).json({ error: "Not authenticated" });
  }
});

export const handler = serverless(app);
