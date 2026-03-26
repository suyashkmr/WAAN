const path = require("path");

function buildRelayLaunchConfig({
  autostart = true,
  getServerRoot,
  apiPort,
  relayPort,
} = {}) {
  const entry = path.join(getServerRoot(), "src", "index.js");
  const args = autostart ? ["--auto-start"] : [];

  return {
    entry,
    args,
    cwd: getServerRoot(),
    env: {
      WAAN_API_PORT: String(apiPort),
      WAAN_RELAY_PORT: String(relayPort),
      WAAN_RELAY_HEADLESS: "false",
      WAAN_AUTOSTART: autostart ? "1" : "0",
    },
  };
}

module.exports = {
  buildRelayLaunchConfig,
};
