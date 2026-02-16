export function describeRelayStatus(status, { relayServiceName, brandName, formatRelayAccount }) {
  const baseMessage = (() => {
    switch (status.status) {
      case "starting":
        return `Starting ${relayServiceName}. Launching the relay browser…`;
      case "waiting_qr":
        return "Waiting for you to scan the QR code from your phone.";
      case "running":
        return status.account
          ? `Connected as ${formatRelayAccount(status.account)}.`
          : `Connected to ${brandName}.`;
      default:
        return "Relay is offline.";
    }
  })();
  return { message: baseMessage };
}

function normalizeAccountId(value) {
  if (!value) return "";
  if (typeof value === "string") return value.replace(/@[\w.]+$/, "");
  if (typeof value === "object") {
    if (typeof value._serialized === "string") return value._serialized.replace(/@[\w.]+$/, "");
    if (typeof value.user === "string" && typeof value.server === "string") {
      return `${value.user}`.replace(/@[\w.]+$/, "");
    }
  }
  return "";
}

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
}) {
  if (!relayBannerEl || !relayBannerMessage || !relayBannerMeta) return;
  if (!status) {
    relayBannerEl.dataset.status = "offline";
    relayBannerMessage.textContent = "Relay offline.";
    relayBannerMeta.textContent = "Launch the relay desktop app, press Connect, then pick a mirrored chat.";
    return;
  }
  relayBannerEl.dataset.status = status.status || "unknown";
  relayBannerMessage.textContent = describeRelayStatusFn(status).message;
  const metaParts = [];
  if (status.account) {
    const accountLabel = formatRelayAccountFn(status.account) || "Linked account";
    metaParts.push(`Account: ${accountLabel}`);
  }
  if (status.chatsSyncedAt) {
    const relative = formatRelativeTime(status.chatsSyncedAt);
    metaParts.push(relative ? `Synced ${relative}` : `Synced ${formatDisplayDate(status.chatsSyncedAt)}`);
  } else {
    metaParts.push("Waiting to sync chats");
  }
  if (Number.isFinite(status.chatCount)) {
    metaParts.push(`${formatNumber(status.chatCount)} chats indexed`);
  }
  relayBannerMeta.textContent = metaParts.join(" · ") || "Relay ready.";
}

export function updateRelayOnboarding({ status, relayOnboardingSteps }) {
  if (!relayOnboardingSteps?.length) return;
  const state = status?.status || "stopped";
  const chatCount = Number(status?.chatCount ?? 0);
  relayOnboardingSteps.forEach(step => {
    const id = step.dataset.stepId;
    let value = "pending";
    if (id === "start") {
      if (!status) value = "pending";
      else if (state === "starting") value = "active";
      else if (state === "running" || state === "waiting_qr") value = "complete";
      else value = "pending";
      const detail = step.querySelector(".relay-step-detail");
      if (detail) {
        if (value === "complete") {
          detail.textContent = "Relay is running.";
        } else if (value === "active") {
          detail.textContent = "Launching the service…";
        } else if (state === "error") {
          detail.textContent = "Relay failed to launch. Retry.";
        } else {
          detail.textContent = "Open the ChatScope Relay app and press Start.";
        }
      }
    } else if (id === "qr") {
      if (!status) value = "pending";
      else if (state === "waiting_qr") value = "active";
      else if (state === "running") value = "complete";
      const detail = step.querySelector(".relay-step-detail");
      if (detail) {
        detail.textContent =
          value === "complete"
            ? "Phone linked."
            : value === "active"
              ? "Scan the QR code shown below."
              : "Open chat app → Linked Devices on your phone and scan the code.";
      }
    } else if (id === "sync") {
      if (state === "running" && chatCount === 0) value = "active";
      else if (state === "running" && chatCount > 0) value = "complete";
      else value = "pending";
      const detail = step.querySelector(".relay-step-detail");
      if (detail) {
        detail.textContent =
          value === "complete"
            ? "Chats synced."
            : value === "active"
              ? "Syncing chats…"
              : "Sync chats into ChatScope.";
      }
    }
    step.dataset.state = value;
  });
}
