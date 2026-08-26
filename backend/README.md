# Docmate Backend

The API server for Docmate, built with **Bun.js** and **Hono**.

## Tech Stack
-   **Runtime:** [Bun](https://bun.sh/)
-   **Framework:** [Hono](https://hono.dev/)
-   **ORM:** [Drizzle ORM](https://orm.drizzle.team/)
-   **Database:** PostgreSQL
-   **Validation:** Zod & Zod OpenAPI

## API Routes

| Route | Description |
|---|---|
| `/v1/auth` | Authentication (login, register, logout, session) |
| `/v1/docs` | Documentation CRUD, sidebar, pages, export/import |
| `/v1/users` | User management |
| `/v1/roles` | Role management |
| `/v1/permissions` | Permission definitions |
| `/v1/settings` | System settings (theming, branding) |
| `/v1/external-docs` | OpenAPI spec ingestion |
| `/swagger` | Interactive API documentation (Swagger UI) |

## Getting Started

### 1. Install Dependencies
```bash
bun install
```

### 2. Configure Environment
Copy `.env.example` to `.env` and fill in your values:
```bash
cp .env.example .env
```

Key variables:
-   `DATABASE_URL`: Your PostgreSQL connection string.
-   `AUTH_JWT_SECRET`: A strong secret for JWT signing.
-   `CORS_ORIGINS`: Comma-separated list of allowed origins.

### 3. Database Setup
```bash
# Push schema to database (development)
bun run drizzle:push

# Or generate and run migrations (production)
bun run drizzle:generate
bun run drizzle:migrate
```

### 4. Run Development Server
```bash
bun run dev
```
The server will be running at `http://localhost:8000`.
You can access the API documentation at `http://localhost:8000/docs`.

## Scripts
| Script | Description |
|---|---|
| `bun run dev` | Start dev server with hot reload |
| `bun run drizzle:push` | Push schema to database |
| `bun run drizzle:generate` | Generate migration files |
| `bun run drizzle:migrate` | Run pending migrations |
| `bun run drizzle:seed` | Seed initial data |
| `bun run test` | Run tests |
| `bun run test:security` | Run security-specific tests |
