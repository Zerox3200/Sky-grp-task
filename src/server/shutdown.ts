import type { Server } from "http";
import { sequelize } from "../../DB/connection.js";
import { disconnectRedis } from "../config/redis.js";
import { closeOrderQueue } from "../jobs/order.queue.js";
import { stopOrderWorker } from "../jobs/order.worker.js";
import { logger } from "../utils/logger.js";

const SHUTDOWN_TIMEOUT_MS = 2000;

let httpServer: Server | undefined;
let isShuttingDown = false;

export const setHttpServer = (server: Server): void => {
  httpServer = server;
};

const closeHttpServer = async (): Promise<void> => {
  if (!httpServer) {
    return;
  }

  httpServer.closeAllConnections?.();

  await new Promise<void>((resolve, reject) => {
    httpServer!.close((error) => {
      if (error) {
        reject(error);
        return;
      }

      resolve();
    });
  });
};

const closeInfrastructure = async (): Promise<void> => {
  await stopOrderWorker();
  await closeOrderQueue();
  await disconnectRedis();
  await sequelize.close();
};

export const gracefulShutdown = async (signal: string): Promise<void> => {
  if (isShuttingDown) {
    return;
  }

  isShuttingDown = true;
  logger.info({ signal }, "Shutting down gracefully");

  const forceExitTimer = setTimeout(() => {
    logger.warn("Forced shutdown after timeout");
    process.exit(0);
  }, SHUTDOWN_TIMEOUT_MS);

  try {
    await closeHttpServer();
    await closeInfrastructure();
    clearTimeout(forceExitTimer);
    process.exit(0);
  } catch (error) {
    clearTimeout(forceExitTimer);
    const message = error instanceof Error ? error.message : "Unknown error";
    logger.error({ error: message }, "Shutdown failed");
    process.exit(1);
  }
};

export const registerShutdownHandlers = (): void => {
  for (const signal of ["SIGTERM", "SIGINT"] as const) {
    process.once(signal, () => {
      gracefulShutdown(signal).catch(() => process.exit(1));
    });
  }
};
