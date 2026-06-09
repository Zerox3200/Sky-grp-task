import { startServer } from "./src/server/startServer.js";
import { logger } from "./src/utils/logger.js";

startServer().catch((error) => {
  const message = error instanceof Error ? error.message : "Unknown error";
  logger.error({ error: message }, "Failed to start server");
  process.exit(1);
});
