import { DataTypes } from "sequelize";
import { tableExists, type MigrationContext } from "./helpers.js";

export const up = async ({ context: queryInterface }: MigrationContext): Promise<void> => {
  if (await tableExists(queryInterface, "idempotency_keys")) {
    return;
  }

  await queryInterface.createTable("idempotency_keys", {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
      allowNull: false,
    },
    idempotencyKey: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    scopeKey: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    method: {
      type: DataTypes.STRING(10),
      allowNull: false,
    },
    route: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    requestHash: {
      type: DataTypes.STRING(64),
      allowNull: false,
    },
    status: {
      type: DataTypes.ENUM("processing", "completed"),
      allowNull: false,
      defaultValue: "processing",
    },
    statusCode: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    responseBody: {
      type: DataTypes.JSON,
      allowNull: true,
    },
    expiresAt: {
      type: DataTypes.DATE,
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

  await queryInterface.addIndex("idempotency_keys", ["scopeKey", "idempotencyKey"], {
    unique: true,
    name: "uniq_idempotency_scope_key",
  });

  await queryInterface.addIndex("idempotency_keys", ["expiresAt"], {
    name: "idx_idempotency_expires_at",
  });
};

export const down = async ({ context: queryInterface }: MigrationContext): Promise<void> => {
  await queryInterface.dropTable("idempotency_keys");
};
