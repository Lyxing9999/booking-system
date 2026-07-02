import mongoose from "mongoose";
import dotenv from "dotenv";
import User from "../models/User.js";
import Slot from "../models/Slot.js";

dotenv.config({ path: "./backend/.env" });

const ADMIN = {
  name: process.env.SEED_ADMIN_NAME || "PS5 Admin",
  email: process.env.SEED_ADMIN_EMAIL || "admin@ps5booking.com",
  password: process.env.SEED_ADMIN_PASSWORD || "Admin@123",
  role: "admin",
  theme: "ps5-default",
};

const DEMO_USER = {
  name: process.env.SEED_USER_NAME || "Demo Player",
  email: process.env.SEED_USER_EMAIL || "user@ps5booking.com",
  password: process.env.SEED_USER_PASSWORD || "User@123",
  role: "user",
  theme: "neon-arena",
};

const SAMPLE_SLOTS = [
  {
    gameTitle: "FIFA 25",
    gameImage: "https://images.igdb.com/igdb/image/upload/t_cover_big/co7re8.jpg",
    description: "Football match game — perfect for friends",
    date: "2026-06-01",
    time: "14:00 - 15:00",
    price: 2,
    maxPlayers: 2,
    status: "available",
  },
  {
    gameTitle: "God of War Ragnarök",
    gameImage: "https://images.igdb.com/igdb/image/upload/t_cover_big/co5s5v.jpg",
    description: "Epic Norse adventure on PS5",
    date: "2026-06-01",
    time: "16:00 - 17:00",
    price: 3,
    maxPlayers: 1,
    status: "available",
  },
  {
    gameTitle: "Gran Turismo 7",
    gameImage: "https://images.igdb.com/igdb/image/upload/t_cover_big/co2abg.jpg",
    description: "Real driving simulator experience",
    date: "2026-06-02",
    time: "10:00 - 11:00",
    price: 2.5,
    maxPlayers: 1,
    status: "available",
  },
];

async function upsertUser({ name, email, password, role, theme }) {
  const existing = await User.findOne({ email });
  if (existing) {
    console.log(`  ↳ User already exists: ${email}`);
    return existing;
  }

  const user = await User.create({ name, email, password, role, theme });
  console.log(`  ✓ Created ${role}: ${email}`);
  return user;
}

async function seedSlots(adminId) {
  let created = 0;
  for (const slot of SAMPLE_SLOTS) {
    const exists = await Slot.findOne({ date: slot.date, time: slot.time });
    if (exists) continue;
    await Slot.create({ ...slot, createdBy: adminId });
    created++;
  }
  if (created > 0) {
    console.log(`  ✓ Created ${created} sample PS5 slots`);
  } else {
    console.log("  ↳ Sample slots already exist");
  }
}

async function seed() {
  if (!process.env.MONGO_URI) {
    console.error("❌ MONGO_URI is not set in backend/.env");
    process.exit(1);
  }

  await mongoose.connect(process.env.MONGO_URI);
  console.log("✅ Connected to MongoDB\n🌱 Seeding...\n");

  const admin = await upsertUser(ADMIN);
  await upsertUser(DEMO_USER);
  await seedSlots(admin._id);

  console.log("\n✅ Seed complete!\n");
  console.log("Admin login:");
  console.log(`  Email:    ${ADMIN.email}`);
  console.log(`  Password: ${ADMIN.password}`);
  console.log("\nDemo user login:");
  console.log(`  Email:    ${DEMO_USER.email}`);
  console.log(`  Password: ${DEMO_USER.password}`);

  await mongoose.disconnect();
}

seed().catch((err) => {
  console.error("❌ Seed failed:", err.message);
  process.exit(1);
});
