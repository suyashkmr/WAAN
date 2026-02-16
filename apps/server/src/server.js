const express = require("express");
const cors = require("cors");

const { buildApiRouter } = require("./http/apiRouter");
const { buildRelayRouter } = require("./http/relayRouter");

function buildCorsOptions(allowOrigin) {
  if (allowOrigin === "*" || !allowOrigin) {
    return { origin: true, credentials: false };
  }
  const origins = allowOrigin.split(",").map(origin => origin.trim());
  return {
    origin: (origin, callback) => {
      if (!origin || origins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
  };
}

function createHttpServers({ config, store, relayManager, logger }) {
  const commonMiddleware = [
    express.json({ limit: "256kb" }),
    cors(buildCorsOptions(config.allowOrigin)),
  ];

  const apiApp = express();
  commonMiddleware.forEach(mw => apiApp.use(mw));
  apiApp.use("/api", buildApiRouter({ store, relayManager, logger }));

  const relayApp = express();
  commonMiddleware.forEach(mw => relayApp.use(mw));
  relayApp.use("/", buildRelayRouter({ relayManager }));

  const apiServer = apiApp.listen(config.apiPort, config.host, () => {
    logger.info("API server listening on http://%s:%d", config.host, config.apiPort);
  });

  const relayServer = relayApp.listen(config.relayPort, config.host, () => {
    logger.info(
      "Relay control server listening on http://%s:%d",
      config.host,
      config.relayPort
    );
  });

  return {
    close: async () => {
      await Promise.all([
        new Promise(resolve => apiServer.close(resolve)),
        new Promise(resolve => relayServer.close(resolve)),
      ]);
    },
  };
}

module.exports = {
  createHttpServers,
};
