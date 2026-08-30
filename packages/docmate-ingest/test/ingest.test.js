"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const os = require("os");
const path = require("path");
const { collectMarkdownFiles, ingest } = require("../lib/ingest");

function makeTempDocsDir() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "docmate-ingest-test-"));
  fs.writeFileSync(path.join(dir, "1-intro.md"), "# Intro");
  fs.mkdirSync(path.join(dir, "2-api"));
  fs.writeFileSync(path.join(dir, "2-api", "1-auth.md"), "# Auth");
  fs.writeFileSync(path.join(dir, "notes.txt"), "ignore me");
  fs.mkdirSync(path.join(dir, ".hidden"));
  fs.writeFileSync(path.join(dir, ".hidden", "secret.md"), "# skip me");
  return dir;
}

test("collectMarkdownFiles finds nested markdown files with posix paths, skipping non-md and dotfiles", () => {
  const dir = makeTempDocsDir();
  const files = collectMarkdownFiles(dir).sort((a, b) => a.path.localeCompare(b.path));

  assert.deepEqual(
    files.map((f) => f.path),
    ["1-intro.md", "2-api/1-auth.md"]
  );
  assert.equal(files[0].content, "# Intro");

  fs.rmSync(dir, { recursive: true, force: true });
});

test("ingest posts collected files as JSON with a bearer token", async () => {
  const dir = makeTempDocsDir();
  let capturedUrl;
  let capturedInit;

  const fakeFetch = async (url, init) => {
    capturedUrl = url;
    capturedInit = init;
    return {
      ok: true,
      status: 200,
      json: async () => ({ success: true, docId: 42, createdItems: 2 }),
    };
  };

  const result = await ingest({
    url: "https://docs.example.com/",
    token: "abc123",
    dir,
    version: "1.2.0",
    fetchImpl: fakeFetch,
  });

  assert.equal(capturedUrl, "https://docs.example.com/v1/external-docs/ingest-markdown");
  assert.equal(capturedInit.headers.Authorization, "Bearer abc123");

  const body = JSON.parse(capturedInit.body);
  assert.equal(body.version, "1.2.0");
  assert.equal(body.files.length, 2);

  assert.deepEqual(result, { success: true, docId: 42, createdItems: 2 });

  fs.rmSync(dir, { recursive: true, force: true });
});

test("ingest throws with the server's error message on a failed response", async () => {
  const dir = makeTempDocsDir();
  const fakeFetch = async () => ({
    ok: false,
    status: 401,
    json: async () => ({ error: "Unauthorized: Invalid token" }),
  });

  await assert.rejects(
    () => ingest({ url: "https://docs.example.com", token: "bad", dir, fetchImpl: fakeFetch }),
    /Unauthorized: Invalid token/
  );

  fs.rmSync(dir, { recursive: true, force: true });
});

test("ingest throws when the docs directory has no markdown files", async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "docmate-ingest-empty-"));

  await assert.rejects(
    () => ingest({ url: "https://docs.example.com", token: "abc", dir, fetchImpl: async () => ({}) }),
    /No markdown files found/
  );

  fs.rmSync(dir, { recursive: true, force: true });
});
