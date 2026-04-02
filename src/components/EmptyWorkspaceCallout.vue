<template>
    <div id="dataset-empty-callout" class="dataset-empty dataset-empty--inline dataset-empty--strip hidden" aria-live="polite">
        <div class="dataset-empty-copy dataset-empty-copy--inline">
            <div class="dataset-empty-status-block">
                <p class="dataset-empty-kicker">Setup status</p>
                
                <!-- Hero Status (for visibility during setup) -->
                <div class="dataset-empty-status-row">
                    <div id="hero-status-badge" class="hero-status-badge px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider bg-gray-500 text-white">Offline</div>
                    <div id="hero-sync-dot" class="hero-sync-dot w-2 h-2 rounded-full bg-gray-500" hidden></div>
                    <div class="flex flex-col">
                        <span id="hero-status-copy" class="hero-status-copy text-sm font-semibold text-[var(--text)]">Relay is offline</span>
                        <span id="hero-status-meta-copy" class="hero-status-meta text-[10px] text-[var(--text-muted)]">Connect to start analysis</span>
                    </div>
                </div>
                <div class="dataset-empty-inline-summary">
                    <h3 id="dataset-empty-heading" class="dataset-empty-heading">Workspace locked</h3>
                    <p id="dataset-empty-copy">Start relay to unlock chat and range controls.</p>
                </div>
            </div>
            <div class="dataset-empty-progress-block">
                <div class="hero-milestones" id="hero-milestones" aria-label="Relay setup progress">
                    <span class="hero-milestone" data-step="connect" data-state="active">Connect</span>
                    <span class="hero-milestone" data-step="sync" data-state="pending">Sync</span>
                    <span class="hero-milestone" data-step="ready" data-state="pending">Ready</span>
                </div>
                <div class="first-run-setup first-run-setup--inline" id="first-run-setup" aria-label="First run setup guide">
                    <ol class="first-run-steps">
                        <li class="first-run-step" data-setup-step="connect" data-state="active">
                            <span class="first-run-step-index">1</span>
                            <span class="first-run-step-copy">Start the relay.</span>
                        </li>
                        <li class="first-run-step" data-setup-step="link" data-state="pending">
                            <span class="first-run-step-index">2</span>
                            <span class="first-run-step-copy">Link your phone.</span>
                        </li>
                        <li class="first-run-step" data-setup-step="load" data-state="pending">
                            <span class="first-run-step-index">3</span>
                            <span class="first-run-step-copy">Choose a chat.</span>
                        </li>
                    </ol>
                    <div class="first-run-actions">
                        <button type="button" class="wa-button wa-button--ghost dense" id="first-run-open-relay">
                            Open relay
                        </button>
                        <button type="button" class="wa-button wa-button--primary dense" id="first-run-primary-action">
                            Start relay
                        </button>
                        <a class="ghost-button tiny" id="first-run-macos-help-link" href="#faq-macos-gatekeeper" @click.prevent="openMacosLaunchHelp">
                            macOS launch help
                        </a>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup>
import { useWorkspaceStoreActions } from "../store/useWorkspaceStore.js";

const workspaceStoreActions = useWorkspaceStoreActions();

function openMacosLaunchHelp() {
  workspaceStoreActions.setActiveStage("support");
  if (typeof window === "undefined") return;
  const hash = "#faq-macos-gatekeeper";
  const scrollToSupportFaq = () => {
    const target = document.getElementById("faq-macos-gatekeeper");
    if (!target) return false;
    target.scrollIntoView({ behavior: "smooth", block: "start" });
    if (window.location.hash !== hash) {
      window.location.hash = hash;
    }
    return true;
  };
  setTimeout(() => {
    if (scrollToSupportFaq()) return;
    setTimeout(() => {
      scrollToSupportFaq();
    }, 60);
  }, 0);
}
</script>
