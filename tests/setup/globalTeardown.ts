import { sequelize } from "../../DB/connection.js";

export default async function globalTeardown(): Promise<void> {
  await sequelize.close();
}
