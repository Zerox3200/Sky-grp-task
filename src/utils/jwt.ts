export const getJwtSecret = (): string => {
  const secret = process.env.secretkey;

  if (!secret) {
    throw new Error("secretkey is not configured in environment variables");
  }

  return secret;
};
