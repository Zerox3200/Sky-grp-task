import { DataTypes, Model, ModelStatic, Optional } from "sequelize";
import { sequelize } from "../connection.js";

export interface ProductAttributes {
  id: string;
  sku: string;
  name: string;
  price: string;
  stockQuantity: number;
  isDeleted: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

export type ProductCreationAttributes = Optional<
  ProductAttributes,
  "id" | "stockQuantity" | "isDeleted" | "createdAt" | "updatedAt"
>;

export type ProductInstance = Model<ProductAttributes, ProductCreationAttributes>;

export const Product = sequelize.define<ProductInstance>(
  "Product",
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    sku: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
      validate: {
        isAlphanumeric: true,
      },
    },
    name: {
      type: DataTypes.STRING(200),
      allowNull: false,
      validate: {
        len: [3, 200],
      },
    },
    price: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      validate: {
        min: 0.01,
      },
    },
    stockQuantity: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      validate: {
        min: 0,
      },
    },
    isDeleted: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
  },
  {
    tableName: "products",
    timestamps: true,
  }
) as ModelStatic<ProductInstance>;
