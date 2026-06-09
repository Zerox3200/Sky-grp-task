import type { NextFunction, Request, RequestHandler, Response } from "express";
import { ERROR_CODES } from "../constants/errorCodes.js";
import { errorResponseFromException } from "../helpers/response.helpers.js";

type AsyncRequestHandler = (
  req: Request,
  res: Response,
  next: NextFunction
) => Promise<unknown>;

export const ErrorCatch = (controller: AsyncRequestHandler): RequestHandler => {
  return (req, res, next) => {
    controller(req, res, next).catch((error: unknown) => {
      return errorResponseFromException(res, error, {
        fallbackMessage: "An unexpected error occurred",
        fallbackCode: ERROR_CODES.INTERNAL_ERROR,
        fallbackStatus: 500,
      });
    });
  };
};
