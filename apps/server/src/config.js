const os = require("os");
const path = require("path");
const fs = require("fs-extra");

const pkg = require("../package.json");

function toNumber(value, fallback) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function loadConfig(overrides = {}) {
  const defaultDataRoot = path.join(os.homedir(), "Library", "Application Support", "WAAN");
  const persistedConfigPath = path.join(defaultDataRoot, "waan.config.json");
  let persistedConfig = {};
  try {
    persistedConfig = fs.readJsonSync(persistedConfigPath);
  } catch {
    persistedConfig = {};
  }
  const dataDir = path.resolve(
    overrides.dataDir ||
      process.env.WAAN_DATA_DIR ||
      persistedConfig.dataDir ||
      path.join(defaultDataRoot, "data")
  );
  const apiPort = toNumber(
    overrides.apiPort || process.env.WAAN_API_PORT,
    3333
  );
  const relayPort = toNumber(
    overrides.relayPort || process.env.WAAN_RELAY_PORT,
    4545
  );
  const host = overrides.host || process.env.WAAN_BIND_HOST || "127.0.0.1";
  const allowOrigin =
    overrides.allowOrigin || process.env.WAAN_ALLOW_ORIGIN || "*";
  const logDir = path.resolve(
    overrides.logDir || process.env.WAAN_LOG_DIR || path.join(dataDir, "logs")
  );

  fs.ensureDirSync(dataDir);
  fs.ensureDirSync(path.join(dataDir, "storage"));
  fs.ensureDirSync(logDir);

  if (persistedConfig.dataDir !== dataDir) {
    fs.outputJsonSync(
      persistedConfigPath,
      { dataDir },
      { spaces: 2 }
    );
  }

  return {
    version: pkg.version,
    dataDir,
    storageDir: path.join(dataDir, "storage"),
    logDir,
    host,
    apiPort,
    relayPort,
    allowOrigin,
  };
}

module.exports = {
  loadConfig,
};
