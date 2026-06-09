import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import dotenv from "dotenv";
import { Umzug, SequelizeStorage } from "umzug";
import type { QueryInterface } from "sequelize";
import { conn, sequelize } from "./connection.js";

dotenv.config();

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const migrationsDir = path.join(rootDir, "migrations");

const getMigrationFiles = (): string[] =>
  fs
    .readdirSync(migrationsDir)
    .filter((file) => /^\d.+\.ts$/.test(file))
    .sort()
    .map((file) => path.join(migrationsDir, file));

const createMigrator = () => {
  const queryInterface = sequelize.getQueryInterface();

  const migrations = getMigrationFiles().map((migrationPath) => {
    const name = path.basename(migrationPath, ".ts");
    const migrationUrl = pathToFileURL(migrationPath).href;

    return {
      name,
      up: async () => {
        const migration = await import(migrationUrl);
        await migration.up({ context: queryInterface });
      },
      down: async () => {
        const migration = await import(migrationUrl);
        await migration.down({ context: queryInterface });
      },
    };
  });

  return new Umzug({
    migrations,
    context: queryInterface,
    storage: new SequelizeStorage({ sequelize, tableName: "SequelizeMeta" }),
    logger: console,
  });
};

export const runMigrations = async (): Promise<void> => {
  await conn();

  const migrator = createMigrator();
  const executed = await migrator.up();

  if (executed.length === 0) {
    console.log("No pending migrations");
  } else {
    console.log(
      "Migrations applied:",
      executed.map((migration) => migration.name).join(", ")
    );
  }
};

export const undoLastMigration = async (): Promise<void> => {
  await conn();

  const migrator = createMigrator();
  const reverted = await migrator.down();

  if (reverted.length === 0) {
    console.log("No migrations to undo");
  } else {
    console.log(
      "Migrations reverted:",
      reverted.map((migration) => migration.name).join(", ")
    );
  }
};

export const migrationStatus = async (): Promise<void> => {
  await conn();

  const migrator = createMigrator();
  const executed = await migrator.executed();
  const pending = await migrator.pending();

  console.log("Executed migrations:");
  executed.forEach((migration) => console.log(`  ✓ ${migration.name}`));

  console.log("Pending migrations:");
  pending.forEach((migration) => console.log(`  - ${migration.name}`));
};

const isCli = process.argv[1]?.includes("migrate");

if (isCli) {
  const command = process.argv[2];

  const run = async (): Promise<void> => {
    if (command === "--undo") {
      await undoLastMigration();
    } else if (command === "--status") {
      await migrationStatus();
    } else {
      await runMigrations();
    }

    await sequelize.close();
  };

  run().catch(async (error) => {
    console.error(error);
    await sequelize.close();
    process.exit(1);
  });
}

export type { QueryInterface };
