import dotenv from "dotenv";

let loaded = false;

export const loadEnv = (): void => {
  if (loaded) {
    return;
  }

  dotenv.config();
  loaded = true;
};

export const getPort = (): number => Number(process.env.PORT) || 5001;
