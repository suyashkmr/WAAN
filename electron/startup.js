const { spawn } = require("child_process");
const path = require("path");

const repoRoot = path.resolve(__dirname, "..");

const clientProcess = spawn("node", ["serve.js"], {
  cwd: repoRoot,
  env: {
    ...process.env,
    WAAN_CLIENT_PORT: process.env.WAAN_CLIENT_PORT || "4173",
  },
  stdio: "inherit",
});

const relayProcess = spawn("npm", ["start", "--workspace", "apps/server", "--", "--auto-start"], {
  cwd: repoRoot,
  env: {
    ...process.env,
    WAAN_API_PORT: process.env.WAAN_API_PORT || "3334",
    WAAN_RELAY_PORT: process.env.WAAN_RELAY_PORT || "4546",
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
