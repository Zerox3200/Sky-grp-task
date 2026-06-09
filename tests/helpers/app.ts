import express, { type Application } from "express";
import { appRouter } from "../../src/app.router.js";

export const buildTestApp = (): Application => {
  const app = express();
  app.set("trust proxy", 1);
  app.use(express.json());
  appRouter(app);
  return app;
};
