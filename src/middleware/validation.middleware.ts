import type { NextFunction, Request, Response } from "express";
import type { ObjectSchema } from "joi";
import { ERROR_CODES } from "../constants/errorCodes.js";
import { errorResponse } from "../helpers/response.helpers.js";

export const isvalid =
  (schema: ObjectSchema) => (req: Request, res: Response, next: NextFunction) => {
    const { error, value } = schema.validate(req.body, { abortEarly: false });

    if (error) {
      return errorResponse(res, {
        statusCode: 400,
        message: error.details.map((detail) => detail.message).join(", "),
        code: ERROR_CODES.VALIDATION_ERROR,
        details: {
          fields: error.details.map((detail) => ({
            path: detail.path.join("."),
            message: detail.message,
          })),
        },
      });
    }

    req.body = value;
    next();
  };
