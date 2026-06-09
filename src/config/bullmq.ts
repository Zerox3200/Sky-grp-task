import type { ConnectionOptions } from "bullmq";

export const getBullMqConnection = (): ConnectionOptions => {
  const url = process.env.REDIS_URL || "redis://127.0.0.1:6379";

  return {
    url,
    maxRetriesPerRequest: null,
  };
};

export const ORDER_QUEUE_NAME = "order-created";

export const DEFAULT_JOB_OPTIONS = {
  attempts: 5,
  backoff: {
    type: "exponential" as const,
    delay: 1000,
  },
  removeOnComplete: 100,
  removeOnFail: 500,
};
