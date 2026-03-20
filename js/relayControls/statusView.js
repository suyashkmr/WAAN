// @ts-check

import { UI_COPY } from "../uiCopy.js";

/**
 * @typedef {Record<string, any>} AnyRecord
 */
const SLOW_SYNC_THRESHOLD_MS = 12_000;

/**
 * @param {number} ms
 */
function formatSyncDurationLabel(ms) {
  if (!Number.isFinite(ms) || ms < 0) return "";
  if (ms >= 10_000) {
    return `${Math.round(ms / 1000)}s`;
  }
  return `${Math.round(ms)}ms`;
}

/**
 * @param {AnyRecord} status
 * @param {{ relayServiceName: string, brandName: string, formatRelayAccount: (account: any) => string }} options
 */
export function describeRelayStatus(status, { relayServiceName, brandName, formatRelayAccount }) {
  const baseMessage = (() => {
    switch (status.status) {
      case "starting":
        return UI_COPY.relay.startingStatus;
      case "waiting_qr":
        return UI_COPY.relay.waitingPhoneStatus;
      case "running":
        return status.account
          ? `Connected: ${formatRelayAccount(status.account)}.`
          : "Connected.";
      default:
        return UI_COPY.relay.offlineStatus;
    }
  })();
  return { message: baseMessage };
}

/**
 * @param {unknown} value
 */
function normalizeAccountId(value) {
  if (!value) return "";
  if (typeof value === "string") return value.replace(/@[\w.]+$/, "");
  if (typeof value === "object") {
    const objectValue = /** @type {any} */ (value);
    if (typeof objectValue._serialized === "string") return objectValue._serialized.replace(/@[\w.]+$/, "");
    if (typeof objectValue.user === "string" && typeof objectValue.server === "string") {
      return `${objectValue.user}`.replace(/@[\w.]+$/, "");
    }
  }
  return "";
}

/**
 * @param {AnyRecord | null | undefined} account
 * @param {string} relayClientLabel
 */
export function formatRelayAccount(account, relayClientLabel) {
  if (!account) return "";
  const name =
    account.name || account.pushName || account.pushname || account.displayName || account.formattedName;
  const number =
    normalizeAccountId(account.id) ||
    normalizeAccountId(account.jid) ||
    normalizeAccountId(account.me) ||
    normalizeAccountId(account.wid);
  if (name && number) return `${name} (${number})`;
  if (name) return name;
  return number || relayClientLabel;
}

/**
 * @param {{
 *   status: AnyRecord | null | undefined,
 *   relayBannerEl: HTMLElement | null | undefined,
 *   relayBannerMessage: HTMLElement | null | undefined,
 *   relayBannerMeta: HTMLElement | null | undefined,
 *   describeRelayStatusFn: (status: any) => { message: string },
 *   formatRelayAccountFn: (account: any) => string,
 *   formatRelativeTime: (value: any) => string,
 *   formatDisplayDate: (value: any) => string,
 *   formatNumber: (value: number) => string,
 *   hasCompletedRemoteChatFetch?: boolean | null | undefined,
 *   relayStatusViewRenderer?: { renderBanner?: (payload: { message?: string, meta?: string }) => void } | null | undefined,
 * }} params
 */
export function updateRelayBanner({
  status,
  relayBannerEl,
  relayBannerMessage,
  relayBannerMeta,
  describeRelayStatusFn,
  formatRelayAccountFn,
  formatRelativeTime,
  formatDisplayDate,
  formatNumber,
  hasCompletedRemoteChatFetch = true,
  relayStatusViewRenderer = null,
}) {
  if (!relayBannerEl || !relayBannerMessage || !relayBannerMeta) return;
  const canRenderBanner = typeof relayStatusViewRenderer?.renderBanner === "function";
  if (!status) {
    relayBannerEl.dataset.status = "offline";
    relayStatusViewRenderer?.renderBanner?.({
      message: "Relay offline.",
      meta: UI_COPY.relay.banner.offlineMeta,
    });
    if (!canRenderBanner) {
      relayBannerMessage.textContent = UI_COPY.relay.offlineStatus;
      relayBannerMeta.textContent = UI_COPY.relay.banner.offlineMeta;
    }
    return;
  }
  relayBannerEl.dataset.status = status.status || "unknown";
  const message = describeRelayStatusFn(status).message;
  if (status.status === "starting") {
    const meta = UI_COPY.relay.banner.startingMeta;
    relayStatusViewRenderer?.renderBanner?.({ message, meta });
    if (!canRenderBanner) {
      relayBannerMessage.textContent = message;
      relayBannerMeta.textContent = meta;
    }
    return;
  }
  if (status.status === "waiting_qr") {
    const meta = UI_COPY.relay.banner.waitingMeta;
    relayStatusViewRenderer?.renderBanner?.({ message, meta });
    if (!canRenderBanner) {
      relayBannerMessage.textContent = message;
      relayBannerMeta.textContent = meta;
    }
    return;
  }
  const metaParts = [];
  if (status.account) {
    const accountLabel = formatRelayAccountFn(status.account) || "Linked account";
    metaParts.push(accountLabel);
  }
  if (status.syncingChats) {
    metaParts.push(UI_COPY.relay.banner.loadingMeta);
  } else if (Number.isFinite(status.chatCount) && status.chatCount <= 0 && hasCompletedRemoteChatFetch) {
    metaParts.push(UI_COPY.relay.banner.emptyMeta);
  } else if (Number.isFinite(status.chatCount) && status.chatCount <= 0) {
    metaParts.push(UI_COPY.relay.banner.loadingMeta);
  } else if (status.chatsSyncedAt) {
    const relative = formatRelativeTime(status.chatsSyncedAt);
    metaParts.push(relative ? `Synced ${relative}` : formatDisplayDate(status.chatsSyncedAt));
  } else {
    metaParts.push(UI_COPY.relay.banner.noChatMeta);
  }
  if (Number.isFinite(status.chatCount)) {
    metaParts.push(`${formatNumber(status.chatCount)} chats`);
  }
  if (Number.isFinite(status.lastSyncDurationMs) && status.lastSyncDurationMs >= 0) {
    metaParts.push(`Last sync ${formatNumber(status.lastSyncDurationMs)}ms`);
    if (status.lastSyncDurationMs >= SLOW_SYNC_THRESHOLD_MS) {
      metaParts.push(`Slow sync ${formatSyncDurationLabel(status.lastSyncDurationMs)}`);
    }
  }
  if (status.syncPath === "primary" || status.syncPath === "fallback") {
    metaParts.push(status.syncPath === "fallback" ? "Fallback sync" : "Primary sync");
    if (status.syncPath === "fallback") {
      const reason = typeof status.lastSyncPathReason === "string" ? status.lastSyncPathReason.trim() : "";
      metaParts.push(reason || "Primary sync unavailable.");
    }
  }
  const meta = metaParts.join(" · ") || UI_COPY.relay.runningReadyBannerFallback;
  relayStatusViewRenderer?.renderBanner?.({ message, meta });
  if (!canRenderBanner) {
    relayBannerMessage.textContent = message;
    relayBannerMeta.textContent = meta;
  }
}

