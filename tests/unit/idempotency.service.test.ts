import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { IdempotencyKey } from "../../DB/IdempotencyKeys/IdempotencyKey.model.js";
import { ERROR_CODES } from "../../src/constants/errorCodes.js";
import {
  buildScopeKey,
  completeIdempotency,
  hashRequestBody,
  resolveIdempotency,
} from "../../src/services/idempotency.service.js";
import { cleanupAllIdempotencyKeys } from "../helpers/cleanup.js";
import { setupTestDatabase, uniqueId } from "../helpers/database.js";

describe("Idempotency Service — pure functions", () => {
  it("hashRequestBody produces stable SHA-256 for same payload", () => {
    const body = { items: [{ productId: "abc", quantity: 1 }] };
    expect(hashRequestBody(body)).toBe(hashRequestBody(body));
  });

  it("hashRequestBody differs when payload changes", () => {
    expect(hashRequestBody({ a: 1 })).not.toBe(hashRequestBody({ a: 2 }));
  });

  it("buildScopeKey prefers user scope over ip", () => {
    expect(buildScopeKey("user-1", "127.0.0.1")).toBe("user:user-1");
    expect(buildScopeKey(undefined, "127.0.0.1")).toBe("ip:127.0.0.1");
  });
});

describe("Idempotency Service — database", () => {
  beforeEach(async () => {
    await setupTestDatabase();
    await cleanupAllIdempotencyKeys();
  });

  afterEach(async () => {
    await cleanupAllIdempotencyKeys();
  });

  it("resolveIdempotency creates a processing record for new keys", async () => {
    const key = `idem-${uniqueId()}`;
    const result = await resolveIdempotency({
      scopeKey: "user:test-user",
      idempotencyKey: key,
      method: "POST",
      route: "/api/orders/",
      requestHash: hashRequestBody({ items: [] }),
    });

    expect(result.type).toBe("new");
    expect(result.record.status).toBe("processing");
  });

  it("resolveIdempotency replays completed records with same hash", async () => {
    const key = `idem-${uniqueId()}`;
    const hash = hashRequestBody({ items: [{ productId: "x", quantity: 1 }] });
    const scope = "user:replay-user";

    const created = await resolveIdempotency({
      scopeKey: scope,
      idempotencyKey: key,
      method: "POST",
      route: "/api/orders/",
      requestHash: hash,
    });

    await completeIdempotency(created.record.id, 201, {
      success: true,
      data: { orderId: "order-1" },
    });

    const replay = await resolveIdempotency({
      scopeKey: scope,
      idempotencyKey: key,
      method: "POST",
      route: "/api/orders/",
      requestHash: hash,
    });

    expect(replay.type).toBe("replay");
    expect(replay.record.statusCode).toBe(201);
    expect(
      typeof replay.record.responseBody === "string"
        ? JSON.parse(replay.record.responseBody)
        : replay.record.responseBody
    ).toEqual({ success: true, data: { orderId: "order-1" } });
  });

  it("resolveIdempotency rejects hash mismatch with IDEMPOTENCY_CONFLICT", async () => {
    const key = `idem-${uniqueId()}`;
    const scope = "user:conflict-user";

    await resolveIdempotency({
      scopeKey: scope,
      idempotencyKey: key,
      method: "POST",
      route: "/api/orders/",
      requestHash: hashRequestBody({ items: [{ productId: "a", quantity: 1 }] }),
    });

    await expect(
      resolveIdempotency({
        scopeKey: scope,
        idempotencyKey: key,
        method: "POST",
        route: "/api/orders/",
        requestHash: hashRequestBody({ items: [{ productId: "a", quantity: 2 }] }),
      })
    ).rejects.toMatchObject({
      statusCode: 409,
      code: ERROR_CODES.IDEMPOTENCY_CONFLICT,
    });
  });

  it("completeIdempotency marks record as completed", async () => {
    const key = `idem-${uniqueId()}`;
    const created = await IdempotencyKey.create({
      idempotencyKey: key,
      scopeKey: "user:complete-user",
      method: "POST",
      route: "/api/orders/",
      requestHash: "abc",
      status: "processing",
      expiresAt: new Date(Date.now() + 60_000),
    });

    await completeIdempotency(created.id, 201, { success: true });

    const updated = await IdempotencyKey.findByPk(created.id);
    expect(updated?.status).toBe("completed");
    expect(updated?.statusCode).toBe(201);
  });
});
