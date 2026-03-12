import { mergePageControlState, snapshotPageControlState } from "./shellPageControlsState.js";
import { mergeLegacyPageControlRefs, resolveLegacyPageControlRefs, resolvePageControlTarget } from "./shellPageControlsUtils.js";

export function refreshLegacyRefs(pageControlsBridge, controlsEl) {
  const legacyRefs = mergeLegacyPageControlRefs(
    pageControlsBridge?.legacyRefs,
    resolveLegacyPageControlRefs(controlsEl),
  );
  pageControlsBridge.legacyRefs = legacyRefs;
  return legacyRefs;
}

export function syncPageControlsBridgeState(
  pageControlsBridge,
  controlsEl,
  globalScope,
  nextState,
  { syncLegacyPageControlRefs, syncPrimePageControls },
) {
  const legacyRefs = refreshLegacyRefs(pageControlsBridge, controlsEl);
  pageControlsBridge.state = mergePageControlState(pageControlsBridge.state, nextState);

  const hasConnectedLegacyRef = Boolean(
    legacyRefs.chatSelector?.isConnected ||
    legacyRefs.rangeSelect?.isConnected ||
    legacyRefs.customStartInput?.isConnected ||
    legacyRefs.customEndInput?.isConnected ||
    legacyRefs.customApplyButton?.isConnected ||
    legacyRefs.customControls?.isConnected
  );
  if (hasConnectedLegacyRef) {
    syncLegacyPageControlRefs(legacyRefs, nextState);
  }

  const ownsInteractions = syncPrimePageControls(legacyRefs, pageControlsBridge, globalScope);
  pageControlsBridge.ownsPageControlInteractions = ownsInteractions;
  if (!ownsInteractions) {
    pageControlsBridge.state = snapshotPageControlState(legacyRefs, pageControlsBridge.state);
  }
  return ownsInteractions;
}

export function readPageControlsBridgeState(pageControlsBridge, controlsEl) {
  if (!pageControlsBridge.state || !pageControlsBridge.ownsPageControlInteractions) {
    const legacyRefs = refreshLegacyRefs(pageControlsBridge, controlsEl);
    pageControlsBridge.state = snapshotPageControlState(legacyRefs, pageControlsBridge.state);
  }
  return {
    chatValue: pageControlsBridge.state?.chatValue ?? "",
    rangeValue: pageControlsBridge.state?.rangeValue ?? "all",
    customStart: pageControlsBridge.state?.customStart ?? "",
    customEnd: pageControlsBridge.state?.customEnd ?? "",
  };
}

export function interactWithPageControl(pageControlsBridge, controlsEl, controlKey, methodName) {
  const legacyRefs = refreshLegacyRefs(pageControlsBridge, controlsEl);
  const target = resolvePageControlTarget(
    legacyRefs,
    controlsEl.ownerDocument,
    controlKey,
    pageControlsBridge.ownsPageControlInteractions,
  );
  const method = target?.[methodName];
  if (typeof method !== "function") return false;
  if (methodName === "scrollIntoView") {
    method.call(target, { behavior: "auto", block: "center" });
  } else {
    method.call(target);
  }
  return true;
}
