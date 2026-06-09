import type { Application } from "express";
import type { Server } from "http";
import { appRouter } from "../app.router.js";
import { createApp } from "../app/createApp.js";
import { conn } from "../../DB/connection.js";
import { runMigrations } from "../../DB/migrate.js";
import { getPort, loadEnv } from "../config/env.js";
import { connectRedis } from "../config/redis.js";
import { setupSwagger } from "../config/swagger.js";
import { startOrderWorker } from "../jobs/order.worker.js";
import { freePort, wait } from "../utils/freePort.js";
import { logger } from "../utils/logger.js";
import { registerShutdownHandlers, setHttpServer } from "./shutdown.js";

const connectRedisOrWarn = async (): Promise<void> => {
  const redisConnected = await connectRedis({
    onError: (error) => logger.error({ error: error.message }, "Redis error"),
  });

  if (redisConnected) {
    logger.info("Connected to Redis");
    startOrderWorker();
    return;
  }

  logger.warn("Redis unavailable; background jobs disabled");
};

const listen = async (app: Application, port: number): Promise<Server> => {
  const maxAttempts = 3;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const killed = freePort(port, process.pid);

    if (killed.length > 0) {
      logger.info({ port, pids: killed }, "Freed port before startup");
      await wait(300);
    }

    try {
      const server = await new Promise<Server>((resolve, reject) => {
        const instance = app.listen(port, () => {
          resolve(instance);
        });

        instance.on("error", reject);
      });

      logger.info({ port }, "Sky Group Task API listening");
      return server;
    } catch (error) {
      const nodeError = error as NodeJS.ErrnoException;

      if (nodeError.code === "EADDRINUSE" && attempt < maxAttempts) {
        logger.warn({ port, attempt }, "Port in use, retrying...");
        await wait(500 * attempt);
        continue;
      }

      if (nodeError.code === "EADDRINUSE") {
        logger.error({ port }, "Port is already in use");
        process.exit(1);
      }

      logger.error({ error: nodeError.message }, "Server error");
      process.exit(1);
    }
  }

  throw new Error(`Failed to bind to port ${port}`);
};

export const startServer = async (): Promise<void> => {
  loadEnv();

  const app = createApp();
  const port = getPort();

  await conn();
  await connectRedisOrWarn();
  await runMigrations();

  setupSwagger(app);
  appRouter(app);

  const server = await listen(app, port);
  setHttpServer(server);
  registerShutdownHandlers();
};
