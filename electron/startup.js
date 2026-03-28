const { spawn } = require("child_process");
const fs = require("fs");
const path = require("path");
const {
  autostartReusedRelayIfNeeded,
  assertReusableExistingBackend,
  assertReusableExistingClient,
  formatHostForUrl,
  getServerBuildFingerprint,
  resolveReachableClientHost,
} = require("./mainStartupHelpers.cjs");
const { buildRelayLaunchConfig } = require("./relayLaunchConfig.cjs");
const { detectExistingBackend, detectExistingClient } = require("./backendHealth.cjs");

const repoRoot = path.resolve(__dirname, "..");
const serverRoot = path.join(repoRoot, "apps", "server");
const serverPkg = require(path.join(serverRoot, "package.json"));
const serverBuildFingerprint = getServerBuildFingerprint({ serverRoot });

let clientProcess = null;
const clientHost = process.env.WAAN_CLIENT_HOST || process.env.HOST || "127.0.0.1";
const clientPort = process.env.WAAN_CLIENT_PORT || "4173";
const clientProbeHost = resolveReachableClientHost(clientHost);
const clientUrl = process.env.WAAN_CLIENT_URL || `http://${formatHostForUrl(clientProbeHost)}:${clientPort}`;
const backendBindHost = process.env.WAAN_BIND_HOST || "127.0.0.1";
const backendProbeHost = resolveReachableClientHost(backendBindHost);

const relayLaunchConfig = buildRelayLaunchConfig({
  autostart: process.env.WAAN_AUTOSTART !== "0",
  getServerRoot: () => serverRoot,
  apiPort: process.env.WAAN_API_PORT || "3334",
  relayPort: process.env.WAAN_RELAY_PORT || "4546",
});
const apiBase = `http://${formatHostForUrl(backendProbeHost)}:${relayLaunchConfig.env.WAAN_API_PORT}/api`;
const relayBase = `http://${formatHostForUrl(backendProbeHost)}:${relayLaunchConfig.env.WAAN_RELAY_PORT}`;

const relayArgs = ["start", "--workspace", "apps/server", "--", ...relayLaunchConfig.args];
let relayProcess = null;

function getNpmCommand(platform = process.platform) {
  return platform === "win32" ? "npm.cmd" : "npm";
}

function getExpectedDevModuleEntries() {
  try {
    const indexPath = path.join(repoRoot, "index.html");
    const html = fs.readFileSync(indexPath, "utf8");
    const moduleEntries = Array.from(
      html.matchAll(/<script[^>]+type=["']module["'][^>]+src=["']([^"']+)["']/gi),
      match => match[1],
    );
    if (moduleEntries.includes("/src/main.js") && !moduleEntries.includes("/@vite/client")) {
      return ["/@vite/client", ...moduleEntries];
    }
    return moduleEntries;
  } catch {
    return ["/@vite/client", "/src/main.js"];
  }
}

function getExpectedDevDocument() {
  try {
    return fs.readFileSync(path.join(repoRoot, "index.html"), "utf8");
  } catch {
    return null;
  }
}

function getExpectedUnpackagedDashboardEntries() {
  return getExpectedDevModuleEntries();
}

function buildClientLaunchConfig() {
  return {
    command: getNpmCommand(),
    args: ["run", "dev", "--", "--host", clientHost, "--port", clientPort, "--strictPort"],
    cwd: repoRoot,
    env: {
      ...process.env,
      WAAN_CLIENT_HOST: clientHost,
      WAAN_CLIENT_PORT: clientPort,
    },
  };
}

async function startClientIfNeeded() {
  const existingClient = await detectExistingClient({
    clientUrl,
    allowSourceEntry: true,
    expectedModuleEntries: getExpectedDevModuleEntries(),
    expectedSourceDocument: getExpectedDevDocument(),
    requireAllExpectedModuleEntries: true,
  });
  if (existingClient.ok) {
    console.log(`[WAAN] Reusing existing local dashboard at ${clientUrl}.`);
    return false;
  }
  assertReusableExistingClient({ existingClient, clientUrl });
  const launchConfig = buildClientLaunchConfig();
  clientProcess = spawn(launchConfig.command, launchConfig.args, {
    cwd: launchConfig.cwd,
    env: launchConfig.env,
    stdio: "inherit",
  });
  return true;
}

async function startRelayIfNeeded() {
  const existingBackend = await detectExistingBackend({
    apiBase,
    relayBase,
    expectedVersion: serverPkg.version,
    expectedBuildFingerprint: serverBuildFingerprint,
  });
  if (existingBackend.ok) {
    console.log("[WAAN] Reusing existing local backend on 127.0.0.1.");
    await autostartReusedRelayIfNeeded({
      relayBase,
      relayStatus: existingBackend.relayStatus,
      autostart: relayLaunchConfig.env.WAAN_AUTOSTART === "1",
      onWarn: error => {
        console.error("[WAAN] Reused backend relay auto-start failed:", error);
      },
    });
    return false;
  }
  assertReusableExistingBackend({
    existingBackend,
    apiBase,
    relayBase,
  });
  relayProcess = spawn(getNpmCommand(), relayArgs, {
    cwd: repoRoot,
    env: {
      ...process.env,
      ...relayLaunchConfig.env,
    },
    stdio: "inherit",
  });
  return true;
}

function maintainHelperLiveness({ startedClient, startedRelay }) {
  return !startedClient && !startedRelay;
}

const cleanup = (exitCode = 0) => {
  clientProcess?.kill("SIGINT");
  relayProcess?.kill("SIGINT");
  process.exit(exitCode);
};

function registerSignalHandlers() {
  process.on("SIGINT", () => cleanup(0));
  process.on("SIGTERM", () => cleanup(0));
}

function handleStartupFailure(error) {
  console.error("[WAAN] Failed to start local services:", error);
  cleanup(1);
}

async function startLocalServices() {
  try {
    const [startedClient, startedRelay] = await Promise.all([startClientIfNeeded(), startRelayIfNeeded()]);
    maintainHelperLiveness({ startedClient, startedRelay });
  } catch (error) {
    handleStartupFailure(error);
  }
}

if (require.main === module) {
  registerSignalHandlers();
  void startLocalServices();
}

module.exports = {
  __test: {
    buildClientLaunchConfig,
    cleanup,
    clientUrl,
    clientProbeHost,
    apiBase,
    backendProbeHost,
    getExpectedUnpackagedDashboardEntries,
    getExpectedDevModuleEntries,
    getExpectedDevDocument,
    getNpmCommand,
    handleStartupFailure,
    maintainHelperLiveness,
    relayBase,
    startLocalServices,
    registerSignalHandlers,
  },
};
