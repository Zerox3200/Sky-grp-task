import type { Request, Response } from "express";
import { ERROR_CODES } from "../../constants/errorCodes.js";
import { ErrorCatch } from "../../utils/ErrorCatch.js";
import { invalidateCache } from "../../helpers/cache.helpers.js";
import {
  errorResponse,
  errorResponseFromException,
  successResponse,
} from "../../helpers/response.helpers.js";
import * as orderService from "./Order.service.js";
import type { OrderStatus } from "../../../DB/Orders/Order.model.js";

export const createOrder = ErrorCatch(async (req: Request, res: Response) => {
  if (!req.user) {
    return errorResponse(res, {
      statusCode: 401,
      message: "Not authorized",
      code: ERROR_CODES.UNAUTHORIZED,
    });
  }

  const { items } = req.body as { items: orderService.CreateOrderItemInput[] };

  try {
    const order = await orderService.createOrder({
      userId: req.user.id,
      items,
    });

    await invalidateCache("orderMutation");

    return successResponse(res, {
      statusCode: 201,
      message: "Order created successfully",
      data: order,
    });
  } catch (error) {
    return errorResponseFromException(res, error, {
      fallbackMessage: "Failed to create order",
      fallbackCode: ERROR_CODES.ORDER_CREATE_FAILED,
      fallbackStatus: 500,
    });
  }
});

export const listOrders = ErrorCatch(async (req: Request, res: Response) => {
  if (!req.user) {
    return errorResponse(res, {
      statusCode: 401,
      message: "Not authorized",
      code: ERROR_CODES.UNAUTHORIZED,
    });
  }

  const query = req.query as unknown as {
    page: number;
    limit: number;
    status?: OrderStatus;
    startDate?: Date;
    endDate?: Date;
    minTotalAmount?: number;
  };

  const result = await orderService.listOrders({
    userId: req.user.role === "Admin" ? undefined : req.user.id,
    status: query.status,
    startDate: query.startDate,
    endDate: query.endDate,
    minTotalAmount: query.minTotalAmount,
    page: query.page,
    limit: query.limit,
  });

  return successResponse(res, {
    message: "Orders fetched successfully",
    data: result,
  });
});
