import { beforeEach, describe, expect, it, vi } from "vitest";
import { DEFAULT_JOB_OPTIONS, ORDER_QUEUE_NAME } from "../../src/config/bullmq.js";

const addMock = vi.fn().mockResolvedValue({ id: "job-1" });

vi.mock("bullmq", () => ({
  Queue: vi.fn().mockImplementation(() => ({
    add: addMock,
    close: vi.fn(),
  })),
}));

vi.mock("../../src/config/redis.js", () => ({
  isRedisReady: vi.fn(() => true),
}));

describe("Order queue", () => {
  beforeEach(() => {
    addMock.mockClear();
  });

  it("defines retry strategy with exponential backoff", () => {
    expect(DEFAULT_JOB_OPTIONS.attempts).toBe(5);
    expect(DEFAULT_JOB_OPTIONS.backoff).toEqual({
      type: "exponential",
      delay: 1000,
    });
  });

  it("uses order-created queue name", () => {
    expect(ORDER_QUEUE_NAME).toBe("order-created");
  });

  it("enqueues order-created-email job when Redis is ready", async () => {
    const { queueOrderCreatedJob } = await import("../../src/jobs/order.queue.js");

    await queueOrderCreatedJob({
      orderId: "order-123",
      userId: "user-456",
      totalAmount: "99.99",
    });

    expect(addMock).toHaveBeenCalledWith(
      "order-created-email",
      {
        orderId: "order-123",
        userId: "user-456",
        totalAmount: "99.99",
      },
      { jobId: "order-email-order-123" }
    );
  });
});
