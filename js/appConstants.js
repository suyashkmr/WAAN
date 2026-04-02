export const ACTIVE_STAGE_CHANGED_EVENT = "waan:active-stage-changed";
export const EXPORT_SUCCESS_EVENT = "waan:export-success";
export const PRIMARY_EXPORT_BUTTON_IDS = Object.freeze([
  "download-pdf",
  "download-markdown-report",
  "download-slides-report",
]);

export const SECTION_NAV_ITEMS_BY_STAGE = Object.freeze({
  workspace: Object.freeze([
    { id: "workspace-stage", label: "Workspace" },
  ]),
  findings: Object.freeze([
    { id: "guided-findings-stage", label: "Findings" },
    { id: "insight-highlights", label: "Highlights" },
    { id: "participants", label: "Participants" },
    { id: "hourly-activity", label: "Rhythm" },
  ]),
  deepdive: Object.freeze([
    { id: "deep-dive-stage", label: "Tools" },
    { id: "message-types", label: "Message Mix" },
    { id: "polls-card", label: "Polls" },
    { id: "search-panel", label: "Search" },
    { id: "saved-views-card", label: "Saved" },
  ]),
  support: Object.freeze([
    { id: "faq-card", label: "Support" },
  ]),
});

export const SECTION_NAV_ITEMS = Object.freeze(
  Object.values(SECTION_NAV_ITEMS_BY_STAGE).flatMap(items => items),
);

export const SEARCH_RESULT_LIMIT = 200;

export const ONBOARDING_STEPS = [
  {
    copy: "Start the relay in the setup stage.",
    target: "#relay-status-banner",
  },
  {
    copy: "Scan the QR code to link your phone.",
    target: "#relay-qr-container",
  },
  {
    copy: "Pick a chat from Loaded chats when the workspace unlocks.",
    target: "#chat-selector",
  },
  {
    copy: "Open relay logs if sync stalls.",
    target: "#log-drawer-toggle",
  },
];
