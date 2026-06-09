import crypto from "crypto";
import jwt from "jsonwebtoken";
import { describe, expect, it } from "vitest";
import { ERROR_CODES } from "../../src/constants/errorCodes.js";
import { getJwtSecret } from "../../src/utils/jwt.js";

const hashValue = (value: string): string =>
  crypto.createHash("sha256").update(value).digest("hex");

describe("Authentication utilities", () => {
  it("issues JWT access tokens with id and role payload", () => {
    const token = jwt.sign({ id: "user-1", role: "Admin" }, getJwtSecret(), {
      expiresIn: "15m",
    });

    const decoded = jwt.verify(token, getJwtSecret()) as { id: string; role: string };
    expect(decoded.id).toBe("user-1");
    expect(decoded.role).toBe("Admin");
  });

  it("rejects expired access tokens with TokenExpiredError", () => {
    const expired = jwt.sign({ id: "user-1", role: "User" }, getJwtSecret(), {
      expiresIn: "-1s",
    });

    expect(() => jwt.verify(expired, getJwtSecret())).toThrow(
      expect.objectContaining({ name: "TokenExpiredError" })
    );
  });

  it("hashes refresh tokens with SHA-256 for storage", () => {
    const refreshToken = crypto.randomBytes(40).toString("hex");
    expect(refreshToken.length).toBeGreaterThanOrEqual(64);
    expect(hashValue(refreshToken)).toHaveLength(64);
    expect(hashValue(refreshToken)).toBe(hashValue(refreshToken));
  });

  it("defines auth error codes used by middleware", () => {
    expect(ERROR_CODES.TOKEN_EXPIRED).toBe("TOKEN_EXPIRED");
    expect(ERROR_CODES.INVALID_TOKEN).toBe("INVALID_TOKEN");
    expect(ERROR_CODES.INVALID_REFRESH_TOKEN).toBe("INVALID_REFRESH_TOKEN");
    expect(ERROR_CODES.INVALID_CREDENTIALS).toBe("INVALID_CREDENTIALS");
  });
});
