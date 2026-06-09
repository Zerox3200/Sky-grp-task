import { Transaction } from "sequelize";
import { Product } from "../../../DB/index.js";
import { ERROR_CODES } from "../../constants/errorCodes.js";
import { throwHttpError } from "../../utils/httpError.js";
import { runInTransaction } from "../../utils/transaction.js";

interface CreateProductInput {
  sku: string;
  name: string;
  price: number;
  stockQuantity: number;
}

interface UpdateProductInput {
  id: string;
  name?: string;
  price?: number;
  stockQuantity?: number;
}

export const createProduct = async ({
  sku,
  name,
  price,
  stockQuantity,
}: CreateProductInput) => {
  return runInTransaction(async (transaction) => {
    const existing = await Product.findOne({
      where: { sku },
      lock: Transaction.LOCK.UPDATE,
      transaction,
    });

    if (existing) {
      throwHttpError({
        message: "SKU already exists",
        statusCode: 409,
        code: ERROR_CODES.SKU_ALREADY_EXISTS,
        details: { sku },
      });
    }

    return Product.create(
      {
        sku,
        name,
        price: price.toFixed(2),
        stockQuantity,
        isDeleted: false,
      },
      { transaction }
    );
  });
};

export const updateProduct = async ({ id, name, price, stockQuantity }: UpdateProductInput) => {
  return runInTransaction(async (transaction) => {
    const product = await Product.findOne({
      where: { id, isDeleted: false },
      lock: Transaction.LOCK.UPDATE,
      transaction,
    });

    if (!product) {
      throwHttpError({
        message: "Product not found",
        statusCode: 404,
        code: ERROR_CODES.PRODUCT_NOT_FOUND,
        details: { id },
      });
    }

    const existingProduct = product;

    await existingProduct.update(
      {
        ...(name !== undefined ? { name } : {}),
        ...(price !== undefined ? { price: price.toFixed(2) } : {}),
        ...(stockQuantity !== undefined ? { stockQuantity } : {}),
      },
      { transaction }
    );

    return existingProduct;
  });
};

export const softDeleteProduct = async (id: string) => {
  return runInTransaction(async (transaction) => {
    const product = await Product.findOne({
      where: { id, isDeleted: false },
      lock: Transaction.LOCK.UPDATE,
      transaction,
    });

    if (!product) {
      throwHttpError({
        message: "Product not found",
        statusCode: 404,
        code: ERROR_CODES.PRODUCT_NOT_FOUND,
        details: { id },
      });
    }

    const existingProduct = product;

    await existingProduct.update({ isDeleted: true }, { transaction });

    return existingProduct.toJSON();
  });
};
