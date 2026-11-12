# Docmate

A modern, self-hosted documentation platform built with **Bun.js** and **React 19**.

Docmate is designed for teams who need a powerful, customizable, and efficient way to create and share
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

### AI Assistant (Ask AI)

- **Ask AI chat on every documentation page**: Readers get a floating "Ask AI" button that opens a
  streaming chat about the content they are reading.
- **Document-aware answers**: The AI receives the current page plus the documentation outline, and
  can look up any other page of that documentation on its own when a question needs it.
- **Multi-provider**: Works with OpenAI (or any OpenAI-compatible endpoint such as Azure OpenAI,
  OpenRouter, Ollama or LM Studio), Anthropic Claude, and Google Gemini.
- **Safe by default**: Access control is enforced server-side (public docs for visitors,
  `docs:read` for private ones), requests are rate-limited per IP, and answers render through the
  same sanitized markdown pipeline as documentation content.

#### Enabling Ask AI

1. Open **Admin → Settings → AI Assistant**.
2. Toggle **Enable the Ask AI assistant**, pick a provider, set a model (leave empty for the
   provider default), and paste your API key if the provider requires one (not needed for local
   endpoints like Ollama).
3. Save. The "Ask AI" button appears on documentation pages immediately.

Keep the API key out of the database by setting `AI_API_KEY` instead — the environment variable
takes precedence over the admin settings value.

For the `openai` provider, any OpenAI-compatible **Chat Completions** endpoint works via the
*API Base URL* setting. Enter the server URL; the conventional `/v1` API path is appended
automatically when missing (URLs that already end in `/v1` are used as-is):

| Endpoint    | Base URL                        | Notes                                              |
| ----------- | ------------------------------- | -------------------------------------------------- |
| OpenAI      | *(leave empty)*                 | Defaults to `https://api.openai.com/v1`             |
| Ollama      | `http://localhost:11434`        | Local models, no API key, data never leaves the host |
| OpenRouter  | `https://openrouter.ai/api/v1`  | Many hosted models behind one key                   |
| LM Studio   | `http://localhost:1234`         | Local models                                        |

Use **Test connection** (Settings → AI Assistant) after saving: it probes the endpoint and tells
you whether the configured model is actually available there.

> Pick a model that supports **tool calling** — that is what allows the assistant to read other
> pages of the documentation when answering. Models without tool support still answer from the
> current page.

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
git clone https://github.com/your-username/docmate.git
cd docmate
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

## Quick Start with Docker

Docmate runs as three containers (frontend, backend, PostgreSQL). Choose how you want to get it.

