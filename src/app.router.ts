import express, { type Application, type NextFunction, type Request, type Response } from "express";
import authRouter from "./modules/Auth/Auth.routes.js";
import orderRouter from "./modules/Orders/Order.routes.js";
import productRouter from "./modules/Products/Product.routes.js";
import { ERROR_CODES } from "./constants/errorCodes.js";
import { errorResponse, errorResponseFromException } from "./helpers/response.helpers.js";
import { HttpError } from "./utils/httpError.js";

export const appRouter = (app: Application): void => {
  app.use("/uploads", express.static("uploads"));
  app.use(express.json());

  app.use("/api/auth", authRouter);
  app.use("/api/orders", orderRouter);
  app.use("/api/products", productRouter);

  app.all("*", (_req, _res, next) => {
    return next(
      new HttpError({
        message: "Page not found",
        statusCode: 404,
        code: ERROR_CODES.PAGE_NOT_FOUND,
      })
    );
  });

  app.use((error: unknown, _req: Request, res: Response, _next: NextFunction) => {
    if (error instanceof HttpError) {
      return errorResponse(res, {
        statusCode: error.statusCode,
        message: error.message,
        code: error.code,
        details: error.details,
      });
    }

    const legacyError = error as Error & { cause?: number };

    if (legacyError.cause === 404) {
      return errorResponse(res, {
        statusCode: 404,
        message: legacyError.message,
        code: ERROR_CODES.PAGE_NOT_FOUND,
      });
    }

    return errorResponseFromException(res, error, {
      fallbackMessage: "Internal server error",
      fallbackCode: ERROR_CODES.INTERNAL_ERROR,
      fallbackStatus: legacyError.cause || 500,
    });
  });
};
