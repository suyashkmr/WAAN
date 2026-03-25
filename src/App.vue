<template>
  <!-- Global Progress Bar -->
  <div id="global-progress" aria-live="polite" class="hidden fixed top-0 left-0 w-full h-1 bg-[var(--surface-sunken)] z-[100] overflow-hidden">
    <div class="h-full bg-[var(--accent)] w-1/3 animate-pulse transition-all"></div>
    <span class="sr-only" id="global-progress-label">Working…</span>
  </div>

  <!-- Section Navigation Rail -->
  <nav class="section-nav" aria-label="Page sections">
    <div class="section-nav-inner"></div>
  </nav>

  <main class="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 flex flex-col gap-16">
    
    <!-- Workspace Stage -->
    <section class="flex flex-col gap-10 w-full opacity-0 animate-fade-in-up" data-stage="workspace" aria-labelledby="workspace-stage-title" style="animation-delay: 50ms;">
      <!-- Stage Header -->
      <div class="flex flex-col gap-2 pb-4 border-b border-[var(--border)]">
        <h2 id="workspace-stage-title" class="text-3xl font-display font-semibold text-[var(--text)] m-0">Workspace</h2>
      </div>

      <section class="flex flex-col gap-6 w-full" id="workspace-stage" aria-label="Workspace" data-nav-target="workspace">
        <div class="workspace-stage-grid flex flex-col lg:flex-row gap-8 lg:items-start" id="workspace-stage-grid">
          
          <WorkspaceSidebar />

          <div class="workspace-command-surface flex-1 w-full min-h-[400px] flex items-center justify-center bg-[var(--surface-sunken)] border border-[var(--border)] rounded-xl relative shadow-inner">
            <EmptyWorkspaceCallout />
          </div>

        </div>
        <div id="data-status" class="hidden px-4 py-3 bg-[var(--surface-sunken)] border border-[var(--border)] text-[var(--text)] text-sm rounded-lg" aria-live="polite"></div>
      </section>
    </section>

    <FindingsStage class="opacity-0 animate-fade-in-up" style="animation-delay: 150ms;" />

    <DeepDiveStage class="opacity-0 animate-fade-in-up" style="animation-delay: 250ms;" />

    <!-- Support Stage -->
    <section class="flex flex-col gap-10 w-full opacity-0 animate-fade-in-up" data-stage="support" aria-labelledby="support-stage-title" style="animation-delay: 350ms;">
      <div class="flex flex-col gap-2 pb-4 border-b border-[var(--border)]">
        <h2 id="support-stage-title" class="text-3xl font-display font-semibold text-[var(--text)] m-0">Support</h2>
      </div>

      <!-- FAQ Card -->
      <section class="bg-[var(--card-bg)] border border-[var(--border)] rounded-xl shadow-card overflow-hidden flex flex-col w-full" id="faq-card" data-nav-target="faq" data-accent="faq" data-vue-shell-mount="card-shell">
        <div class="flex items-center justify-between p-5 border-b border-[var(--border)] bg-[var(--surface-sunken)]">
          <div class="flex items-center gap-3">
            <h2 class="text-[var(--text)] font-semibold flex items-center gap-2 m-0">
              <span aria-hidden="true" class="text-[var(--accent)] flex">
                <svg viewBox="0 0 24 24" class="w-5 h-5 fill-current"><path d="M11 18h2v2h-2zm1-16a9 9 0 0 0-9 9h2a7 7 0 1 1 9.9 6.32l-.9.44V20h2v-1.1a9 9 0 0 0-4-17.9z" /></svg>
              </span>
              Recovery help
            </h2>
          </div>
          <div class="flex items-center gap-2">
                <button type="button" class="card-toggle w-8 h-8 flex items-center justify-center rounded-md hover:bg-[var(--surface-hover)] text-[var(--text-muted)] transition-colors" aria-expanded="true" data-target="faq-content" title="Collapse or expand recovery help">
                  <svg class="w-4 h-4 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/></svg>
                </button>
              </div>
        </div>
        <div class="p-6 flex flex-col gap-6" id="faq-content">
          <ul class="flex flex-col gap-6 m-0 p-0 list-none text-[var(--text)] text-sm leading-relaxed" id="faq-list">
            <li class="flex flex-col gap-2 pb-4 border-b border-[var(--border)]">
              <h3 class="font-semibold text-base m-0 text-[var(--text)]">Do I need Chrome or Chromium installed for relay sync?</h3>
              <p class="m-0 text-[var(--text-muted)]">Yes. Install Chrome or Chromium locally, then relaunch <code class="bg-[var(--surface)] border border-[var(--border)] px-1.5 py-0.5 rounded text-xs text-[var(--accent)] font-mono">WAAN.app</code> if relay will not start on a fresh Mac.</p>
            </li>
            <li class="flex flex-col gap-2 pb-4 border-b border-[var(--border)]" id="faq-macos-gatekeeper">
              <h3 class="font-semibold text-base m-0 text-[var(--text)]">macOS says the relay app is damaged or from an unidentified developer. What should I do?</h3>
              <p class="m-0 text-[var(--text-muted)]">Open <code class="bg-[var(--surface)] border border-[var(--border)] px-1.5 py-0.5 rounded text-xs text-[var(--accent)] font-mono">WAAN.app</code> from Finder, then allow it in System Settings → Privacy & Security with <em class="text-[var(--text)] font-medium">Open Anyway</em>. If it is still blocked, Control-click the app once and choose <em class="text-[var(--text)] font-medium">Open</em>. If no override appears, make sure the app is in <code class="bg-[var(--surface)] border border-[var(--border)] px-1.5 py-0.5 rounded text-xs text-[var(--accent)] font-mono">/Applications/WAAN.app</code>, then run <code class="bg-[var(--surface)] border border-[var(--border)] px-1.5 py-0.5 rounded text-xs text-[var(--accent)] font-mono">xattr -dr com.apple.quarantine "/Applications/WAAN.app"</code> and reopen it from Finder.</p>
            </li>
            <li class="flex flex-col gap-2 pb-4 border-b border-[var(--border)]" id="faq-account-safety">
              <h3 class="font-semibold text-base m-0 text-[var(--text)]">Can WhatsApp block my account for using WAAN?</h3>
              <p class="m-0 text-[var(--text-muted)]">Yes, it is possible. WAAN is not an official WhatsApp client, and WhatsApp/Meta can apply temporary or permanent restrictions. Start with a secondary account. Official policies:
                <a href="https://www.whatsapp.com/legal/terms-of-service" class="text-[#3b82f6] hover:underline transition-colors" target="_blank" rel="noopener noreferrer">WhatsApp Terms of Service</a>,
                <a href="https://www.whatsapp.com/legal/business-terms" class="text-[#3b82f6] hover:underline transition-colors" target="_blank" rel="noopener noreferrer">WhatsApp Business Terms</a>.
              </p>
            </li>
            <li class="flex flex-col gap-2 pb-4 border-b border-[var(--border)]">
              <h3 class="font-semibold text-base m-0 text-[var(--text)]">What should I do if syncing looks stuck or the relay drops?</h3>
              <p class="m-0 text-[var(--text-muted)]">Use <strong class="text-[var(--text)] font-medium">Resync</strong> first. If it still fails, use <strong class="text-[var(--text)] font-medium">Reconnect</strong>, then <strong class="text-[var(--text)] font-medium">Export diagnostics</strong> before reporting the issue.</p>
            </li>
            <li class="flex flex-col gap-2">
              <h3 class="font-semibold text-base m-0 text-[var(--text)]">Where is my data stored, and does WAAN send it anywhere?</h3>
              <p class="m-0 text-[var(--text-muted)]">WAAN stores mirrored chats locally on your Mac by default. Data leaves your device only when you explicitly export or share it. See:
                <a href="https://github.com/suyashkmr/WAAN/blob/main/PRIVACY.md" class="text-[#3b82f6] hover:underline transition-colors" target="_blank" rel="noopener noreferrer">PRIVACY.md</a>.
              </p>
            </li>
          </ul>
        </div>
      </section>
    </section>

  </main>

  <!-- Global Offcanvas Utilities -->
  
  <aside class="relay-log-drawer fixed top-0 right-0 h-full w-96 max-w-[90vw] bg-[var(--card-bg)] border-l border-[var(--border)] shadow-2xl z-50 flex flex-col" id="relay-log-drawer" aria-hidden="true" aria-label="Diagnostics and relay log">
    <div class="flex flex-col gap-4 p-6 border-b border-[var(--border)] bg-[var(--surface-sunken)] shrink-0">
      <div class="flex flex-col gap-1">
        <p class="text-[var(--accent)] text-xs font-semibold uppercase tracking-wider m-0">Recovery tools</p>
        <p class="text-xl font-display font-semibold text-[var(--text)] m-0">Diagnostics</p>
        <p class="text-xs text-[var(--text-muted)] m-0" id="relay-log-connection">Connecting…</p>
      </div>
      <div class="grid grid-cols-3 gap-2 mt-2">
        <button type="button" class="px-3 py-2 text-xs font-medium rounded-md bg-[var(--surface)] border border-[var(--border)] hover:bg-[var(--surface-hover)] text-[var(--text)] transition-colors" id="relay-log-export" title="Download a diagnostics bundle">Export</button>
        <button type="button" class="px-3 py-2 text-xs font-medium rounded-md bg-[var(--surface)] border border-[var(--border)] hover:bg-[var(--surface-hover)] text-[var(--text)] transition-colors" id="relay-log-report" title="Open issue report">Report</button>
        <button type="button" class="px-3 py-2 text-xs font-medium rounded-md bg-[var(--surface)] border border-[var(--border)] hover:bg-[var(--surface-hover)] text-[var(--text-muted)] transition-colors" id="relay-log-clear" title="Clear log entries">Clear</button>
        <button type="button" class="px-3 py-2 text-xs font-medium rounded-md bg-[var(--surface)] border border-[var(--border)] hover:bg-[var(--surface-hover)] text-[var(--text-muted)] transition-colors col-span-3 mt-2" id="relay-log-close" title="Close diagnostics drawer">Close</button>
      </div>
    </div>
    <div class="p-4 overflow-y-auto flex-1 text-xs font-mono text-[var(--text-muted)] bg-black/40" id="relay-log-list">
      <p class="m-0">No relay events yet.</p>
    </div>
  </aside>

  <div class="fixed bottom-6 right-6 flex flex-col gap-4 z-50 pointer-events-none" id="toast-container" aria-live="polite" aria-atomic="true"></div>

  <div class="fixed inset-0 bg-black/70 backdrop-blur-sm z-[200] flex items-center justify-center opacity-0 pointer-events-none transition-opacity duration-300" id="onboarding-overlay" aria-hidden="true" role="dialog" aria-modal="true" style="visibility: hidden;">
    <div class="bg-[var(--card-bg)] border border-[var(--border)] shadow-2xl rounded-2xl p-8 max-w-md w-full mx-4 flex flex-col gap-6 translate-y-4 transition-transform duration-300">
      <div class="flex flex-col gap-2">
        <h2 class="text-2xl font-display font-semibold text-[var(--text)] m-0">Need a setup reminder?</h2>
        <p class="text-xs text-[var(--accent)] font-semibold uppercase tracking-wider m-0" id="onboarding-step-label"></p>
      </div>
      <p class="text-[var(--text-muted)] text-base m-0 leading-relaxed" id="onboarding-copy">Start relay.</p>
      <div class="flex justify-end gap-3 mt-4 pt-4 border-t border-[var(--border)]">
        <button type="button" class="px-4 py-2 text-sm font-medium rounded-md text-[var(--text-muted)] hover:text-[var(--text)] transition-colors" id="onboarding-skip">Close</button>
        <button type="button" class="px-5 py-2 text-sm font-medium rounded-md bg-[var(--accent)] text-black hover:bg-opacity-90 transition-colors shadow-lg" id="onboarding-next">Next tip</button>
      </div>
    </div>
  </div>

  <footer class="w-full mt-12 py-8 border-t border-[var(--border)] bg-[var(--surface-sunken)] flex flex-col items-center text-center justify-center gap-6 px-6 relative z-10">
    <div class="flex items-center gap-3 justify-center mb-2">
      <img src="/waanlogo.png" alt="WAAN logo" class="w-8 h-8 rounded-lg shadow-md" loading="lazy">
      <div class="text-left flex flex-col">
        <p class="m-0 text-lg font-display font-semibold text-[var(--text)]">WAAN Relay</p>
        <small class="m-0 text-xs text-[var(--text-muted)] uppercase tracking-wider">Local chat intelligence.</small>
      </div>
    </div>
    <div class="flex flex-col gap-2 items-center">
      <p class="text-sm text-[var(--text-muted)] flex items-center gap-2 m-0 mt-4">
        Local-first analysis
        <a href="https://github.com/suyashkmr/WAAN" class="text-[var(--text-muted)] hover:text-[#3b82f6] transition-colors" aria-label="View WAAN on GitHub" target="_blank" rel="noopener noreferrer">
          <svg viewBox="0 0 24 24" class="w-4 h-4 fill-current"><path d="M12 2C6.48 2 2 6.59 2 12.26c0 4.53 2.87 8.37 6.84 9.73.5.1.68-.22.68-.49 0-.24-.01-1.04-.01-1.89-2.78.62-3.37-1.22-3.37-1.22-.45-1.18-1.11-1.49-1.11-1.49-.91-.64.07-.63.07-.63 1 .07 1.53 1.06 1.53 1.06.9 1.57 2.35 1.12 2.92.86.09-.67.35-1.12.64-1.38-2.22-.26-4.56-1.14-4.56-5.08 0-1.12.39-2.03 1.03-2.75-.1-.26-.45-1.31.1-2.73 0 0 .84-.28 2.75 1.05A9.31 9.31 0 0 1 12 6.84c.85 0 1.71.12 2.51.35 1.91-1.33 2.75-1.05 2.75-1.05.55 1.42.2 2.47.1 2.73.64.72 1.03 1.63 1.03 2.75 0 3.95-2.34 4.82-4.57 5.07.36.32.68.94.68 1.89 0 1.36-.01 2.45-.01 2.79 0 .27.18.59.69.49A10.25 10.25 0 0 0 22 12.26C22 6.59 17.52 2 12 2z"/></svg>
        </a>
      </p>
      <p class="text-xs text-[var(--text-muted)] max-w-xl mx-auto m-0 opacity-70">
        WhatsApp is a trademark of Meta Platforms, Inc. WAAN is an independent project and is not affiliated with Meta or WhatsApp.
      </p>
    </div>
  </footer>
</template>

<script setup>
import DeepDiveStage from './components/DeepDiveStage.vue';
import FindingsStage from './components/FindingsStage.vue';
import WorkspaceSidebar from './components/WorkspaceSidebar.vue';
import EmptyWorkspaceCallout from './components/EmptyWorkspaceCallout.vue';
</script>
