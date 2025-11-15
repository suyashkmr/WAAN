#!/usr/bin/env node
const process = require("process");
const { program } = require("commander");
require("dotenv").config();

const { loadConfig } = require("./config");
const { buildLogger } = require("./logger");
const { ChatStore } = require("./store/chatStore");
const { RelayManager } = require("./relay/relayManager");
const { createHttpServers } = require("./server");

async function main() {
  program
    .name("waan-server")
    .description("WhatsApp Analytics relay server")
    .option("--data-dir <path>", "Directory to store relay data")
    .option("--api-port <number>", "API port", parseInt, 3334)
    .option("--relay-port <number>", "Relay control port", parseInt)
    .option("--host <host>", "Host/IP to bind")
    .option("--allow-origin <origin,...>", "Comma separated CORS origins")
    .option("--auto-start", "Start the relay immediately", false)
    .parse(process.argv);

  const options = program.opts();
  const config = loadConfig(options);
  const logger = buildLogger(config);
  logger.info("WAAN relay %s starting…", config.version);
  logger.info("Data directory: %s", config.dataDir);

  const store = new ChatStore(config.storageDir, logger);
  await store.hydrate();

  const relayManager = new RelayManager({ config, store, logger });
  const servers = createHttpServers({ config, store, relayManager, logger });

  if (options.autoStart || process.env.WAAN_AUTOSTART === "1") {
    relayManager
      .start()
      .then(() => logger.info("Relay started automatically."))
      .catch(error => logger.error("Autostart failed: %s", error.message));
  }

  const cleanup = async () => {
    logger.info("Shutting down WAAN relay…");
    await relayManager.stop().catch(() => {});
    await servers.close().catch(() => {});
    process.exit(0);
  };

  process.on("SIGINT", cleanup);
  process.on("SIGTERM", cleanup);
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});
