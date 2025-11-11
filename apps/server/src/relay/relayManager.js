const EventEmitter = require("events");

const HEARTBEAT_INTERVAL_MS = 30_000;

class RelayManager extends EventEmitter {
  constructor({ config, store, logger }) {
    super();
    this.config = config;
    this.store = store;
    this.logger = logger;
    this.heartbeatTimer = null;
    this.state = {
      status: "stopped",
      startedAt: null,
      readyAt: null,
      lastError: null,
      lastQr: null,
    };
  }

  getStatus() {
    return {
      status: this.state.status,
      startedAt: this.state.startedAt,
      readyAt: this.state.readyAt,
      lastError: this.state.lastError,
      lastQr: this.state.lastQr,
      version: this.config.version,
    };
  }

  async start() {
    if (this.state.status === "running" || this.state.status === "starting") {
      this.logger.warn("Relay already running.");
      return this.getStatus();
    }
    this.log("Starting relay (stub mode)…");
    this.state.status = "starting";
    this.state.startedAt = new Date().toISOString();
    this.state.readyAt = null;
    this.state.lastError = null;
    this.emit("status", this.getStatus());
    await this.delay(500);
    this.state.status = "running";
    this.state.readyAt = new Date().toISOString();
    this.log("Relay is ready (WhatsApp integration disabled).");
    this.emit("status", this.getStatus());
    this.beginHeartbeat();
    return this.getStatus();
  }

  async stop() {
    if (this.state.status === "stopped") {
      this.logger.info("Relay is not running.");
      return this.getStatus();
    }
    this.log("Stopping relay…");
    this.stopHeartbeat();
    this.state = {
      status: "stopped",
      startedAt: null,
      readyAt: null,
      lastError: null,
      lastQr: null,
    };
    this.emit("status", this.getStatus());
    return this.getStatus();
  }

  beginHeartbeat() {
    this.stopHeartbeat();
    this.heartbeatTimer = setInterval(() => {
      this.log("Relay heartbeat (stub)");
    }, HEARTBEAT_INTERVAL_MS);
  }

  stopHeartbeat() {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  log(text) {
    this.logger.info(text);
    this.emit("log", text);
  }
}

module.exports = {
  RelayManager,
};
