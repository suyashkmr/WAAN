import { afterEach, describe, expect, it } from "vitest";
import http from "node:http";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { detectExistingBackend, detectExistingClient, normalizeHtmlForSourceReuse } = require("../electron/backendHealth.cjs");

function listen(server) {
  return new Promise(resolve => {
    server.listen(0, "127.0.0.1", () => {
      resolve(server.address());
    });
  });
}

function close(server) {
  return new Promise(resolve => {
    server.close(() => resolve());
  });
}

describe("backend health detection", () => {
  /** @type {http.Server[]} */
  let servers = [];

  afterEach(async () => {
    await Promise.all(servers.map(close));
    servers = [];
  });

  it("recognizes an already running WAAN backend", async () => {
    const apiServer = http.createServer((_req, res) => {
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify({ ok: true, version: "1.1.0", buildFingerprint: "build-a" }));
    });
    const relayServer = http.createServer((_req, res) => {
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify({ status: "running", version: "1.1.0", buildFingerprint: "build-a", chatCount: 4, syncingChats: false }));
    });
    servers.push(apiServer, relayServer);
    const apiAddress = await listen(apiServer);
    const relayAddress = await listen(relayServer);

    const result = await detectExistingBackend({
      apiBase: `http://127.0.0.1:${apiAddress.port}`,
      relayBase: `http://127.0.0.1:${relayAddress.port}`,
      expectedVersion: "1.1.0",
      expectedBuildFingerprint: "build-a",
    });

    expect(result.ok).toBe(true);
    expect(result.apiHealthy).toBe(true);
    expect(result.relayHealthy).toBe(true);
    expect(result.apiHealth).toEqual({ ok: true, version: "1.1.0", buildFingerprint: "build-a" });
    expect(result.relayStatus).toEqual({ status: "running", version: "1.1.0", buildFingerprint: "build-a", chatCount: 4, syncingChats: false });
  });

  it("rejects reusable-looking backends when the health version does not match", async () => {
    const apiServer = http.createServer((_req, res) => {
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify({ ok: true, version: "0.9.0" }));
    });
    const relayServer = http.createServer((_req, res) => {
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify({ status: "running", version: "0.9.0", chatCount: 2, syncingChats: false }));
    });
    servers.push(apiServer, relayServer);
    const apiAddress = await listen(apiServer);
    const relayAddress = await listen(relayServer);

    const result = await detectExistingBackend({
      apiBase: `http://127.0.0.1:${apiAddress.port}`,
      relayBase: `http://127.0.0.1:${relayAddress.port}`,
      expectedVersion: "1.1.0",
    });

    expect(result.ok).toBe(false);
    expect(result.apiHealthy).toBe(true);
    expect(result.relayHealthy).toBe(true);
    expect(result.apiHealth).toEqual({ ok: true, version: "0.9.0" });
  });

  it("rejects reuse when the relay version does not match the current build", async () => {
    const apiServer = http.createServer((_req, res) => {
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify({ ok: true, version: "1.1.0" }));
    });
    const relayServer = http.createServer((_req, res) => {
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify({ status: "running", version: "0.9.0", chatCount: 2, syncingChats: false }));
    });
    servers.push(apiServer, relayServer);
    const apiAddress = await listen(apiServer);
    const relayAddress = await listen(relayServer);

    const result = await detectExistingBackend({
      apiBase: `http://127.0.0.1:${apiAddress.port}`,
      relayBase: `http://127.0.0.1:${relayAddress.port}`,
      expectedVersion: "1.1.0",
    });

    expect(result.ok).toBe(false);
    expect(result.apiHealthy).toBe(true);
    expect(result.relayHealthy).toBe(true);
    expect(result.apiVersionMatched).toBe(true);
    expect(result.relayVersionMatched).toBe(false);
    expect(result.versionMatched).toBe(false);
  });

  it("rejects reuse when the backend build fingerprint does not match the current build", async () => {
    const apiServer = http.createServer((_req, res) => {
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify({ ok: true, version: "1.1.0", buildFingerprint: "older-build" }));
    });
    const relayServer = http.createServer((_req, res) => {
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify({ status: "running", version: "1.1.0", buildFingerprint: "older-build", chatCount: 2, syncingChats: false }));
    });
    servers.push(apiServer, relayServer);
    const apiAddress = await listen(apiServer);
    const relayAddress = await listen(relayServer);

    const result = await detectExistingBackend({
      apiBase: `http://127.0.0.1:${apiAddress.port}`,
      relayBase: `http://127.0.0.1:${relayAddress.port}`,
      expectedVersion: "1.1.0",
      expectedBuildFingerprint: "build-a",
    });

    expect(result.ok).toBe(false);
    expect(result.apiHealthy).toBe(true);
    expect(result.relayHealthy).toBe(true);
    expect(result.versionMatched).toBe(true);
    expect(result.apiBuildFingerprintMatched).toBe(false);
    expect(result.relayBuildFingerprintMatched).toBe(false);
    expect(result.buildFingerprintMatched).toBe(false);
  });

  it("rejects partial or unrelated listeners", async () => {
    const apiServer = http.createServer((_req, res) => {
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify({ ok: true }));
    });
    servers.push(apiServer);
    const apiAddress = await listen(apiServer);

    const result = await detectExistingBackend({
      apiBase: `http://127.0.0.1:${apiAddress.port}`,
      relayBase: "http://127.0.0.1:1",
      timeoutMs: 250,
    });

    expect(result.ok).toBe(false);
    expect(result.apiHealthy).toBe(true);
    expect(result.apiOccupied).toBe(true);
    expect(result.relayHealthy).toBe(false);
    expect(result.relayOccupied).toBe(false);
    expect(result.apiHealth).toEqual({ ok: true });
    expect(result.relayStatus).toBeUndefined();
    expect(result.versionMatched).toBe(true);
  });

  it("preserves relay health when the API side is down", async () => {
    const relayServer = http.createServer((_req, res) => {
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify({ status: "running", version: "1.1.0", chatCount: 1, syncingChats: false }));
    });
    servers.push(relayServer);
    const relayAddress = await listen(relayServer);

    const result = await detectExistingBackend({
      apiBase: "http://127.0.0.1:1/api",
      relayBase: `http://127.0.0.1:${relayAddress.port}`,
      timeoutMs: 250,
      expectedVersion: "1.1.0",
    });

    expect(result.ok).toBe(false);
    expect(result.apiHealthy).toBe(false);
    expect(result.apiOccupied).toBe(false);
    expect(result.relayHealthy).toBe(true);
    expect(result.relayOccupied).toBe(true);
    expect(result.apiHealth).toBeUndefined();
    expect(result.relayStatus).toEqual({ status: "running", version: "1.1.0", chatCount: 1, syncingChats: false });
    expect(result.versionMatched).toBe(false);
  });

  it("preserves occupied-port evidence when a backend endpoint returns a non-200 response", async () => {
    const apiServer = http.createServer((_req, res) => {
      res.statusCode = 404;
      res.end("not found");
    });
    const relayServer = http.createServer((_req, res) => {
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify({ status: "running", version: "1.1.0", chatCount: 3, syncingChats: false }));
    });
    servers.push(apiServer, relayServer);
    const apiAddress = await listen(apiServer);
    const relayAddress = await listen(relayServer);

    const result = await detectExistingBackend({
      apiBase: `http://127.0.0.1:${apiAddress.port}`,
      relayBase: `http://127.0.0.1:${relayAddress.port}`,
      timeoutMs: 250,
    });

    expect(result.ok).toBe(false);
    expect(result.apiHealthy).toBe(false);
    expect(result.apiOccupied).toBe(true);
    expect(result.relayHealthy).toBe(true);
    expect(result.relayOccupied).toBe(true);
  });

  it("rejects a foreign JSON listener on the relay port even if it exposes a status field", async () => {
    const apiServer = http.createServer((_req, res) => {
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify({ ok: true, version: "1.1.0" }));
    });
    const relayServer = http.createServer((_req, res) => {
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify({ status: "running" }));
    });
    servers.push(apiServer, relayServer);
    const apiAddress = await listen(apiServer);
    const relayAddress = await listen(relayServer);

    const result = await detectExistingBackend({
      apiBase: `http://127.0.0.1:${apiAddress.port}`,
      relayBase: `http://127.0.0.1:${relayAddress.port}`,
      expectedVersion: "1.1.0",
    });

    expect(result.ok).toBe(false);
    expect(result.apiHealthy).toBe(true);
    expect(result.apiOccupied).toBe(true);
    expect(result.relayHealthy).toBe(false);
    expect(result.relayOccupied).toBe(true);
    expect(result.relayStatus).toEqual({ status: "running" });
  });

  it("retries once on timeout before treating a backend as absent", async () => {
    let apiRequestCount = 0;
    let relayRequestCount = 0;
    const apiServer = http.createServer((_req, res) => {
      apiRequestCount += 1;
      const delay = apiRequestCount === 1 ? 120 : 0;
      setTimeout(() => {
        res.setHeader("Content-Type", "application/json");
        res.end(JSON.stringify({ ok: true, version: "1.1.0" }));
      }, delay);
    });
    const relayServer = http.createServer((_req, res) => {
      relayRequestCount += 1;
      const delay = relayRequestCount === 1 ? 120 : 0;
      setTimeout(() => {
        res.setHeader("Content-Type", "application/json");
        res.end(JSON.stringify({ status: "stopped", version: "1.1.0", chatCount: 0, syncingChats: false }));
      }, delay);
    });
    servers.push(apiServer, relayServer);
    const apiAddress = await listen(apiServer);
    const relayAddress = await listen(relayServer);

    const result = await detectExistingBackend({
      apiBase: `http://127.0.0.1:${apiAddress.port}`,
      relayBase: `http://127.0.0.1:${relayAddress.port}`,
      timeoutMs: 80,
      expectedVersion: "1.1.0",
    });

    expect(result.ok).toBe(true);
    expect(apiRequestCount).toBeGreaterThan(1);
    expect(relayRequestCount).toBeGreaterThan(1);
  });
});

