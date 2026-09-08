# docmate-ingest

Puts your project's markdown docs into [Docmate](https://github.com/anasalaqeel/docmate). Run one command, your docs show up in Docmate.

## What this does

1. You write `.md` files in a folder (like `docs/`).
2. You run this tool.
3. It reads those files and sends them to your Docmate site.

That's it. No copy-pasting, no manual uploading. It never touches git or clones anything — it just reads files on your computer and sends them over.

## Step 1: Get a token

Tokens are created in the **admin panel** (where you manage docs), not the public docs site (where readers browse them).

1. Log in to Docmate and open the **admin panel**.
2. Open the documentation project you want to sync to, and click **Edit**.
3. Find the **External API Ingestion** section and turn on **Enable Ingestion**.
4. Click **Generate** to create a token, then copy it. You'll need it in Step 3.

While ingestion is enabled, the project's content is **read-only in the admin panel** — your repo's docs folder is the source of truth, so manual edits can't conflict with syncs. Version management (cutting versions, setting the stable one) stays available in the panel, and you can turn ingestion off any time to edit content by hand.

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

## Versioning (CI releases)

By default a push syncs **both** the live draft **and** the stable version readers see — so typo fixes and corrections go out immediately when you run it.

**1. Sync (corrections to the current version)** — no version flags:

```bash
npx docmate-ingest --dir ./docs
```

If a stable version exists (say 2.1.0), its snapshot is re-cut from the pushed content; readers get the fixes right away.

**2. New release** — cut a new version and make it the stable one readers get:

```bash
npx docmate-ingest --dir ./docs --version 2.2.0 --default --changelog "New endpoints"
```

**3. Fix a specific version** — push with that version's label; only that snapshot is re-cut:

```bash
npx docmate-ingest --dir ./docs --version 2.1.0 --changelog "Fixed typos"
```

Readers pick versions from the dropdown on your docs site; the stable version is what opens by default.

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
| `--version` | — | No | Target a specific version (new label = new version, existing = re-cut); omit to sync the stable version readers see |
| `--default` | — | No | Make the published version the stable one readers get |
| `--changelog` | — | No | Short note stored with the published version |
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
