import { reactive } from "vue";

const WORKSPACE_STAGES = ["workspace", "findings", "deepdive", "support"];

const initialState = () => ({
  relay: {
    status: "offline",
    account: "",
    relayError: "",
    statusText: "Relay offline.",
    accountText: "Workspace locked until relay starts.",
  },
  sync: {
    isSyncing: false,
    syncStep: "idle",
    syncChatsMeta: "",
    syncProgressPercent: 0,
  },
  qr: {
    showQR: false,
    qrCodeUrl: "",
    qrHelpText: "",
  },
  selection: {
    activeChatId: "",
    activeRange: "all",
    customRange: {
      start: "",
      end: "",
    },
  },
  ui: {
    activeStage: "workspace",
  },
});

const workspaceStore = reactive(initialState());

function normalizeStage(stage) {
  return WORKSPACE_STAGES.includes(stage) ? stage : "workspace";
}

function normalizePercent(value) {
  const num = Number(value);
  if (!Number.isFinite(num)) return 0;
  return Math.max(0, Math.min(100, num));
}

function normalizeString(value) {
  return typeof value === "string" ? value : "";
}

function setRelayStatus(payload = {}) {
  workspaceStore.relay.status = normalizeString(payload.status) || "offline";
  workspaceStore.relay.account = normalizeString(payload.account);
  workspaceStore.relay.relayError = normalizeString(payload.relayError || payload.lastError);
  if (typeof payload.statusText === "string") {
    workspaceStore.relay.statusText = payload.statusText;
  }
  if (typeof payload.accountText === "string") {
    workspaceStore.relay.accountText = payload.accountText;
  }
}

function setSyncProgress(payload = {}) {
  workspaceStore.sync.isSyncing = Boolean(payload.isSyncing);
  workspaceStore.sync.syncStep = normalizeString(payload.syncStep) || "idle";
  workspaceStore.sync.syncChatsMeta = normalizeString(payload.syncChatsMeta);
  workspaceStore.sync.syncProgressPercent = normalizePercent(payload.syncProgressPercent);
}

function setQrState(payload = {}) {
  workspaceStore.qr.qrCodeUrl = normalizeString(payload.qrCodeUrl || payload.qrSrc);
  workspaceStore.qr.qrHelpText = normalizeString(payload.qrHelpText || payload.helpText);
  if (typeof payload.showQR === "boolean") {
    workspaceStore.qr.showQR = payload.showQR;
  } else {
    workspaceStore.qr.showQR = Boolean(workspaceStore.qr.qrCodeUrl);
  }
}

function setSelectionState(payload = {}) {
  if (Object.prototype.hasOwnProperty.call(payload, "activeChatId")) {
    workspaceStore.selection.activeChatId = normalizeString(payload.activeChatId);
  }
  if (Object.prototype.hasOwnProperty.call(payload, "activeRange")) {
    workspaceStore.selection.activeRange = normalizeString(payload.activeRange) || "all";
  }
  if (Object.prototype.hasOwnProperty.call(payload, "customRange")) {
    const customRange = payload.customRange && typeof payload.customRange === "object"
      ? payload.customRange
      : {};
    workspaceStore.selection.customRange = {
      start: normalizeString(customRange.start),
      end: normalizeString(customRange.end),
    };
  }
}

function setActiveStage(stage) {
  workspaceStore.ui.activeStage = normalizeStage(stage);
}

function resetWorkspaceState() {
  const reset = initialState();
  workspaceStore.relay = reset.relay;
  workspaceStore.sync = reset.sync;
  workspaceStore.qr = reset.qr;
  workspaceStore.selection = reset.selection;
  workspaceStore.ui = reset.ui;
}

export function useWorkspaceStore() {
  return workspaceStore;
}

export function useWorkspaceStoreActions() {
  return {
    setRelayStatus,
    setSyncProgress,
    setQrState,
    setSelectionState,
    setActiveStage,
    resetWorkspaceState,
  };
}

export { WORKSPACE_STAGES };
