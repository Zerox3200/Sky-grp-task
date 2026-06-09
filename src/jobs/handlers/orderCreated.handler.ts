import { Order, User } from "../../../DB/index.js";
import { orderCreatedEmail } from "../../emails/orderCreated.email.js";
import { logger } from "../../utils/logger.js";
import { SendMail } from "../../utils/sendmail.js";

export interface OrderCreatedJobPayload {
  orderId: string;
  userId: string;
  totalAmount: string;
}

export const processOrderCreatedJob = async (
  payload: OrderCreatedJobPayload
): Promise<void> => {
  const user = await User.findByPk(payload.userId, {
    attributes: ["id", "name", "email"],
  });

  if (!user) {
    logger.error({ userId: payload.userId, orderId: payload.orderId }, "User not found for order email");
    throw new Error(`User ${payload.userId} not found`);
  }

  const order = await Order.findByPk(payload.orderId, {
    include: [{ association: "items" }],
  });

  if (!order) {
    logger.error({ orderId: payload.orderId }, "Order not found for email job");
    throw new Error(`Order ${payload.orderId} not found`);
  }

  const itemCount = (order.get("items") as unknown[] | undefined)?.length ?? 0;

  const sent = await SendMail({
    to: user.email,
    subject: `Order Confirmation — ${payload.orderId}`,
    html: orderCreatedEmail({
      name: user.name,
      orderId: payload.orderId,
      totalAmount: payload.totalAmount,
      itemCount,
    }),
  });

  if (!sent) {
    logger.error({ orderId: payload.orderId, email: user.email }, "Failed to send order confirmation email");
    throw new Error("Email delivery failed");
  }

  logger.info(
    { orderId: payload.orderId, userId: payload.userId, email: user.email },
    "Order confirmation email sent"
  );
};
