import type { QueryInterface } from "sequelize";

export interface MigrationContext {
  context: QueryInterface;
}

export const tableExists = async (
  queryInterface: QueryInterface,
  tableName: string
): Promise<boolean> => {
  const tables = await queryInterface.showAllTables();
  return tables.includes(tableName);
};

export const columnExists = async (
  queryInterface: QueryInterface,
  tableName: string,
  columnName: string
): Promise<boolean> => {
  if (!(await tableExists(queryInterface, tableName))) {
    return false;
  }

  const description = await queryInterface.describeTable(tableName);
  return columnName in description;
};

export const indexExists = async (
  queryInterface: QueryInterface,
  tableName: string,
  indexName: string
): Promise<boolean> => {
  if (!(await tableExists(queryInterface, tableName))) {
    return false;
  }

  const indexes = (await queryInterface.showIndex(tableName)) as Array<{ name?: string }>;
  return indexes.some((index) => index.name === indexName);
};
