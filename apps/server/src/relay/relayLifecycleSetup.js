const { createRelayClient, wireRelayClientEvents } = require("./relayLifecycle");

function setupRelayClient(manager) {
  manager.client = createRelayClient({
    dataDir: manager.config.dataDir,
    headless: manager.relayConfig.RELAY_HEADLESS,
  });

  wireRelayClientEvents(manager.client, {
    onQr: qr => manager.handleQr(qr),
    onAuthenticated: () => manager.log("Authenticated with ChatScope Web."),
    onAuthFailure: message => manager.handleAuthFailure(message),
    onReady: () => manager.handleReady(),
    onChangeState: state => manager.log(`Client state changed: ${state}`),
    onDisconnected: reason => manager.handleDisconnect(reason),
    onLoadingScreen: (percent, message) => {
      manager.log(`Loading ChatScope… ${percent || 0}% ${message || ""}`.trim());
    },
    onMessage: message => {
      manager.handleIncomingMessage(message).catch(error => {
        manager.logger.warn("Failed to record incoming message: %s", error.message);
      });
    },
  });
}

module.exports = {
  setupRelayClient,
};
