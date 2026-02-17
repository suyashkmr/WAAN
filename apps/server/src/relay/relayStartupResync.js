const { formatErrorDetails } = require("../errorUtils");

function scheduleStartupPrimaryResync(manager, syncStatus) {
  if (manager.relayConfig.RELAY_SYNC_MODE !== "auto") return;
  if (!syncStatus || syncStatus.syncPath !== "fallback") return;
  if (manager.startupPrimaryResyncScheduled || manager.startupPrimaryResyncTimer) return;
  manager.startupPrimaryResyncScheduled = true;
  manager.log(
    `Scheduling deferred primary chat sync in ${manager.relayConfig.STARTUP_PRIMARY_RESYNC_DELAY_MS}ms after fallback startup sync.`,
  );
  manager.startupPrimaryResyncTimer = setTimeout(() => {
    manager.startupPrimaryResyncTimer = null;
    runDeferredPrimaryResync(manager);
  }, manager.relayConfig.STARTUP_PRIMARY_RESYNC_DELAY_MS);
}

async function runDeferredPrimaryResync(manager) {
  if (!manager.client) return;
  try {
    manager.log("Running deferred primary chat sync.");
    await manager.syncChats({ mode: "primary" });
  } catch (error) {
    const details = formatErrorDetails(error, "Deferred primary sync failed");
    manager.logger.debug("Deferred primary sync failed: %s", details);
  }
}

function clearStartupPrimaryResync(manager) {
  if (manager.startupPrimaryResyncTimer) {
    clearTimeout(manager.startupPrimaryResyncTimer);
    manager.startupPrimaryResyncTimer = null;
  }
  manager.startupPrimaryResyncScheduled = false;
}

module.exports = {
  scheduleStartupPrimaryResync,
  runDeferredPrimaryResync,
  clearStartupPrimaryResync,
};
