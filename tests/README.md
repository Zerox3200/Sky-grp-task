# Testing Guide

## Test stack

This project uses **Vitest** (Jest-compatible API) and **Supertest** for HTTP integration tests against a real MySQL test database.

## Test database

Tests use a separate database configured in [`.env.test`](.env.test):

```env
DB_NAME=sky_grp_test
```

Create the database (migrations run automatically on first test):

```sql
CREATE DATABASE IF NOT EXISTS sky_grp_test;
```

## Run tests

```bash
# All tests
npm run test

# Watch mode
npm run test:watch

# Coverage report
npm run test:coverage
```

## Test structure

```
tests/
├── setup/env.ts              # Loads .env.test, sets test DB + secrets
├── helpers/
│   ├── app.ts                # Supertest Express app builder
│   ├── database.ts           # DB setup + error assertions
│   ├── factories.ts          # Users, products, login helpers
│   └── cleanup.ts            # Deterministic teardown
├── unit/                     # Pure logic + mocked externals
├── integration/              # Full API + real Sequelize/MySQL
├── concurrency/              # Parallel stock / race condition tests
├── idempotency/              # Idempotency-Key HTTP behavior
└── rate-limit/               # POST /api/orders rate limiter
```

## Test strategy

| Layer | What is tested | Mocking policy |
|-------|----------------|----------------|
| **Unit** | `mergeOrderItems`, totals, idempotency hash/resolve, JWT utils, queue config, email handler | Mock email + BullMQ only |
| **Integration** | Auth login/refresh, orders API, products CRUD, filters, error format | Mock `queueOrderCreatedJob` only |
| **Concurrency** | 10–20 parallel `createOrder` calls, stock never negative, no overselling | Real DB transactions + `SELECT FOR UPDATE`; service layer to avoid rate-limit interference |
| **Idempotency** | Replay, conflict, parallel identical keys | Real idempotency table |
| **Rate limit** | 429 after 10 req/min per user, user isolation | Real in-memory limiter |

Critical database logic (stock deduction, transactions, `SELECT FOR UPDATE`) is **never mocked** in integration or concurrency tests.

## Prerequisites

- MySQL running locally
- Optional: Redis (not required for most tests; queue is mocked in integration tests)

## Notes

- Tests run **sequentially** (`fileParallelism: false`) to avoid DB contention.
- Each suite creates isolated users/products with `@example.com` emails and cleans up in `afterAll`.
- Concurrency tests use unique idempotency keys per request to avoid idempotency collisions.
