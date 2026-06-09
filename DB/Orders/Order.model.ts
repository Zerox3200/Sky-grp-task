import { DataTypes, Model, ModelStatic, Optional } from "sequelize";
import { sequelize } from "../connection.js";

export type OrderStatus = "pending" | "completed" | "cancelled";

export interface OrderAttributes {
  id: string;
  userId: string;
  status: OrderStatus;
  totalAmount: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export type OrderCreationAttributes = Optional<
  OrderAttributes,
  "id" | "status" | "createdAt" | "updatedAt"
>;

export type OrderInstance = Model<OrderAttributes, OrderCreationAttributes>;

export const Order = sequelize.define<OrderInstance>(
  "Order",
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: "users",
        key: "id",
      },
    },
    status: {
      type: DataTypes.ENUM("pending", "completed", "cancelled"),
      allowNull: false,
      defaultValue: "pending",
    },
    totalAmount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      validate: {
        min: 0,
      },
    },
  },
  {
    tableName: "orders",
    timestamps: true,
  }
) as ModelStatic<OrderInstance>;
