import request from "supertest";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { ERROR_CODES } from "../../src/constants/errorCodes.js";
import { buildTestApp } from "../helpers/app.js";
import { destroyProduct, destroyUser } from "../helpers/cleanup.js";
import { setupTestDatabase, assertErrorBody } from "../helpers/database.js";
import {
  authHeader,
  createTestProduct,
  createTestUser,
  idempotencyHeader,
  loginUser,
  newIdempotencyKey,
} from "../helpers/factories.js";

vi.mock("../../src/jobs/order.queue.js", () => ({
  queueOrderCreatedJob: vi.fn().mockResolvedValue(undefined),
}));

describe("POST /api/orders rate limiting", () => {
  const app = buildTestApp();
  let userAId: string;
  let userBId: string;
  let tokenA: string;
  let tokenB: string;
  let productId: string;

  beforeAll(async () => {
    await setupTestDatabase();

    const userA = await createTestUser({ password: "password123" });
    const userB = await createTestUser({ password: "password123" });
    userAId = userA.getDataValue("id");
    userBId = userB.getDataValue("id");

    tokenA = (await loginUser(app, userA.getDataValue("email"), "password123")).accessToken;
    tokenB = (await loginUser(app, userB.getDataValue("email"), "password123")).accessToken;

    const product = await createTestProduct({ stockQuantity: 10_000, price: "1.00" });
    productId = product.getDataValue("id");
  });

  afterAll(async () => {
    await destroyUser(userAId);
    await destroyUser(userBId);
    await destroyProduct(productId);
  });

  it("returns 429 after exceeding 10 requests per minute for the same user", async () => {
    let lastStatus = 0;

    for (let i = 0; i < 11; i++) {
      const response = await request(app)
        .post("/api/orders")
        .set(authHeader(tokenA))
        .set(idempotencyHeader(newIdempotencyKey()))
        .send({ items: [{ productId, quantity: 1 }] });

      lastStatus = response.status;

      if (i < 10) {
        expect([201, 409]).toContain(response.status);
      }
    }

    expect(lastStatus).toBe(429);
  }, 60_000);

  it("isolates rate limits per user", async () => {
    const response = await request(app)
      .post("/api/orders")
      .set(authHeader(tokenB))
      .set(idempotencyHeader(newIdempotencyKey()))
      .send({ items: [{ productId, quantity: 1 }] });

    expect(response.status).toBe(201);
  });

  it("returns standard rate limit error format", async () => {
    for (let i = 0; i < 10; i++) {
      await request(app)
        .post("/api/orders")
        .set(authHeader(tokenB))
        .set(idempotencyHeader(newIdempotencyKey()))
        .send({ items: [{ productId, quantity: 1 }] });
    }

    const limited = await request(app)
      .post("/api/orders")
      .set(authHeader(tokenB))
      .set(idempotencyHeader(newIdempotencyKey()))
      .send({ items: [{ productId, quantity: 1 }] });

    expect(limited.status).toBe(429);
    assertErrorBody(limited.body, ERROR_CODES.RATE_LIMIT_EXCEEDED);
  }, 60_000);
});
