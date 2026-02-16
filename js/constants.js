export const SYSTEM_PATTERNS = [
  /joined using a group link\.?$/i,
  /joined using your invite\.?$/i,
  /joined from the community\.?$/i,
  /requested to join\.?$/i,
];

export const SYSTEM_JOIN_TEXT_PATTERNS = SYSTEM_PATTERNS.slice(0, 3);
export const SYSTEM_JOIN_REQUEST_TEXT_PATTERNS = [SYSTEM_PATTERNS[3]];

export const SYSTEM_JOIN_SUBTYPES = new Set(["linked_group_join", "v4_add_invite_join"]);
export const SYSTEM_JOIN_REQUEST_SUBTYPES = new Set(["membership_approval_request"]);
export const SYSTEM_ADD_SUBTYPES = new Set(["add", "invite"]);
export const SYSTEM_REMOVE_SUBTYPES = new Set(["remove"]);
export const SYSTEM_LEAVE_SUBTYPES = new Set(["leave"]);
export const SYSTEM_CHANGE_SUBTYPES = new Set([
  "subject",
  "description",
  "announce",
  "icon",
  "create",
  "limit_sharing_system_message",
  "member_add_mode",
  "membership_approval",
  "admin",
  "restrict",
]);

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
