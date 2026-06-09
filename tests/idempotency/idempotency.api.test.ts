import request from "supertest";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { Order } from "../../DB/index.js";
import { buildTestApp } from "../helpers/app.js";
import { cleanupAllIdempotencyKeys, destroyProduct, destroyUser } from "../helpers/cleanup.js";
import { setupTestDatabase, uniqueId } from "../helpers/database.js";
import {
  authHeader,
  createTestProduct,
  createTestUser,
  idempotencyHeader,
  loginUser,
} from "../helpers/factories.js";

vi.mock("../../src/jobs/order.queue.js", () => ({
  queueOrderCreatedJob: vi.fn().mockResolvedValue(undefined),
}));

describe("Order idempotency API", () => {
  const app = buildTestApp();
  let userId: string;
  let accessToken: string;
  let productId: string;
  let idempotencyKey: string;

  beforeAll(async () => {
    await setupTestDatabase();
    await cleanupAllIdempotencyKeys();

    idempotencyKey = `idem-stable-key-${uniqueId()}-12345678`;

    const user = await createTestUser({ password: "password123" });
    userId = user.getDataValue("id");
    const login = await loginUser(app, user.getDataValue("email"), "password123");
    accessToken = login.accessToken;

    const product = await createTestProduct({ stockQuantity: 100, price: "15.00" });
    productId = product.getDataValue("id");
  });

  afterAll(async () => {
    await cleanupAllIdempotencyKeys();
    await destroyUser(userId);
    await destroyProduct(productId);
  });

  it("does not create duplicate orders when the same Idempotency-Key is retried", async () => {
    const orderPayload = { items: [{ productId, quantity: 1 }] };

    const first = await request(app)
      .post("/api/orders")
      .set(authHeader(accessToken))
      .set(idempotencyHeader(idempotencyKey))
      .send(orderPayload);

    expect(first.status).toBe(201);
    const orderId = first.body.data.id;

    const second = await request(app)
      .post("/api/orders")
      .set(authHeader(accessToken))
      .set(idempotencyHeader(idempotencyKey))
      .send(orderPayload);

    expect(second.status).toBe(201);
    expect(second.body.data.id).toBe(orderId);

    const orderCount = await Order.count({ where: { userId } });
    expect(orderCount).toBe(1);
  });

  it("returns 409 when the same key is reused with a different body", async () => {
    const key = `idem-conflict-${Date.now()}-12345678`;
    const orderPayload = { items: [{ productId, quantity: 1 }] };

    await request(app)
      .post("/api/orders")
      .set(authHeader(accessToken))
      .set(idempotencyHeader(key))
      .send(orderPayload);

    const conflict = await request(app)
      .post("/api/orders")
      .set(authHeader(accessToken))
      .set(idempotencyHeader(key))
      .send({ items: [{ productId, quantity: 2 }] });

    expect(conflict.status).toBe(409);
    expect(conflict.body.error.code).toBe("IDEMPOTENCY_CONFLICT");
  });
});

describe("Concurrent identical idempotency requests", () => {
  const app = buildTestApp();
  let userId: string;
  let accessToken: string;
  let productId: string;

  beforeAll(async () => {
    await setupTestDatabase();
    await cleanupAllIdempotencyKeys();

    const user = await createTestUser({ password: "password123" });
    userId = user.getDataValue("id");
    const login = await loginUser(app, user.getDataValue("email"), "password123");
    accessToken = login.accessToken;

    const product = await createTestProduct({ stockQuantity: 50, price: "12.00" });
    productId = product.getDataValue("id");
  });

  afterAll(async () => {
    await cleanupAllIdempotencyKeys();
    await destroyUser(userId);
    await destroyProduct(productId);
  });

  it("handles parallel retries with the same idempotency key safely", async () => {
    const key = `idem-parallel-${Date.now()}-12345678`;
    const payload = { items: [{ productId, quantity: 1 }] };

    const results = await Promise.all(
      Array.from({ length: 5 }, () =>
        request(app)
          .post("/api/orders")
          .set(authHeader(accessToken))
          .set(idempotencyHeader(key))
          .send(payload)
      )
    );

    const created = results.filter((response) => response.status === 201);
    const blocked = results.filter((response) => response.status === 409);

    expect(created.length).toBeGreaterThanOrEqual(1);
    expect(created.length + blocked.length).toBe(5);

    const successfulOrderIds = new Set(
      created.map((response) => response.body.data?.id ?? response.body.data?.id)
    );
    expect(successfulOrderIds.size).toBe(1);

    expect(await Order.count({ where: { userId } })).toBe(1);
  }, 30_000);
});
