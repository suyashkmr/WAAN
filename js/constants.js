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
