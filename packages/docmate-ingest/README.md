# docmate-ingest

Sync a project's markdown docs folder into a [Docmate](../../README.md) documentation project — designed to run from CI on every push.

Docmate never clones your repository; this tool reads your local files and POSTs their contents to your Docmate instance.

## Usage

```bash
npx docmate-ingest --url https://docs.example.com --token <ingestion-token> --dir ./docs
```

Or via environment variables:

```bash
DOCMATE_URL=https://docs.example.com DOCMATE_TOKEN=<ingestion-token> npx docmate-ingest --dir ./docs
```

### Options

| Flag         | Env var         | Required | Description                                 |
| ------------ | --------------- | -------- | -------------------------------------------- |
| `--url`      | `DOCMATE_URL`   | Yes      | Base URL of your Docmate instance             |
| `--token`    | `DOCMATE_TOKEN` | Yes      | Ingestion token from the doc's admin panel    |
| `--dir`      | —               | Yes      | Path to the docs folder to sync               |
| `--version`  | —               | No       | Override the documentation version            |
| `--public`   | —               | No       | Mark the documentation public                 |

### Ordering pages

Prefix any file or folder with `N-` to control sidebar order, e.g. `1-getting-started.md`, `2-api/1-authentication.md`. See the main [Import Guide](../../docs/IMPORT_GUIDE.md#controlling-sidebar-order).

### GitHub Actions example

```yaml
- name: Sync docs to Docmate
  run: npx docmate-ingest --dir ./docs
  env:
    DOCMATE_URL: ${{ secrets.DOCMATE_URL }}
    DOCMATE_TOKEN: ${{ secrets.DOCMATE_TOKEN }}
```

## Library usage

```js
const { ingest } = require("docmate-ingest");

await ingest({
  url: "https://docs.example.com",
  token: process.env.DOCMATE_TOKEN,
  dir: "./docs",
});
```
