import { Queue } from "bullmq";
import {
  DEFAULT_JOB_OPTIONS,
  getBullMqConnection,
  ORDER_QUEUE_NAME,
} from "../config/bullmq.js";
import { isRedisReady } from "../config/redis.js";
import { logger } from "../utils/logger.js";
import type { OrderCreatedJobPayload } from "./handlers/orderCreated.handler.js";

let orderQueue: Queue | null = null;

export const getOrderQueue = (): Queue => {
  if (!orderQueue) {
    orderQueue = new Queue(ORDER_QUEUE_NAME, {
      connection: getBullMqConnection(),
      defaultJobOptions: DEFAULT_JOB_OPTIONS,
    });
  }

  return orderQueue;
};

export const queueOrderCreatedJob = async (
  payload: OrderCreatedJobPayload
): Promise<void> => {
  if (!isRedisReady()) {
    logger.warn({ orderId: payload.orderId }, "Redis unavailable; order email job skipped");
    return;
  }

  const queue = getOrderQueue();
  await queue.add("order-created-email", payload, {
    jobId: `order-email-${payload.orderId}`,
  });

  logger.info({ orderId: payload.orderId, userId: payload.userId }, "Order created job queued");
};

export const closeOrderQueue = async (): Promise<void> => {
  if (orderQueue) {
    await orderQueue.close();
    orderQueue = null;
  }
};
