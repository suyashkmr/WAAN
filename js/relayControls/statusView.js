// @ts-check

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
        return `Starting ${relayServiceName}.`;
      case "waiting_qr":
        return "Waiting for phone link.";
      case "running":
        return status.account
          ? `Connected as ${formatRelayAccount(status.account)}.`
          : `${brandName} connected.`;
      default:
        return "Relay offline.";
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
  relayStatusViewRenderer = null,
}) {
  if (!relayBannerEl || !relayBannerMessage || !relayBannerMeta) return;
  const canRenderBanner = typeof relayStatusViewRenderer?.renderBanner === "function";
  if (!status) {
    relayBannerEl.dataset.status = "offline";
    relayStatusViewRenderer?.renderBanner?.({
      message: "Relay offline.",
      meta: "Start the relay, link your phone, then choose a chat.",
    });
    if (!canRenderBanner) {
      relayBannerMessage.textContent = "Relay offline.";
      relayBannerMeta.textContent = "Start the relay, link your phone, then choose a chat.";
    }
    return;
  }
  relayBannerEl.dataset.status = status.status || "unknown";
  const message = describeRelayStatusFn(status).message;
  const metaParts = [];
  if (status.account) {
    const accountLabel = formatRelayAccountFn(status.account) || "Linked account";
    metaParts.push(`Account: ${accountLabel}`);
  }
  if (status.chatsSyncedAt) {
    const relative = formatRelativeTime(status.chatsSyncedAt);
    metaParts.push(relative ? `Synced ${relative}` : `Synced ${formatDisplayDate(status.chatsSyncedAt)}`);
  } else {
    metaParts.push("Sync pending");
  }
  if (Number.isFinite(status.chatCount)) {
    metaParts.push(`${formatNumber(status.chatCount)} chats indexed`);
  }
  if (Number.isFinite(status.lastSyncDurationMs) && status.lastSyncDurationMs >= 0) {
    metaParts.push(`Last sync: ${formatNumber(status.lastSyncDurationMs)}ms`);
    if (status.lastSyncDurationMs >= SLOW_SYNC_THRESHOLD_MS) {
      metaParts.push(`Sync slowdown detected (${formatSyncDurationLabel(status.lastSyncDurationMs)})`);
    }
  }
  if (status.syncPath === "primary" || status.syncPath === "fallback") {
    metaParts.push(`Sync path: ${status.syncPath}`);
    if (status.syncPath === "fallback") {
      const reason = typeof status.lastSyncPathReason === "string" ? status.lastSyncPathReason.trim() : "";
      metaParts.push(`Fallback reason: ${reason || "Primary sync path unavailable."}`);
    }
  }
  const meta = metaParts.join(" · ") || "Relay ready.";
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
 *   relayStatusViewRenderer?: { renderOnboardingDetail?: (stepId: string, text: string, fallbackEl?: HTMLElement | null | undefined) => void } | null | undefined,
 * }} params
 */
export function updateRelayOnboarding({ status, relayOnboardingSteps, relayOnboardingStepDetails, relayStatusViewRenderer = null }) {
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
        let detailText = "Open the WAAN Relay app and press Start.";
        if (value === "complete") {
          detailText = "Relay is running.";
        } else if (value === "active") {
          detailText = "Launching the relay…";
        } else if (state === "error") {
          detailText = "Relay failed to launch. Try again.";
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
            ? "Phone linked."
            : value === "active"
              ? "Scan the QR code below."
              : "Open Linked Devices on your phone and scan the code.";
        relayStatusViewRenderer?.renderOnboardingDetail?.(String(id || ""), detailText, detail);
        if (!canRenderOnboardingDetail) detail.textContent = detailText;
      }
    } else if (id === "sync") {
      if (state === "running" && chatCount === 0) value = "active";
      else if (state === "running" && chatCount > 0) value = "complete";
      else value = "pending";
      if (detail) {
        const detailText =
          value === "complete"
            ? "Chats loaded."
            : value === "active"
              ? "Loading chats..."
              : "Load chats into WAAN.";
        relayStatusViewRenderer?.renderOnboardingDetail?.(String(id || ""), detailText, detail);
        if (!canRenderOnboardingDetail) detail.textContent = detailText;
      }
    }
    step.dataset.state = value;
  });
}
