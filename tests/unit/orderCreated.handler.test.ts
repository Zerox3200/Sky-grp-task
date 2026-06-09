import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Order, OrderItem, User } from "../../DB/index.js";
import { processOrderCreatedJob } from "../../src/jobs/handlers/orderCreated.handler.js";
import { setupTestDatabase } from "../helpers/database.js";
import { createTestUser } from "../helpers/factories.js";
import { destroyUser } from "../helpers/cleanup.js";

const sendMailMock = vi.fn();

vi.mock("../../src/utils/sendmail.js", () => ({
  SendMail: (...args: unknown[]) => sendMailMock(...args),
}));

describe("Order created job handler", () => {
  let userId: string;
  let orderId: string;

  beforeEach(async () => {
    sendMailMock.mockReset();
    await setupTestDatabase();

    const user = await createTestUser({
      email: `worker-${Date.now()}@example.com`,
      name: "Worker Test User",
    });

    userId = user.getDataValue("id");

    const order = await Order.create({
      userId,
      status: "pending",
      totalAmount: "50.00",
    });

    orderId = order.getDataValue("id");
  });

  it("sends order confirmation email on success", async () => {
    sendMailMock.mockResolvedValue(true);

    await processOrderCreatedJob({
      orderId,
      userId,
      totalAmount: "50.00",
    });

    expect(sendMailMock).toHaveBeenCalledOnce();
    expect(sendMailMock.mock.calls[0]?.[0]).toMatchObject({
      to: expect.stringContaining("@example.com"),
      subject: expect.stringContaining(orderId),
    });
  });

  it("throws when email delivery fails to trigger BullMQ retry", async () => {
    sendMailMock.mockResolvedValue(false);

    await expect(
      processOrderCreatedJob({ orderId, userId, totalAmount: "50.00" })
    ).rejects.toThrow("Email delivery failed");
  });

  it("throws when user is not found", async () => {
    await User.destroy({ where: { id: userId }, force: true });

    await expect(
      processOrderCreatedJob({ orderId, userId, totalAmount: "50.00" })
    ).rejects.toThrow(`User ${userId} not found`);
  });

  afterEach(async () => {
    if (orderId) {
      await OrderItem.destroy({ where: { orderId } });
      await Order.destroy({ where: { id: orderId }, force: true });
    }
    if (userId) {
      await destroyUser(userId);
    }
  });
});
