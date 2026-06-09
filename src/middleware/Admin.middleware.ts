import jwt from "jsonwebtoken";
import type { NextFunction, Request, Response } from "express";
import { User } from "../../DB/index.js";
import { ERROR_CODES, type ErrorCode } from "../constants/errorCodes.js";
import { ErrorCatch } from "../utils/ErrorCatch.js";
import { errorResponse } from "../helpers/response.helpers.js";
import { getJwtSecret } from "../utils/jwt.js";

interface AccessTokenPayload {
  id: string;
  role: string;
}

const getBearerOrTokenHeader = (req: Request): string | undefined => {
  const authHeader = req.headers.authorization;

  if (authHeader && !Array.isArray(authHeader)) {
    const [scheme, token] = authHeader.split(" ");
    if (scheme?.toLowerCase() === "bearer" && token) {
      return token.trim();
    }
  }

  const tokenHeader = req.headers.token;
  if (tokenHeader && !Array.isArray(tokenHeader)) {
    return tokenHeader.trim();
  }

  return undefined;
};

const verifyAccessToken = (token: string): AccessTokenPayload => {
  try {
    return jwt.verify(token, getJwtSecret()) as AccessTokenPayload;
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      throw Object.assign(new Error("Access token expired"), {
        statusCode: 401,
        code: ERROR_CODES.TOKEN_EXPIRED,
      });
    }

    if (error instanceof jwt.JsonWebTokenError) {
      throw Object.assign(new Error("Invalid access token"), {
        statusCode: 401,
        code: ERROR_CODES.INVALID_TOKEN,
      });
    }

    throw error;
  }
};

const authenticateRequest = async (
  req: Request,
  res: Response,
  next: NextFunction,
  requireAdmin: boolean
): Promise<void> => {
  const token = getBearerOrTokenHeader(req);

  if (!token) {
    errorResponse(res, {
      statusCode: 401,
      message: "Not authorized",
      code: ERROR_CODES.UNAUTHORIZED,
    });
    return;
  }

  let decoded: AccessTokenPayload;

  try {
    decoded = verifyAccessToken(token);
  } catch (error) {
    const authError = error as Error & { statusCode?: number; code?: string };

    errorResponse(res, {
      statusCode: authError.statusCode ?? 401,
      message: authError.message,
      code: (authError.code as ErrorCode | undefined) ?? ERROR_CODES.UNAUTHORIZED,
    });
    return;
  }

  const where = requireAdmin
    ? { id: decoded.id, role: "Admin" as const }
    : { id: decoded.id };

  const user = await User.unscoped().findOne({ where });

  if (!user) {
    errorResponse(res, {
      statusCode: requireAdmin ? 403 : 401,
      message: requireAdmin ? "Only Admin allowed" : "Not authorized",
      code: requireAdmin ? ERROR_CODES.FORBIDDEN : ERROR_CODES.UNAUTHORIZED,
    });
    return;
  }

  req.user = user;
  req.id = decoded.id;
  next();
};

export const CheckToken = ErrorCatch(async (req: Request, res: Response, next: NextFunction) => {
  await authenticateRequest(req, res, next, false);
});

export const CheckAdmin = ErrorCatch(async (req: Request, res: Response, next: NextFunction) => {
  await authenticateRequest(req, res, next, true);
});
