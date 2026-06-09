import request from "supertest";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { Order, Product } from "../../DB/index.js";
import { buildTestApp } from "../helpers/app.js";
import { destroyProduct, destroyUser } from "../helpers/cleanup.js";
import { setupTestDatabase } from "../helpers/database.js";
import {
  authHeader,
  createTestAdmin,
  createTestProduct,
  createTestUser,
  idempotencyHeader,
  loginUser,
  newIdempotencyKey,
} from "../helpers/factories.js";

vi.mock("../../src/jobs/order.queue.js", () => ({
  queueOrderCreatedJob: vi.fn().mockResolvedValue(undefined),
}));

describe("Products API integration", () => {
  const app = buildTestApp();
  let adminToken: string;
  let adminId: string;
  let productId: string;

  beforeAll(async () => {
    await setupTestDatabase();

    const admin = await createTestAdmin({ password: "adminpass123" });
    adminId = admin.getDataValue("id");
    const login = await loginUser(app, admin.getDataValue("email"), "adminpass123");
    adminToken = login.accessToken;
  });

  afterAll(async () => {
    if (productId) {
      await destroyProduct(productId);
    }
    await destroyUser(adminId);
  });

  it("PUT /api/products/:id updates name, price, and stock", async () => {
    const product = await createTestProduct({
      name: "Original Name",
      price: "10.00",
      stockQuantity: 20,
    });
    productId = product.getDataValue("id");

    const response = await request(app)
      .put(`/api/products/${productId}`)
      .set(authHeader(adminToken))
      .send({ name: "Updated Name", price: 15.5, stockQuantity: 18 });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.name).toBe("Updated Name");
    expect(Number(response.body.data.price)).toBe(15.5);
    expect(response.body.data.stockQuantity).toBe(18);
  });

  it("DELETE /api/products/:id soft deletes product", async () => {
    const product = await createTestProduct({ stockQuantity: 5 });
    const deleteId = product.getDataValue("id");

    const response = await request(app)
      .delete(`/api/products/${deleteId}`)
      .set(authHeader(adminToken));

    expect(response.status).toBe(200);
    expect(response.body.data.isDeleted).toBe(true);

    const row = await Product.findByPk(deleteId);
    expect(row!.getDataValue("isDeleted")).toBe(true);

    const list = await request(app).get("/api/products").query({ search: product.getDataValue("sku") });
    expect(list.body.data.products.every((p: { id: string }) => p.id !== deleteId)).toBe(true);

    await destroyProduct(deleteId);
  });

  it("GET /api/products lists active products publicly", async () => {
    const response = await request(app).get("/api/products").query({ page: 1, limit: 5 });
    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(Array.isArray(response.body.data.products)).toBe(true);
  });
});

describe("GET /api/orders filters integration", () => {
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

    const product = await createTestProduct({ price: "30.00", stockQuantity: 100 });
    productId = product.getDataValue("id");

    await request(app)
      .post("/api/orders")
      .set(authHeader(accessToken))
      .set(idempotencyHeader(newIdempotencyKey()))
      .send({ items: [{ productId, quantity: 2 }] });
  });

  afterAll(async () => {
    await destroyUser(userId);
    await destroyProduct(productId);
  });

  it("filters by status and minTotalAmount", async () => {
    const response = await request(app)
      .get("/api/orders")
      .set(authHeader(accessToken))
      .query({ status: "pending", minTotalAmount: 50, page: 1, limit: 10 });

    expect(response.status).toBe(200);
    expect(response.body.data.orders.length).toBeGreaterThanOrEqual(1);
    expect(response.body.data.orders.every((o: { status: string }) => o.status === "pending")).toBe(
      true
    );
    expect(
      response.body.data.orders.every((o: { totalAmount: string }) => Number(o.totalAmount) >= 50)
    ).toBe(true);
  });

  it("scopes orders to authenticated user", async () => {
    const otherUser = await createTestUser({ password: "otherpass123" });
    const otherLogin = await loginUser(app, otherUser.getDataValue("email"), "otherpass123");

    const response = await request(app)
      .get("/api/orders")
      .set(authHeader(otherLogin.accessToken));

    expect(response.body.data.orders.every((o: { userId: string }) => o.userId !== userId)).toBe(true);

    await destroyUser(otherUser.getDataValue("id"));
  });
});
