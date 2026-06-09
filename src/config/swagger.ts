import swaggerJsdoc from "swagger-jsdoc";
import swaggerUi from "swagger-ui-express";
import type { Application } from "express";

const errorJson = {
  description: "Error response",
  content: {
    "application/json": {
      schema: { $ref: "#/components/schemas/ErrorResponse" },
    },
  },
};

const authSecurity = [{ bearerAuth: [] }, { tokenHeader: [] }];
const adminSecurity = [{ bearerAuth: [] }, { tokenHeader: [] }];
const idempotencySecurity = [{ idempotencyKey: [] }];

const swaggerDefinition = {
  openapi: "3.0.0",
  info: {
    title: "Sky Group Order & Inventory API",
    version: "1.0.0",
    description:
      "Order and inventory management system API. Auth routes are also available under `/auth/*` (legacy alias).",
  },
  servers: [{ url: "http://localhost:5001", description: "Development server" }],
  tags: [
    { name: "Auth", description: "Authentication and user account management" },
    { name: "Products", description: "Product catalog (admin mutations)" },
    { name: "Orders", description: "Order creation and listing" },
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: "http",
        scheme: "bearer",
        bearerFormat: "JWT",
        description: "JWT access token from login/signup",
      },
      tokenHeader: {
        type: "apiKey",
        in: "header",
        name: "token",
        description: "Alternative JWT access token header",
      },
      idempotencyKey: {
        type: "apiKey",
        in: "header",
        name: "idempotency-key",
        description: "Required for idempotent POST requests (8-255 chars)",
      },
    },
    schemas: {
      ErrorResponse: {
        type: "object",
        properties: {
          success: { type: "boolean", example: false },
          message: { type: "string" },
          error: {
            type: "object",
            properties: {
              code: { type: "string" },
              details: { type: "object" },
            },
          },
        },
      },
      SuccessResponse: {
        type: "object",
        properties: {
          success: { type: "boolean", example: true },
          message: { type: "string" },
          data: { type: "object" },
        },
      },
      SignUpRequest: {
        type: "object",
        required: ["name", "email", "password"],
        properties: {
          name: { type: "string", minLength: 2, maxLength: 60, example: "John Doe" },
          email: { type: "string", format: "email", example: "user@example.com" },
          password: { type: "string", minLength: 6, example: "password123" },
        },
      },
      LoginRequest: {
        type: "object",
        required: ["email", "password"],
        properties: {
          email: { type: "string", format: "email", example: "ziad@admin.com" },
          password: { type: "string", example: "123456789" },
        },
      },
      RefreshTokenRequest: {
        type: "object",
        required: ["refreshToken"],
        properties: {
          refreshToken: { type: "string", minLength: 64 },
        },
      },
      ForgetPasswordRequest: {
        type: "object",
        required: ["email"],
        properties: {
          email: { type: "string", format: "email" },
        },
      },
      ResetPasswordRequest: {
        type: "object",
        required: ["email", "otp", "newPassword"],
        properties: {
          email: { type: "string", format: "email" },
          otp: { type: "string", minLength: 6, maxLength: 6, pattern: "^\\d+$", example: "123456" },
          newPassword: { type: "string", minLength: 6 },
        },
      },
      ChangePasswordRequest: {
        type: "object",
        required: ["oldPassword", "newPassword"],
        properties: {
          oldPassword: { type: "string", minLength: 6 },
          newPassword: { type: "string", minLength: 6 },
        },
      },
      CreateProductRequest: {
        type: "object",
        required: ["sku", "name", "price"],
        properties: {
          sku: { type: "string", example: "SKU001" },
          name: { type: "string", minLength: 3, maxLength: 200, example: "Wireless Mouse" },
          price: { type: "number", minimum: 0.01, example: 29.99 },
          stockQuantity: { type: "integer", minimum: 0, default: 0, example: 100 },
        },
      },
      UpdateProductRequest: {
        type: "object",
        properties: {
          name: { type: "string", minLength: 3, maxLength: 200 },
          price: { type: "number", minimum: 0.01 },
          stockQuantity: { type: "integer", minimum: 0 },
        },
      },
      CreateOrderRequest: {
        type: "object",
        required: ["items"],
        properties: {
          items: {
            type: "array",
            minItems: 1,
            items: {
              type: "object",
              required: ["productId", "quantity"],
              properties: {
                productId: { type: "string", format: "uuid" },
                quantity: { type: "integer", minimum: 1, example: 2 },
              },
            },
          },
        },
      },
    },
  },
  paths: {
    "/api/auth/signup": {
      post: {
        tags: ["Auth"],
        summary: "Register a new user",
        description: "Requires `idempotency-key` header.",
        security: idempotencySecurity,
        requestBody: {
          required: true,
          content: {
            "application/json": { schema: { $ref: "#/components/schemas/SignUpRequest" } },
          },
        },
        responses: {
          201: { description: "User registered with access + refresh tokens" },
          409: errorJson,
          400: errorJson,
        },
      },
    },
    "/api/auth/login": {
      post: {
        tags: ["Auth"],
        summary: "Login and receive access + refresh tokens",
        requestBody: {
          required: true,
          content: {
            "application/json": { schema: { $ref: "#/components/schemas/LoginRequest" } },
          },
        },
        responses: {
          200: { description: "Login successful" },
          400: errorJson,
          404: errorJson,
        },
      },
    },
    "/api/auth/refresh": {
      post: {
        tags: ["Auth"],
        summary: "Refresh access token (rotate refresh token)",
        requestBody: {
          required: true,
          content: {
            "application/json": { schema: { $ref: "#/components/schemas/RefreshTokenRequest" } },
          },
        },
        responses: {
          200: { description: "New access + refresh tokens issued" },
          401: errorJson,
          400: errorJson,
        },
      },
    },
    "/api/auth/refresh-token": {
      post: {
        tags: ["Auth"],
        summary: "Refresh access token (alias of /refresh)",
        requestBody: {
          required: true,
          content: {
            "application/json": { schema: { $ref: "#/components/schemas/RefreshTokenRequest" } },
          },
        },
        responses: {
          200: { description: "New access + refresh tokens issued" },
          401: errorJson,
          400: errorJson,
        },
      },
    },
    "/api/auth/forget-password": {
      post: {
        tags: ["Auth"],
        summary: "Request password reset OTP via email",
        description: "Requires `idempotency-key` header.",
        security: idempotencySecurity,
        requestBody: {
          required: true,
          content: {
            "application/json": { schema: { $ref: "#/components/schemas/ForgetPasswordRequest" } },
          },
        },
        responses: {
          200: { description: "OTP sent to email" },
          404: errorJson,
          500: errorJson,
          400: errorJson,
        },
      },
    },
    "/api/auth/reset-password": {
      patch: {
        tags: ["Auth"],
        summary: "Reset password using OTP",
        requestBody: {
          required: true,
          content: {
            "application/json": { schema: { $ref: "#/components/schemas/ResetPasswordRequest" } },
          },
        },
        responses: {
          200: { description: "Password reset successfully" },
          400: errorJson,
        },
      },
    },
    "/api/auth/change-password": {
      put: {
        tags: ["Auth"],
        summary: "Change password for authenticated user",
        security: authSecurity,
        requestBody: {
          required: true,
          content: {
            "application/json": { schema: { $ref: "#/components/schemas/ChangePasswordRequest" } },
          },
        },
        responses: {
          200: { description: "Password changed successfully" },
          400: errorJson,
          401: errorJson,
        },
      },
    },
    "/api/auth/me": {
      get: {
        tags: ["Auth"],
        summary: "Get current user profile",
        security: authSecurity,
        responses: {
          200: { description: "User profile" },
          401: errorJson,
          404: errorJson,
        },
      },
    },
    "/api/products": {
      get: {
        tags: ["Products"],
        summary: "List active products (excludes soft-deleted)",
        parameters: [
          { name: "page", in: "query", schema: { type: "integer", default: 1, minimum: 1 } },
          { name: "limit", in: "query", schema: { type: "integer", default: 10, minimum: 1 } },
          { name: "search", in: "query", schema: { type: "string" }, description: "Search by name or SKU" },
        ],
        responses: { 200: { description: "Paginated product list" } },
      },
      post: {
        tags: ["Products"],
        summary: "Create product (Admin only)",
        description: "Requires `idempotency-key` header and Admin role.",
        security: [...adminSecurity, ...idempotencySecurity],
        requestBody: {
          required: true,
          content: {
            "application/json": { schema: { $ref: "#/components/schemas/CreateProductRequest" } },
          },
        },
        responses: {
          201: { description: "Product created" },
          401: errorJson,
          403: errorJson,
          409: errorJson,
          400: errorJson,
        },
      },
    },
    "/api/products/{id}": {
      put: {
        tags: ["Products"],
        summary: "Update product name, price, and/or stock (Admin only)",
        security: adminSecurity,
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: { type: "string", format: "uuid" },
          },
        ],
        requestBody: {
          required: true,
          content: {
            "application/json": { schema: { $ref: "#/components/schemas/UpdateProductRequest" } },
          },
        },
        responses: {
          200: { description: "Product updated" },
          401: errorJson,
          403: errorJson,
          404: errorJson,
          400: errorJson,
        },
      },
      delete: {
        tags: ["Products"],
        summary: "Soft delete product (Admin only)",
        security: adminSecurity,
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: { type: "string", format: "uuid" },
          },
        ],
        responses: {
          200: { description: "Product soft deleted (`isDeleted: true`)" },
          401: errorJson,
          403: errorJson,
          404: errorJson,
        },
      },
    },
    "/api/orders": {
      get: {
        tags: ["Orders"],
        summary: "List orders with filters",
        description: "Non-admin users see only their own orders. Admins see all orders.",
        security: authSecurity,
        parameters: [
          { name: "page", in: "query", schema: { type: "integer", default: 1, minimum: 1 } },
          { name: "limit", in: "query", schema: { type: "integer", default: 10, minimum: 1, maximum: 100 } },
          {
            name: "status",
            in: "query",
            schema: { type: "string", enum: ["pending", "completed", "cancelled"] },
          },
          { name: "startDate", in: "query", schema: { type: "string", format: "date-time" } },
          { name: "endDate", in: "query", schema: { type: "string", format: "date-time" } },
          { name: "minTotalAmount", in: "query", schema: { type: "number", minimum: 0.01 } },
        ],
        responses: {
          200: { description: "Paginated orders with items" },
          401: errorJson,
          400: errorJson,
        },
      },
      post: {
        tags: ["Orders"],
        summary: "Create order (deducts stock, queues confirmation email)",
        description:
          "Requires `idempotency-key` header. Rate limited to 10 requests per minute per user.",
        security: [...authSecurity, ...idempotencySecurity],
        requestBody: {
          required: true,
          content: {
            "application/json": { schema: { $ref: "#/components/schemas/CreateOrderRequest" } },
          },
        },
        responses: {
          201: { description: "Order created" },
          401: errorJson,
          404: errorJson,
          409: {
            description: "Insufficient stock",
            content: errorJson.content,
          },
          429: errorJson,
          400: errorJson,
        },
      },
    },
  },
};

const swaggerSpec = swaggerJsdoc({
  definition: swaggerDefinition,
  apis: [],
});

export const setupSwagger = (app: Application): void => {
  app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));
  app.get("/api-docs.json", (_req, res) => {
    res.json(swaggerSpec);
  });
};
