# Grud

A modern, self-hosted documentation platform built with **Bun.js** and **React 19**.

Grud is designed for teams who need a powerful, customizable, and efficient way to create and share internal or public-facing documentation. It supports traditional guides, API documentation, or a mix of both, all from a single, elegant interface.

---

## ✨ Features

### 📝 Documentation Management
-   **Multi-Type Projects**: Create traditional guides, API references, or mixed documentation.
-   **Hierarchical Sidebar**: Organize content into folders, pages, and dividers with drag-and-drop support.
-   **OpenAPI Integration**: Import and display OpenAPI specs directly in your docs.
-   **Public & Private**: Control visibility with a single toggle.
-   **Versioning**: Tag documentation projects with versions.

### 🎨 Dynamic Theming
-   **Light & Dark Mode**: Full support with system preference detection.
-   **Custom Colors**: Personalize primary, secondary, success, warning, and danger colors.
-   **Gradients**: Enable or disable gradient effects globally.
-   **Typography**: Customize heading, body, and code fonts.

### 🔐 Admin & Security
-   **Role-Based Access Control (RBAC)**: Manage users, roles, and granular permissions.
-   **Session Management**: Automatic session cleanup and secure token handling.
-   **Enterprise-Grade Security**: Input sanitization (XSS, SQLi), rate limiting, secure file uploads with checksum validation.

### 🔌 API
-   **Versioned REST API**: All endpoints are served under `/v1/`.
-   **Auto-Generated OpenAPI Spec**: Access your API docs at `/v1/openapi.json`.
-   **Swagger UI**: Interactive API documentation available at `/swagger`.

---

## 🛠️ Tech Stack

| Layer | Technologies |
|---|---|
| **Frontend** | React 19, Vite, Tailwind CSS 4, HeroUI, Framer Motion |
| **Backend** | Bun.js, Hono, Drizzle ORM |
| **Database** | PostgreSQL |
| **Validation** | Zod |

---

## 🚀 Getting Started

### Prerequisites
-   [Bun](https://bun.sh/) (v1.0+)
-   [PostgreSQL](https://www.postgresql.org/) (v14+)

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

## 🐳 Running with Docker (Recommended)

The easiest way to get Grud up and running is using Docker Compose.

### 1. Set up Environment Variables
Copy the example environment file and fill in your secrets:
```bash
cp .env.docker.example .env.docker
```
> [!IMPORTANT]
> Make sure to set `SEED_ADMIN_USER` and `SEED_ADMIN_PASSWORD` in your `.env.docker` file. These are required for the initial admin account creation on first startup.

### 2. Start the Containers
```bash
docker compose up -d
```

### 3. Access the Application
- **Frontend**: `http://localhost:5173`
- **Backend API**: `http://localhost:8000/v1`
- **Swagger UI**: `http://localhost:8000/v1/docs`

> [!NOTE]
> On the first run, the Docker container automatically handles database schema synchronization and initial seeding.

### Build Arguments
To use a custom API URL for the frontend build:
```bash
docker compose build --build-arg VITE_API_BASE_URL=https://api.yourdomain.com/v1
```

---

## 📂 Project Structure

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

## 🤝 Contributing

Contributions are welcome! Please see [CONTRIBUTING.md](./CONTRIBUTING.md) for guidelines.

---

## 📜 License

Distributed under the MIT License. See [LICENSE](./LICENSE) for details.
