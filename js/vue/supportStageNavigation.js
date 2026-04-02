import { useWorkspaceStoreActions } from "../../src/store/useWorkspaceStore.js";

const workspaceStoreActions = useWorkspaceStoreActions();

/**
 * @param {any} globalScope
 */
export function openSupportMacosHelp(globalScope = globalThis) {
  workspaceStoreActions.setActiveStage("support");
  const documentRef = globalScope?.document;
  if (!documentRef) return;
  const targetId = "faq-macos-gatekeeper";
  const targetHash = `#${targetId}`;
  const setTimer = globalScope?.setTimeout ? globalScope.setTimeout.bind(globalScope) : globalThis.setTimeout.bind(globalThis);
  const scrollToTarget = () => {
    const target = documentRef.getElementById(targetId);
    if (!(target instanceof HTMLElement)) return false;
    target.scrollIntoView({ behavior: "smooth", block: "start" });
    if (typeof globalScope?.location?.hash === "string" && globalScope.location.hash !== targetHash) {
      globalScope.location.hash = targetHash;
    }
    return true;
  };
  setTimer(() => {
    if (scrollToTarget()) return;
    setTimer(() => {
      scrollToTarget();
    }, 60);
  }, 0);
}
