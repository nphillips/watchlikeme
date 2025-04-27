console.log("--- seed.ts execution started ---");

import path from "path";
import dotenv from "dotenv";
import bcrypt from "bcryptjs";

try {
  console.log("Attempting to load .env...");
  dotenv.config({ path: path.resolve(__dirname, "../../.env") });
  console.log(".env loaded. DATABASE_URL set:", !!process.env.DATABASE_URL);
} catch (dotenvError) {
  console.error("ERROR loading .env:", dotenvError);
  // Decide if you want to exit if .env fails
  // process.exit(1);
}

import { PrismaClient, Role } from "@prisma/client";

console.log("Attempting to instantiate PrismaClient...");
const prisma = new PrismaClient();
console.log("PrismaClient instantiated.");

// Helper function for delay
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function main() {
  console.log("🌱 Seeding database... START");
  console.log("Waiting 3 seconds for DB to potentially settle after reset...");
  await delay(3000); // Add 3-second delay
  console.log("Wait complete.");

  // —— Cleanup existing data (COMMENTED OUT FOR TESTING) ——
  /*
  console.log("--- Cleaning up existing data ---");
  await prisma.collectionItem.deleteMany();
  await prisma.collection.deleteMany();
  await prisma.video.deleteMany();
  await prisma.channel.deleteMany();
  await prisma.googleToken.deleteMany(); 
  await prisma.user.deleteMany();
  console.log("✓ Cleanup complete.");
  */

  // Hash a password for native users
  console.log("--- Hashing password ---");
  const hashedPassword = await bcrypt.hash(
    process.env.DEFAULT_PASSWORD || "password123",
    10
  );
  console.log("✓ Password hashed.");

  // —— Create users with different authentication methods ——
  console.log("--- Creating Users ---");
  const googleFirst = await prisma.user.create({
    data: {
      email: process.env.GOOGLE_TEST_EMAIL || "test@test.com",
      username: "google-first",
      googleId: process.env.GOOGLE_TEST_ID || "google_oauth_id_placeholder",
      password: hashedPassword, // Add hashed password
      name: "Google First User",
      image: "https://i.pravatar.cc/150?img=1",
      role: Role.USER,
    },
  });
  const bob = await prisma.user.create({
    data: {
      email: "bob@example.com",
      username: "bob",
      name: "Bob Example",
      image: "https://i.pravatar.cc/150?img=2",
      role: Role.USER,
      password: hashedPassword,
    },
  });
  const hybrid = await prisma.user.create({
    data: {
      email: process.env.GOOGLE_TEST_EMAIL_2 || "charlie@example.com",
      username: "hybrid",
      googleId: process.env.GOOGLE_TEST_ID_2 || "google_oauth_id_placeholder_2",
      name: "Hybrid User",
      image: "https://i.pravatar.cc/150?img=3",
      role: Role.USER,
      password: hashedPassword,
    },
  });
  console.log("✓ Users created:");
  console.log({ googleFirst, bob, hybrid });

  // Add Google tokens for googleFirst
  console.log("--- Creating Google Token for googleFirst ---");
  await prisma.googleToken.create({
    data: {
      userId: googleFirst.id,
      accessToken:
        process.env.GOOGLE_TEST_ACCESS_TOKEN || "test_access_token_googleFirst",
      refreshToken:
        process.env.GOOGLE_TEST_REFRESH_TOKEN ||
        "test_refresh_token_googleFirst",
      expiryDate: new Date(Date.now() + 3600000), // 1 hour from now
      // Add dummy scope/type if needed for testing, or leave null
      // scope: "test_scope",
      // tokenType: "Bearer",
    },
  });
  console.log("✓ Google Token for googleFirst created.");

  // Add Google tokens for hybrid
  console.log("--- Creating Google Token for hybrid ---");
  await prisma.googleToken.create({
    data: {
      userId: hybrid.id,
      accessToken:
        process.env.GOOGLE_TEST_ACCESS_TOKEN_2 || "test_access_token_hybrid",
      refreshToken:
        process.env.GOOGLE_TEST_REFRESH_TOKEN_2 || "test_refresh_token_hybrid",
      expiryDate: new Date(Date.now() + 3600000), // 1 hour from now
      // Add dummy scope/type if needed for testing, or leave null
      // scope: "test_scope_hybrid",
      // tokenType: "Bearer",
    },
  });
  console.log("✓ Google Token for hybrid created.");

  // —— Create realistic tech channels ——
  console.log("--- Creating Channels ---");
  const verge = await prisma.channel.create({
    data: {
      youtubeId: "UCddiUEpeqJcYeBxFu_BnGOA",
      title: "The Verge",
      thumbnail:
        "https://yt3.googleusercontent.com/ytc/APkrFKaqca-rGQnQc3X7X9qZsZUMXmBZJ9Xz6K8QJ8KZ=s176-c-k-c0x00ffffff-no-rj",
      subscriberCount: 3000000,
      subscribers: { connect: [{ id: googleFirst.id }, { id: hybrid.id }] },
    },
  });
  const ltt = await prisma.channel.create({
    data: {
      youtubeId: "UCXuqSBlHAE6Xw-yeJA0Tunw",
      title: "Linus Tech Tips",
      thumbnail:
        "https://yt3.googleusercontent.com/ytc/APkrFKYcYswt_UhD7D0j6ddiQz6Gb8Qmh9YxYVt8w=s176-c-k-c0x00ffffff-no-rj",
      subscriberCount: 15000000,
      subscribers: { connect: [{ id: bob.id }, { id: hybrid.id }] },
    },
  });
  const mkbhd = await prisma.channel.create({
    data: {
      youtubeId: "UCBJycsmduvYEL83R_U4JriQ",
      title: "MKBHD",
      thumbnail:
        "https://yt3.googleusercontent.com/ytc/APkrFKaqca-rGQnQc3X7X9qZsZUMXmBZJ9Xz6K8QJ8KZ=s176-c-k-c0x00ffffff-no-rj",
      subscriberCount: 18000000,
      subscribers: {
        connect: [{ id: googleFirst.id }, { id: bob.id }, { id: hybrid.id }],
      },
    },
  });
  console.log("✓ Channels created.");
  console.log({ verge, ltt, mkbhd });

  // —— Create some realistic videos ——
  console.log("--- Creating Videos ---");
  const vergeVideo = await prisma.video.create({
    data: {
      youtubeId: "verge2024",
      title: "The Verge's 2024 Tech Predictions",
      thumbnail: "https://i.ytimg.com/vi/dQw4w9WgXcQ/maxresdefault.jpg",
      publishedAt: new Date("2024-01-01"),
      channelId: verge.id,
    },
  });
  const lttVideo = await prisma.video.create({
    data: {
      youtubeId: "lttgaming",
      title: "Building the Ultimate Gaming PC",
      thumbnail: "https://i.ytimg.com/vi/dQw4w9WgXcQ/maxresdefault.jpg",
      publishedAt: new Date("2024-02-01"),
      channelId: ltt.id,
    },
  });
  const mkbhdVideo = await prisma.video.create({
    data: {
      youtubeId: "iphone15review",
      title: "iPhone 15 Pro Review: Worth the Upgrade?",
      thumbnail: "https://i.ytimg.com/vi/dQw4w9WgXcQ/maxresdefault.jpg",
      publishedAt: new Date("2024-03-01"),
      channelId: mkbhd.id,
    },
  });
  console.log("✓ Videos created.");
  console.log({ vergeVideo, lttVideo, mkbhdVideo });

  // —— Create collections for googleFirst ——
  console.log("--- Creating Collections for googleFirst ---");
  await prisma.collection.create({
    data: {
      slug: "favorites",
      name: "Favorites",
      description: "My favorite tech channels",
      isPublic: true,
      userId: googleFirst.id,
      items: {
        create: [{ channelId: verge.id }, { channelId: mkbhd.id }],
      },
    },
  });
  console.log("✓ Collection 1 for googleFirst created.");
  await prisma.collection.create({
    data: {
      slug: "untitled",
      name: "Untitled",
      description: "My untitled collection",
      isPublic: false,
      userId: googleFirst.id,
      items: {
        create: [{ channelId: ltt.id }],
      },
    },
  });
  console.log("✓ Collection 2 for googleFirst created.");
  await prisma.collection.create({
    data: {
      slug: "watch-later",
      name: "Watch Later",
      description: "Videos to watch later",
      isPublic: false,
      userId: googleFirst.id,
      items: {
        create: [{ videoId: vergeVideo.id }, { videoId: mkbhdVideo.id }],
      },
    },
  });
  console.log("✓ Collection 3 for googleFirst created.");

  // —— Create collections for Bob ——
  console.log("--- Creating Collections for Bob ---");
  await prisma.collection.create({
    data: {
      slug: "tech-channels",
      name: "Tech Channels",
      description: "Great tech content creators",
      isPublic: true,
      userId: bob.id,
      items: {
        create: [{ channelId: ltt.id }, { channelId: mkbhd.id }],
      },
    },
  });
  console.log("✓ Collection 1 for Bob created.");
  await prisma.collection.create({
    data: {
      slug: "untitled",
      name: "Untitled",
      description: "My untitled collection",
      isPublic: false,
      userId: bob.id,
      items: {
        create: [{ channelId: verge.id }],
      },
    },
  });
  console.log("✓ Collection 2 for Bob created.");

  // —— Create collections for hybrid ——
  console.log("--- Creating Collections for hybrid ---");
  await prisma.collection.create({
    data: {
      slug: "tech-mix",
      name: "Tech Mix",
      description: "A mix of tech content",
      isPublic: true,
      userId: hybrid.id,
      items: {
        create: [
          { channelId: verge.id },
          { channelId: ltt.id },
          { channelId: mkbhd.id },
        ],
      },
    },
  });
  console.log("✓ Collection 1 for hybrid created.");
  await prisma.collection.create({
    data: {
      slug: "untitled",
      name: "Untitled",
      description: "My untitled collection",
      isPublic: false,
      userId: hybrid.id,
      items: {
        create: [{ videoId: lttVideo.id }],
      },
    },
  });
  console.log("✓ Collection 2 for hybrid created.");

  console.log("✅ Seeding complete!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
