import { createClient, type RedisClientType } from "redis";

type AppRedisClient = RedisClientType<{}, {}, {}, 2>;

let redisClient: AppRedisClient | null = null;
let redisReady = false;

export interface RedisConnectOptions {
  onError?: (error: Error) => void;
}

export const connectRedis = async (options?: RedisConnectOptions): Promise<boolean> => {
  const url = process.env.REDIS_URL || "redis://127.0.0.1:6379";

  const client = createClient({
    url,
    RESP: 2,
  });

  redisClient = client;

  client.on("ready", () => {
    redisReady = true;
  });

  client.on("error", (error) => {
    redisReady = false;
    options?.onError?.(error);
  });

  try {
    await client.connect();
    redisReady = true;
    return true;
  } catch (error) {
    redisReady = false;

    if (error instanceof Error) {
      options?.onError?.(error);
    }

    return false;
  }
};

export const isRedisReady = (): boolean => Boolean(redisClient?.isOpen && redisReady);

export const getRedisClient = (): AppRedisClient => {
  if (!redisClient) {
    throw new Error("Redis client is not initialized");
  }

  return redisClient;
};

export const disconnectRedis = async (): Promise<void> => {
  if (redisClient?.isOpen) {
    await redisClient.quit();
  }

  redisReady = false;
  redisClient = null;
};
