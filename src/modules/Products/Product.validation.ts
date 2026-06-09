import Joi from "joi";

export const createProductSchema = Joi.object({
  sku: Joi.string().alphanum().required(),
  name: Joi.string().min(3).max(200).required(),
  price: Joi.number().positive().required(),
  stockQuantity: Joi.number().integer().min(0).default(0),
});

export const updateProductSchema = Joi.object({
  name: Joi.string().min(3).max(200).optional(),
  price: Joi.number().positive().optional(),
  stockQuantity: Joi.number().integer().min(0).optional(),
})
  .min(1)
  .messages({
    "object.min": "At least one of name, price, or stockQuantity is required",
  });

export const listProductsSchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(10),
  search: Joi.string().trim().min(1).max(200).optional(),
});
