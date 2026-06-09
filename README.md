<h1 align="center">Welcome to sky-grp-backend 👋</h1>
<p>
  <img alt="Version" src="https://img.shields.io/badge/version-1.0.0-blue.svg?cacheSeconds=2592000" />
  <a href="#" target="_blank">
    <img alt="License: ISC" src="https://img.shields.io/badge/License-ISC-yellow.svg" />
  </a>
</p>

> Project Description

### 📌 Project Description

The Order & Inventory Management System is a scalable backend service designed to handle product management, order processing, and stock control in a reliable and production-ready architecture.

It is built to simulate real-world e-commerce backend systems, focusing on data consistency, concurrency safety, and asynchronous processing.

The system allows users to place orders while ensuring that inventory levels are accurately maintained using database transactions and pessimistic locking to prevent race conditions during high traffic.

To improve performance and scalability, the system uses Redis with BullMQ to process background jobs such as sending order confirmation emails asynchronously.

It also implements JWT-based authentication with access and refresh tokens, idempotency keys to prevent duplicate requests, and rate limiting to protect critical endpoints.

The project follows a clean architecture approach, separating concerns into controllers, services, and data layers, ensuring maintainability and scalability.

Key Features
Product management with stock control and soft delete
Secure authentication (JWT access & refresh tokens)
Order creation with full transactional integrity
Concurrency-safe inventory updates (pessimistic locking)
Idempotency support for safe retry requests
Background job processing using Redis + BullMQ
Rate limiting for API protection
Structured logging and error handling
Swagger API documentation
Integration and unit testing support

### ✨ [Demo](Integration and unit testing supportyy)

## Install

```sh
npm install
```

## Usage

```sh
npm run dev
```

## Run tests

Requires MySQL and a test database (`sky_grp_test`). See [tests/README.md](tests/README.md).

```sh
npm run test
npm run test:watch
npm run test:coverage
```

## Author

👤 **Ziad Ahmed Salah**

- Github: [@Zerox3200](https://github.com/Zerox3200)
