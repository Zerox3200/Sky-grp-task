import { Order, OrderItem, Product, User } from "../../DB/index.js";
import { IdempotencyKey } from "../../DB/IdempotencyKeys/IdempotencyKey.model.js";

export const cleanupUserData = async (userId: string): Promise<void> => {
  const orders = await Order.findAll({ where: { userId } });

  for (const order of orders) {
    await OrderItem.destroy({ where: { orderId: order.getDataValue("id") } });
    await order.destroy();
  }
};

export const destroyUser = async (userId?: string): Promise<void> => {
  if (!userId) {
    return;
  }

  await cleanupUserData(userId);
  await User.destroy({ where: { id: userId }, force: true });
};

export const destroyProduct = async (productId?: string): Promise<void> => {
  if (!productId) {
    return;
  }

  await Product.destroy({ where: { id: productId }, force: true });
};

export const cleanupAllIdempotencyKeys = async (): Promise<void> => {
  await IdempotencyKey.destroy({ truncate: true, force: true });
};
