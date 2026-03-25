<template>
  <section class="flex flex-col gap-10 w-full" id="guided-findings-stage" data-stage="findings" aria-labelledby="guided-findings-title">
    
    <!-- Stage Header -->
    <div class="flex flex-col gap-2 pb-4 border-b border-[var(--border)]">
      <h2 id="guided-findings-title" class="text-3xl font-display font-semibold text-[var(--text)] m-0">Findings</h2>
    </div>

    <div class="flex flex-col gap-12">
      
      <!-- Overview Block -->
      <section class="flex flex-col gap-4" id="workspace-overview" data-nav-target="overview">
        <div class="flex flex-col">
          <p class="text-xs font-medium uppercase tracking-wider text-[var(--accent)] m-0">Overview</p>
          <h2 class="text-xl font-semibold text-[var(--text)] m-0">Conversation summary</h2>
        </div>
        <div class="w-full">
          <!-- The Vue Island mounts here to render the stat cards -->
          <section id="summary" class="w-full" data-nav-target="overview"></section>
        </div>
      </section>

      <!-- Highlights Block -->
      <section class="flex flex-col gap-4" aria-labelledby="guided-findings-signal-title">
        <h3 id="guided-findings-signal-title" class="text-lg font-semibold text-[var(--text)] m-0 px-2 border-l-2 border-[var(--accent)]">Highlights</h3>

        <section class="bg-[var(--card-bg)] border border-[var(--border)] rounded-xl shadow-card overflow-hidden flex flex-col" id="insight-highlights" data-nav-target="highlights" data-vue-shell-mount="card-shell" data-accent="highlights">
          <!-- Card Header -->
          <div class="flex items-center justify-between p-5 border-b border-[var(--border)] bg-[var(--surface-sunken)]">
            <div class="flex items-center gap-3">
              <h2 class="font-display text-[var(--text)] font-semibold flex items-center gap-2 m-0">
                <span aria-hidden="true" class="text-[var(--accent)] flex">
                  <svg viewBox="0 0 24 24" class="w-5 h-5 fill-current"><path d="M12 2l1.76 5.15L19 7.5l-4 3.34L16.5 16l-4.5-2.8L7.5 16 9 10.84 5 7.5l5.24-.35z" /></svg>
                </span>
                Highlights
              </h2>
              <div class="relative group">
                <button type="button" class="text-[var(--text-muted)] hover:text-[var(--text)] focus:outline-none" aria-label="About this section">
                  <svg viewBox="0 0 24 24" class="w-4 h-4 fill-current"><path d="M11 17h2v-6h-2v6zm0-8h2V7h-2v2zm1-7C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z" /></svg>
                </button>
                <div class="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 w-48 p-2 text-xs text-white bg-gray-900 rounded opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all pointer-events-none z-10 text-center shadow-lg">
                  Activity outlooks anchor on the dataset end date.
                </div>
              </div>
            </div>
            <button type="button" class="card-toggle w-8 h-8 flex items-center justify-center rounded-md hover:bg-[var(--surface-hover)] text-[var(--text-muted)] transition-colors focus:ring-2 focus:ring-[var(--focus-ring)]" aria-expanded="true" data-target="insight-highlights-content">
              <svg class="w-4 h-4 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path></svg>
            </button>
          </div>
          <!-- Card Content -->
          <div class="p-5 flex flex-col gap-4" id="insight-highlights-content">
            <div class="flex flex-col gap-3" id="highlight-list"></div>
          </div>
        </section>
      </section>

      <!-- Participants Block -->
      <section class="flex flex-col gap-4" aria-labelledby="guided-findings-drivers-title">
        <h3 id="guided-findings-drivers-title" class="font-display text-lg font-semibold text-[var(--text)] m-0 px-2 border-l-2 border-[#14b8a6]">Participants</h3> <!-- teal accent -->

        <section class="bg-[var(--card-bg)] border border-[var(--border)] rounded-xl shadow-card overflow-hidden flex flex-col" id="participants" data-nav-target="participants" data-vue-shell-mount="card-shell" data-accent="participants">
          <!-- Card Header -->
          <div class="flex items-center justify-between p-5 border-b border-[var(--border)] bg-[var(--surface-sunken)]">
            <div class="flex items-center gap-3">
              <h2 class="font-display text-[var(--text)] font-semibold flex items-center gap-2 m-0">
                <span aria-hidden="true" class="text-[#14b8a6] flex">
                  <svg viewBox="0 0 24 24" class="w-5 h-5 fill-current"><path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5s-3 1.34-3 3 1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5C15 14.17 10.33 13 8 13zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.96 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z" /></svg>
                </span>
                Participants
              </h2>
            </div>
            <div class="flex items-center gap-2 border-l border-[var(--border)] pl-4">
              <button type="button" class="px-3 py-1.5 text-xs font-medium rounded-md bg-[var(--surface)] border border-[var(--border)] hover:bg-[var(--surface-hover)] hover:text-[var(--text)] text-[var(--text-muted)] transition-colors" id="download-participants" title="Download the participants table as CSV">Download CSV</button>
              <button type="button" class="card-toggle w-8 h-8 flex items-center justify-center rounded-md hover:bg-[var(--surface-hover)] text-[var(--text-muted)] transition-colors" aria-expanded="true" data-target="participants-content">
                <svg class="w-4 h-4 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path></svg>
              </button>
            </div>
          </div>
          <!-- Card Content -->
          <div class="p-5 flex flex-col gap-6" id="participants-content">
            <!-- Controls Grid -->
             <div class="grid grid-cols-1 md:grid-cols-2 gap-6 bg-[var(--surface-sunken)] p-4 rounded-lg border border-[var(--border)]">
               <div class="participants-controls flex flex-wrap gap-4">
                 <label class="flex flex-col gap-1.5" for="participants-top-count">
                    <span class="text-xs font-medium uppercase text-[var(--text-muted)]">Show Top</span>
                    <select id="participants-top-count" class="appearance-none bg-[var(--surface)] border border-[var(--border)] text-[var(--text)] rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--focus-ring)]">
                      <option value="5">5</option>
                      <option value="10">10</option>
                      <option value="25" selected>25</option>
                      <option value="50">50</option>
                      <option value="0">All</option>
                    </select>
                 </label>
                 <label class="flex flex-col gap-1.5" for="participants-sort">
                     <span class="text-xs font-medium uppercase text-[var(--text-muted)]">Sort</span>
                     <select id="participants-sort" class="appearance-none bg-[var(--surface)] border border-[var(--border)] text-[var(--text)] rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--focus-ring)]">
                       <option value="most" selected>Most active</option>
                       <option value="quiet">Quietest</option>
                     </select>
                 </label>
                 <label class="flex flex-col gap-1.5" for="participants-timeframe">
                     <span class="text-xs font-medium uppercase text-[var(--text-muted)]">Timeframe</span>
                     <select id="participants-timeframe" class="appearance-none bg-[var(--surface)] border border-[var(--border)] text-[var(--text)] rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--focus-ring)]">
                       <option value="all">All time</option>
                       <option value="week">Last 7 days</option>
                     </select>
                 </label>
               </div>
               <div class="participants-quick-filters flex flex-col gap-2 items-start md:items-end justify-center">
                  <span class="text-xs font-medium text-[var(--text-muted)]">Quick filters:</span>
                  <div class="flex gap-2">
                    <button type="button" class="px-2 py-1 text-xs rounded-md bg-[var(--surface)] border border-[var(--border)] hover:bg-[var(--surface-hover)] hover:text-[#14b8a6] transition-colors" data-participants-preset="top-week" aria-pressed="false">Top 5 this week</button>
                    <button type="button" class="px-2 py-1 text-xs rounded-md bg-[var(--surface)] border border-[var(--border)] hover:bg-[var(--surface-hover)] hover:text-[#14b8a6] transition-colors" data-participants-preset="quiet" aria-pressed="false">Quietest 5</button>
                  </div>
               </div>
             </div>

             <!-- Table -->
             <div class="overflow-x-auto border border-[var(--border)] rounded-lg">
                <table id="top-senders" class="w-full text-left border-collapse text-sm">
                  <thead class="bg-[var(--surface-sunken)] border-b border-[var(--border)] text-[var(--text-muted)]">
                    <tr>
                      <th class="p-3 font-medium">Rank</th>
                      <th class="p-3 font-medium">Participant</th>
                      <th class="p-3 font-medium">Messages</th>
                      <th class="p-3 font-medium">
                        <div class="flex items-center gap-2">
                          <span>Share</span>
                          <button type="button" class="info-note-button" aria-describedby="participants-share-note" title="Explain how share is calculated.">?</button>
                        </div>
                      </th>
                      <th class="p-3 font-medium">
                        <div class="flex items-center gap-2">
                          <span>Avg Words</span>
                          <button type="button" class="info-note-button" aria-describedby="participants-avg-words-note" title="Explain how average words are calculated.">?</button>
                        </div>
                      </th>
                    </tr>
                  </thead>
                  <tbody class="divide-y divide-[var(--border)] text-[var(--text)]"></tbody>
                </table>
                <div class="sr-only">
                  <p id="participants-share-note">Share shows each participant's portion of the total message volume in the current filter state.</p>
                  <p id="participants-avg-words-note">Average words shows the average words per message for the participant in the current filter state.</p>
                </div>
             </div>
          </div>
        </section>
      </section>

      <!-- Timing Block -->
      <section class="flex flex-col gap-4" aria-labelledby="guided-findings-timing-title">
        <h3 id="guided-findings-timing-title" class="text-lg font-semibold text-[var(--text)] m-0 px-2 border-l-2 border-[#8b5cf6]">Timing</h3> <!-- purple accent -->

        <section class="bg-[var(--card-bg)] border border-[var(--border)] rounded-xl shadow-card overflow-hidden flex flex-col" id="hourly-activity" data-nav-target="hourly-activity" data-accent="hourly" data-vue-shell-mount="card-shell">
          <!-- Card Header -->
          <div class="flex items-center justify-between p-5 border-b border-[var(--border)] bg-[var(--surface-sunken)]">
            <div class="flex items-center gap-3">
              <h2 class="font-display text-[var(--text)] font-semibold flex items-center gap-2 m-0">
                <span aria-hidden="true" class="text-[#f59e0b] flex"> <!-- Amber accent -->
                  <svg viewBox="0 0 24 24" class="w-5 h-5 fill-current"><path d="M11 7h2v6h-4v-2h2zm1-5C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z" /></svg>
                </span>
                Hourly rhythm
              </h2>
            </div>
            <div class="flex items-center gap-2 border-l border-[var(--border)] pl-4">
              <button type="button" class="px-3 py-1.5 text-xs font-medium rounded-md bg-[var(--surface)] border border-[var(--border)] hover:bg-[var(--surface-hover)] hover:text-[var(--text)] text-[var(--text-muted)] transition-colors" id="download-hourly" title="Download hourly activity as CSV">Download CSV</button>
              <button type="button" class="card-toggle w-8 h-8 flex items-center justify-center rounded-md hover:bg-[var(--surface-hover)] text-[var(--text-muted)] transition-colors" aria-expanded="true" data-target="hourly-activity-content">
                <svg class="w-4 h-4 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path></svg>
              </button>
            </div>
          </div>
          <!-- Card Content -->
          <div class="p-5 grid grid-cols-1 lg:grid-cols-[300px_1fr] gap-8" id="hourly-activity-content">
             <!-- Sidebar Controls -->
             <div class="flex flex-col gap-6">
                <!-- Data Point -->
                <div class="flex flex-col bg-[var(--surface-sunken)] p-4 border border-[var(--border)] rounded-lg">
                  <span class="text-xs font-semibold uppercase text-[#f59e0b] tracking-wider">Top Hour</span>
                  <span class="text-3xl font-display text-[var(--text)] mt-1" id="hourly-top-hour">—</span>
                </div>
                <!-- Filters -->
                <div class="hourly-controls flex flex-col gap-4">
                  <div class="flex flex-col gap-2">
                    <span class="text-xs font-medium text-[var(--text-muted)]">Days</span>
                    <label class="flex items-center gap-2 text-sm text-[var(--text)] cursor-pointer"><input type="checkbox" id="filter-weekdays" checked class="accent-[#f59e0b] h-4 w-4"> Weekdays</label>
                    <label class="flex items-center gap-2 text-sm text-[var(--text)] cursor-pointer"><input type="checkbox" id="filter-weekends" checked class="accent-[#f59e0b] h-4 w-4"> Weekends</label>
                  </div>
                  <div class="flex flex-col gap-2">
                    <span class="text-xs font-medium text-[var(--text-muted)]">Hours</span>
                    <label class="flex items-center gap-2 text-sm text-[var(--text)] cursor-pointer"><input type="checkbox" id="filter-working" checked class="accent-[#f59e0b] h-4 w-4"> Working (09-17)</label>
                    <label class="flex items-center gap-2 text-sm text-[var(--text)] cursor-pointer"><input type="checkbox" id="filter-offhours" checked class="accent-[#f59e0b] h-4 w-4"> Off Hours</label>
                  </div>
                  <!-- Brush inputs -->
                  <div class="flex flex-col gap-2 mt-2 pt-4 border-t border-[var(--border)] hidden lg:flex">
                     <label for="hourly-brush-start" class="text-xs font-medium text-[var(--text-muted)]">Hour Range</label>
                     <div class="flex flex-col gap-1">
                        <input type="range" id="hourly-brush-start" min="0" max="23" value="0" class="w-full accent-[#f59e0b]">
                        <input type="range" id="hourly-brush-end" min="0" max="23" value="23" class="w-full accent-[#f59e0b]">
                     </div>
                     <div class="flex items-center justify-between text-xs text-[var(--text-muted)] font-mono">
                        <span id="hourly-brush-start-label">00:00</span>
                        <span>–</span>
                        <span id="hourly-brush-end-label">23:00</span>
                     </div>
                  </div>
                </div>
                <div class="text-xs text-[var(--text-muted)] italic" id="hourly-filter-note"></div>
                <div class="text-xs text-[var(--text-muted)] bg-[var(--surface-sunken)] p-2 rounded hidden" id="hourly-brush-summary">Select hour range to view details.</div>
             </div>
             
             <!-- Chart Area -->
             <div class="flex flex-col gap-4">
                <div id="hourly-chart" class="w-full h-80 bg-[var(--surface-sunken)] rounded-xl border border-[var(--border)] overflow-hidden"></div>
                <div class="hourly-anomalies text-sm text-[var(--text)]" id="hourly-anomalies"></div>
             </div>
          </div>
        </section>
      </section>

      <div class="flex justify-center pt-8 border-t border-[var(--border)] border-dashed">
        <p class="text-[var(--text-muted)] text-sm italic">Deeper tools continue below.</p>
      </div>

    </div>
  </section>
</template>

<script setup>
</script>
