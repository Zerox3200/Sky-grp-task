import bcrypt from "bcryptjs";
import type { Application } from "express";
import request from "supertest";
import { Product, User } from "../../DB/index.js";
import type { UserRole } from "../../DB/Users/User.model.js";
import { uniqueId } from "./database.js";

interface CreateUserOptions {
  email?: string;
  password?: string;
  name?: string;
  role?: UserRole;
}

export const createTestUser = async (options: CreateUserOptions = {}) => {
  const password = options.password ?? "password123";

  return User.unscoped().create({
    name: options.name ?? "Test User",
    email: options.email ?? `user-${uniqueId()}@example.com`,
    password: bcrypt.hashSync(password, +(process.env.saltRound || 8)),
    role: options.role ?? "User",
  });
};

export const createTestAdmin = (options: Omit<CreateUserOptions, "role"> = {}) =>
  createTestUser({ ...options, role: "Admin" });

export const createTestProduct = async (overrides: Partial<{
  sku: string;
  name: string;
  price: string;
  stockQuantity: number;
  isDeleted: boolean;
}> = {}) => {
  return Product.create({
    sku: overrides.sku ?? `SKU${uniqueId().replace(/-/g, "").slice(0, 12)}`,
    name: overrides.name ?? "Test Product",
    price: overrides.price ?? "10.00",
    stockQuantity: overrides.stockQuantity ?? 100,
    isDeleted: overrides.isDeleted ?? false,
  });
};

export const loginUser = async (
  app: Application,
  email: string,
  password: string
): Promise<{ accessToken: string; refreshToken: string; userId: string }> => {
  const response = await request(app).post("/api/auth/login").send({ email, password });

  expect(response.status).toBe(200);
  expect(response.body.data.accessToken).toBeTruthy();
  expect(response.body.data.refreshToken).toBeTruthy();

  return {
    accessToken: response.body.data.accessToken,
    refreshToken: response.body.data.refreshToken,
    userId: response.body.data.user.id,
  };
};

export const authHeader = (token: string): { token: string } => ({ token });

export const idempotencyHeader = (key: string): { "idempotency-key": string } => ({
  "idempotency-key": key,
});

export const newIdempotencyKey = (): string =>
  `idem-${uniqueId()}-${"x".repeat(8)}`;
