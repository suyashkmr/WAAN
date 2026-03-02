// @ts-check

import {
  createExportOrchestrator,
  createDatasetRelayOrchestrator,
  createSelectionOrchestrator,
} from "./compositionAssembly/orchestrators.js";
import { createCompositionAssemblyApi } from "./compositionAssembly/apiSurface.js";

/**
 * @typedef {Record<string, any>} AnyRecord
 */

/**
 * @param {{
 *   dom: AnyRecord,
 *   state: AnyRecord,
 *   utils: AnyRecord,
 *   analytics: AnyRecord,
 *   constants: AnyRecord,
 *   wiring: AnyRecord,
 *   electronAPI?: AnyRecord,
 * }} params
 */
export function createAppCompositionAssembly({
  dom,
  state,
  utils,
  analytics,
  constants,
  wiring,
  electronAPI = /** @type {any} */ (globalThis.window)?.electronAPI,
}) {
  const exportRuntime = createExportOrchestrator({
    state,
    utils,
    analytics,
    constants,
    wiring,
  });

  const relayRuntime = createDatasetRelayOrchestrator({
    dom,
    state,
    utils,
    constants,
    wiring,
    electronAPI,
  });
  const handleChatSelectionChange = createSelectionOrchestrator({
    wiring,
    loadRemoteChat: relayRuntime.loadRemoteChat,
    updateStatus: state.updateStatus,
  });

  return createCompositionAssemblyApi({
    exportRuntime,
    relayRuntime,
    handleChatSelectionChange,
  });
}