**Requirement:** [Docker](https://docs.docker.com/get-docker/) with Docker Compose.

### Option 1: Clone and build

```bash
git clone https://github.com/anasalaqeel/docmate.git
cd docmate
cp .env.example .env    # then edit .env (see Configuration below)
docker compose up -d
```

### Option 2: Use the Docker Hub images

No source code needed. Prebuilt images are published as
[`anasalaqeel/docmate-backend`](https://hub.docker.com/r/anasalaqeel/docmate-backend) and
[`anasalaqeel/docmate-frontend`](https://hub.docker.com/r/anasalaqeel/docmate-frontend).

1. Download the example environment file and edit it (see Configuration below):

   ```bash
   curl -o .env https://raw.githubusercontent.com/anasalaqeel/docmate/main/.env.example
   ```

2. Save this as `docker-compose.yml` in the same folder:

   ```yaml
   services:
     database:
       image: postgres:18-alpine
       restart: unless-stopped
       environment:
         POSTGRES_USER: ${POSTGRES_USER:-postgres}
         POSTGRES_PASSWORD: ${POSTGRES_PASSWORD:?set POSTGRES_PASSWORD in .env}
         POSTGRES_DB: ${POSTGRES_DB:-docmate}
       volumes:
         - docmate-db-data:/var/lib/postgresql/data
       healthcheck:
         test: ["CMD-SHELL", "pg_isready -U ${POSTGRES_USER:-postgres}"]
         interval: 5s
         timeout: 5s
         retries: 5

     backend:
       image: anasalaqeel/docmate-backend:latest
       restart: unless-stopped
       env_file: .env
       environment:
         - PORT=8000
         - DATABASE_URL=postgres://${POSTGRES_USER:-postgres}:${POSTGRES_PASSWORD}@database:5432/${POSTGRES_DB:-docmate}
         - NODE_ENV=production
       depends_on:
         database:
           condition: service_healthy

     frontend:
       image: anasalaqeel/docmate-frontend:latest
       restart: unless-stopped
       ports:
         - "${FRONTEND_PORT:-80}:80"
       depends_on:
         - backend

   volumes:
     docmate-db-data:
   ```

3. Start it:

   ```bash
   docker compose up -d
   ```

### Configuration

Set at least these values in `.env`:

| Variable | Description |
| -------- | ----------- |
| `POSTGRES_PASSWORD` | A strong database password |
| `AUTH_JWT_SECRET` | A random secret used to sign JWTs |
| `CORS_ORIGINS` | The URL you open the app at (default `http://localhost:3000`) |
| `SEED_ADMIN_EMAIL`, `SEED_ADMIN_USERNAME`, `SEED_ADMIN_PASSWORD` | Initial admin account |

The full list of variables is in [Configuration Variables](#configuration-variables).

### Open the app

- **App:** `http://localhost:3000` (the `FRONTEND_PORT` set in `.env`)
- **API:** `http://localhost:3000/v1`

The database schema is synchronized automatically on first start. The admin account is created when `SEED_DATABASE=true` is set in `.env`.

To use a different backend URL when building from source:

```bash
docker compose build --build-arg VITE_API_BASE_URL=https://api.yourdomain.com/v1
```

---

## Project Structure

```
docmate/
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
| `POSTGRES_DB`     | Database name            | `docmate`   |
| `AUTH_JWT_SECRET` | JWT signing secret       | —        |
| `AI_API_KEY`      | AI provider API key (overrides the admin settings value) | — |
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

## External Markdown Ingestion

Sync a project's own `docs` folder into a Docmate documentation project from CI, a git hook, or any script — Docmate never clones your repository; your script reads the files and posts their contents.

### Quick start: `docmate-ingest`

The easiest way to use this is the [`docmate-ingest`](./packages/docmate-ingest/README.md) npm package, which handles walking your docs folder and building the request for you:

```bash
npx docmate-ingest --url https://docs.example.com --token <ingestion-token> --dir ./docs
```

The rest of this section documents the underlying HTTP contract directly, for other languages/tooling.

### Setup

Same as OpenAPI ingestion above: open the documentation project, enable **Ingestion**, and copy the **Ingestion Token**.

### Endpoint

```
POST /v1/external-docs/ingest-markdown
```

### Authentication

```
Authorization: Bearer <ingestion-token>
```

### Request Body

| Field         | Type                                  | Required | Description                                   |
| ------------- | -------------------------------------- | -------- | ---------------------------------------------- |
| `files`       | `{ path: string; content: string }[]` | Yes      | Every markdown file, with its path relative to your docs folder |
| `version`     | `string`                              | No       | Override the documentation version             |
| `isPublic`    | `boolean`                             | No       | Override the public visibility                 |

Each ingest **replaces** the project's existing pages and folders with the files sent in that request — send your full docs folder every time, not just the files that changed.

File names may carry a `N-` ordering prefix, same as [the ZIP import format](./docs/IMPORT_GUIDE.md) — e.g. `1-getting-started.md`, `2-api/1-authentication.md` — to control sidebar order; the prefix is stripped from the displayed title.

### Example

Given a repo with:

```text
docs/
├── 1-getting-started.md
└── 2-api/
    └── 1-authentication.md
```

a CI step could POST:

```bash
curl -X POST http://localhost:8000/v1/external-docs/ingest-markdown \
  -H "Authorization: Bearer your-ingestion-token" \
  -H "Content-Type: application/json" \
  -d '{
    "version": "1.4.0",
    "files": [
      { "path": "1-getting-started.md", "content": "# Getting Started\n\n..." },
      { "path": "2-api/1-authentication.md", "content": "# Authentication\n\n..." }
    ]
  }'
```

### Responses

| Status | Description                                      |
| ------ | ------------------------------------------------ |
| `200`  | Documentation updated successfully                |
| `400`  | Missing/empty `files`, or no markdown files found |
| `401`  | Missing or invalid ingestion token               |
| `403`  | Ingestion is disabled for this documentation     |
| `500`  | Internal server error                            |

---

## Remote Deployment (via SSH)

Deploy Docmate to any server with Docker installed:

```bash
SERVER_IP=your_server_ip ./scripts/deploy.sh
```

Optional variables:

```bash
SERVER_USER=root \
DEPLOY_PATH=/opt/docmate \
FRONTEND_PORT=80 \
BACKEND_PORT=8000 \
SERVER_IP=1.2.3.4 ./scripts/deploy.sh
```

---

## License

Distributed under the MIT License. See [LICENSE](./LICENSE) for details.
