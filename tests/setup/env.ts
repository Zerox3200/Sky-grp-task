import dotenv from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

dotenv.config({ path: path.join(rootDir, ".env.test") });
dotenv.config({ path: path.join(rootDir, ".env") });

process.env.NODE_ENV = "test";
process.env.DB_NAME = process.env.TEST_DB_NAME || process.env.DB_NAME || "sky_grp_test";
process.env.secretkey = process.env.secretkey || "test-secret-key-for-automated-tests-only";
process.env.LOG_LEVEL = "silent";
