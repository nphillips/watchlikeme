import path from "path";
import dotenv from "dotenv";
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

  // —— Create some dummy users ——
  const alice = await prisma.user.create({
    data: {
      email: "alice@example.com",
      username: "alice",
      googleId: "google-uid-alice",
      name: "Alice Example",
      image: "https://i.pravatar.cc/150?img=1",
      role: Role.USER,
    },
  });

  const bob = await prisma.user.create({
    data: {
      email: "bob@example.com",
      username: "bob",
      googleId: "google-uid-bob",
      name: "Bob Example",
      image: "https://i.pravatar.cc/150?img=2",
      role: Role.USER,
    },
  });

  // —— Create some channels ——
  const channelA = await prisma.channel.create({
    data: {
      youtubeId: "UC123ABC",
      title: "Channel A",
      thumbnail: "https://via.placeholder.com/150",
      subscriberCount: 1200,
      subscribers: { connect: [{ id: alice.id }] },
    },
  });

  const channelB = await prisma.channel.create({
    data: {
      youtubeId: "UC456DEF",
      title: "Channel B",
      thumbnail: "https://via.placeholder.com/150",
      subscriberCount: 800,
      subscribers: { connect: [{ id: alice.id }, { id: bob.id }] },
    },
  });

  // —— Create some videos ——
  const videoA1 = await prisma.video.create({
    data: {
      youtubeId: "VIDA1",
      title: "Video A1",
      thumbnail: "https://via.placeholder.com/150",
      publishedAt: new Date("2025-01-01"),
      channelId: channelA.id,
    },
  });

  const videoB1 = await prisma.video.create({
    data: {
      youtubeId: "VIDB1",
      title: "Video B1",
      thumbnail: "https://via.placeholder.com/150",
      publishedAt: new Date("2025-02-01"),
      channelId: channelB.id,
    },
  });

  // —— Create a collection for Alice ——
  await prisma.collection.create({
    data: {
      slug: "favorites",
      name: "Favorites",
      description: "My favorite channels & videos",
      note: "Check out these top picks I love!",
      isPublic: true,
      userId: alice.id,
      items: {
        create: [{ channelId: channelA.id }, { videoId: videoA1.id }],
      },
    },
  });

  // —— Create a collection for Bob ——
  await prisma.collection.create({
    data: {
      slug: "bob-faves",
      name: "Bob’s Faves",
      description: "Channels Bob recommends",
      note: "Great content from these creators.",
      isPublic: true,
      userId: bob.id,
      items: {
        create: [{ channelId: channelB.id }, { videoId: videoB1.id }],
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
