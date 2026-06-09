import jwt from "jsonwebtoken";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { User } from "../../DB/index.js";
import { ERROR_CODES } from "../../src/constants/errorCodes.js";
import { getJwtSecret } from "../../src/utils/jwt.js";
import { buildTestApp } from "../helpers/app.js";
import { destroyUser } from "../helpers/cleanup.js";
import { setupTestDatabase, assertErrorBody } from "../helpers/database.js";
import { authHeader, createTestUser, loginUser } from "../helpers/factories.js";

describe("Authentication API integration", () => {
  const app = buildTestApp();
  let userId: string;
  let email: string;
  const password = "password123";

  beforeAll(async () => {
    await setupTestDatabase();
    const user = await createTestUser({ password });
    userId = user.getDataValue("id");
    email = user.getDataValue("email");
  });

  afterAll(async () => {
    await destroyUser(userId);
  });

  it("POST /api/auth/login returns access and refresh tokens", async () => {
    const response = await request(app).post("/api/auth/login").send({ email, password });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.accessToken).toBeTruthy();
    expect(response.body.data.refreshToken.length).toBeGreaterThanOrEqual(64);
    expect(response.body.data.user.email).toBe(email);
  });

  it("POST /api/auth/login rejects invalid credentials", async () => {
    const response = await request(app)
      .post("/api/auth/login")
      .send({ email, password: "wrong-password" });

    expect(response.status).toBe(400);
    assertErrorBody(response.body, ERROR_CODES.INVALID_CREDENTIALS);
  });

  it("POST /api/auth/refresh rotates refresh token", async () => {
    const login = await loginUser(app, email, password);

    const refreshResponse = await request(app)
      .post("/api/auth/refresh")
      .send({ refreshToken: login.refreshToken });

    expect(refreshResponse.status).toBe(200);
    expect(refreshResponse.body.data.refreshToken).not.toBe(login.refreshToken);
    expect(refreshResponse.body.data.accessToken).toBeTruthy();

    const oldRefreshAttempt = await request(app)
      .post("/api/auth/refresh")
      .send({ refreshToken: login.refreshToken });

    expect(oldRefreshAttempt.status).toBe(401);
    assertErrorBody(oldRefreshAttempt.body, ERROR_CODES.INVALID_REFRESH_TOKEN);
  });

  it("GET /api/auth/me rejects expired access token with 401", async () => {
    const expired = jwt.sign({ id: userId, role: "User" }, getJwtSecret(), { expiresIn: "-1s" });

    const response = await request(app).get("/api/auth/me").set(authHeader(expired));

    expect(response.status).toBe(401);
    assertErrorBody(response.body, ERROR_CODES.TOKEN_EXPIRED);
  });

  it("GET /api/auth/me rejects missing token", async () => {
    const response = await request(app).get("/api/auth/me");
    expect(response.status).toBe(401);
    assertErrorBody(response.body, ERROR_CODES.UNAUTHORIZED);
  });

  it("GET /api/auth/me returns profile for valid token", async () => {
    const login = await loginUser(app, email, password);
    const response = await request(app).get("/api/auth/me").set(authHeader(login.accessToken));

    expect(response.status).toBe(200);
    expect(response.body.data.email).toBe(email);
  });
});

describe("Error handling format", () => {
  const app = buildTestApp();

  beforeAll(async () => {
    await setupTestDatabase();
  });

  it("returns standard validation error format", async () => {
    const response = await request(app).post("/api/auth/login").send({ email: "not-an-email" });

    expect(response.status).toBe(400);
    assertErrorBody(response.body, ERROR_CODES.VALIDATION_ERROR);
    expect(response.body.error.details.fields).toBeDefined();
  });

  it("returns standard 404 error format for unknown routes", async () => {
    const response = await request(app).get("/api/does-not-exist");
    expect(response.status).toBe(404);
    assertErrorBody(response.body, ERROR_CODES.PAGE_NOT_FOUND);
  });
});
