import { DataTypes, Model, Optional } from "sequelize";
import { sequelize } from "../connection.js";

const SENSITIVE_FIELDS = [
  "password",
  "refreshToken",
  "refreshTokenExpires",
  "resetPasswordOtp",
  "resetPasswordOtpExpires",
] as const;

export type UserRole = "User" | "Admin";

export interface UserAttributes {
  id: string;
  name: string;
  email: string;
  password: string;
  role: UserRole;
  refreshToken?: string | null;
  refreshTokenExpires?: Date | null;
  resetPasswordOtp?: string | null;
  resetPasswordOtpExpires?: Date | null;
  createdAt?: Date;
  updatedAt?: Date;
}

export type UserCreationAttributes = Optional<
  UserAttributes,
  | "id"
  | "role"
  | "refreshToken"
  | "refreshTokenExpires"
  | "resetPasswordOtp"
  | "resetPasswordOtpExpires"
  | "createdAt"
  | "updatedAt"
>;

export class User extends Model<UserAttributes, UserCreationAttributes> implements UserAttributes {
  declare id: string;
  declare name: string;
  declare email: string;
  declare password: string;
  declare role: UserRole;
  declare refreshToken: string | null;
  declare refreshTokenExpires: Date | null;
  declare resetPasswordOtp: string | null;
  declare resetPasswordOtpExpires: Date | null;
  declare readonly createdAt: Date;
  declare readonly updatedAt: Date;
}

User.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    email: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
      validate: { isEmail: true },
    },
    password: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    role: {
      type: DataTypes.ENUM("User", "Admin"),
      allowNull: false,
      defaultValue: "User",
    },
    refreshToken: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    refreshTokenExpires: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    resetPasswordOtp: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    resetPasswordOtpExpires: {
      type: DataTypes.DATE,
      allowNull: true,
    },
  },
  {
    sequelize,
    tableName: "users",
    timestamps: true,
    defaultScope: {
      attributes: { exclude: [...SENSITIVE_FIELDS] },
    },
    scopes: {
      withSecrets: {
        attributes: { include: [...SENSITIVE_FIELDS] },
      },
    },
  }
);

export type UserInstance = User;
