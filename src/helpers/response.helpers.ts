import type { Response } from "express";
import { ERROR_CODES, type ErrorCode } from "../constants/errorCodes.js";
import type { ErrorDetails } from "../utils/httpError.js";
import { getErrorCode, getErrorDetails, getErrorMessage, getErrorStatus, HttpError } from "../utils/httpError.js";

interface SuccessOptions {
  statusCode?: number;
  message?: string;
  data?: unknown;
}

export interface ErrorOptions {
  statusCode?: number;
  message: string;
  code: ErrorCode;
  details?: ErrorDetails;
}

export const successResponse = (
  res: Response,
  { statusCode = 200, message, data }: SuccessOptions = {}
) => {
  const payload: { success: true; message?: string; data?: unknown } = {
    success: true,
    message,
  };

  if (data !== undefined) {
    payload.data = data;
  }

  return res.status(statusCode).json(payload);
};

export const errorResponse = (
  res: Response,
  { statusCode = 400, message, code, details = {} }: ErrorOptions
) => {
  return res.status(statusCode).json({
    success: false,
    message,
    error: {
      code,
      details,
    },
  });
};

export const errorResponseFromException = (
  res: Response,
  error: unknown,
  {
    fallbackMessage,
    fallbackCode = ERROR_CODES.INTERNAL_ERROR,
    fallbackStatus = 500,
  }: {
    fallbackMessage: string;
    fallbackCode?: ErrorCode;
    fallbackStatus?: number;
  }
) => {
  return errorResponse(res, {
    statusCode: getErrorStatus(error, fallbackStatus),
    message: getErrorMessage(error, fallbackMessage),
    code: getErrorCode(error, fallbackCode),
    details: getErrorDetails(error),
  });
};

export const isHttpError = (error: unknown): error is HttpError => error instanceof HttpError;
