import type { NextFunction, Request, Response } from "express";
import { ERROR_CODES } from "../constants/errorCodes.js";
import { errorResponse, errorResponseFromException } from "../helpers/response.helpers.js";
import {
  buildScopeKey,
  completeIdempotency,
  hashRequestBody,
  resolveIdempotency,
} from "../services/idempotency.service.js";
import { logger } from "../utils/logger.js";
import { ErrorCatch } from "../utils/ErrorCatch.js";

const IDEMPOTENCY_HEADER = "idempotency-key";

const getIdempotencyKey = (req: Request): string | undefined => {
  const headerValue = req.headers[IDEMPOTENCY_HEADER];

  if (!headerValue || Array.isArray(headerValue)) {
    return undefined;
  }

  return headerValue.trim();
};

export const requireIdempotencyKey = ErrorCatch(
  async (req: Request, res: Response, next: NextFunction) => {
    const idempotencyKey = getIdempotencyKey(req);

    if (!idempotencyKey || idempotencyKey.length < 8 || idempotencyKey.length > 255) {
      return errorResponse(res, {
        statusCode: 400,
        message: "A valid Idempotency-Key header is required",
        code: ERROR_CODES.IDEMPOTENCY_KEY_REQUIRED,
        details: { header: IDEMPOTENCY_HEADER, minLength: 8, maxLength: 255 },
      });
    }

    const scopeKey = buildScopeKey(req.user?.id, req.ip);
    const requestHash = hashRequestBody(req.body);
    const route = req.baseUrl + req.path;

    try {
      const result = await resolveIdempotency({
        scopeKey,
        idempotencyKey,
        method: req.method,
        route,
        requestHash,
      });

      if (result.type === "replay") {
        const { record } = result;
        const replayBody =
          typeof record.responseBody === "string"
            ? (JSON.parse(record.responseBody) as Record<string, unknown>)
            : (record.responseBody ?? {});

        return res.status(record.statusCode ?? 200).json(replayBody);
      }

      const recordId = result.record.id;
      let responseCaptured = false;

      const captureResponse = (statusCode: number, body: Record<string, unknown>) => {
        if (responseCaptured) {
          return;
        }

        responseCaptured = true;

        const serialized = JSON.parse(JSON.stringify(body)) as Record<string, unknown>;

        completeIdempotency(recordId, statusCode, serialized).catch((error) => {
          logger.error({ error }, "Failed to persist idempotency response");
        });
      };

      const originalStatus = res.status.bind(res);
      const originalJson = res.json.bind(res);

      res.status = function status(code: number) {
        res.statusCode = code;
        return originalStatus(code);
      };

      res.json = function json(body: Record<string, unknown>) {
        captureResponse(res.statusCode || 200, body);
        return originalJson(body);
      };

      res.on("finish", () => {
        if (!responseCaptured && res.statusCode >= 400) {
          captureResponse(res.statusCode, {
            success: false,
            message: "Request failed before a JSON response was captured",
            error: { code: ERROR_CODES.INTERNAL_ERROR, details: {} },
          });
        }
      });

      next();
    } catch (error) {
      return errorResponseFromException(res, error, {
        fallbackMessage: "Idempotency check failed",
        fallbackCode: ERROR_CODES.INTERNAL_ERROR,
        fallbackStatus: 500,
      });
    }
  }
);
