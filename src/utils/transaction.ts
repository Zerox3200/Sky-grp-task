import type { Transaction } from "sequelize";
import { sequelize } from "../../DB/index.js";

export const runInTransaction = async <T>(
  handler: (transaction: Transaction) => Promise<T>
): Promise<T> => {
  return sequelize.transaction(async (transaction) => handler(transaction));
};
