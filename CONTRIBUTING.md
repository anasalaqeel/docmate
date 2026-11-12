# Contributing to Docmate

Thank you for considering contributing to Docmate! We welcome contributions of all kinds.

## Code of Conduct

By participating in this project, you agree to abide by the [Code of Conduct](./CODE_OF_CONDUCT.md).

## How to Contribute

### Reporting Bugs
-   Search [existing issues](https://github.com/your-username/docmate/issues) first.
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

### Root Workspace Scripts
```bash
bun run dev              # Run both frontend & backend concurrently
bun run test             # Run backend test suite
bun run lint             # Run frontend ESLint checks
bun run build            # Build frontend production bundle
```

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

## Continuous Integration & Releases

- **CI Pipeline (`.github/workflows/ci.yml`)**: Automatically triggers on every push and pull request to `main`. It verifies:
  1. Frontend ESLint checks & TypeScript production build.
  2. Backend automated test suite with a live PostgreSQL service container.
  3. Backend and Frontend Docker image build sanity.
- **Releases (`.github/workflows/release.yml`)**:
  - Automatically runs quality checks, creates a GitHub Release with auto-generated release notes/changelog, and builds & pushes Docker images to Docker Hub (`anasalaqeel/docmate-*`) and GitHub Container Registry (`ghcr.io`). Publishing to Docker Hub requires the `DOCKERHUB_USERNAME` and `DOCKERHUB_TOKEN` repository secrets.
  - Can be triggered by pushing a version tag (e.g., `git tag v1.0.0 && git push origin v1.0.0`) or manually via the GitHub Actions **Run workflow** button (specifying the version).

## Coding Standards
-   Use Prettier for formatting.
-   Follow ESLint rules.
-   Use [Conventional Commits](https://www.conventionalcommits.org/) for commit messages.
