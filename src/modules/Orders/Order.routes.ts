import { Router } from "express";
import { CheckToken } from "../../middleware/Admin.middleware.js";
import { cacheResponse } from "../../middleware/cache.middleware.js";
import { CACHE_NAMESPACES } from "../../constants/cache.namespaces.js";
import { requireIdempotencyKey } from "../../middleware/idempotency.middleware.js";
import { orderCreateRateLimiter } from "../../middleware/rateLimiter.middleware.js";
import { validateQuery } from "../../middleware/query.middleware.js";
import { isvalid } from "../../middleware/validation.middleware.js";
import { createOrder, listOrders } from "./Order.controller.js";
import { createOrderSchema, listOrdersSchema } from "./Order.validation.js";

const router = Router();

router.post(
  "/",
  CheckToken,
  orderCreateRateLimiter,
  requireIdempotencyKey,
  isvalid(createOrderSchema),
  createOrder
);
router.get(
  "/",
  CheckToken,
  cacheResponse(CACHE_NAMESPACES.ORDERS),
  validateQuery(listOrdersSchema),
  listOrders
);

export default router;