describe("client health detection", () => {
  /** @type {http.Server[]} */
  let servers = [];

  afterEach(async () => {
    await Promise.all(servers.map(close));
    servers = [];
  });

  it("recognizes an already running WAAN dashboard", async () => {
    const clientServer = http.createServer((_req, res) => {
      res.setHeader("Content-Type", "text/html; charset=utf-8");
      res.end("<html><head><title>WAAN Conversation Intelligence</title><script type=\"module\" src=\"/assets/index-abc123.js\"></script></head><body><div id=\"app\"></div></body></html>");
    });
    servers.push(clientServer);
    const clientAddress = await listen(clientServer);

    const result = await detectExistingClient({
      clientUrl: `http://127.0.0.1:${clientAddress.port}`,
    });

    expect(result.ok).toBe(true);
  });

  it("recognizes built WAAN dashboards even when the entry chunk name and app markup vary", async () => {
    const clientServer = http.createServer((_req, res) => {
      res.setHeader("Content-Type", "text/html; charset=utf-8");
      res.end(
        '<html><head><title>WAAN Analytics Dashboard</title><script async type="module" src="/assets/appShell-CzaIB6jU.js"></script></head><body><main><div id="app">\n</div></main></body></html>',
      );
    });
    servers.push(clientServer);
    const clientAddress = await listen(clientServer);

    const result = await detectExistingClient({
      clientUrl: `http://127.0.0.1:${clientAddress.port}`,
    });

    expect(result.ok).toBe(true);
  });

  it("rejects foreign built dashboards when a specific packaged entry is expected", async () => {
    const clientServer = http.createServer((_req, res) => {
      res.setHeader("Content-Type", "text/html; charset=utf-8");
      res.end(
        '<html><head><title>WAAN Analytics Dashboard</title><script async type="module" src="/assets/older-build.js"></script></head><body><main><div id="app"></div></main></body></html>',
      );
    });
    servers.push(clientServer);
    const clientAddress = await listen(clientServer);

    const result = await detectExistingClient({
      clientUrl: `http://127.0.0.1:${clientAddress.port}`,
      allowSourceEntry: false,
      expectedModuleEntries: ["/assets/current-build.js"],
    });

    expect(result.ok).toBe(false);
  });

  it("rejects a built WAAN dashboard when the built document does not match the current release", async () => {
    const clientServer = http.createServer((_req, res) => {
      res.setHeader("Content-Type", "text/html; charset=utf-8");
      res.end(
        `
          <html>
            <head>
              <title>WAAN Analytics Dashboard</title>
              <link rel="stylesheet" href="/assets/older-styles.css">
              <script async type="module" src="/assets/current-build.js"></script>
            </head>
            <body>
              <main class="older-layout"><div id="app"></div></main>
            </body>
          </html>
        `,
      );
    });
    servers.push(clientServer);
    const clientAddress = await listen(clientServer);

    const result = await detectExistingClient({
      clientUrl: `http://127.0.0.1:${clientAddress.port}`,
      allowSourceEntry: false,
      expectedModuleEntries: ["/assets/current-build.js"],
      expectedBuiltDocument: `
        <html>
          <head>
            <title>WAAN Analytics Dashboard</title>
            <link rel="stylesheet" href="/assets/current-styles.css">
            <script async type="module" src="/assets/current-build.js"></script>
          </head>
          <body>
            <main class="current-layout"><div id="app"></div></main>
          </body>
        </html>
      `,
    });

    expect(result.builtDocumentMatched).toBe(false);
    expect(result.ok).toBe(false);
  });

  it("rejects unrelated listeners", async () => {
    const clientServer = http.createServer((_req, res) => {
      res.setHeader("Content-Type", "text/html; charset=utf-8");
      res.end("<html><body>Not WAAN</body></html>");
    });
    servers.push(clientServer);
    const clientAddress = await listen(clientServer);

    const result = await detectExistingClient({
      clientUrl: `http://127.0.0.1:${clientAddress.port}`,
    });

    expect(result.ok).toBe(false);
  });

  it("preserves occupied-port evidence when a client port returns a non-200 response", async () => {
    const clientServer = http.createServer((_req, res) => {
      res.statusCode = 404;
      res.end("");
    });
    servers.push(clientServer);
    const clientAddress = await listen(clientServer);

    const result = await detectExistingClient({
      clientUrl: `http://127.0.0.1:${clientAddress.port}`,
      timeoutMs: 250,
    });

    expect(result.ok).toBe(false);
    expect(result.portOccupied).toBe(true);
    expect(result.statusCode).toBe(404);
    expect(result.body).toBe("");
  });

  it("reuses source-entry dev dashboards that point at /src/main.js", async () => {
    const expectedSourceDocument = `
      <!DOCTYPE html>
      <html lang="en">
        <head>
          <title>WAAN Conversation Intelligence</title>
          <link rel="stylesheet" href="styles.css">
        </head>
        <body>
          <div id="app"></div>
          <script type="module" src="/src/main.js"></script>
        </body>
      </html>
    `;
    const clientServer = http.createServer((_req, res) => {
      res.setHeader("Content-Type", "text/html; charset=utf-8");
      res.end(`
        <!DOCTYPE html>
        <html lang="en">
          <head>
            <title>WAAN Conversation Intelligence</title>
            <link rel="stylesheet" href="styles.css">
            <script type="module" src="/@vite/client"></script>
          </head>
          <body>
            <div id="app"></div>
            <script type="module" src="/src/main.js"></script>
          </body>
        </html>
      `);
    });
    servers.push(clientServer);
    const clientAddress = await listen(clientServer);

    const result = await detectExistingClient({
      clientUrl: `http://127.0.0.1:${clientAddress.port}`,
      expectedSourceDocument,
    });

    expect(result.ok).toBe(true);
  });

  it("rejects a foreign WAAN dev dashboard when the source document does not match this working tree", async () => {
    const clientServer = http.createServer((_req, res) => {
      res.setHeader("Content-Type", "text/html; charset=utf-8");
      res.end(
        '<html><head><title>WAAN Conversation Intelligence</title><script type="module" src="/@vite/client"></script></head><body><main class="older-branch"><div id="app"></div></main><script type="module" src="/src/main.js"></script></body></html>',
      );
    });
    servers.push(clientServer);
    const clientAddress = await listen(clientServer);

    const expectedSourceDocument = `
      <!DOCTYPE html>
      <html>
        <head><title>WAAN Conversation Intelligence</title></head>
        <body><section class="current-branch"><div id="app"></div></section><script type="module" src="/src/main.js"></script></body>
      </html>
    `;

    const result = await detectExistingClient({
      clientUrl: `http://127.0.0.1:${clientAddress.port}`,
      allowSourceEntry: true,
      expectedModuleEntries: ["/@vite/client", "/src/main.js"],
      expectedSourceDocument,
      requireAllExpectedModuleEntries: true,
    });

    expect(normalizeHtmlForSourceReuse(expectedSourceDocument)).not.toBe(
      normalizeHtmlForSourceReuse(result.body),
    );
    expect(result.sourceDocumentMatched).toBe(false);
    expect(result.ok).toBe(false);
  });

  it("requires all expected dev module entries before reusing a source-entry dashboard", async () => {
    const clientServer = http.createServer((_req, res) => {
      res.setHeader("Content-Type", "text/html; charset=utf-8");
      res.end(
        "<html><head><title>WAAN Conversation Intelligence</title></head><body><div id=\"app\"></div><script type=\"module\" src=\"/src/main.js\"></script></body></html>",
      );
    });
    servers.push(clientServer);
    const clientAddress = await listen(clientServer);

    const result = await detectExistingClient({
      clientUrl: `http://127.0.0.1:${clientAddress.port}`,
      allowSourceEntry: true,
      expectedModuleEntries: ["/@vite/client", "/src/main.js"],
      requireAllExpectedModuleEntries: true,
    });

    expect(result.ok).toBe(false);
  });

  it("reuses a dashboard when any expected module-entry set matches in unpackaged mode", async () => {
    const clientServer = http.createServer((_req, res) => {
      res.setHeader("Content-Type", "text/html; charset=utf-8");
      res.end(
        '<html><head><title>WAAN Analytics Dashboard</title><script async type="module" src="/assets/current-build.js"></script></head><body><main><div id="app"></div></main></body></html>',
      );
    });
    servers.push(clientServer);
    const clientAddress = await listen(clientServer);

    const result = await detectExistingClient({
      clientUrl: `http://127.0.0.1:${clientAddress.port}`,
      allowSourceEntry: true,
      expectedModuleEntrySets: [
        ["/@vite/client", "/src/main.js"],
        ["/assets/current-build.js"],
      ],
      requireAllExpectedModuleEntries: true,
    });

    expect(result.ok).toBe(true);
  });

  it("rejects an unpackaged built dashboard when the built document does not match this checkout", async () => {
    const clientServer = http.createServer((_req, res) => {
      res.setHeader("Content-Type", "text/html; charset=utf-8");
      res.end(
        '<html><head><title>WAAN Analytics Dashboard</title><link rel="stylesheet" href="/assets/current-styles.css"><script async type="module" src="/assets/current-build.js"></script></head><body><main class="older-layout"><div id="app"></div></main></body></html>',
      );
    });
    servers.push(clientServer);
    const clientAddress = await listen(clientServer);

    const result = await detectExistingClient({
      clientUrl: `http://127.0.0.1:${clientAddress.port}`,
      allowSourceEntry: true,
      expectedModuleEntrySets: [
        ["/@vite/client", "/src/main.js"],
        ["/assets/current-build.js"],
      ],
      expectedBuiltDocument: `
        <html>
          <head>
            <title>WAAN Analytics Dashboard</title>
            <link rel="stylesheet" href="/assets/current-styles.css">
            <script async type="module" src="/assets/current-build.js"></script>
          </head>
          <body>
            <main class="current-layout"><div id="app"></div></main>
          </body>
        </html>
      `,
      requireAllExpectedModuleEntries: true,
    });

    expect(result.builtDocumentMatched).toBe(false);
    expect(result.ok).toBe(false);
  });

  it("rejects source-entry dev dashboards when source reuse is explicitly disabled", async () => {
    const clientServer = http.createServer((_req, res) => {
      res.setHeader("Content-Type", "text/html; charset=utf-8");
      res.end("<html><head><title>WAAN Conversation Intelligence</title></head><body><div id=\"app\"></div><script type=\"module\" src=\"/src/main.js\"></script></body></html>");
    });
    servers.push(clientServer);
    const clientAddress = await listen(clientServer);

    const result = await detectExistingClient({
      clientUrl: `http://127.0.0.1:${clientAddress.port}`,
      allowSourceEntry: false,
      expectedModuleEntries: ["/assets/current-build.js"],
    });

    expect(result.ok).toBe(false);
  });

  it("retries once on timeout before treating a dashboard as absent", async () => {
    let requestCount = 0;
    const clientServer = http.createServer((_req, res) => {
      requestCount += 1;
      const delay = requestCount === 1 ? 120 : 0;
      setTimeout(() => {
        res.setHeader("Content-Type", "text/html; charset=utf-8");
        res.end("<html><head><title>WAAN Conversation Intelligence</title></head><body><div id=\"app\"></div><script type=\"module\" src=\"/src/main.js\"></script></body></html>");
      }, delay);
    });
    servers.push(clientServer);
    const clientAddress = await listen(clientServer);

    const result = await detectExistingClient({
      clientUrl: `http://127.0.0.1:${clientAddress.port}`,
      timeoutMs: 80,
    });

    expect(result.ok).toBe(true);
    expect(requestCount).toBeGreaterThan(1);
  });
});
