import { conn, sequelize } from "../../DB/connection.js";

let initialized = false;

export const setupTestDatabase = async (): Promise<void> => {
  if (initialized) {
    return;
  }

  await conn();
  initialized = true;
};

export const closeTestDatabase = async (): Promise<void> => {
  if (sequelize) {
    await sequelize.close();
    initialized = false;
  }
};

export const assertErrorBody = (
  body: Record<string, unknown>,
  expectedCode?: string
): void => {
  expect(body.success).toBe(false);
  expect(typeof body.message).toBe("string");
  expect(body.error).toBeDefined();
  expect(typeof (body.error as { code: string }).code).toBe("string");

  if (expectedCode) {
    expect((body.error as { code: string }).code).toBe(expectedCode);
  }
};

export const uniqueId = (): string =>
  `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
