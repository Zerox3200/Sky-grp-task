declare namespace NodeJS {
  interface ProcessEnv {
    PORT?: string;
    secretkey: string;
    saltRound?: string;
    DB_HOST?: string;
    DB_PORT?: string;
    DB_NAME?: string;
    DB_USER?: string;
    DB_PASSWORD?: string;
    Email?: string;
    Emailpassword?: string;
    REDIS_URL?: string;
    CACHE_KEY_PREFIX?: string;
    NODE_ENV?: string;
  }
}

export {};
