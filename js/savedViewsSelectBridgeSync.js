import { syncPrimeSelectBridgeValue } from "./vue/primeSelectBridge.js";

export function syncSavedViewListSelection(selectEl, value, dataAvailable) {
  syncPrimeSelectBridgeValue({
    selectEl,
    value,
    disabled: !dataAvailable,
  });
}
