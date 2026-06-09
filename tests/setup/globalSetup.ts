import { execSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";

export default async function globalSetup(): Promise<void> {
  const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

  dotenv.config({ path: path.join(rootDir, ".env.test") });
  dotenv.config({ path: path.join(rootDir, ".env") });

  process.env.NODE_ENV = "test";
  process.env.DB_NAME = process.env.TEST_DB_NAME || "sky_grp_test";
  process.env.secretkey = process.env.secretkey || "test-secret-key-for-automated-tests-only";

  execSync("npx tsx DB/migrate.ts", {
    cwd: rootDir,
    env: process.env,
    stdio: "inherit",
  });
}
