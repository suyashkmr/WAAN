import { createRelaySyncProgressController } from "./syncProgress.js";
import { createRelayLogController } from "./logStream.js";
import { createFirstRunSetupController } from "./firstRunSetup.js";

export function createRelaySupportControllers({
  elements,
  deps,
}) {
  const firstRunSetupController = createFirstRunSetupController({
    firstRunSetup: elements.firstRunSetup,
    firstRunSetupSteps: elements.firstRunSetupSteps,
    firstRunPrimaryActionButton: elements.firstRunPrimaryActionButton,
    relayStartButton: elements.relayStartButton,
    getControlsLocked: deps.getControlsLocked,
    getDataAvailable: deps.getDataAvailable,
  });
  const relaySyncProgressController = createRelaySyncProgressController({
    relaySyncProgressEl: elements.relaySyncProgressEl,
    relaySyncChatsMeta: elements.relaySyncChatsMeta,
    relaySyncMessagesMeta: elements.relaySyncMessagesMeta,
    formatNumber: deps.formatNumber,
  });
  const relayLogController = createRelayLogController({
    brandName: deps.brandName,
    relayServiceName: deps.relayServiceName,
    relayBase: deps.relayBase,
    logDrawerToggleButton: elements.logDrawerToggleButton,
    logDrawerEl: elements.logDrawerEl,
    logDrawerList: elements.logDrawerList,
    logDrawerConnectionLabel: elements.logDrawerConnectionLabel,
    issueBaseUrl: deps.issueBaseUrl,
    getRelayStatus: deps.getRelayStatus,
    getDatasetLabel: deps.getDatasetLabel,
    getDataAvailable: deps.getDataAvailable,
    getRemoteChatCount: deps.getRemoteChatCount,
    fetchJson: deps.fetchJson,
    updateStatus: deps.updateStatus,
  });

  return {
    firstRunSetupController,
    relaySyncProgressController,
    relayLogController,
  };
}
