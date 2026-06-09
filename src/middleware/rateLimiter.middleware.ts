import rateLimit, { ipKeyGenerator } from "express-rate-limit";
import type { Request } from "express";
import { ERROR_CODES } from "../constants/errorCodes.js";
import { errorResponse } from "../helpers/response.helpers.js";

export const orderCreateRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req: Request): string => {
    if (req.user?.id) {
      return `user:${req.user.id}`;
    }

    return `ip:${ipKeyGenerator(req.ip ?? "unknown")}`;
  },
  handler: (_req, res) => {
    return errorResponse(res, {
      statusCode: 429,
      message: "Too many order creation requests. Please try again later.",
      code: ERROR_CODES.RATE_LIMIT_EXCEEDED,
      details: { retryAfterSeconds: 60 },
    });
  },
});
