import type { QueryInterface } from "sequelize";
import { indexExists, tableExists, type MigrationContext } from "./helpers.js";

const addIndexIfMissing = async (
  queryInterface: QueryInterface,
  tableName: string,
  fields: string[],
  indexName: string
): Promise<void> => {
  if (!(await tableExists(queryInterface, tableName))) {
    return;
  }

  if (await indexExists(queryInterface, tableName, indexName)) {
    return;
  }

  await queryInterface.addIndex(tableName, fields, { name: indexName });
};

export const up = async ({ context: queryInterface }: MigrationContext): Promise<void> => {
  await addIndexIfMissing(queryInterface, "products", ["sku"], "idx_products_sku");
  await addIndexIfMissing(queryInterface, "products", ["isDeleted"], "idx_products_is_deleted");

  await addIndexIfMissing(queryInterface, "orders", ["status"], "idx_orders_status");
  await addIndexIfMissing(queryInterface, "orders", ["userId"], "idx_orders_user_id");
  await addIndexIfMissing(queryInterface, "orders", ["createdAt"], "idx_orders_created_at");
  await addIndexIfMissing(
    queryInterface,
    "orders",
    ["status", "createdAt"],
    "idx_orders_status_created_at"
  );
  await addIndexIfMissing(
    queryInterface,
    "orders",
    ["userId", "status"],
    "idx_orders_user_id_status"
  );
};

export const down = async ({ context: queryInterface }: MigrationContext): Promise<void> => {
  const indexes = [
    { table: "orders", name: "idx_orders_user_id_status" },
    { table: "orders", name: "idx_orders_status_created_at" },
    { table: "orders", name: "idx_orders_created_at" },
    { table: "orders", name: "idx_orders_user_id" },
    { table: "orders", name: "idx_orders_status" },
    { table: "products", name: "idx_products_is_deleted" },
    { table: "products", name: "idx_products_sku" },
  ];

  for (const { table, name } of indexes) {
    if (await indexExists(queryInterface, table, name)) {
      await queryInterface.removeIndex(table, name);
    }
  }
};
