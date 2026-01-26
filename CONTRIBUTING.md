# Contributing to Grud

Thank you for considering contributing to Grud! We welcome contributions of all kinds.

## Code of Conduct

By participating in this project, you agree to abide by the [Code of Conduct](./CODE_OF_CONDUCT.md).

## How to Contribute

### Reporting Bugs
-   Search [existing issues](https://github.com/your-username/grud/issues) first.
-   If none exist, open a new issue with a clear description, steps to reproduce, and expected behavior.

### Suggesting Features
-   Open a new issue and describe the feature, its use case, and potential implementation.

### Pull Requests
1.  Fork the repo and create a branch from `main`.
2.  Make your changes.
3.  Ensure tests pass and linting is clean.
4.  Submit your pull request.

## Development Workflow

### Tech Stack
-   **Frontend:** React 19, Vite, Tailwind CSS, HeroUI.
-   **Backend:** Bun.js, Hono, Drizzle ORM, PostgreSQL.

### Backend Scripts
```bash
bun run dev              # Start dev server
bun run drizzle:push     # Push schema to database
bun run test             # Run tests
```

### Frontend Scripts
```bash
bun run dev              # Start Vite dev server
bun run build            # Build for production
bun run lint             # Run ESLint
```

## Coding Standards
-   Use Prettier for formatting.
-   Follow ESLint rules.
-   Use [Conventional Commits](https://www.conventionalcommits.org/) for commit messages.
