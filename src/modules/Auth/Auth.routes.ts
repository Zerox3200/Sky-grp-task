import { Router } from "express";
import { isvalid } from "../../middleware/validation.middleware.js";
import {
  changePassword,
  forgetPassword,
  getMe,
  login,
  refreshToken,
  resetPassword,
  signUp,
} from "./Auth.controller.js";
import {
  changePasswordSchema,
  forgetPasswordSchema,
  loginSchema,
  refreshTokenSchema,
  resetPasswordSchema,
  signUpSchema,
} from "./Auth.validation.js";
import { CheckToken } from "../../middleware/Admin.middleware.js";
import { cacheResponse } from "../../middleware/cache.middleware.js";
import { CACHE_NAMESPACES } from "../../constants/cache.namespaces.js";
import { requireIdempotencyKey } from "../../middleware/idempotency.middleware.js";

const router = Router();

router.post("/signup", requireIdempotencyKey, isvalid(signUpSchema), signUp);
router.post("/login", isvalid(loginSchema), login);
router.post("/refresh-token", isvalid(refreshTokenSchema), refreshToken);
router.post("/refresh", isvalid(refreshTokenSchema), refreshToken);

router.post("/forget-password", requireIdempotencyKey, isvalid(forgetPasswordSchema), forgetPassword);
router.patch("/reset-password", isvalid(resetPasswordSchema), resetPassword);

router.put("/change-password", CheckToken, isvalid(changePasswordSchema), changePassword);
router.get("/me", CheckToken, cacheResponse(CACHE_NAMESPACES.AUTH), getMe);

export default router;
