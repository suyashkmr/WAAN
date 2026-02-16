const { inspect } = require("util");

function formatErrorMessage(error, fallback = "Unknown error") {
  if (error instanceof Error) {
    if (typeof error.message === "string" && error.message.trim()) {
      return error.message;
    }
    return fallback;
  }
  if (typeof error === "string") {
    return error.trim() || fallback;
  }
  if (error && typeof error === "object") {
    const maybeMessage = error.message;
    if (typeof maybeMessage === "string" && maybeMessage.trim()) {
      return maybeMessage;
    }
    try {
      return JSON.stringify(error);
    } catch {
      return fallback;
    }
  }
  if (error == null) return fallback;
  return String(error);
}

function formatErrorDetails(error, fallback = "Unknown error") {
  const message = formatErrorMessage(error, fallback);
  if (error instanceof Error) {
    const name = error.name || "Error";
    const stack = typeof error.stack === "string" && error.stack.trim() ? error.stack : "";
    return stack ? `${name}: ${message}\n${stack}` : `${name}: ${message}`;
  }
  const type = error === null ? "null" : typeof error;
  const raw = inspect(error, { depth: 4, breakLength: 120 });
  return `NonError(${type}): ${message}; raw=${raw}`;
}

module.exports = {
  formatErrorMessage,
  formatErrorDetails,
};
