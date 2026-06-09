import { DataTypes, Model, Optional } from "sequelize";
import { sequelize } from "../connection.js";

export type IdempotencyStatus = "processing" | "completed";

export interface IdempotencyKeyAttributes {
  id: string;
  idempotencyKey: string;
  scopeKey: string;
  method: string;
  route: string;
  requestHash: string;
  status: IdempotencyStatus;
  statusCode?: number | null;
  responseBody?: Record<string, unknown> | null;
  expiresAt: Date;
  createdAt?: Date;
  updatedAt?: Date;
}

export type IdempotencyKeyCreationAttributes = Optional<
  IdempotencyKeyAttributes,
  "id" | "statusCode" | "responseBody" | "createdAt" | "updatedAt"
>;

export class IdempotencyKey
  extends Model<IdempotencyKeyAttributes, IdempotencyKeyCreationAttributes>
  implements IdempotencyKeyAttributes
{
  declare id: string;
  declare idempotencyKey: string;
  declare scopeKey: string;
  declare method: string;
  declare route: string;
  declare requestHash: string;
  declare status: IdempotencyStatus;
  declare statusCode: number | null;
  declare responseBody: Record<string, unknown> | null;
  declare expiresAt: Date;
  declare readonly createdAt: Date;
  declare readonly updatedAt: Date;
}

IdempotencyKey.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
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
  },
  {
    sequelize,
    tableName: "idempotency_keys",
    timestamps: true,
    indexes: [
      {
        unique: true,
        fields: ["scopeKey", "idempotencyKey"],
        name: "uniq_idempotency_scope_key",
      },
      {
        fields: ["expiresAt"],
        name: "idx_idempotency_expires_at",
      },
    ],
  }
);
