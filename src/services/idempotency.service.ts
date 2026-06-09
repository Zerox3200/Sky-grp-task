import crypto from "crypto";
import { Op } from "sequelize";
import { IdempotencyKey } from "../../DB/IdempotencyKeys/IdempotencyKey.model.js";
import { ERROR_CODES } from "../constants/errorCodes.js";
import { throwHttpError } from "../utils/httpError.js";

const IDEMPOTENCY_TTL_MS = 24 * 60 * 60 * 1000;

export const hashRequestBody = (body: unknown): string =>
  crypto.createHash("sha256").update(JSON.stringify(body ?? {})).digest("hex");

export const buildScopeKey = (userId?: string, ip?: string): string => {
  if (userId) {
    return `user:${userId}`;
  }

  return `ip:${ip ?? "unknown"}`;
};

const isUniqueConstraintError = (error: unknown): boolean => {
  return (
    typeof error === "object" &&
    error !== null &&
    "name" in error &&
    (error as { name: string }).name === "SequelizeUniqueConstraintError"
  );
};

export const findActiveIdempotencyRecord = async (
  scopeKey: string,
  idempotencyKey: string
) => {
  return IdempotencyKey.findOne({
    where: {
      scopeKey,
      idempotencyKey,
      expiresAt: { [Op.gt]: new Date() },
    },
  });
};

export const resolveIdempotency = async ({
  scopeKey,
  idempotencyKey,
  method,
  route,
  requestHash,
}: {
  scopeKey: string;
  idempotencyKey: string;
  method: string;
  route: string;
  requestHash: string;
}) => {
  const existing = await findActiveIdempotencyRecord(scopeKey, idempotencyKey);

  if (existing) {
    if (existing.requestHash !== requestHash) {
      throwHttpError({
        message: "Idempotency key was already used with a different request body",
        statusCode: 409,
        code: ERROR_CODES.IDEMPOTENCY_CONFLICT,
        details: { idempotencyKey },
      });
    }

    if (existing.status === "processing") {
      throwHttpError({
        message: "A request with this idempotency key is still being processed",
        statusCode: 409,
        code: ERROR_CODES.IDEMPOTENCY_IN_PROGRESS,
        details: { idempotencyKey },
      });
    }

    return { type: "replay" as const, record: existing };
  }

  try {
    const record = await IdempotencyKey.create({
      idempotencyKey,
      scopeKey,
      method,
      route,
      requestHash,
      status: "processing",
      expiresAt: new Date(Date.now() + IDEMPOTENCY_TTL_MS),
    });

    return { type: "new" as const, record };
  } catch (error) {
    if (!isUniqueConstraintError(error)) {
      throw error;
    }

    const raced = await findActiveIdempotencyRecord(scopeKey, idempotencyKey);

    if (!raced) {
      throw error;
    }

    if (raced.requestHash !== requestHash) {
      throwHttpError({
        message: "Idempotency key was already used with a different request body",
        statusCode: 409,
        code: ERROR_CODES.IDEMPOTENCY_CONFLICT,
        details: { idempotencyKey },
      });
    }

    if (raced.status === "processing") {
      throwHttpError({
        message: "A request with this idempotency key is still being processed",
        statusCode: 409,
        code: ERROR_CODES.IDEMPOTENCY_IN_PROGRESS,
        details: { idempotencyKey },
      });
    }

    return { type: "replay" as const, record: raced };
  }
};

export const completeIdempotency = async (
  recordId: string,
  statusCode: number,
  responseBody: Record<string, unknown>
): Promise<void> => {
  await IdempotencyKey.update(
    {
      status: "completed",
      statusCode,
      responseBody,
    },
    { where: { id: recordId } }
  );
};
