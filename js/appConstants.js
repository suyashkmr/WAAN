export const SECTION_NAV_ITEMS = [
  { id: "setup-stage", label: "Setup" },
  { id: "workspace-stage", label: "Workspace" },
  { id: "guided-findings-stage", label: "Findings" },
  { id: "insight-highlights", label: "Highlights" },
  { id: "participants", label: "Participants" },
  { id: "hourly-activity", label: "Rhythm" },
  { id: "deep-dive-stage", label: "Tools" },
  { id: "search-panel", label: "Search" },
  { id: "saved-views-card", label: "Saved" },
  { id: "message-types", label: "Message Mix" },
  { id: "polls-card", label: "Polls" },
  { id: "faq-card", label: "Support" },
];

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
