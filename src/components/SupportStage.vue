<template>
  <section class="flex flex-col gap-6 w-full opacity-0 animate-fade-in-up" data-stage="support" aria-labelledby="support-stage-title" style="animation-delay: 350ms;">
    <div class="flex flex-col gap-2 pb-4 border-b border-[var(--border)]">
      <h2 id="support-stage-title" class="text-3xl font-display font-semibold text-[var(--text)] m-0">Support</h2>
    </div>

    <section class="analytics-story-card wa-card bg-[var(--card-bg)] border border-[var(--border)] rounded-xl overflow-hidden flex flex-col w-full" id="faq-card" data-nav-target="faq" data-accent="faq" data-vue-shell-mount="card-shell">
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
</template>
