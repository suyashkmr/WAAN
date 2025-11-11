export const MESSAGE_START = /^(\d{1,2})\/(\d{1,2})\/(\d{2,4}), (\d{1,2}):(\d{2})(?: (AM|PM|am|pm))? - (.*)$/;

export const SYSTEM_PREFIXES = [
  "Messages and calls are end-to-end encrypted",
  "You created the group",
  "You changed",
  "You added",
  "You removed",
  "You left",
  "You invited",
  "You deleted",
  "You turned",
  "You blocked",
  "You unblocked",
  "You made",
  "You enabled",
  "You disabled",
  "You accepted",
  "You rejected",
  "You reported",
  "You requested",
  "You sent",
  "Missed voice call",
  "Waiting for this message",
];

export const SYSTEM_PATTERNS = [
  /joined using a group link\.?$/i,
  /joined using your invite\.?$/i,
  /joined from the community\.?$/i,
  /requested to join\.?$/i,
];

export const SYSTEM_JOIN_TEXT_PATTERNS = SYSTEM_PATTERNS.slice(0, 3);
export const SYSTEM_JOIN_REQUEST_TEXT_PATTERNS = [SYSTEM_PATTERNS[3]];

export const SYSTEM_JOIN_SUBTYPES = new Set(["linked_group_join"]);
export const SYSTEM_JOIN_REQUEST_SUBTYPES = new Set(["membership_approval_request"]);
export const SYSTEM_ADD_SUBTYPES = new Set(["add", "invite"]);
export const SYSTEM_REMOVE_SUBTYPES = new Set(["remove"]);
export const SYSTEM_LEAVE_SUBTYPES = new Set(["leave"]);
export const SYSTEM_CHANGE_SUBTYPES = new Set(["subject", "description", "announce"]);

export const WEEKDAY_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
export const WEEKDAY_LONG = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];
