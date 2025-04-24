import path from "path";
import dotenv from "dotenv";
import bcrypt from "bcryptjs";
dotenv.config({ path: path.resolve(__dirname, "../../.env") });

import { PrismaClient, Role } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱  Seeding database...");

  // —— Cleanup existing data ——
  await prisma.collectionItem.deleteMany();
  await prisma.collection.deleteMany();
  await prisma.video.deleteMany();
  await prisma.channel.deleteMany();
  await prisma.user.deleteMany();

  // Hash a password for native users
  const hashedPassword = await bcrypt.hash(
    process.env.DEFAULT_PASSWORD || "password123",
    10
  );

  // —— Create users with different authentication methods ——

  // 1. Google OAuth only user (no WatchLikeMe password)
  const googleFirst = await prisma.user.create({
    data: {
      email: process.env.GOOGLE_TEST_EMAIL || "test@test.com",
      username: "google-first",
      googleId: process.env.GOOGLE_TEST_ID || "google_oauth_id_placeholder",
      name: "Google First User",
      image: "https://i.pravatar.cc/150?img=1",
      role: Role.USER,
    },
  });

  // Add Google tokens for googleFirst
  await prisma.googleToken.create({
    data: {
      userId: googleFirst.id,
      accessToken:
        process.env.GOOGLE_TEST_ACCESS_TOKEN || "test_access_token_googleFirst",
      refreshToken:
        process.env.GOOGLE_TEST_REFRESH_TOKEN ||
        "test_refresh_token_googleFirst",
      expiryDate: new Date(Date.now() + 3600000), // 1 hour from now
    },
  });

  // 2. WatchLikeMe only user (no Google account linked)
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

  // 3. Hybrid user (both WatchLikeMe password and Google OAuth linked)
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

  // Add Google tokens for hybrid
  await prisma.googleToken.create({
    data: {
      userId: hybrid.id,
      accessToken:
        process.env.GOOGLE_TEST_ACCESS_TOKEN_2 || "test_access_token_hybrid",
      refreshToken:
        process.env.GOOGLE_TEST_REFRESH_TOKEN_2 || "test_refresh_token_hybrid",
      expiryDate: new Date(Date.now() + 3600000), // 1 hour from now
    },
  });

  // —— Create realistic tech channels ——
  const verge = await prisma.channel.create({
    data: {
      youtubeId: "UCddiUEpeqJcYeBxFu_BnGOA",
      title: "The Verge",
      thumbnail:
        "https://yt3.googleusercontent.com/ytc/APkrFKaqca-rGQnQc3X7X9qZsZUMXmBZJ9Xz6K8QJ8KZ=s176-c-k-c0x00ffffff-no-rj",
      subscriberCount: 3000000,
      userId: googleFirst.id,
      thumbnailUpdatedAt: new Date(),
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
      userId: bob.id,
      thumbnailUpdatedAt: new Date(),
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
      userId: hybrid.id,
      thumbnailUpdatedAt: new Date(),
      subscribers: {
        connect: [{ id: googleFirst.id }, { id: bob.id }, { id: hybrid.id }],
      },
    },
  });

  // —— Create some realistic videos ——
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

  // —— Create collections for googleFirst ——
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

  // —— Create collections for Bob ——
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

  // —— Create collections for hybrid ——
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

  console.log("✅  Seeding complete!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
