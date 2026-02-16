const express = require("express");
const { formatErrorMessage } = require("../errorUtils");

const LOG_LIMIT = 400;

function buildRelayRouter({ relayManager }) {
  const router = express.Router();
  const clients = new Set();
  const logBuffer = [];

  function pushLog(line) {
    logBuffer.push(line);
    if (logBuffer.length > LOG_LIMIT) {
      logBuffer.splice(0, logBuffer.length - LOG_LIMIT);
    }
    broadcast(line);
  }

  function broadcast(line) {
    const payload = `data: ${line.replace(/\n/g, " ")}\n\n`;
    clients.forEach(res => {
      res.write(payload);
    });
  }

  relayManager.on("log", pushLog);

  router.get("/relay/status", (req, res) => {
    res.json(relayManager.getStatus());
  });

  router.post("/relay/start", async (req, res) => {
    try {
      const status = await relayManager.start();
      res.json(status);
    } catch (error) {
      res.status(500).json({ error: formatErrorMessage(error, "Unable to start relay") });
    }
  });

  router.post("/relay/stop", async (req, res) => {
    try {
      const status = await relayManager.stop();
      res.json(status);
    } catch (error) {
      res.status(500).json({ error: formatErrorMessage(error, "Unable to stop relay") });
    }
  });

  router.post("/relay/logout", async (req, res) => {
    try {
      const status = await relayManager.logout();
      res.json(status);
    } catch (error) {
      res.status(500).json({ error: formatErrorMessage(error, "Unable to logout relay session") });
    }
  });

  router.post("/relay/sync", async (req, res) => {
    try {
      const status = await relayManager.syncChats();
      res.json(status);
    } catch (error) {
      res.status(500).json({ error: formatErrorMessage(error, "Unable to sync chats") });
    }
  });

  router.post("/relay/show-browser", async (req, res) => {
    try {
      await relayManager.showBrowserWindow();
      res.json({ ok: true });
    } catch (error) {
      res.status(500).json({ error: formatErrorMessage(error, "Unable to show relay browser") });
    }
  });

  router.get("/relay/logs/stream", (req, res) => {
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.flushHeaders?.();

    logBuffer.forEach(line => {
      res.write(`data: ${line.replace(/\n/g, " ")}\n\n`);
    });

    clients.add(res);
    req.on("close", () => {
      clients.delete(res);
      res.end();
    });
  });

  router.post("/relay/logs/clear", (req, res) => {
    logBuffer.splice(0, logBuffer.length);
    res.json({ ok: true });
  });

  return router;
}

module.exports = {
  buildRelayRouter,
};
