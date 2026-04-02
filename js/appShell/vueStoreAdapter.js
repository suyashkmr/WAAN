// @ts-check

import { useWorkspaceStoreActions } from "../../src/store/useWorkspaceStore.js";

/** @typedef {{ status?: string, account?: string, lastError?: string, syncingChats?: boolean, syncPath?: string, chatCount?: number, lastQr?: string }} RelayStatusPayload */

const storeActions = useWorkspaceStoreActions();

let adapterEnabled = false;

/**
 * @param {RelayStatusPayload | null | undefined} status
 */
function normalizeRelayStatus(status) {
  return {
    status: status?.status || "offline",
    account: status?.account || "",
    relayError: status?.lastError || "",
  };
}

/**
 * @param {RelayStatusPayload | null | undefined} status
 */
function resolveSyncStep(status) {
  if (!status) return "idle";
  if (status.status === "running" && !status.syncingChats) return "ready";
  if (status.syncingChats) {
    if (status.syncPath === "messages") return "messages";
    return "chats";
  }
  if (status.status === "starting" || status.status === "waiting_qr") return "link";
  return status.status || "idle";
}

/**
 * @param {RelayStatusPayload | null | undefined} status
 */
function resolveSyncPercent(status) {
  if (!status) return 0;
  if (status.status === "running" && !status.syncingChats) return 100;
  if (status.syncingChats) return 50;
  if (status.status === "starting" || status.status === "waiting_qr") return 10;
  return 0;
}

/**
 * @param {{ enabled?: boolean }} [params]
 */
export function initVueStoreAdapter({ enabled = true } = {}) {
  adapterEnabled = Boolean(enabled);
}

/**
 * @param {any} status
 */
export function syncWorkspaceRelayStatus(status) {
  if (!adapterEnabled) return;
  storeActions.setRelayStatus(normalizeRelayStatus(status));
  storeActions.setSyncProgress({
    isSyncing: Boolean(status?.syncingChats),
    syncStep: resolveSyncStep(status),
    syncChatsMeta: typeof status?.chatCount === "number" ? `${status.chatCount} chats` : "",
    syncProgressPercent: resolveSyncPercent(status),
  });
  storeActions.setQrState({
    showQR: Boolean(status?.lastQr),
    qrCodeUrl: status?.lastQr || "",
  });
}

/**
 * @param {{ statusText?: string, accountText?: string, helpText?: string, qrSrc?: string | null }} [payload]
 */
export function syncWorkspaceRelaySurface(payload = {}) {
  if (!adapterEnabled) return;
  if (typeof payload.statusText === "string" || typeof payload.accountText === "string") {
    storeActions.setRelayStatus({
      statusText: payload.statusText,
      accountText: payload.accountText,
    });
  }
  storeActions.setQrState({
    showQR: Boolean(payload.qrSrc),
    qrCodeUrl: payload.qrSrc || "",
    qrHelpText: payload.helpText || "",
  });
}

/**
 * @param {{ activeChatId?: string, activeRange?: string, customRange?: { start?: string, end?: string } }} payload
 */
export function syncWorkspaceSelectionState(payload = {}) {
  if (!adapterEnabled) return;
  storeActions.setSelectionState(payload);
}
