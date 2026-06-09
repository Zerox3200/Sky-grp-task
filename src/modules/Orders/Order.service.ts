import { Op, Transaction } from "sequelize";
import { Order, OrderItem, Product } from "../../../DB/index.js";
import type { OrderStatus } from "../../../DB/Orders/Order.model.js";
import type { ProductAttributes } from "../../../DB/Products/Product.model.js";
import { ERROR_CODES } from "../../constants/errorCodes.js";
import { queueOrderCreatedJob } from "../../jobs/order.queue.js";
import { logger } from "../../utils/logger.js";
import { throwHttpError } from "../../utils/httpError.js";
import { runInTransaction } from "../../utils/transaction.js";

export interface CreateOrderItemInput {
  productId: string;
  quantity: number;
}

interface CreateOrderInput {
  userId: string;
  items: CreateOrderItemInput[];
}

interface ListOrdersFilters {
  userId?: string;
  status?: OrderStatus;
  startDate?: Date;
  endDate?: Date;
  minTotalAmount?: number;
  page: number;
  limit: number;
}

export const mergeOrderItems = (items: CreateOrderItemInput[]): CreateOrderItemInput[] => {
  const merged = new Map<string, number>();

  for (const item of items) {
    merged.set(item.productId, (merged.get(item.productId) ?? 0) + item.quantity);
  }

  return Array.from(merged.entries()).map(([productId, quantity]) => ({
    productId,
    quantity,
  }));
};

export const createOrder = async ({ userId, items }: CreateOrderInput) => {
  const normalizedItems = mergeOrderItems(items).sort((a, b) =>
    a.productId.localeCompare(b.productId)
  );

  const order = await runInTransaction(async (transaction) => {
    const lockedProducts: Array<{
      product: ProductAttributes & { id: string };
      quantity: number;
      unitPrice: number;
    }> = [];

    for (const item of normalizedItems) {
      const productRow = await Product.findOne({
        where: { id: item.productId, isDeleted: false },
        lock: Transaction.LOCK.UPDATE,
        transaction,
      });

      if (!productRow) {
        throwHttpError({
          message: "Product not found or unavailable",
          statusCode: 404,
          code: ERROR_CODES.PRODUCT_NOT_FOUND,
          details: { productId: item.productId },
        });
      }

      const lockedProductRow = productRow;
      const product = lockedProductRow.toJSON() as ProductAttributes & { id: string };

      if (product.stockQuantity < item.quantity) {
        throwHttpError({
          message: "Stock not available",
          statusCode: 409,
          code: ERROR_CODES.INSUFFICIENT_STOCK,
          details: {
            productId: product.id,
            sku: product.sku,
            requested: item.quantity,
            available: product.stockQuantity,
          },
        });
      }

      lockedProducts.push({
        product: { ...product, id: product.id },
        quantity: item.quantity,
        unitPrice: Number(product.price),
      });
    }

    const totalAmount = lockedProducts.reduce(
      (sum, entry) => sum + entry.unitPrice * entry.quantity,
      0
    );

    const createdOrder = await Order.create(
      {
        userId,
        status: "pending",
        totalAmount: totalAmount.toFixed(2),
      },
      { transaction }
    );

    for (const entry of lockedProducts) {
      const [updatedRows] = await Product.update(
        { stockQuantity: entry.product.stockQuantity - entry.quantity },
        { where: { id: entry.product.id }, transaction }
      );

      if (updatedRows === 0) {
        throwHttpError({
          message: "Stock not available",
          statusCode: 409,
          code: ERROR_CODES.STOCK_UPDATE_FAILED,
          details: { productId: entry.product.id },
        });
      }

      await OrderItem.create(
        {
          orderId: createdOrder.getDataValue("id"),
          productId: entry.product.id,
          quantity: entry.quantity,
          price: entry.unitPrice.toFixed(2),
        },
        { transaction }
      );
    }

    return createdOrder;
  });

  const orderData = order.toJSON();

  void queueOrderCreatedJob({
    orderId: orderData.id,
    userId: orderData.userId,
    totalAmount: orderData.totalAmount,
  }).catch((error) => {
    const message = error instanceof Error ? error.message : "Unknown error";
    logger.error(
      { orderId: orderData.id, error: message },
      "Failed to queue order notification job"
    );
  });

  const fullOrder = await Order.findByPk(orderData.id, {
    include: [
      {
        association: "items",
        include: [{ association: "product", attributes: ["id", "sku", "name"] }],
      },
    ],
  });

  return fullOrder ?? order;
};

export const listOrders = async ({
  userId,
  status,
  startDate,
  endDate,
  minTotalAmount,
  page,
  limit,
}: ListOrdersFilters) => {
  const where: Record<string, unknown> = {};

  if (userId) {
    where.userId = userId;
  }

  if (status) {
    where.status = status;
  }

  if (minTotalAmount !== undefined) {
    where.totalAmount = { [Op.gte]: minTotalAmount };
  }

  if (startDate || endDate) {
    where.createdAt = {
      ...(startDate ? { [Op.gte]: startDate } : {}),
      ...(endDate ? { [Op.lte]: endDate } : {}),
    };
  }

  const offset = (page - 1) * limit;

  const { rows, count } = await Order.findAndCountAll({
    where,
    include: [
      {
        association: "items",
        include: [{ association: "product", attributes: ["id", "sku", "name"] }],
      },
    ],
    order: [["createdAt", "DESC"]],
    limit,
    offset,
  });

  return {
    orders: rows,
    pagination: {
      page,
      limit,
      total: count,
      totalPages: Math.ceil(count / limit) || 1,
    },
  };
};
