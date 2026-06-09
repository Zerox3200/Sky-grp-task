import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { Order, Product } from "../../DB/index.js";
import { ERROR_CODES } from "../../src/constants/errorCodes.js";
import { createOrder } from "../../src/modules/Orders/Order.service.js";
import { setupTestDatabase } from "../helpers/database.js";
import { destroyProduct, destroyUser } from "../helpers/cleanup.js";
import { createTestProduct, createTestUser } from "../helpers/factories.js";

vi.mock("../../src/jobs/order.queue.js", () => ({
  queueOrderCreatedJob: vi.fn().mockResolvedValue(undefined),
}));

describe("Stock concurrency — service layer", () => {
  let userId: string;
  let productId: string;
  const parallelRequests = 20;
  const initialStock = 5;

  beforeAll(async () => {
    await setupTestDatabase();

    const user = await createTestUser();
    userId = user.getDataValue("id");

    const product = await createTestProduct({
      stockQuantity: initialStock,
      price: "10.00",
    });
    productId = product.getDataValue("id");
  });

  afterAll(async () => {
    await destroyUser(userId);
    await destroyProduct(productId);
  });

  it(`allows only ${initialStock} successful orders from ${parallelRequests} parallel service calls`, async () => {
    const results = await Promise.allSettled(
      Array.from({ length: parallelRequests }, () =>
        createOrder({
          userId,
          items: [{ productId, quantity: 1 }],
        })
      )
    );

    const successes = results.filter((result) => result.status === "fulfilled");
    const stockFailures = results.filter(
      (result) =>
        result.status === "rejected" &&
        (result.reason as { code?: string }).code === ERROR_CODES.INSUFFICIENT_STOCK
    );

    expect(successes).toHaveLength(initialStock);
    expect(stockFailures.length).toBe(parallelRequests - initialStock);

    const product = await Product.findByPk(productId);
    expect(product!.getDataValue("stockQuantity")).toBe(0);
    expect(product!.getDataValue("stockQuantity")).toBeGreaterThanOrEqual(0);

    const orderCount = await Order.count({ where: { userId } });
    expect(orderCount).toBe(initialStock);
  }, 60_000);
});

describe("Stock concurrency — single unit inventory", () => {
  let userId: string;
  let productId: string;

  beforeAll(async () => {
    await setupTestDatabase();

    const user = await createTestUser();
    userId = user.getDataValue("id");

    const product = await createTestProduct({ stockQuantity: 1, price: "99.00" });
    productId = product.getDataValue("id");
  });

  afterAll(async () => {
    await destroyUser(userId);
    await destroyProduct(productId);
  });

  it("allows exactly one winner from 10 parallel service calls for stock=1", async () => {
    const results = await Promise.allSettled(
      Array.from({ length: 10 }, () =>
        createOrder({
          userId,
          items: [{ productId, quantity: 1 }],
        })
      )
    );

    expect(results.filter((result) => result.status === "fulfilled")).toHaveLength(1);

    const finalProduct = await Product.findByPk(productId);
    expect(finalProduct!.getDataValue("stockQuantity")).toBe(0);
  }, 60_000);
});
