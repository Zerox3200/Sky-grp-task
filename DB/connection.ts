import { Sequelize } from "sequelize";

const dbName = process.env.DB_NAME || "sky_grp";
const dbUser = process.env.DB_USER || "root";
const dbPassword = process.env.DB_PASSWORD || "";
const dbHost = process.env.DB_HOST || "127.0.0.1";
const dbPort = Number(process.env.DB_PORT) || 3306;

export const sequelize = new Sequelize(dbName, dbUser, dbPassword, {
  host: dbHost,
  port: dbPort,
  dialect: "mysql",
  logging: false,
});

const ensureDatabaseExists = async (): Promise<void> => {
  const bootstrap = new Sequelize("", dbUser, dbPassword, {
    host: dbHost,
    port: dbPort,
    dialect: "mysql",
    logging: false,
  });

  await bootstrap.query(`CREATE DATABASE IF NOT EXISTS \`${dbName}\`;`);
  await bootstrap.close();
};

export const conn = async (): Promise<void> => {
  try {
    await ensureDatabaseExists();
    await sequelize.authenticate();
    console.log("Connected to MySQL via Sequelize");
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.log("Database connection failed", message);
    throw err;
  }
};
