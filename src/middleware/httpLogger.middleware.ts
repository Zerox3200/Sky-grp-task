import type { IncomingMessage, ServerResponse } from "http";
import type { Request } from "express";
import { pinoHttp } from "pino-http";
import { logger } from "../utils/logger.js";

const shouldIgnoreRequest = (req: IncomingMessage): boolean => {
  const url = "url" in req ? String(req.url) : "";
  return url === "/api-docs" || url.startsWith("/api-docs");
};

const formatRequestLine = (req: Request, res: ServerResponse, responseTimeMs?: number): string => {
  const duration = responseTimeMs !== undefined ? ` ${Math.round(responseTimeMs)}ms` : "";
  return `${req.method} ${req.originalUrl || req.url} → ${res.statusCode}${duration}`;
};

export const httpLogger = pinoHttp({
  logger,
  quietReqLogger: true,
  quietResLogger: true,
  autoLogging: {
    ignore: shouldIgnoreRequest,
  },
  customSuccessMessage(req, res) {
    return formatRequestLine(req as Request, res);
  },
  customErrorMessage(req, res) {
    return formatRequestLine(req as Request, res);
  },
  customSuccessObject(_req, _res, val) {
    return { responseTimeMs: val.responseTime };
  },
  customErrorObject(_req, _res, _err, val) {
    return { responseTimeMs: val.responseTime };
  },
  serializers: {
    req: () => undefined,
    res: () => undefined,
  },
});
