# Grud

A modern, self-hosted documentation platform built with **Bun.js** and **React 19**.

Grud is designed for teams who need a powerful, customizable, and efficient way to create and share
internal or public-facing documentation. It supports traditional guides, API documentation, or a mix
of both, all from a single, elegant interface.

---

## Features

### Documentation Management

- **Multi-Type Projects**: Create traditional guides, API references, or mixed documentation.
- **Hierarchical Sidebar**: Organize content into folders, pages, and dividers with drag-and-drop
  support.
- **OpenAPI Integration**: Import and display OpenAPI specs directly in your docs.
- **Public & Private**: Control visibility with a single toggle.
- **Versioning**: Tag documentation projects with versions.

### Dynamic Theming

- **Light & Dark Mode**: Full support with system preference detection.
- **Custom Colors**: Personalize primary, secondary, success, warning, and danger colors.
- **Gradients**: Enable or disable gradient effects globally.
- **Typography**: Customize heading, body, and code fonts.

### Admin & Security

- **Role-Based Access Control (RBAC)**: Manage users, roles, and granular permissions.
- **Session Management**: Automatic session cleanup and secure token handling.
- **Enterprise-Grade Security**: Input sanitization (XSS, SQLi), rate limiting, secure file uploads
  with checksum validation.

### API

- **Versioned REST API**: All endpoints are served under `/v1/`.
- **Auto-Generated OpenAPI Spec**: Access your API docs at `/v1/openapi.json`.
- **Swagger UI**: Interactive API documentation available at `/swagger`.

---

## Tech Stack

| Layer          | Technologies                                          |
| -------------- | ----------------------------------------------------- |
| **Frontend**   | React 19, Vite, Tailwind CSS 4, HeroUI, Framer Motion |
| **Backend**    | Bun.js, Hono, Drizzle ORM                             |
| **Database**   | PostgreSQL                                            |
| **Validation** | Zod                                                   |

---

## Getting Started

### Prerequisites

