import bcrypt from "bcryptjs";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { Order, OrderItem, Product, User } from "../../DB/index.js";
import { ERROR_CODES } from "../../src/constants/errorCodes.js";
import { createOrder } from "../../src/modules/Orders/Order.service.js";
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

describe("Order transaction integration", () => {
  let userId: string;
  let productId: string;

  beforeAll(async () => {
    await setupTestDatabase();

    const user = await createTestUser();
    userId = user.getDataValue("id");

    const product = await createTestProduct({
      name: "Integration Test Product",
      price: "25.00",
      stockQuantity: 100,
    });
    productId = product.getDataValue("id");
  });

  afterAll(async () => {
    await destroyUser(userId);
    await destroyProduct(productId);
  });

  it("creates order, deducts stock, and persists order items atomically", async () => {
    const productBefore = await Product.findByPk(productId);
    const stockBefore = productBefore!.getDataValue("stockQuantity");
    const quantity = 3;

    const order = await createOrder({
      userId,
      items: [{ productId, quantity }],
    });

    expect(order!.getDataValue("status")).toBe("pending");
    expect(Number(order!.getDataValue("totalAmount"))).toBe(75);

    const productAfter = await Product.findByPk(productId);
    expect(productAfter!.getDataValue("stockQuantity")).toBe(stockBefore - quantity);

    const items = await OrderItem.findAll({ where: { orderId: order!.getDataValue("id") } });
    expect(items).toHaveLength(1);
    expect(items[0]!.getDataValue("quantity")).toBe(quantity);
  });

  it("rolls back when stock is insufficient", async () => {
    const productBefore = await Product.findByPk(productId);
    const stockBefore = productBefore!.getDataValue("stockQuantity");

    await expect(
      createOrder({
        userId,
        items: [{ productId, quantity: stockBefore + 1 }],
      })
    ).rejects.toMatchObject({
      statusCode: 409,
      code: ERROR_CODES.INSUFFICIENT_STOCK,
    });

    const productAfter = await Product.findByPk(productId);
    expect(productAfter!.getDataValue("stockQuantity")).toBe(stockBefore);
  });

  it("rejects orders for soft-deleted products", async () => {
    const deletedProduct = await createTestProduct({
      name: "Deleted Product",
      price: "10.00",
      stockQuantity: 50,
      isDeleted: true,
    });

    await expect(
      createOrder({
        userId,
        items: [{ productId: deletedProduct.getDataValue("id"), quantity: 1 }],
      })
    ).rejects.toMatchObject({
      statusCode: 404,
      code: ERROR_CODES.PRODUCT_NOT_FOUND,
    });

    await destroyProduct(deletedProduct.getDataValue("id"));
  });
});

describe("POST /api/orders API integration", () => {
  const app = buildTestApp();
  let userId: string;
  let accessToken: string;
  let productId: string;

  beforeAll(async () => {
    await setupTestDatabase();

    const user = await createTestUser({ password: "password123" });
    userId = user.getDataValue("id");
    const login = await loginUser(app, user.getDataValue("email"), "password123");
    accessToken = login.accessToken;

    const product = await createTestProduct({ stockQuantity: 50, price: "20.00" });
    productId = product.getDataValue("id");
  });

  afterAll(async () => {
    await destroyUser(userId);
    await destroyProduct(productId);
  });

  it("creates order via HTTP and returns standard success format", async () => {
    const response = await request(app)
      .post("/api/orders")
      .set(authHeader(accessToken))
      .set(idempotencyHeader(newIdempotencyKey()))
      .send({ items: [{ productId, quantity: 2 }] });

    expect(response.status).toBe(201);
    expect(response.body.success).toBe(true);
    expect(response.body.data.status).toBe("pending");
    expect(Number(response.body.data.totalAmount)).toBe(40);
  });

  it("returns validation error for empty items array", async () => {
    const response = await request(app)
      .post("/api/orders")
      .set(authHeader(accessToken))
      .set(idempotencyHeader(newIdempotencyKey()))
      .send({ items: [] });

    expect(response.status).toBe(400);
    assertErrorBody(response.body, ERROR_CODES.VALIDATION_ERROR);
  });
});
