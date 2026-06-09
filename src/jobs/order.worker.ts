import { Worker } from "bullmq";
import { getBullMqConnection, ORDER_QUEUE_NAME } from "../config/bullmq.js";
import { logger } from "../utils/logger.js";
import {
  processOrderCreatedJob,
  type OrderCreatedJobPayload,
} from "./handlers/orderCreated.handler.js";

let orderWorker: Worker | null = null;

export const startOrderWorker = (): Worker => {
  if (orderWorker) {
    return orderWorker;
  }

  orderWorker = new Worker(
    ORDER_QUEUE_NAME,
    async (job) => {
      const data = job.data as OrderCreatedJobPayload;
      logger.info(
        { jobId: job.id, orderId: data.orderId, attempt: job.attemptsMade + 1 },
        "Processing order created job"
      );
      await processOrderCreatedJob(data);
    },
    {
      connection: getBullMqConnection(),
    }
  );

  orderWorker.on("completed", (job) => {
    const data = job.data as OrderCreatedJobPayload;
    logger.info({ jobId: job.id, orderId: data.orderId }, "Order created job completed");
  });

  orderWorker.on("failed", (job, error) => {
    const data = job?.data as OrderCreatedJobPayload | undefined;
    logger.error(
      {
        jobId: job?.id,
        orderId: data?.orderId,
        attempts: job?.attemptsMade,
        error: error.message,
      },
      "Order created job failed"
    );
  });

  logger.info("Order worker started");
  return orderWorker;
};

export const stopOrderWorker = async (): Promise<void> => {
  if (orderWorker) {
    await orderWorker.close();
    orderWorker = null;
    logger.info("Order worker stopped");
  }
};
