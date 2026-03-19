// @ts-check

import { UI_COPY } from "../uiCopy.js";

export function createHeroViewState() {
  return {
    badgeText: "",
    badgeState: "offline",
    copyText: "",
    syncMetaState: "idle",
    syncMetaMessage: UI_COPY.relay.offlineMeta,
    milestones: {
      connect: "pending",
      sync: "pending",
      ready: "pending",
    },
    readyCelebrating: false,
  };
}

/**
 * @param {ReturnType<typeof createHeroViewState>} heroViewState
 * @param {HTMLElement | null | undefined} heroStatusBadge
 * @param {string} state
 */
export function setHeroBadgeState(heroViewState, heroStatusBadge, state) {
  heroViewState.badgeState = state;
  if (!heroStatusBadge) return;
  heroStatusBadge.dataset.state = state;
}

/**
 * @param {ReturnType<typeof createHeroViewState>} heroViewState
 * @param {{ connect?: string, sync?: string, ready?: string }} nextMilestones
 */
export function setHeroMilestones(heroViewState, nextMilestones) {
  heroViewState.milestones = {
    connect: nextMilestones.connect ?? heroViewState.milestones.connect,
    sync: nextMilestones.sync ?? heroViewState.milestones.sync,
    ready: nextMilestones.ready ?? heroViewState.milestones.ready,
  };
}
