export const SECTION_NAV_ITEMS = [
  { id: "hero-panel", label: "Home" },
  { id: "relay-status-banner", label: "Relay Status" },
  { id: "actions-toolbar", label: "Actions" },
  { id: "summary", label: "Overview" },
  { id: "insight-highlights", label: "Highlights" },
  { id: "participants", label: "Participants" },
  { id: "hourly-activity", label: "Hourly Activity" },
  { id: "daily-activity", label: "Day by Day" },
  { id: "weekly-trend", label: "Week by Week" },
  { id: "weekday-trend", label: "Day of Week" },
  { id: "timeofday-trend", label: "Time of Day" },
  { id: "sentiment-overview", label: "Mood" },
  { id: "message-types", label: "Message Mix" },
  { id: "polls-card", label: "Polls" },
  { id: "saved-views-card", label: "Saved Views" },
  { id: "search-panel", label: "Search Messages" },
  { id: "faq-card", label: "FAQ" },
];

export const TIME_OF_DAY_BANDS = [
  { id: "late-night", label: "Late Night", start: 0, end: 4 },
  { id: "early-morning", label: "Early Morning", start: 5, end: 7 },
  { id: "morning", label: "Morning", start: 8, end: 11 },
  { id: "afternoon", label: "Afternoon", start: 12, end: 16 },
  { id: "evening", label: "Evening", start: 17, end: 20 },
  { id: "late-evening", label: "Late Evening", start: 21, end: 23 },
];

export const TIME_OF_DAY_SPAN_WINDOW = 3;

export const SEARCH_RESULT_LIMIT = 200;

export const ONBOARDING_STEPS = [
  {
    copy: "Use the relay banner to connect and keep an eye on status messages.",
    target: "#relay-status-banner",
  },
  {
    copy: "Track connection details and sync activity with the relay log drawer.",
    target: "#log-drawer-toggle",
  },
  {
    copy: "Need extra breathing room? Toggle Compact mode right from the toolbar.",
    target: "#compact-toggle",
  },
  {
    copy: "Guided insights highlight notable trends for your dataset.",
    target: "#insight-highlights",
  },
];
