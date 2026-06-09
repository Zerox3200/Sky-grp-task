import express, { type Application } from "express";
import cors from "cors";
import { httpLogger } from "../middleware/httpLogger.middleware.js";

export const createApp = (): Application => {
  const app = express();

  app.set("trust proxy", 1);
  app.use(cors());
  app.use(httpLogger);

  return app;
};
