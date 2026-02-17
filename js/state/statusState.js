import { debounce } from "../utils.js";

let statusCallback = null;

export function setStatusCallback(callback) {
  statusCallback = debounce(callback, 50);
}

export function updateStatus(message, tone = "info") {
  if (statusCallback) {
    statusCallback(message, tone);
  }
}
