import dotenv from "dotenv";
import bcrypt from "bcryptjs";
import { conn, sequelize } from "./connection.js";
import { User } from "./Users/User.model.js";

dotenv.config();

const ADMIN_EMAIL = "ziad@admin.com";
const ADMIN_PASSWORD = "123456789";
const ADMIN_NAME = "Ziad Admin";

export const seedAdmin = async (): Promise<void> => {
  await conn();

  const existing = await User.unscoped().findOne({ where: { email: ADMIN_EMAIL } });

  const hashedPassword = bcrypt.hashSync(ADMIN_PASSWORD, +(process.env.saltRound || 8));

  if (existing) {
    await existing.update({
      name: ADMIN_NAME,
      password: hashedPassword,
      role: "Admin",
    });

    console.log(`Admin user updated: ${ADMIN_EMAIL}`);
    return;
  }

  await User.unscoped().create({
    name: ADMIN_NAME,
    email: ADMIN_EMAIL,
    password: hashedPassword,
    role: "Admin",
  });

  console.log(`Admin user created: ${ADMIN_EMAIL}`);
};

const isCli = process.argv[1]?.includes("seed");

if (isCli) {
  seedAdmin()
    .catch((error) => {
      console.error("Seed failed:", error);
      process.exit(1);
    })
    .finally(async () => {
      await sequelize.close();
    });
}