- [Bun](https://bun.sh/) (v1.0+)
- [PostgreSQL](https://www.postgresql.org/) (v14+)

### 1. Clone the Repository

```bash
git clone https://github.com/your-username/grud.git
cd grud
```

### 2. Setup Backend

```bash
cd backend
cp .env.example .env  # Configure your database URL and secrets
bun install
bun run drizzle:push  # Push the schema to your database
bun run dev
```

The API will be running at `http://localhost:8000`.

### 3. Setup Frontend

```bash
cd ../frontend
bun install
bun run dev
```

Open `http://localhost:5173` in your browser.

---

## Running with Docker (Recommended)

The easiest way to get Grud up and running is using Docker Compose.

### Prerequisites

- [Docker](https://docs.docker.com/get-docker/) with Docker Compose

### 1. Set up Environment Variables

Copy the example environment file and update the values:

```bash
cp .env.example .env
```

Edit `.env` and set at minimum:
- `POSTGRES_PASSWORD` — a strong database password
- `AUTH_JWT_SECRET` — a secure random string for JWT signing
- `SEED_ADMIN_EMAIL`, `SEED_ADMIN_USERNAME`, `SEED_ADMIN_PASSWORD` — initial admin credentials

### 2. Start the Containers

```bash
docker compose up -d
```

### 3. Access the Application

- **Frontend**: `http://localhost`
- **Backend API**: `http://localhost:8000/v1`
- **Swagger UI**: `http://localhost:8000/v1/docs`

> On the first run, the backend container automatically handles database schema synchronization.
> To seed an initial admin user, set `SEED_DATABASE=true` in your `.env`.

### Custom Ports

By default, the frontend runs on port 80 and the backend on port 8000. You can change these:

```bash
FRONTEND_PORT=3000 BACKEND_PORT=9000 docker compose up -d
```

### Custom API URL for Frontend

To use a different backend URL (e.g. for production):

```bash
docker compose build --build-arg VITE_API_BASE_URL=https://api.yourdomain.com/v1
```

---

## Project Structure

```
grud/
├── backend/             # Bun.js + Hono API
│   ├── src/
│   │   ├── routes/      # API endpoints
│   │   ├── db/          # Drizzle schema & migrations
│   │   ├── services/    # Business logic
│   │   └── middlewares/ # Auth, logging, security
│   └── config/          # Environment-based configuration
│
├── frontend/            # React 19 + Vite app
│   └── src/
│       ├── components/  # UI components
│       ├── pages/       # Route pages (admin, public)
│       ├── contexts/    # Auth, Theme, Layout
│       └── services/    # API clients
│
└── .github/             # Issue & PR templates
```

---

## Contributing

Contributions are welcome! Please see [CONTRIBUTING.md](./CONTRIBUTING.md) for guidelines.

---

## Configuration Variables

| Variable          | Description              | Default  |
| ----------------- | ------------------------ | -------- |
| `POSTGRES_USER`   | Database user            | `postgres` |
| `POSTGRES_PASSWORD` | Database password      | `password` |
| `POSTGRES_DB`     | Database name            | `grud`   |
| `AUTH_JWT_SECRET` | JWT signing secret       | —        |
| `SEED_DATABASE`   | Seed DB on startup       | `false`  |
| `FRONTEND_PORT`   | Host port for frontend   | `80`     |
| `BACKEND_PORT`    | Host port for backend    | `8000`   |
| `VITE_API_BASE_URL` | Backend URL for frontend build | `http://localhost:8000/v1` |

---

## External Ingestion API

External applications can push OpenAPI specifications directly into a documentation project using the ingestion endpoint — no admin login required.

### Setup

1. Open a documentation project in the admin panel.
2. Enable **Ingestion** and copy the generated **Ingestion Token**.

### Endpoint

```
POST /v1/external-docs/ingest
```

### Authentication

Include the ingestion token as a Bearer token:

```
Authorization: Bearer <ingestion-token>
```

### Request Body

| Field         | Type     | Required | Description                        |
| ------------- | -------- | -------- | ---------------------------------- |
| `spec`        | `object` | Yes      | A valid OpenAPI 3.x specification |
| `version`     | `string` | No       | Override the documentation version |
| `isPublic`    | `boolean`| No       | Override the public visibility     |
| `serviceName` | `string` | No       | Service name identifier            |

### Example

```bash
curl -X POST http://localhost:8000/v1/external-docs/ingest \
  -H "Authorization: Bearer your-ingestion-token" \
  -H "Content-Type: application/json" \
  -d '{
    "version": "2.1.0",
    "isPublic": true,
    "spec": {
      "openapi": "3.1.0",
      "info": { "title": "My API", "version": "2.1.0" },
      "paths": {}
    }
  }'
```

### Responses

| Status | Description                                      |
| ------ | ------------------------------------------------ |
| `200`  | Documentation updated successfully                |
| `400`  | Missing or invalid `spec` field                  |
| `401`  | Missing or invalid ingestion token               |
| `403`  | Ingestion is disabled for this documentation     |
| `500`  | Internal server error                            |

---

## Publishing to Docker Hub

When you're ready to publish images:

```bash
# Build and tag
docker compose build
docker tag grud-backend anasalaqeel/grud-backend:latest
docker tag grud-frontend anasalaqeel/grud-frontend:latest

# Push
docker login
docker push anasalaqeel/grud-backend:latest
docker push anasalaqeel/grud-frontend:latest
```

---

## Remote Deployment (via SSH)

Deploy Grud to any server with Docker installed:

```bash
SERVER_IP=your_server_ip ./scripts/deploy.sh
```

Optional variables:

```bash
SERVER_USER=root \
DEPLOY_PATH=/opt/grud \
FRONTEND_PORT=80 \
BACKEND_PORT=8000 \
SERVER_IP=1.2.3.4 ./scripts/deploy.sh
```

---

## License

Distributed under the MIT License. See [LICENSE](./LICENSE) for details.
