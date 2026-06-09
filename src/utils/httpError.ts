import { ERROR_CODES, type ErrorCode } from "../constants/errorCodes.js";

export type ErrorDetails = Record<string, unknown>;

export interface HttpErrorInput {
  message: string;
  statusCode: number;
  code: ErrorCode;
  details?: ErrorDetails;
}

export class HttpError extends Error {
  statusCode: number;
  code: ErrorCode;
  details: ErrorDetails;

  constructor({ message, statusCode, code, details = {} }: HttpErrorInput) {
    super(message);
    this.name = "HttpError";
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
  }
}

export function throwHttpError(input: HttpErrorInput): never {
  throw new HttpError(input);
}

export const getErrorStatus = (error: unknown, fallback = 500): number => {
  if (error instanceof HttpError) {
    return error.statusCode;
  }

  if (typeof error === "object" && error !== null && "statusCode" in error) {
    return Number((error as { statusCode: number }).statusCode) || fallback;
  }

  return fallback;
};

export const getErrorMessage = (error: unknown, fallback: string): string => {
  return error instanceof Error ? error.message : fallback;
};

export const getErrorCode = (error: unknown, fallback: ErrorCode = ERROR_CODES.INTERNAL_ERROR): ErrorCode => {
  if (error instanceof HttpError) {
    return error.code;
  }

  return fallback;
};

export const getErrorDetails = (error: unknown): ErrorDetails => {
  if (error instanceof HttpError) {
    return error.details;
  }

  return {};
};
