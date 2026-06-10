<h1 align="center">Welcome to sky-grp-backend 👋</h1>
<p>
  <img alt="Version" src="https://img.shields.io/badge/version-1.0.0-blue.svg?cacheSeconds=2592000" />
  <a href="#" target="_blank">
    <img alt="License: ISC" src="https://img.shields.io/badge/License-ISC-yellow.svg" />
  </a>
</p>

> Order & Inventory Management System — production-grade Node.js backend with MySQL, Redis, and BullMQ.

### Project Description

The Order & Inventory Management System is a scalable backend service designed to handle product management, order processing, and stock control in a reliable and production-ready architecture.

It is built to simulate real-world e-commerce backend systems, focusing on data consistency, concurrency safety, and asynchronous processing.

The system allows users to place orders while ensuring that inventory levels are accurately maintained using database transactions and pessimistic locking to prevent race conditions during high traffic.

To improve performance and scalability, the system uses Redis with BullMQ to process background jobs such as sending order confirmation emails asynchronously.

It also implements JWT-based authentication with access and refresh tokens, idempotency keys to prevent duplicate requests, and rate limiting to protect critical endpoints.

The project follows a clean architecture approach, separating concerns into controllers, services, and data layers, ensuring maintainability and scalability.

### Key Features

- Product management with stock control and soft delete
- Secure authentication (JWT access & refresh tokens)
- Order creation with full transactional integrity
- Concurrency-safe inventory updates (pessimistic locking)
- Idempotency support for safe retry requests
- Background job processing using Redis + BullMQ
- Rate limiting for API protection
- Structured logging and error handling
- Swagger API documentation
- Integration and unit testing support
- Docker & Docker Compose for containerized deployment

---

## Prerequisites

### Local development (without Docker)

1. **Start [XAMPP](https://www.apachefriends.org/)** and ensure **MySQL** is running before you start the API or run migrations.
2. Node.js 18+ and npm
3. Redis (optional — background email jobs are disabled if Redis is unavailable)

### Docker

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) (includes Docker Compose)

---

## Install

```sh
npm install
```

Copy the environment file and adjust values if needed:

```sh
cp .env.example .env
```

> **Important:** When running locally, **open XAMPP and start MySQL** first. The app connects to `127.0.0.1:3306` by default (`root` / `root`).

---

## Usage (local)

```sh
# Run migrations (first time)
npm run db:migrate

# Seed admin user (ziad@admin.com / 123456789)
npm run db:seed

# Start dev server
npm run dev
```

| Resource | URL |
|----------|-----|
| API base | http://localhost:5001/api |
| Swagger docs | http://localhost:5001/api-docs |

---

## Docker & Docker Compose

Run the full stack (API + MySQL + Redis) without XAMPP:

```sh
# Build and start all services
npm run docker:up

# View API logs
npm run docker:logs

# Stop services
npm run docker:down

# Stop and remove volumes (fresh database)
npm run docker:reset
```

Or use Docker Compose directly:

```sh
docker compose up -d --build
```

### Docker services

| Service | Host port | Description |
|---------|-----------|-------------|
| **api** | `5001` | Express API |
| **mysql** | `3307` | MySQL 8 (mapped to avoid XAMPP on `3306`) |
| **redis** | `6380` | Redis 7 (mapped to avoid local Redis on `6379`) |

On first startup the container runs migrations and seeds the admin user (`ziad@admin.com` / `123456789`).

- Swagger: http://localhost:5001/api-docs
- API: http://localhost:5001/api

Optional email env vars for order notifications (set in your shell or a `.env` file next to `docker-compose.yml`):

```env
Email=your@gmail.com
Emailpassword=your-app-password
```

---

## Run tests

Requires MySQL and a test database (`sky_grp_test`). **Start XAMPP MySQL** before running tests locally. See [tests/README.md](tests/README.md).

```sh
npm run test
npm run test:watch
npm run test:coverage
```

---

## NPM scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start dev server with hot reload |
| `npm run build` | Compile TypeScript to `dist/` |
| `npm run start` | Run production build |
| `npm run db:migrate` | Apply database migrations |
| `npm run db:seed` | Seed admin user |
| `npm run docker:up` | Build & start Docker Compose stack |
| `npm run docker:down` | Stop Docker Compose stack |
| `npm run test` | Run test suite |

---

## Author

👤 **Ziad Ahmed Salah**

- Github: [@Zerox3200](https://github.com/Zerox3200)