/**
 * @param {{
 *   status: AnyRecord | null | undefined,
 *   relayOnboardingSteps: Array<HTMLElement> | null | undefined,
 *   relayOnboardingStepDetails?: Record<string, HTMLElement | null> | null | undefined,
 *   hasCompletedRemoteChatFetch?: boolean | null | undefined,
 *   relayStatusViewRenderer?: { renderOnboardingDetail?: (stepId: string, text: string, fallbackEl?: HTMLElement | null | undefined) => void } | null | undefined,
 * }} params
 */
export function updateRelayOnboarding({
  status,
  relayOnboardingSteps,
  relayOnboardingStepDetails,
  hasCompletedRemoteChatFetch = true,
  relayStatusViewRenderer = null,
}) {
  if (!relayOnboardingSteps?.length) return;
  const state = status?.status || "stopped";
  const chatCount = Number(status?.chatCount ?? 0);
  const canRenderOnboardingDetail = typeof relayStatusViewRenderer?.renderOnboardingDetail === "function";
  relayOnboardingSteps.forEach(step => {
    const id = step.dataset.stepId;
    const detail =
      relayOnboardingStepDetails?.[String(id || "")] ??
      /** @type {HTMLElement | null} */ (step.querySelector(".relay-step-detail"));
    let value = "pending";
    if (id === "start") {
      if (!status) value = "pending";
      else if (state === "starting") value = "active";
      else if (state === "running" || state === "waiting_qr") value = "complete";
      else value = "pending";
      if (detail) {
        let detailText = UI_COPY.relay.onboarding.startPending;
        if (value === "complete") {
          detailText = UI_COPY.relay.onboarding.startComplete;
        } else if (value === "active") {
          detailText = UI_COPY.relay.onboarding.startActive;
        } else if (state === "error") {
          detailText = UI_COPY.relay.onboarding.startError;
        }
        relayStatusViewRenderer?.renderOnboardingDetail?.(String(id || ""), detailText, detail);
        if (!canRenderOnboardingDetail) detail.textContent = detailText;
      }
    } else if (id === "qr") {
      if (!status) value = "pending";
      else if (state === "waiting_qr") value = "active";
      else if (state === "running") value = "complete";
      if (detail) {
        const detailText =
          value === "complete"
            ? UI_COPY.relay.onboarding.qrComplete
            : value === "active"
              ? UI_COPY.relay.onboarding.qrActive
              : UI_COPY.relay.onboarding.qrPending;
        relayStatusViewRenderer?.renderOnboardingDetail?.(String(id || ""), detailText, detail);
        if (!canRenderOnboardingDetail) detail.textContent = detailText;
      }
    } else if (id === "sync") {
      if (state === "running" && Boolean(status?.syncingChats)) value = "active";
      else if (state === "running" && (chatCount > 0 || hasCompletedRemoteChatFetch)) value = "complete";
      else value = "pending";
      if (detail) {
        const detailText =
          value === "complete"
            ? UI_COPY.relay.onboarding.syncComplete
            : value === "active"
              ? UI_COPY.relay.onboarding.syncActive
              : UI_COPY.relay.onboarding.syncPending;
        relayStatusViewRenderer?.renderOnboardingDetail?.(String(id || ""), detailText, detail);
        if (!canRenderOnboardingDetail) detail.textContent = detailText;
      }
    }
    step.dataset.state = value;
  });
}
