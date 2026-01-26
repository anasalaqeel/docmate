import app from "./src/app";
import config from "config";

const server = Bun.serve({
  port: config.get("port"),
  fetch: app.fetch,
});

console.log(`Listening on http://localhost:${server.port} ...`);
