<template>
    <div id="dataset-empty-callout" class="dataset-empty panel-state panel-state--empty shell-lane shell-lane--secondary shell-lane--quiet hidden" aria-live="polite">
        <div class="empty-illustration" aria-hidden="true">
            <span></span>
            <span></span>
            <span></span>
        </div>
        <div class="dataset-empty-copy">
            <p class="dataset-empty-kicker">Workspace state</p>
            <h3 id="dataset-empty-heading">Workspace locked</h3>
            <p id="dataset-empty-copy">Start relay to unlock chat and range controls.</p>
            <div class="first-run-setup" id="first-run-setup" aria-label="First run setup guide">
                <ol class="first-run-steps" hidden>
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
                    <button type="button" class="ghost-button tiny" id="first-run-open-relay">
                        Open relay
                    </button>
                    <button type="button" class="ghost-button tiny primary" id="first-run-primary-action">
                        Start relay
                    </button>
                    <a class="ghost-button tiny" id="first-run-macos-help-link" href="#faq-macos-gatekeeper">
                        macOS launch help
                    </a>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup>
</script>
