const { spawn } = require("child_process");
const path = require("path");
const { buildRelayLaunchConfig } = require("./relayLaunchConfig.cjs");

const repoRoot = path.resolve(__dirname, "..");
const serverRoot = path.join(repoRoot, "apps", "server");

const clientProcess = spawn("node", ["serve.js"], {
  cwd: repoRoot,
  env: {
    ...process.env,
    WAAN_CLIENT_PORT: process.env.WAAN_CLIENT_PORT || "4173",
  },
  stdio: "inherit",
});

const relayLaunchConfig = buildRelayLaunchConfig({
  autostart: process.env.WAAN_AUTOSTART !== "0",
  getServerRoot: () => serverRoot,
  apiPort: process.env.WAAN_API_PORT || "3334",
  relayPort: process.env.WAAN_RELAY_PORT || "4546",
});

const relayArgs = ["start", "--workspace", "apps/server", "--", ...relayLaunchConfig.args];

const relayProcess = spawn("npm", relayArgs, {
  cwd: repoRoot,
  env: {
    ...process.env,
    ...relayLaunchConfig.env,
  },
  stdio: "inherit",
});

const cleanup = () => {
  clientProcess.kill("SIGINT");
  relayProcess.kill("SIGINT");
  process.exit(0);
};

process.on("SIGINT", cleanup);
process.on("SIGTERM", cleanup);
