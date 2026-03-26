<template>
  <div class="relay-workspace-shell flex flex-col gap-6 w-full max-w-sm lg:sticky lg:top-6 h-fit shrink-0" data-nav-target="actions">
    
    <!-- Core Controls Container -->
    <div class="relay-workspace-main flex flex-col gap-6 p-5 bg-[var(--card-bg)] border border-[var(--border)] rounded-xl shadow-card backdrop-blur-md">
      
      <!-- Relay Status Banner -->
      <section class="relay-workspace-primary flex flex-col gap-3 p-4 rounded-lg bg-[var(--surface-sunken)] border border-[var(--border)]" id="relay-status-panel" aria-live="polite" data-nav-target="relay-status">
        <!-- The ID below is targeted by Vue for mounting the status message/indicator. 
             We keep it on a child div so it doesn't wipe out the QR and actions below it. -->
        <div class="relay-status-banner flex items-center gap-3" id="relay-status-banner">
          <div class="relay-banner-indicator w-2.5 h-2.5" id="relay-status-dot" aria-hidden="true"></div>
          <div class="flex flex-col">
            <span class="text-sm font-semibold text-[var(--text)] m-0 leading-tight" id="relay-connection-status">Relay offline.</span>
            <span class="text-[10px] text-[var(--text-muted)] m-0" id="relay-account-name">Workspace locked until relay starts.</span>
          </div>
        </div>

        <!-- Relay QR Code (Hidden by default) -->
        <div id="relay-qr-container" class="flex flex-col items-center gap-4 py-4 bg-white rounded-lg mt-2 shadow-inner" hidden>
            <img id="relay-qr-image" class="w-40 h-40" alt="Scan QR code with WhatsApp">
            <p id="relay-help-text" class="text-[10px] text-gray-900 text-center px-4 font-medium"></p>
        </div>

        <!-- Sync Progress (Hidden by default) -->
        <div id="relay-sync-progress" class="flex flex-col gap-2 mt-2" hidden>
            <div class="flex items-center justify-between text-[10px] uppercase tracking-wider font-semibold text-[var(--text-muted)]">
                <span>Sync Progress</span>
                <span id="relay-sync-chats-meta"></span>
            </div>
            <div class="w-full h-1 bg-[var(--surface)] rounded-full overflow-hidden">
                <div id="relay-sync-messages-meta" class="h-full bg-[var(--accent)] w-0 transition-all duration-500"></div>
            </div>
            <div class="flex gap-4">
                <span data-step="chats" class="text-[9px] text-[var(--text-muted)] font-medium">CHATS</span>
                <span data-step="messages" class="text-[9px] text-[var(--text-muted)] font-medium">MESSAGES</span>
            </div>
        </div>

        <!-- Live relay action buttons (mounted by shellRelayActionViews.js) -->
        <div class="live-actions flex flex-wrap gap-2 mt-2" id="relay-sidebar-live-actions">
           <!-- Buttons are dynamically mounted here by RelayLiveActionsPrimitive -->
        </div>

        <!-- Recovery actions (shown on error/disconnected) -->
        <div class="flex flex-wrap gap-2 mt-2" id="relay-status-actions" hidden>
          <button type="button" class="px-3 py-1.5 text-xs font-medium rounded-md bg-[var(--surface)] border border-[var(--border)] hover:bg-[var(--surface-hover)] hover:text-[var(--text)] text-[var(--text-muted)] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)]" id="relay-recovery-reconnect">Reconnect</button>
          <button type="button" class="px-3 py-1.5 text-xs font-medium rounded-md bg-[var(--surface)] border border-[var(--border)] hover:bg-[var(--surface-hover)] hover:text-[var(--text)] text-[var(--text-muted)] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)]" id="relay-recovery-resync">Resync</button>
          <button type="button" class="px-3 py-1.5 text-xs font-medium rounded-md bg-[var(--surface)] border border-[var(--border)] hover:bg-[var(--surface-hover)] hover:text-[var(--text)] text-[var(--text-muted)] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)]" id="relay-recovery-export">Export diagnostics</button>
        </div>
      </section>

      <!-- Primary Page Controls -->
      <div class="relay-workspace-primary flex flex-col gap-4">
        <!-- Loaded Chats Dropdown -->
        <label class="flex flex-col gap-1.5" for="chat-selector">
          <span class="text-xs font-medium uppercase tracking-wider text-[var(--text-muted)]">Loaded chats</span>
          <div class="relative">
            <select id="chat-selector" disabled class="w-full appearance-none bg-[var(--surface-sunken)] border border-[var(--border)] text-[var(--text)] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--focus-ring)] focus:border-transparent transition-all disabled:opacity-50 disabled:cursor-not-allowed">
              <option value="">No chats loaded yet</option>
            </select>
            <div class="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none text-[var(--text-muted)]">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path></svg>
            </div>
          </div>
        </label>

        <!-- Custom Range (Hidden by default) -->
        <div class="flex flex-col gap-1.5 hidden" id="custom-range-controls">
          <span class="text-xs font-medium uppercase tracking-wider text-[var(--text-muted)]">Custom dates</span>
          <div class="grid grid-cols-1 sm:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)_auto] gap-2 items-end">
            <input type="date" id="custom-start" class="w-full bg-[var(--surface-sunken)] border border-[var(--border)] text-[var(--text)] rounded-md px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--focus-ring)]">
            <span class="text-[var(--text-muted)] text-sm self-center justify-self-center hidden sm:inline">to</span>
            <input type="date" id="custom-end" class="w-full bg-[var(--surface-sunken)] border border-[var(--border)] text-[var(--text)] rounded-md px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--focus-ring)]">
            <button type="button" class="w-full sm:w-auto px-3 py-1.5 text-sm font-medium rounded-md bg-[var(--primary)] text-white hover:bg-[var(--primary-hover)] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)]" id="apply-custom-range">Apply</button>
          </div>
        </div>

        <!-- Time Range Dropdown -->
        <label class="flex flex-col gap-1.5" for="global-range">
          <span class="text-xs font-medium uppercase tracking-wider text-[var(--text-muted)]">Time range</span>
          <div class="relative">
            <select id="global-range" class="w-full appearance-none bg-[var(--surface-sunken)] border border-[var(--border)] text-[var(--text)] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--focus-ring)] focus:border-transparent transition-all hover:bg-[var(--surface-hover)] cursor-pointer">
              <option value="all" selected>All time</option>
              <option value="30">Last 30 days</option>
              <option value="90">Last 90 days</option>
              <option value="180">Last 180 days</option>
              <option value="365">Last 365 days</option>
              <option value="custom">Custom range</option>
            </select>
            <div class="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none text-[var(--text-muted)]">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path></svg>
            </div>
          </div>
        </label>
      </div>

      <!-- Action Toolbar Export Buttons -->
      <section class="relay-workspace-primary actions-toolbar grid grid-cols-1 gap-2 pt-4 border-t border-[var(--border)]" id="actions-toolbar" aria-label="Dataset actions">
        <button type="button" class="w-full h-10 flex items-center justify-between px-3 text-sm font-medium rounded-lg bg-transparent border border-transparent hover:bg-[var(--surface-hover)] hover:border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--text)] transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)] group" id="download-pdf">
          <span>Export PDF</span>
          <svg class="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path></svg>
        </button>
        <button type="button" class="w-full h-10 flex items-center justify-between px-3 text-sm font-medium rounded-lg bg-transparent border border-transparent hover:bg-[var(--surface-hover)] hover:border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--text)] transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)] group" id="download-markdown-report">
          <span>Export text report</span>
          <svg class="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
        </button>
        <button type="button" class="w-full h-10 flex items-center justify-between px-3 text-sm font-medium rounded-lg bg-transparent border border-transparent hover:bg-[var(--surface-hover)] hover:border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--text)] transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)] group" id="download-slides-report">
          <span>Export slides</span>
          <svg class="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z"></path></svg>
        </button>
      </section>
    </div>

    <!-- Workspace Utility Cluster (Settings) -->
    <details class="relay-workspace-support bg-[var(--card-bg)] border border-[var(--border)] rounded-xl shadow-sm overflow-hidden group" id="workspace-utility-cluster">
      <summary class="flex flex-col gap-0.5 p-4 cursor-pointer hover:bg-[var(--surface-hover)] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)] marker:hidden">
        <div class="flex items-center justify-between">
          <span class="font-semibold text-[var(--text)] text-sm">Workspace tools</span>
          <svg class="w-4 h-4 text-[var(--text-muted)] group-open:rotate-180 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path></svg>
        </div>
        <span class="text-xs text-[var(--text-muted)]">Setup, diagnostics, display</span>
      </summary>
      
      <div class="p-4 pt-0 flex flex-col gap-4 border-t border-[var(--border)] mt-2">
        <!-- Shortcuts -->
        <div class="flex flex-col gap-1 mt-4">
          <button type="button" class="text-left px-3 py-2 text-sm text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--surface-hover)] rounded-md transition-colors" id="onboarding-start" title="Open the setup reminder.">Setup tips</button>
          <button type="button" class="text-left px-3 py-2 text-sm text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--surface-hover)] rounded-md transition-colors" id="compact-toggle" aria-pressed="false" title="Switch between compact and comfort layouts">Compact mode</button>
          <button type="button" class="text-left px-3 py-2 text-sm text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--surface-hover)] rounded-md transition-colors" id="log-drawer-toggle" title="Use diagnostics if sync stalls or reconnect fails.">Diagnostics</button>
        </div>

        <!-- Display Theme Toggle -->
        <div class="flex flex-col gap-2 pt-3 border-t border-[var(--border)]">
          <span class="text-xs font-medium uppercase tracking-wider text-[var(--text-muted)]">Theme</span>
          <div class="flex items-center bg-[var(--surface-sunken)] rounded-lg p-1 border border-[var(--border)]">
            <div class="flex-1 text-center relative">
              <input type="radio" name="theme-option" id="theme-system" value="system" checked class="peer sr-only">
              <label for="theme-system" class="block w-full text-xs py-1.5 cursor-pointer rounded-md text-[var(--text-muted)] peer-checked:bg-[var(--surface)] peer-checked:text-[var(--text)] peer-checked:shadow-sm transition-all">Auto</label>
            </div>
            <div class="flex-1 text-center relative">
              <input type="radio" name="theme-option" id="theme-light" value="light" class="peer sr-only">
              <label for="theme-light" class="block w-full text-xs py-1.5 cursor-pointer rounded-md text-[var(--text-muted)] peer-checked:bg-[var(--surface)] peer-checked:text-[var(--text)] peer-checked:shadow-sm transition-all">Light</label>
            </div>
            <div class="flex-1 text-center relative">
              <input type="radio" name="theme-option" id="theme-dark" value="dark" class="peer sr-only">
              <label for="theme-dark" class="block w-full text-xs py-1.5 cursor-pointer rounded-md text-[var(--text-muted)] peer-checked:bg-[var(--surface)] peer-checked:text-[var(--text)] peer-checked:shadow-sm transition-all">Dark</label>
            </div>
          </div>
        </div>

        <!-- Accessibility Controls -->
        <div class="flex flex-col gap-2 pt-3 border-t border-[var(--border)]" aria-label="Accessibility options">
          <button type="button" class="w-full text-left px-3 py-2 text-sm text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--surface-hover)] rounded-md transition-colors" id="reduce-motion-toggle" aria-pressed="mixed" title="Cycle between reduced and standard motion.">Motion: Standard</button>
          <button type="button" class="w-full text-left px-3 py-2 text-sm text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--surface-hover)] rounded-md transition-colors" id="high-contrast-toggle" aria-pressed="false" title="Toggle high-contrast color treatment.">Contrast: Standard</button>
        </div>
      </div>
    </details>

  </div>
</template>

<script setup>
</script>
