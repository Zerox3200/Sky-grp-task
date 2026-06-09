import { Op, type WhereOptions } from "sequelize";
import type { Request, Response } from "express";
import { Product } from "../../../DB/index.js";
import type { ProductAttributes } from "../../../DB/Products/Product.model.js";
import { ERROR_CODES } from "../../constants/errorCodes.js";
import { ErrorCatch } from "../../utils/ErrorCatch.js";
import { invalidateCache } from "../../helpers/cache.helpers.js";
import { errorResponseFromException, successResponse } from "../../helpers/response.helpers.js";
import * as productService from "./Product.service.js";

export const createProduct = ErrorCatch(async (req: Request, res: Response) => {
  const { sku, name, price, stockQuantity = 0 } = req.body as {
    sku: string;
    name: string;
    price: number;
    stockQuantity?: number;
  };

  try {
    const product = await productService.createProduct({
      sku,
      name,
      price,
      stockQuantity,
    });

    await invalidateCache("productMutation");

    return successResponse(res, {
      statusCode: 201,
      message: "Product created successfully",
      data: product,
    });
  } catch (error) {
    return errorResponseFromException(res, error, {
      fallbackMessage: "Failed to create product",
      fallbackCode: ERROR_CODES.PRODUCT_CREATE_FAILED,
      fallbackStatus: 500,
    });
  }
});

export const listProducts = ErrorCatch(async (req: Request, res: Response) => {
  const query = req.query as { page?: string; limit?: string; search?: string };
  const page = Number(query.page) || 1;
  const limit = Number(query.limit) || 10;
  const offset = (page - 1) * limit;

  const where: WhereOptions<ProductAttributes> = query.search
    ? {
        isDeleted: false,
        [Op.or]: [
          { name: { [Op.like]: `%${query.search}%` } },
          { sku: { [Op.like]: `%${query.search}%` } },
        ],
      }
    : { isDeleted: false };

  const { rows, count } = await Product.findAndCountAll({
    where,
    order: [["createdAt", "DESC"]],
    limit,
    offset,
  });

  return successResponse(res, {
    message: "Products fetched successfully",
    data: {
      products: rows,
      pagination: {
        page,
        limit,
        total: count,
        totalPages: Math.ceil(count / limit) || 1,
      },
    },
  });
});

export const updateProduct = ErrorCatch(async (req: Request, res: Response) => {
  const id = String(req.params.id);
  const { name, price, stockQuantity } = req.body as {
    name?: string;
    price?: number;
    stockQuantity?: number;
  };

  try {
    const product = await productService.updateProduct({ id, name, price, stockQuantity });

    await invalidateCache("productMutation");

    return successResponse(res, {
      message: "Product updated successfully",
      data: product,
    });
  } catch (error) {
    return errorResponseFromException(res, error, {
      fallbackMessage: "Failed to update product",
      fallbackCode: ERROR_CODES.PRODUCT_UPDATE_FAILED,
      fallbackStatus: 500,
    });
  }
});

export const softDeleteProduct = ErrorCatch(async (req: Request, res: Response) => {
  const id = String(req.params.id);

  try {
    const product = await productService.softDeleteProduct(id);

    await invalidateCache("productMutation");

    return successResponse(res, {
      message: "Product soft deleted successfully",
      data: { id: product.id, isDeleted: true },
    });
  } catch (error) {
    return errorResponseFromException(res, error, {
      fallbackMessage: "Failed to delete product",
      fallbackCode: ERROR_CODES.PRODUCT_DELETE_FAILED,
      fallbackStatus: 500,
    });
  }
});
