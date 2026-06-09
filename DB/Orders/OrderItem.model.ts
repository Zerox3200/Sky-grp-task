import { DataTypes, Model, ModelStatic, Optional } from "sequelize";
import { sequelize } from "../connection.js";

export interface OrderItemAttributes {
  id: string;
  orderId: string;
  productId: string;
  quantity: number;
  price: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export type OrderItemCreationAttributes = Optional<
  OrderItemAttributes,
  "id" | "createdAt" | "updatedAt"
>;

export type OrderItemInstance = Model<OrderItemAttributes, OrderItemCreationAttributes>;

export const OrderItem = sequelize.define<OrderItemInstance>(
  "OrderItem",
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    orderId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: "orders",
        key: "id",
      },
    },
    productId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: "products",
        key: "id",
      },
    },
    quantity: {
      type: DataTypes.INTEGER,
      allowNull: false,
      validate: {
        min: 1,
      },
    },
    price: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      validate: {
        min: 0.01,
      },
    },
  },
  {
    tableName: "order_items",
    timestamps: true,
  }
) as ModelStatic<OrderItemInstance>;
