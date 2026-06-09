import { DataTypes } from "sequelize";
import { columnExists, tableExists, type MigrationContext } from "./helpers.js";

export const up = async ({ context: queryInterface }: MigrationContext): Promise<void> => {
  if (await tableExists(queryInterface, "orders")) {
    const hasLegacyProductSchema = await columnExists(queryInterface, "orders", "sku");

    if (hasLegacyProductSchema) {
      await queryInterface.sequelize.query("SET FOREIGN_KEY_CHECKS = 0");
      await queryInterface.dropTable("order_items");
      await queryInterface.dropTable("orders");
      await queryInterface.sequelize.query("SET FOREIGN_KEY_CHECKS = 1");
    } else {
      return;
    }
  }

  await queryInterface.createTable("orders", {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
      allowNull: false,
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: "users",
        key: "id",
      },
      onUpdate: "CASCADE",
      onDelete: "CASCADE",
    },
    status: {
      type: DataTypes.ENUM("pending", "completed", "cancelled"),
      allowNull: false,
      defaultValue: "pending",
    },
    totalAmount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
    },
    createdAt: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    updatedAt: {
      type: DataTypes.DATE,
      allowNull: false,
    },
  });
};

export const down = async ({ context: queryInterface }: MigrationContext): Promise<void> => {
  await queryInterface.dropTable("orders");
};
