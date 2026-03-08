// @ts-check

import { createRelaySyncProgressController } from "./syncProgress.js";
import { createRelayLogController } from "./logStream.js";
import { createFirstRunSetupController } from "./firstRunSetup.js";

/**
 * @param {{ elements: Record<string, any>, deps: Record<string, any> }} params
 */
export function createRelaySupportControllers({
  elements,
  deps,
}) {
  const firstRunSetupController = createFirstRunSetupController({
    firstRunSetup: elements.firstRunSetup,
    firstRunSetupSteps: elements.firstRunSetupSteps,
    firstRunPrimaryActionButton: elements.firstRunPrimaryActionButton,
    relayLiveCard: elements.relayLiveCard,
    chatSelector: elements.chatSelector,
    relayStartButton: elements.relayStartButton,
    getControlsLocked: deps.getControlsLocked,
    getDataAvailable: deps.getDataAvailable,
  });
  const relaySyncProgressController = createRelaySyncProgressController({
    relaySyncProgressEl: elements.relaySyncProgressEl,
    relaySyncChatsStep: elements.relaySyncChatsStep,
    relaySyncMessagesStep: elements.relaySyncMessagesStep,
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
    vueRuntime: deps.vueRuntime,
    globalScope: deps.globalScope,
  });

  return {
    firstRunSetupController,
    relaySyncProgressController,
    relayLogController,
  };
}
