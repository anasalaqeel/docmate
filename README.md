# 🚀 Grud

**Grud** is a powerful, self-hosted documentation management system designed for teams who need a sleek, customizable, and efficient way to create and share internal or public-facing guides.

Built with a modern tech stack (React 19, Hono, Drizzle), Grud offers a premium user experience with dynamic theming, role-based access control (RBAC), and a robust documentation editor.

---

## ✨ Key Features

-   **📝 Rich Document Editor:** Create beautiful documentation with support for markdown, images, and live previews.
-   **🎨 Dynamic Theming:** Fully customizable UI with support for gradients, dark mode, and brand color alignment.
-   **🔐 Role-Based Access Control (RBAC):** Manage users, roles, and permissions to control who can view, edit, or manage content.
-   **📊 Admin Dashboard:** Comprehensive overview of documentation status, user activity, and system settings.
-   **🔌 Ingestion Support:** Optionally ingest documentation from external sources into a structured format.
-   **📜 Versioning & Groups:** Organize documents into groups and manage different versions of your guides.
-   **🌓 Dark Mode:** Sleek, premium dark mode out of the box.

---

## 🛠️ Tech Stack

### Frontend
-   **Framework:** [React 19](https://react.dev/)
-   **Build Tool:** [Vite](https://vitejs.dev/)
-   **Styling:** [Tailwind CSS](https://tailwindcss.com/) & [HeroUI](https://heroui.com/)
-   **Animations:** [Framer Motion](https://www.framer.com/motion/)
-   **State/Data:** Axios & Zod

### Backend
-   **Runtime:** [Bun](https://bun.sh/)
-   **Framework:** [Hono](https://hono.dev/)
-   **ORM:** [Drizzle ORM](https://orm.drizzle.team/)
-   **Database:** PostgreSQL
-   **Validation:** Zod

---

## 🚀 Getting Started

### Prerequisites
-   [Bun](https://bun.sh/) installed locally.
-   A running [PostgreSQL](https://www.postgresql.org/) instance.

### Installation

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/your-username/grud.git
    cd grud
    ```

2.  **Setup Backend:**
    ```bash
    cd backend
    cp .env.example .env # Update your database credentials
    bun install
    bun run drizzle:push # Push schema to database
    bun run dev
    ```

3.  **Setup Frontend:**
    ```bash
    cd ../frontend
    bun install
    bun run dev
    ```

Open [http://localhost:5173](http://localhost:5173) in your browser to see the app!

---

## 📂 Project Structure

```text
grud/
├── backend/          # Hono + Drizzle backend
│   ├── src/          # Source code
│   └── drizzle/      # Migrations & schema
├── frontend/         # React + Vite frontend
│   ├── src/          # Source code
│   │   ├── components/
│   │   ├── pages/
│   │   └── contexts/
│   └── public/       # Static assets
└── .github/          # Issue & PR templates
```

---

## 🤝 Contributing

Contributions are what make the open-source community such an amazing place to learn, inspire, and create. Any contributions you make are **greatly appreciated**.

Please see [CONTRIBUTING.md](./CONTRIBUTING.md) for details on our code of conduct and the process for submitting pull requests.

---

## 🛡️ License

Distributed under the MIT License. See [LICENSE](./LICENSE) for more information.

---

## 🌟 Acknowledgments

-   [HeroUI](https://heroui.com/) for the stunning UI components.
-   [Hono](https://hono.dev/) for the blazing fast backend framework.
-   [Vite](https://vitejs.dev/) for the amazing developer experience.
