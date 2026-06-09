import { DataTypes } from "sequelize";
import { tableExists, type MigrationContext } from "./helpers.js";

export const up = async ({ context: queryInterface }: MigrationContext): Promise<void> => {
  if (await tableExists(queryInterface, "users")) {
    return;
  }

  await queryInterface.createTable("users", {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
      allowNull: false,
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    email: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
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
  await queryInterface.dropTable("users");
};
