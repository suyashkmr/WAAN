async function renderQrDataUrl(qrCodeLib, qr) {
  return qrCodeLib.toDataURL(qr, { margin: 2, width: 320 });
}

function updateRelayState(manager, patch = {}) {
  manager.state = {
    ...manager.state,
    ...patch,
  };
  manager.emit("status", manager.getStatus());
}

function handleAuthFailure(manager, message) {
  const error = message || "Authentication failed.";
  manager.state.lastError = error;
  manager.log(`Authentication failed: ${error}`);
}

function handleDisconnect(manager, reason) {
  manager.log(`ChatScope disconnected: ${reason}`);
  manager.stop().catch(err => {
    manager.logger.error("Failed to stop relay after disconnect: %s", err.message);
  });
}

function handleFatalError(manager, error) {
  manager.logger.error("ChatScope relay error: %s", error.message);
  manager.state.lastError = error.message;
  manager.emit("status", manager.getStatus());
}

async function handleQr(manager, qrCodeLib, qr) {
  manager.log("ChatScope requests a QR code scan.");
  try {
    const dataUrl = await renderQrDataUrl(qrCodeLib, qr);
    updateRelayState(manager, {
      status: "waiting_qr",
      lastQr: dataUrl,
    });
  } catch (error) {
    manager.logger.error("Failed to render QR code: %s", error.message);
    manager.state.lastError = error.message;
    manager.emit("status", manager.getStatus());
  }
}

module.exports = {
  updateRelayState,
  handleAuthFailure,
  handleDisconnect,
  handleFatalError,
  handleQr,
};
