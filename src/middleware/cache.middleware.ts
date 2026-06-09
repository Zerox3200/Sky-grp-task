import type { NextFunction, Request, Response } from "express";
import { buildCacheKey, getCache, setCache } from "../utils/redis.js";
import { ErrorCatch } from "../utils/ErrorCatch.js";

interface CachedResponse {
  statusCode: number;
  body: Record<string, unknown>;
}

const getCacheScope = (req: Request): string => req.user?.id ?? req.ip ?? "public";

export const cacheResponse =
  (namespace: string, expiryInSeconds = 300) =>
  ErrorCatch(async (req: Request, res: Response, next: NextFunction) => {
    const cacheKey = buildCacheKey(namespace, getCacheScope(req), req.originalUrl);
    const cached = await getCache<CachedResponse>(cacheKey);

    if (cached) {
      return res.status(cached.statusCode).json(cached.body);
    }

    let responseCaptured = false;
    const originalJson = res.json.bind(res);

    res.json = function json(body: Record<string, unknown>) {
      if (!responseCaptured && res.statusCode < 400) {
        responseCaptured = true;

        setCache(cacheKey, {
          statusCode: res.statusCode || 200,
          body,
        }, expiryInSeconds).catch(() => undefined);
      }

      return originalJson(body);
    };

    next();
  });
