# docmate-ingest

Puts your project's markdown docs into [Docmate](../../README.md). Run one command, your docs show up in Docmate.

## What this does

1. You write `.md` files in a folder (like `docs/`).
2. You run this tool.
3. It reads those files and sends them to your Docmate site.

That's it. No copy-pasting, no manual uploading. It never touches git or clones anything — it just reads files on your computer and sends them over.

## Step 1: Get a token

1. Open Docmate in your browser.
2. Open the documentation project you want to sync to.
3. Turn on "Ingestion" in its settings.
4. Copy the token it gives you. You'll need it in Step 3.

## Step 2: Name your files so they show up in the right order

Put a number and a dash in front of each file/folder name. The number sets the order. The number is removed from the title you see in Docmate.

Example:

```
docs/
├── 1-getting-started/
│   ├── 1-installation.md
│   ├── 2-configuration.md
│   └── 3-quick-start.md
├── 2-usage.md
└── 3-api/
    ├── 1-authentication.md
    ├── 2-endpoints.md
    └── 3-errors.md
```

This shows up in Docmate's sidebar as:

- Getting Started
  - Installation
  - Configuration
  - Quick Start
- Usage
- Api
  - Authentication
  - Endpoints
  - Errors

Rules:
- Folders get numbered too, same as files.
- Numbers don't need to be back-to-back — `1, 2, 5, 10` is fine, and leaves room to insert files later without renumbering everything.
- No number? The file still works, it just has no guaranteed order.

## Step 3: Run the command

```bash
npx docmate-ingest --url https://your-docmate-site.com --token PASTE_YOUR_TOKEN_HERE --dir ./docs
```

Replace:
- `https://your-docmate-site.com` → your actual Docmate URL
- `PASTE_YOUR_TOKEN_HERE` → the token from Step 1
- `./docs` → the folder where your `.md` files live

Run this every time your docs change. It always **replaces everything** in Docmate with what's in your folder — always point it at your whole docs folder, never just the changed file.

## Do this automatically (GitHub Actions)

Add this to your workflow so it runs on every push:

```yaml
- name: Sync docs to Docmate
  run: npx docmate-ingest --dir ./docs
  env:
    DOCMATE_URL: ${{ secrets.DOCMATE_URL }}
    DOCMATE_TOKEN: ${{ secrets.DOCMATE_TOKEN }}
```

Set `DOCMATE_URL` and `DOCMATE_TOKEN` as secrets in your repo settings first.

## All the options

| Flag | Same as env var | Required? | What it does |
| --- | --- | --- | --- |
| `--url` | `DOCMATE_URL` | Yes | Your Docmate site's address |
| `--token` | `DOCMATE_TOKEN` | Yes | The token from Step 1 |
| `--dir` | — | Yes | Folder with your `.md` files |
| `--version` | — | No | Sets a version label for the docs |
| `--public` | — | No | Makes the docs public |

## Using it inside your own script

```js
const { ingest } = require("docmate-ingest");

await ingest({
  url: "https://your-docmate-site.com",
  token: process.env.DOCMATE_TOKEN,
  dir: "./docs",
});
```
