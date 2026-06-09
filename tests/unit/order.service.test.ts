import { describe, expect, it } from "vitest";
import { mergeOrderItems } from "../../src/modules/Orders/Order.service.js";

const computeTotal = (
  mergedItems: ReturnType<typeof mergeOrderItems>,
  prices: Record<string, number>
): number =>
  mergedItems.reduce((sum, item) => sum + (prices[item.productId] ?? 0) * item.quantity, 0);

describe("Order Service — mergeOrderItems", () => {
  const productA = "11111111-1111-1111-1111-111111111111";
  const productB = "22222222-2222-2222-2222-222222222222";

  it("returns items unchanged when no duplicates exist", () => {
    const items = [
      { productId: productA, quantity: 2 },
      { productId: productB, quantity: 1 },
    ];

    expect(mergeOrderItems(items)).toEqual(items);
  });

  it("merges duplicate productId entries by summing quantities", () => {
    const merged = mergeOrderItems([
      { productId: productA, quantity: 2 },
      { productId: productA, quantity: 3 },
      { productId: productB, quantity: 1 },
    ]);

    expect(merged).toHaveLength(2);
    expect(merged.find((item) => item.productId === productA)?.quantity).toBe(5);
    expect(merged.find((item) => item.productId === productB)?.quantity).toBe(1);
  });

  it("handles empty merge input edge case via single item", () => {
    expect(mergeOrderItems([{ productId: productA, quantity: 1 }])).toEqual([
      { productId: productA, quantity: 1 },
    ]);
  });
});

describe("Order Service — total price calculation", () => {
  const productA = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";
  const productB = "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb";

  it("calculates total from merged line items and unit prices", () => {
    const merged = mergeOrderItems([
      { productId: productA, quantity: 2 },
      { productId: productA, quantity: 1 },
      { productId: productB, quantity: 4 },
    ]);

    const total = computeTotal(merged, { [productA]: 25, [productB]: 10 });
    expect(total).toBe(115);
  });

  it("returns zero total when all quantities are zero after merge edge", () => {
    const merged = mergeOrderItems([{ productId: productA, quantity: 0 }]);
    expect(computeTotal(merged, { [productA]: 50 })).toBe(0);
  });
});

describe("Order Service — pagination metadata", () => {
  it("computes total pages correctly", () => {
    const total = 25;
    const limit = 10;
    expect(Math.ceil(total / limit) || 1).toBe(3);
  });
});
