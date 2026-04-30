import { describe, test, expect } from "bun:test";
import app from "../app";

describe("Proxy API", () => {
  test("should proxy a GET request correctly", async () => {
    // We'll use a known public API for testing
    const targetUrl = "https://jsonplaceholder.typicode.com/todos/1";
    
    const res = await app.request("/v1/proxy", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        url: targetUrl,
        method: "GET",
      }),
    });

    expect(res.status).toBe(200);
    
    const body = await res.json();
    expect(body.status).toBe(200);
    expect(body.data).toBeDefined();
    expect(body.data.id).toBe(1);
    expect(body.data.userId).toBe(1);
  });

  test("should handle invalid URLs", async () => {
    const res = await app.request("/v1/proxy", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        url: "not-a-url",
        method: "GET",
      }),
    });

    // Zod validation should fail
    expect(res.status).toBe(400);
  });

  test("should handle request failures from target server", async () => {
    const res = await app.request("/v1/proxy", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        url: "https://jsonplaceholder.typicode.com/non-existent-page-12345",
        method: "GET",
      }),
    });

    expect(res.status).toBe(200); // Proxy itself succeeded
    const body = await res.json();
    expect(body.status).toBe(404); // Target returned 404
  });

  test("should proxy headers correctly", async () => {
    const res = await app.request("/v1/proxy", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        url: "https://httpbin.org/headers",
        method: "GET",
        headers: {
          "X-Test-Header": "Hello-Proxy",
        },
      }),
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.headers["X-Test-Header"]).toBe("Hello-Proxy");
  });
});
