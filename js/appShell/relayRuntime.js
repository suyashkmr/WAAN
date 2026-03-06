// @ts-check

import { createRelayController } from "../relayControls.js";
import { createRelayBootstrapController } from "./relayBootstrap.js";

/**
 * @typedef {Record<string, any>} AnyRecord
 */

/**
 * @param {{
 *   relayElements: AnyRecord,
 *   relayHelpers: AnyRecord,
 *   electronAPI: AnyRecord,
 *   bootstrapElements: AnyRecord,
 *   fetchJson: (...args: any[]) => Promise<any>,
 *   apiBase: string,
 *   setRemoteChatList: (...args: any[]) => void,
 *   refreshChatSelector: (...args: any[]) => Promise<any> | void,
 *   updateStatus: (...args: any[]) => void,
 *   documentRef?: Document | null | undefined,
 *   windowRef?: Window | null | undefined,
 *   globalScope?: any,
 * }} params
 */
export function createRelayRuntime({
  relayElements,
  relayHelpers,
  electronAPI,
  bootstrapElements,
  fetchJson,
  apiBase,
  setRemoteChatList,
  refreshChatSelector,
  updateStatus,
  documentRef = typeof document !== "undefined" ? document : null,
  windowRef = typeof window !== "undefined" ? window : null,
  globalScope = globalThis,
}) {
  const relayController = createRelayController({
    elements: relayElements,
    helpers: relayHelpers,
    electronAPI: /** @type {any} */ (electronAPI),
  });

  const {
    startRelaySession,
    handlePrimaryActionClick: handleRelayPrimaryActionClick,
    stopRelaySession,
    logoutRelaySession,
    handleReloadAllChats,
    syncRelayChats,
    loadRemoteChat,
    refreshRelayStatus,
    startStatusPolling,
    handleLogClear,
    handleExportDiagnostics,
    handleReportIssue,
    openLogDrawer,
    closeLogDrawer,
    handleLogDrawerDocumentClick,
    handleLogDrawerKeydown,
    handleFirstRunOpenRelay,
    handleFirstRunPrimaryAction,
    handleRecoveryReconnect,
    handleRecoveryResync,
    handleRecoveryExportDiagnostics,
    initLogStream,
    isLogDrawerOpen,
  } = relayController;

  const relayBootstrapController = createRelayBootstrapController({
    elements: bootstrapElements,
    handlers: {
      handleRelayPrimaryActionClick,
      stopRelaySession,
      logoutRelaySession,
      handleReloadAllChats,
      openLogDrawer,
      closeLogDrawer,
      handleExportDiagnostics,
      handleReportIssue,
      handleLogClear,
      handleLogDrawerDocumentClick,
      handleLogDrawerKeydown,
      handleFirstRunOpenRelay,
      handleFirstRunPrimaryAction,
      handleRecoveryReconnect,
      handleRecoveryResync,
      handleRecoveryExportDiagnostics,
      refreshRelayStatus,
      startStatusPolling,
      initLogStream,
    },
    deps: {
      fetchJson,
      apiBase,
      setRemoteChatList,
      refreshChatSelector,
      updateStatus,
    },
    documentRef,
    windowRef,
    globalScope,
  });

  return {
    startRelaySession,
    stopRelaySession,
    syncRelayChats,
    loadRemoteChat,
    isLogDrawerOpen,
    openLogDrawer,
    closeLogDrawer,
    initRelayControls: relayBootstrapController.initRelayControls,
  };
}
