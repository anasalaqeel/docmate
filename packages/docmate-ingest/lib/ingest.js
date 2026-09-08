"use strict";

const fs = require("fs");
const path = require("path");

function toPosixPath(p) {
  return p.split(path.sep).join("/");
}

/**
 * Recursively collects every `.md` file under `dir`, skipping dotfiles/dotdirs.
 * Returns [{ path, content }] with POSIX-style paths relative to `dir`.
 */
function collectMarkdownFiles(dir, baseDir) {
  baseDir = baseDir || dir;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  let files = [];

  for (const entry of entries) {
    if (entry.name.startsWith(".")) continue;

    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      files = files.concat(collectMarkdownFiles(fullPath, baseDir));
    } else if (entry.isFile() && entry.name.endsWith(".md")) {
      const relativePath = toPosixPath(path.relative(baseDir, fullPath));
      const content = fs.readFileSync(fullPath, "utf8");
      files.push({ path: relativePath, content });
    }
  }

  return files;
}

/**
 * Reads every markdown file under `dir` and POSTs them to a Docmate
 * documentation project's ingestion endpoint.
 *
 * @param {object} options
 * @param {string} options.url - Docmate base URL, e.g. "https://docs.example.com"
 * @param {string} options.token - Ingestion token from the documentation's admin panel
 * @param {string} options.dir - Path to the docs folder to sync
 * @param {string} [options.version] - Target a specific version: a new label
 *   cuts a new version snapshot, an existing label re-cuts it. Omit to sync
 *   the pushed content to the live draft and to the stable version (when one
 *   exists), so corrections reach readers.
 * @param {boolean} [options.isDefault] - Mark the published version as the
 *   stable version readers get (use with version to release a new version)
 * @param {string} [options.changelog] - Short note stored with the version
 * @param {boolean} [options.isPublic] - Override the public visibility
 * @param {typeof fetch} [options.fetchImpl] - Injectable fetch, for testing
 */
async function ingest(options) {
  const { url, token, dir, version, isDefault, changelog, isPublic } = options;
  const fetchImpl = options.fetchImpl || fetch;

  if (!url) throw new Error("Missing required option: url");
  if (!token) throw new Error("Missing required option: token");
  if (!dir) throw new Error("Missing required option: dir");

  const files = collectMarkdownFiles(dir);

  if (files.length === 0) {
    throw new Error(`No markdown files found under ${dir}`);
  }

  const body = { files };
  if (version !== undefined) body.version = version;
  if (isDefault !== undefined) body.isDefault = isDefault;
  if (changelog !== undefined) body.changelog = changelog;
  if (isPublic !== undefined) body.isPublic = isPublic;

  const endpoint = `${url.replace(/\/$/, "")}/v1/external-docs/ingest-markdown`;

  const res = await fetchImpl(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  });

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.error || `Ingestion failed with status ${res.status}`);
  }

  return data;
}

module.exports = { collectMarkdownFiles, ingest };
