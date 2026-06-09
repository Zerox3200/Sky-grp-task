import { Router } from "express";
import { CheckAdmin } from "../../middleware/Admin.middleware.js";
import { cacheResponse } from "../../middleware/cache.middleware.js";
import { CACHE_NAMESPACES } from "../../constants/cache.namespaces.js";
import { requireIdempotencyKey } from "../../middleware/idempotency.middleware.js";
import { isvalid } from "../../middleware/validation.middleware.js";
import {
  createProduct,
  listProducts,
  softDeleteProduct,
  updateProduct,
} from "./Product.controller.js";
import { createProductSchema, updateProductSchema } from "./Product.validation.js";

const router = Router();

router.post("/", CheckAdmin, requireIdempotencyKey, isvalid(createProductSchema), createProduct);
router.get("/", cacheResponse(CACHE_NAMESPACES.PRODUCTS), listProducts);
router.put("/:id", CheckAdmin, isvalid(updateProductSchema), updateProduct);
router.delete("/:id", CheckAdmin, softDeleteProduct);

export default router;
