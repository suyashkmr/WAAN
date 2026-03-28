<template>
  <section class="flex flex-col gap-10 w-full" id="deep-dive-stage" data-stage="deep-dive" aria-labelledby="deep-dive-stage-title">
    
    <!-- Stage Header -->
    <div class="flex flex-col gap-2 pb-4 border-b border-[var(--border)]">
      <h2 id="deep-dive-stage-title" class="text-3xl font-display font-semibold text-[var(--text)] m-0">Deep dive</h2>
    </div>

    <div class="flex flex-col gap-12">
      
      <!-- Pattern Evidence Cluster -->
      <section class="deep-dive-cluster deep-dive-cluster--patterns flex flex-col gap-4" aria-labelledby="deep-dive-patterns-cluster-title">
        <h3 id="deep-dive-patterns-cluster-title" class="text-lg font-semibold text-[var(--text)] m-0 px-2 border-l-2 border-[#10b981]">Pattern evidence</h3>

        <div class="deep-dive-pattern-sequence flex flex-col gap-6">

          <!-- Weekly Trend -->
          <section class="analytics-story-card bg-[var(--card-bg)] border border-[var(--border)] rounded-xl shadow-card flex flex-col col-span-1 xl:col-span-2" id="weekly-trend" data-nav-target="weekly-trend" data-accent="weekly" data-vue-shell-mount="card-shell">
            <div class="flex items-center justify-between p-5 border-b border-[var(--border)] bg-[var(--surface-sunken)]">
              <div class="flex items-center gap-3">
                <h2 class="text-[var(--text)] font-semibold flex items-center gap-2 m-0">
                  <span aria-hidden="true" class="text-[#10b981] flex">
                    <svg viewBox="0 0 24 24" class="w-5 h-5 fill-current"><path d="M9 16.17l-3.5-3.5-1.41 1.41L9 19 20.5 7.5 19.09 6z" /></svg>
                  </span>
                  Week by Week
                </h2>
              </div>
              <div class="flex items-center gap-2 border-l border-[var(--border)] pl-4">
                <button type="button" class="px-3 py-1.5 text-xs font-medium rounded-md bg-[var(--surface)] border border-[var(--border)] hover:bg-[var(--surface-hover)] text-[var(--text-muted)]" id="download-weekly">Download CSV</button>
                <button type="button" class="card-toggle w-8 h-8 flex items-center justify-center rounded-md hover:bg-[var(--surface-hover)] text-[var(--text-muted)]" aria-expanded="true" data-target="weekly-trend-content">
                  <svg class="w-4 h-4 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/></svg>
                </button>
              </div>
            </div>
            <div class="pattern-story-grid p-5 flex flex-col gap-6" id="weekly-trend-content">
              <div class="weekly-summary story-summary-tier flex gap-4 md:gap-8 bg-[var(--surface-sunken)] border border-[var(--border)] rounded-lg p-4">
                <div class="flex flex-col">
                  <span class="text-xs uppercase text-[#10b981] font-semibold tracking-wider">Total so far</span>
                  <span class="text-2xl font-display text-[var(--text)]" id="weekly-cumulative">—</span>
                </div>
                <div class="flex flex-col border-l border-[var(--border)] pl-4 md:pl-8">
                  <span class="text-xs uppercase text-[#10b981] font-semibold tracking-wider">Avg last 3 wks</span>
                  <span class="text-2xl font-display text-[var(--text)]" id="weekly-rolling">—</span>
                </div>
                <div class="flex flex-col border-l border-[var(--border)] pl-4 md:pl-8">
                  <span class="text-xs uppercase text-[#10b981] font-semibold tracking-wider">Avg per week</span>
                  <span class="text-2xl font-display text-[var(--text)]" id="weekly-average">—</span>
                </div>
              </div>
              <div class="analysis-evidence-frame evidence-panel-tier w-full h-80 border border-[var(--border)] rounded-lg bg-[var(--surface-sunken)] p-2">
                <div id="weekly-chart" class="w-full h-full"></div>
              </div>
            </div>
          </section>

          <!-- Daily Activity Frame -->
          <section class="analytics-story-card bg-[var(--card-bg)] border border-[var(--border)] rounded-xl shadow-card flex flex-col" id="daily-activity" data-nav-target="daily-activity" data-accent="daily" data-vue-shell-mount="card-shell">
            <div class="flex items-center justify-between p-5 border-b border-[var(--border)] bg-[var(--surface-sunken)]">
              <div class="flex items-center gap-3">
                <h2 class="text-[var(--text)] font-semibold flex items-center gap-2 m-0">
                  <span aria-hidden="true" class="text-[#06b6d4] flex">
                    <svg viewBox="0 0 24 24" class="w-5 h-5 fill-current"><path d="M7 2v2H5a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2h-2V2h-2v2H9V2H7zm12 6H5v10h14V8z" /></svg>
                  </span>
                  Day by day
                </h2>
              </div>
              <div class="flex items-center gap-2 border-l border-[var(--border)] pl-4">
                <button type="button" class="px-3 py-1.5 text-xs font-medium rounded-md bg-[var(--surface)] border border-[var(--border)] hover:bg-[var(--surface-hover)] text-[var(--text-muted)]" id="download-daily">Download CSV</button>
                <button type="button" class="card-toggle w-8 h-8 flex items-center justify-center rounded-md hover:bg-[var(--surface-hover)] text-[var(--text-muted)]" aria-expanded="true" data-target="daily-activity-content">
                  <svg class="w-4 h-4 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/></svg>
                </button>
              </div>
            </div>
            <div class="pattern-story-flow p-5 flex flex-col gap-6" id="daily-activity-content">
              <div class="daily-summary story-summary-tier flex items-center gap-4 bg-[var(--surface-sunken)] border border-[var(--border)] rounded-lg p-4">
                <span class="text-xs uppercase text-[#06b6d4] font-semibold tracking-wider">Avg per day</span>
                <span class="text-2xl font-display text-[var(--text)]" id="daily-avg-day">—</span>
              </div>
              <div class="analysis-evidence-frame evidence-panel-tier daily-evidence-frame w-full min-h-[420px] border border-[var(--border)] rounded-lg bg-[var(--surface-sunken)] p-2">
                <div id="daily-chart" class="w-full h-full"></div>
              </div>
            </div>
          </section>

          <!-- Busiest Days of the Week -->
          <section class="analytics-story-card bg-[var(--card-bg)] border border-[var(--border)] rounded-xl shadow-card flex flex-col" id="weekday-trend" data-nav-target="weekday-trend" data-accent="weekday" data-vue-shell-mount="card-shell">
            <div class="flex items-center justify-between p-5 border-b border-[var(--border)] bg-[var(--surface-sunken)]">
              <div class="flex items-center gap-3">
                <h2 class="text-[var(--text)] font-semibold flex items-center gap-2 m-0">
                  <span aria-hidden="true" class="text-[#8b5cf6] flex">
                    <svg viewBox="0 0 24 24" class="w-5 h-5 fill-current"><path d="M21 3h-3V1h-2v2H8V1H6v2H3a2 2 0 0 0-2 2v16c0 1.1.9 2 2 2h18a2 2 0 0 0 2-2V5c0-1.1-.9-2-2-2zm0 18H3V9h18zm0-14H3V5h18z" /></svg>
                  </span>
                  Busiest Days of the Week
                </h2>
              </div>
              <div class="flex items-center gap-2 border-l border-[var(--border)] pl-4">
                <button type="button" class="px-3 py-1.5 text-xs font-medium rounded-md bg-[var(--surface)] border border-[var(--border)] hover:bg-[var(--surface-hover)] text-[var(--text-muted)]" id="download-weekday">Download CSV</button>
                <button type="button" class="card-toggle w-8 h-8 flex items-center justify-center rounded-md hover:bg-[var(--surface-hover)] text-[var(--text-muted)]" aria-expanded="true" data-target="weekday-trend-content">
                  <svg class="w-4 h-4 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/></svg>
                </button>
              </div>
            </div>
            <div class="pattern-story-flow weekday-story-flow p-5 flex flex-col gap-6" id="weekday-trend-content">
                <details class="story-guide supporting-story-tier pattern-story-intro">
                  <summary class="story-guide-summary">How to read</summary>
                  <div class="story-guide-body">
                    <div class="pattern-story-kicker">Pattern guide</div>
                    <h3 class="pattern-story-title">Separate weekday cadence from weekend spillover</h3>
                    <p class="analytics-story-copy">
                      Use the toggles to isolate the days and hour bands that matter, then read the chart as a rhythm comparison rather than a flat totals view.
                    </p>
                  </div>
                </details>
                <div class="weekday-controls pattern-controls-shell bg-[var(--surface-sunken)] border border-[var(--border)] rounded-lg p-4">
                  <div class="weekday-filter-row">
                      <label class="weekday-toggle-chip flex items-center gap-2 text-sm text-[var(--text)] cursor-pointer"><input type="checkbox" id="weekday-toggle-weekdays" checked class="accent-[#8b5cf6] h-4 w-4"> Weekdays</label>
                      <label class="weekday-toggle-chip flex items-center gap-2 text-sm text-[var(--text)] cursor-pointer"><input type="checkbox" id="weekday-toggle-weekends" checked class="accent-[#8b5cf6] h-4 w-4"> Weekends</label>
                      <label class="weekday-toggle-chip flex items-center gap-2 text-sm text-[var(--text)] cursor-pointer"><input type="checkbox" id="weekday-toggle-working" checked class="accent-[#8b5cf6] h-4 w-4"> Work hours (09-17)</label>
                      <label class="weekday-toggle-chip flex items-center gap-2 text-sm text-[var(--text)] cursor-pointer"><input type="checkbox" id="weekday-toggle-offhours" checked class="accent-[#8b5cf6] h-4 w-4"> Off hours</label>
                  </div>
                  <div class="text-xs text-[var(--text-muted)]" id="weekday-filter-note"></div>
                </div>
              <div class="pattern-evidence-lane full-width-evidence-lane">
                <div class="analysis-evidence-frame evidence-panel-tier w-full min-h-[250px] border border-[var(--border)] rounded-lg bg-[var(--surface-sunken)] p-2">
                  <div id="weekday-chart" class="w-full h-full"></div>
                </div>
              </div>
            </div>
          </section>

          <!-- Time of Day -->
          <section class="analytics-story-card bg-[var(--card-bg)] border border-[var(--border)] rounded-xl shadow-card flex flex-col" id="timeofday-trend" data-nav-target="timeofday-trend" data-accent="timeofday" data-vue-shell-mount="card-shell">
            <div class="flex items-center justify-between p-5 border-b border-[var(--border)] bg-[var(--surface-sunken)]">
              <div class="flex items-center gap-3">
                <h2 class="text-[var(--text)] font-semibold flex items-center gap-2 m-0">
                  <span aria-hidden="true" class="text-[#f59e0b] flex">
                    <svg viewBox="0 0 24 24" class="w-5 h-5 fill-current"><path d="M12 7V3h-2v4H7l5 6 5-6h-3zM5 17h14v2H5z" /></svg>
                  </span>
                  Time of Day
                </h2>
              </div>
              <div class="flex items-center gap-2 border-l border-[var(--border)] pl-4">
                <button type="button" class="px-3 py-1.5 text-xs font-medium rounded-md bg-[var(--surface)] border border-[var(--border)] hover:bg-[var(--surface-hover)] text-[var(--text-muted)]" id="download-timeofday">Download CSV</button>
                <button type="button" class="card-toggle w-8 h-8 flex items-center justify-center rounded-md hover:bg-[var(--surface-hover)] text-[var(--text-muted)]" aria-expanded="true" data-target="timeofday-trend-content">
                  <svg class="w-4 h-4 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/></svg>
                </button>
              </div>
            </div>
            <div class="pattern-story-flow timeofday-story-flow p-5 flex flex-col gap-6" id="timeofday-trend-content">
                <details class="story-guide supporting-story-tier pattern-story-intro">
                  <summary class="story-guide-summary">How to read</summary>
                  <div class="story-guide-body">
                    <div class="pattern-story-kicker">Pattern guide</div>
                    <h3 class="pattern-story-title">Compare broad dayparts before drilling into the chart bands</h3>
                    <p class="analytics-story-copy">
                      This panel works best as a quick daypart scan: filter weekdays versus weekends first, then use the sparkline and band callouts to identify the real activity window.
                    </p>
                  </div>
                </details>
                <div class="timeofday-controls pattern-controls-shell bg-[var(--surface-sunken)] border border-[var(--border)] rounded-lg p-4">
                  <div class="timeofday-filter-row">
                      <label class="flex items-center gap-2 text-sm text-[var(--text)] cursor-pointer"><input type="checkbox" id="timeofday-toggle-weekdays" checked class="accent-[#f59e0b] h-4 w-4"> Weekdays</label>
                      <label class="flex items-center gap-2 text-sm text-[var(--text)] cursor-pointer"><input type="checkbox" id="timeofday-toggle-weekends" checked class="accent-[#f59e0b] h-4 w-4"> Weekends</label>
                  </div>
                </div>
              <div class="pattern-evidence-lane full-width-evidence-lane">
                <div class="analysis-evidence-frame evidence-panel-tier w-full h-full border border-[var(--border)] rounded-lg bg-[var(--surface-sunken)] p-4 flex flex-col gap-4">
                  <div id="timeofday-chart" class="w-full">
                    <div id="timeofday-sparkline" class="w-full h-12"></div>
                    <div id="timeofday-bands" class="w-full mt-4"></div>
                    <div id="timeofday-callouts" class="w-full mt-2 text-sm text-[var(--text-muted)]"></div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <!-- Sentiment Overview -->
          <section class="analytics-story-card bg-[var(--card-bg)] border border-[var(--border)] rounded-xl shadow-card flex flex-col col-span-1 xl:col-span-2" id="sentiment-overview" data-nav-target="sentiment-overview" data-vue-shell-mount="card-shell" data-accent="sentiment">
            <div class="flex items-center justify-between p-5 border-b border-[var(--border)] bg-[var(--surface-sunken)]">
              <div class="flex items-center gap-3">
                <h2 class="text-[var(--text)] font-semibold flex items-center gap-2 m-0">
                  <span aria-hidden="true" class="text-[#ec4899] flex">
                    <svg viewBox="0 0 24 24" class="w-5 h-5 fill-current"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09A6.003 6.003 0 0 1 19 3c3.04 0 5.5 2.46 5.5 5.5 0 3.78-3.4 6.86-8.55 11.54L12 21.35z" /></svg>
                  </span>
                  Mood & sentiment
                </h2>
              </div>
              <div class="flex items-center gap-2 border-l border-[var(--border)] pl-4">
                <button type="button" class="px-3 py-1.5 text-xs font-medium rounded-md bg-[var(--surface)] border border-[var(--border)] hover:bg-[var(--surface-hover)] text-[var(--text-muted)]" id="download-sentiment">Download CSV</button>
                <button type="button" class="card-toggle w-8 h-8 flex items-center justify-center rounded-md hover:bg-[var(--surface-hover)] text-[var(--text-muted)]" aria-expanded="true" data-target="sentiment-overview-content">
                  <svg class="w-4 h-4 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/></svg>
                </button>
              </div>
            </div>
            <div class="sentiment-story-flow p-5 flex flex-col gap-6" id="sentiment-overview-content">
              <div class="story-summary-tier rounded-lg border border-[var(--border)] bg-[var(--surface-sunken)] p-4">
                <div id="sentiment-summary" class="text-sm font-medium text-[var(--text)]"></div>
              </div>
              <details class="story-guide supporting-story-tier pattern-story-intro">
                <summary class="story-guide-summary">How to read</summary>
                <div class="story-guide-body">
                  <div class="pattern-story-kicker">Sentiment guide</div>
                  <h3 class="pattern-story-title">Read daily tone shifts beside the member extremes</h3>
                  <p class="analytics-story-copy">
                    This section is most useful when the summary tiles, daily trend, and positive/negative member lists stay in one horizontal reading flow instead of stacking into separate sections.
                  </p>
                </div>
              </details>
              <div class="sentiment-panel shell-split shell-split--sentiment">
                <div class="sentiment-trend flex flex-col gap-2 p-4 bg-[var(--surface-sunken)] border border-[var(--border)] rounded-lg">
                  <h3 class="text-sm font-semibold text-[var(--text)] uppercase tracking-wider">Daily mood</h3>
                  <p class="text-xs text-[var(--text-muted)] m-0" id="sentiment-trend-note"></p>
                  <div class="w-full min-h-[200px] mt-2" id="sentiment-daily-chart"></div>
                </div>
                <div class="sentiment-participants flex flex-col gap-2 p-4 bg-[var(--surface-sunken)] border border-[var(--border)] rounded-lg">
                  <h3 class="text-sm font-semibold text-[var(--text)] uppercase tracking-wider">Members</h3>
                  <div class="flex flex-col gap-4 mt-2">
                    <div class="flex flex-col gap-1">
                      <h4 class="text-xs font-medium text-emerald-500">Most Positive</h4>
                      <ul id="sentiment-top-positive" class="text-sm text-[var(--text)] m-0 pl-4 list-disc"></ul>
                    </div>
                    <div class="flex flex-col gap-1 pt-4 border-t border-[var(--border)]">
                      <h4 class="text-xs font-medium text-rose-500">Most Negative</h4>
                      <ul id="sentiment-top-negative" class="text-sm text-[var(--text)] m-0 pl-4 list-disc"></ul>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

        </div>
      </section>

      <!-- Structured Evidence Cluster -->
      <section class="deep-dive-cluster deep-dive-cluster--exports flex flex-col gap-4" aria-labelledby="deep-dive-exports-cluster-title">
        <h3 id="deep-dive-exports-cluster-title" class="text-lg font-semibold text-[var(--text)] m-0 px-2 border-l-2 border-[#f43f5e]">Structured evidence</h3> <!-- rose accent -->

        <div class="grid grid-cols-1 gap-6">

          <!-- Message Mix -->
          <section class="analytics-story-card bg-[var(--card-bg)] border border-[var(--border)] rounded-xl shadow-card overflow-hidden flex flex-col" id="message-types" data-nav-target="message-types" data-vue-shell-mount="card-shell" data-accent="message-types">
            <div class="flex items-center justify-between p-5 border-b border-[var(--border)] bg-[var(--surface-sunken)]">
              <div class="flex items-center gap-3">
                <h2 class="text-[var(--text)] font-semibold flex items-center gap-2 m-0">
                  <span aria-hidden="true" class="text-[#f43f5e] flex">
                    <svg viewBox="0 0 24 24" class="w-5 h-5 fill-current"><path d="M20 2H4a2 2 0 0 0-2 2v18l4-4h14a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2z" /></svg>
                  </span>
                  Message Mix
                </h2>
              </div>
              <div class="flex items-center gap-2 border-l border-[var(--border)] pl-4">
                <button type="button" class="px-3 py-1.5 text-xs font-medium rounded-md bg-[var(--surface)] border border-[var(--border)] hover:bg-[var(--surface-hover)] text-[var(--text-muted)]" id="download-message-types">Download CSV</button>
                <button type="button" class="px-3 py-1.5 text-xs font-medium rounded-md bg-[var(--surface)] border border-[var(--border)] hover:bg-[var(--surface-hover)] text-[var(--text-muted)]" id="download-chat-json">Download JSON</button>
                <button type="button" class="card-toggle w-8 h-8 flex items-center justify-center rounded-md hover:bg-[var(--surface-hover)] text-[var(--text-muted)]" aria-expanded="true" data-target="message-types-content">
                  <svg class="w-4 h-4 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/></svg>
                </button>
              </div>
            </div>
            <div class="message-types-story-flow p-5 flex flex-col gap-6" id="message-types-content">
              <div class="message-type-summary story-summary-tier rounded-lg border border-[var(--border)] bg-[var(--surface-sunken)] p-4">
                <div id="message-type-summary" class="text-sm text-[var(--text)]"></div>
                <p id="message-types-note" class="m-0 text-xs text-[var(--text-muted)]"></p>
              </div>
              <details class="story-guide lower-lane-intro supporting-story-tier">
                <summary class="story-guide-summary">How to read</summary>
                <div class="story-guide-body">
                  <div class="pattern-story-kicker">Evidence guide</div>
                  <h3 class="pattern-story-title">Scan the message mix before drilling into exports</h3>
                  <p class="analytics-story-copy">
                    The tiles show the mix at a glance; the lower metrics help you tell whether the chat skews short, long, system-heavy, or attachment-heavy before you export the raw rows.
                  </p>
                </div>
              </details>
              <div class="analysis-evidence-frame evidence-panel-tier message-types-grid grid grid-cols-2 lg:grid-cols-4 gap-4 p-4 bg-[var(--surface-sunken)] border border-[var(--border)] rounded-lg text-center">
                
                  <div class="flex flex-col gap-1 p-2 border border-[var(--border)] rounded-md bg-[var(--surface)]">
                    <span class="text-2xl font-display text-[var(--text)]" id="media-count">0</span>
                    <span class="text-xs uppercase text-[var(--text-muted)] font-medium">Media</span>
                    <button type="button" class="mt-2 px-2 py-1 text-xs rounded hover:bg-[var(--surface-hover)] text-[#f43f5e]" data-export="media">CSV</button>
                  </div>
                
                  <div class="flex flex-col gap-1 p-2 border border-[var(--border)] rounded-md bg-[var(--surface)]">
                    <span class="text-2xl font-display text-[var(--text)]" id="link-count">0</span>
                    <span class="text-xs uppercase text-[var(--text-muted)] font-medium">Links</span>
                    <button type="button" class="mt-2 px-2 py-1 text-xs rounded hover:bg-[var(--surface-hover)] text-[#f43f5e]" data-export="links">CSV</button>
                  </div>

                  <div class="flex flex-col gap-1 p-2 border border-[var(--border)] rounded-md bg-[var(--surface)]">
                    <span class="text-2xl font-display text-[var(--text)]" id="poll-count">0</span>
                    <span class="text-xs uppercase text-[var(--text-muted)] font-medium">Polls</span>
                    <button type="button" class="mt-2 px-2 py-1 text-xs rounded hover:bg-[var(--surface-hover)] text-[#f43f5e]" data-export="polls">CSV</button>
                  </div>
                
                  <div class="flex flex-col gap-1 p-2 border border-[var(--border)] rounded-md bg-[var(--surface)]">
                    <span class="text-2xl font-display text-[var(--text)]" id="join-events">0</span>
                    <span class="text-xs uppercase text-[var(--text-muted)] font-medium">Joins</span>
                    <button type="button" class="mt-2 px-2 py-1 text-xs rounded hover:bg-[var(--surface-hover)] text-[#f43f5e]" data-export="joins">CSV</button>
                  </div>

                  <div class="flex items-center justify-between p-2 border-b border-[var(--border)] col-span-2 lg:col-span-4 mt-2">
                    <span class="text-sm text-[var(--text-muted)]">Added: <span id="added-events" class="font-bold text-[var(--text)]">0</span></span>
                    <span class="text-sm text-[var(--text-muted)]">Left: <span id="left-events" class="font-bold text-[var(--text)]">0</span></span>
                    <span class="text-sm text-[var(--text-muted)]">Removed: <span id="removed-events" class="font-bold text-[var(--text)]">0</span></span>
                    <span class="text-sm text-[var(--text-muted)]">Settings: <span id="changed-events" class="font-bold text-[var(--text)]">0</span></span>
                    <span class="text-sm text-[var(--text-muted)]">Other: <span id="other-system-events" class="font-bold text-[var(--text)]">0</span></span>
                  </div>

              </div>
              <div class="supporting-story-tier message-types-lower-strip flex items-center gap-8 justify-center rounded-lg border border-[var(--border)] bg-[var(--surface-sunken)] p-4 pt-2">
                   <div class="flex flex-col items-center">
                     <span class="text-xs text-[var(--text-muted)] uppercase">Avg Char / Msg</span>
                     <span class="text-xl font-display font-semibold text-[var(--text)]" id="avg-chars">0</span>
                   </div>
                   <div class="flex flex-col items-center">
                     <span class="text-xs text-[var(--text-muted)] uppercase">Avg Words / Msg</span>
                     <span class="text-xl font-display font-semibold text-[var(--text)]" id="avg-words">0</span>
                   </div>
              </div>
            </div>
          </section>

          <!-- Polls Card -->
          <section class="analytics-story-card bg-[var(--card-bg)] border border-[var(--border)] rounded-xl shadow-card overflow-hidden flex flex-col" id="polls-card" data-nav-target="polls" data-accent="polls" data-vue-shell-mount="card-shell">
            <div class="flex items-center justify-between p-5 border-b border-[var(--border)] bg-[var(--surface-sunken)]">
              <div class="flex items-center gap-3">
                <h2 class="text-[var(--text)] font-semibold flex items-center gap-2 m-0">
                  <span aria-hidden="true" class="text-[#f43f5e] flex">
                    <svg viewBox="0 0 24 24" class="w-5 h-5 fill-current"><path d="M6 19h2V5H6zm5 6h2V2h-2zm5-11v13h2V14z" /></svg>
                  </span>
                  Poll Highlights
                </h2>
              </div>
              <div class="flex items-center gap-2 border-l border-[var(--border)] pl-4">
                <button type="button" class="card-toggle w-8 h-8 flex items-center justify-center rounded-md hover:bg-[var(--surface-hover)] text-[var(--text-muted)]" aria-expanded="true" data-target="polls-content">
                  <svg class="w-4 h-4 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/></svg>
                </button>
              </div>
            </div>
            <div class="polls-summary p-5 flex flex-col md:flex-row gap-6" id="polls-content">
              <div class="story-summary-tier flex flex-col gap-4 bg-[var(--surface-sunken)] border border-[var(--border)] rounded-lg p-4 md:w-1/3 shrink-0">
                <div class="flex flex-col gap-1">
                  <span class="text-xs uppercase text-[var(--text-muted)] font-semibold tracking-wider">Total polls</span>
                  <span class="text-2xl font-display text-[var(--text)]" id="polls-total">0</span>
                </div>
                <div class="flex flex-col gap-1 pt-4 border-t border-[var(--border)]">
                  <span class="text-xs uppercase text-[var(--text-muted)] font-semibold tracking-wider">Unique creators</span>
                  <span class="text-2xl font-display text-[var(--text)]" id="polls-creators">0</span>
                </div>
              </div>
              <div class="analysis-evidence-frame evidence-panel-tier flex-1 border border-[var(--border)] rounded-lg bg-[var(--surface-sunken)] p-4 max-h-[300px] overflow-y-auto">
                <ol class="flex flex-col gap-2 m-0 p-0 list-none" id="polls-list"></ol>
              </div>
            </div>
            <p id="polls-note" class="px-5 pb-5 text-xs text-[var(--text-muted)]"></p>
          </section>

        </div>
      </section>

      <!-- Search & Saved Views Cluster -->
      <section class="deep-dive-cluster deep-dive-cluster--tools flex flex-col gap-4" aria-labelledby="deep-dive-tools-cluster-title">
        <h3 id="deep-dive-tools-cluster-title" class="text-lg font-semibold text-[var(--text)] m-0 px-2 border-l-2 border-[#3b82f6]">Search and saved views</h3>

        <div class="deep-dive-tools-grid">
          
          <!-- Search Card -->
          <section class="search-panel bg-[var(--card-bg)] border border-[var(--border)] rounded-xl shadow-card overflow-hidden flex flex-col" id="search-panel" data-nav-target="search" data-accent="search" data-vue-shell-mount="card-shell">
            <div class="flex items-center justify-between p-5 border-b border-[var(--border)] bg-[var(--surface-sunken)]">
              <div class="flex items-center gap-3">
                <h2 class="text-[var(--text)] font-semibold flex items-center gap-2 m-0">
                  <span aria-hidden="true" class="text-[#3b82f6] flex">
                    <svg viewBox="0 0 24 24" class="w-5 h-5 fill-current"><path d="M15.5 14h-.79l-.28-.27A6 6 0 1 0 14 15.5l.27.28v.79l5 5 1.5-1.5zm-5.5 0a4.5 4.5 0 1 1 0-9 4.5 4.5 0 0 1 0 9z" /></svg>
                  </span>
                  Search
                </h2>
              </div>
              <div class="flex items-center gap-2 border-l border-[var(--border)] pl-4">
                <button type="button" class="px-3 py-1.5 text-xs font-medium rounded-md bg-[var(--surface)] border border-[var(--border)] hover:bg-[var(--surface-hover)] hover:text-[var(--text)] text-[var(--text-muted)] transition-colors" id="download-search-results">Download CSV</button>
                <button type="button" class="card-toggle w-8 h-8 flex items-center justify-center rounded-md hover:bg-[var(--surface-hover)] text-[var(--text-muted)] transition-colors" aria-expanded="true" data-target="search-panel-content">
                  <svg class="w-4 h-4 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/></svg>
                </button>
              </div>
            </div>
            <div class="card-content search-strip-flow search-panel-layout p-5" id="search-panel-content">
              <form id="advanced-search-form" class="search-controls grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 bg-[var(--surface-sunken)] p-4 rounded-lg border border-[var(--border)]">
                <div class="search-control flex flex-col gap-1.5 focus-within:text-[var(--text)]">
                  <label for="search-keyword" class="text-xs font-medium uppercase text-[var(--text-muted)] tracking-wider transition-colors">Keywords</label>
                  <input type="text" id="search-keyword" placeholder="e.g. launch plan" autocomplete="off" class="w-full bg-[var(--surface)] border border-[var(--border)] text-[var(--text)] rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--focus-ring)]">
                </div>
                <div class="search-control flex flex-col gap-1.5">
                  <label for="search-participant" class="text-xs font-medium uppercase text-[var(--text-muted)] tracking-wider">Participant</label>
                  <select id="search-participant" class="w-full appearance-none bg-[var(--surface)] border border-[var(--border)] text-[var(--text)] rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--focus-ring)]">
                    <option value="">All participants</option>
                  </select>
                </div>
                <div class="search-control flex flex-col gap-1.5">
                  <label for="search-start" class="text-xs font-medium uppercase text-[var(--text-muted)] tracking-wider">Start date</label>
                  <input type="date" id="search-start" class="w-full bg-[var(--surface)] border border-[var(--border)] text-[var(--text)] rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--focus-ring)]">
                </div>
                <div class="search-control flex flex-col gap-1.5">
                  <label for="search-end" class="text-xs font-medium uppercase text-[var(--text-muted)] tracking-wider">End date</label>
                  <input type="date" id="search-end" class="w-full bg-[var(--surface)] border border-[var(--border)] text-[var(--text)] rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--focus-ring)]">
                </div>
                <div class="search-panel-actions col-span-1 md:col-span-2 lg:col-span-4 flex justify-end gap-2 pt-2 border-t border-[var(--border)] mt-2">
                  <button type="button" class="px-4 py-2 text-sm font-medium rounded-md bg-[var(--surface)] border border-[var(--border)] hover:bg-[var(--surface-hover)] text-[var(--text-muted)] hover:text-[var(--text)] transition-colors" id="reset-search">Clear filters</button>
                  <button type="submit" class="px-4 py-2 text-sm font-medium rounded-md bg-[#3b82f6] text-white hover:bg-blue-600 transition-colors shadow-sm" id="run-search">Search</button>
                </div>
              </form>
              <div class="search-results-lane analysis-evidence-frame evidence-panel-tier">
                <div class="search-strip-row search-strip-row--status flex flex-col gap-2">
                  <div id="search-results-summary" class="text-sm font-medium text-[var(--text)]">Search this chat.</div>
                  <div class="hidden flex-col gap-1" id="search-progress" aria-live="polite">
                    <div id="search-progress-track" class="w-full h-1.5 bg-[var(--surface-sunken)] rounded-full overflow-hidden" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0">
                      <div id="search-progress-bar" class="h-full bg-[#3b82f6] transition-all duration-300 w-0"></div>
                    </div>
                    <div id="search-progress-label" class="text-xs text-[var(--text-muted)]"></div>
                  </div>
                  <div class="hidden text-sm text-[var(--text-muted)]" id="search-insights" aria-live="polite"></div>
                </div>
                <div class="search-results-list flex flex-col gap-4" id="search-results-list"></div>
              </div>
            </div>
          </section>

          <!-- Saved Views Card -->
          <section class="saved-views bg-[var(--card-bg)] border border-[var(--border)] rounded-xl shadow-card overflow-hidden flex flex-col" id="saved-views-card" data-nav-target="saved-views" data-vue-shell-mount="card-shell" data-accent="saved-views">
            <div class="flex items-center justify-between p-5 border-b border-[var(--border)] bg-[var(--surface-sunken)]">
              <div class="flex items-center gap-3">
                <h2 class="text-[var(--text)] font-semibold flex items-center gap-2 m-0">
                  <span aria-hidden="true" class="text-[#3b82f6] flex">
                    <svg viewBox="0 0 24 24" class="w-5 h-5 fill-current"><path d="M17 3H5a2 2 0 0 0-2 2v14c0 1.1.9 2 2 2h14a2 2 0 0 0 2-2V7zM7 5h7v4H7zm7 14H7v-6h7zm3-12h-2V5h1z" /></svg>
                  </span>
                  Saved Views
                </h2>
              </div>
              <div class="flex items-center gap-2">
                <button type="button" class="card-toggle w-8 h-8 flex items-center justify-center rounded-md hover:bg-[var(--surface-hover)] text-[var(--text-muted)] transition-colors" aria-expanded="true" data-target="saved-views-content">
                  <svg class="w-4 h-4 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/></svg>
                </button>
              </div>
            </div>
            <div class="card-content saved-view-layout p-5" id="saved-views-content">
              <div class="saved-view-command-lane">
                <div class="saved-view-panel saved-view-command-board bg-[var(--surface-sunken)] p-4 rounded-lg border border-[var(--border)]">
                  <div class="saved-view-subsection saved-view-actions">
                    <label for="saved-view-name" class="text-xs font-medium uppercase text-[var(--text-muted)] tracking-wider">Save View</label>
                    <div class="flex items-center gap-2">
                      <input type="text" id="saved-view-name" placeholder="e.g. Last 30 days" class="w-full bg-[var(--surface)] border border-[var(--border)] text-[var(--text)] rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--focus-ring)]">
                      <button type="button" class="px-3 py-2 text-sm font-medium rounded-md bg-[var(--surface)] border border-[var(--border)] hover:bg-[var(--surface-hover)] text-[var(--text-muted)] hover:text-[#3b82f6] whitespace-nowrap transition-colors" id="save-view">Save</button>
                    </div>
                  </div>

                  <div class="saved-view-subsection saved-view-manage">
                    <label class="flex flex-col gap-1.5" for="saved-view-list">
                      <span class="text-xs font-medium uppercase text-[var(--text-muted)] tracking-wider">Manage Views</span>
                      <select id="saved-view-list" class="w-full appearance-none bg-[var(--surface)] border border-[var(--border)] text-[var(--text)] rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--focus-ring)]">
                        <option value="">No saved views yet</option>
                      </select>
                    </label>
                    <div class="flex gap-2">
                      <button type="button" class="flex-1 px-3 py-2 text-sm font-medium rounded-md bg-[var(--surface)] border border-[var(--border)] hover:bg-[var(--surface-hover)] text-[var(--text)] transition-colors" id="apply-saved-view">Load</button>
                      <button type="button" class="flex-1 px-3 py-2 text-sm font-medium rounded-md bg-[var(--surface)] border border-red-900/40 hover:bg-red-900/20 text-red-400 transition-colors" id="delete-saved-view">Delete</button>
                    </div>
                  </div>

                  <div class="saved-view-subsection saved-view-compare compare-controls" id="compare-controls">
                    <span class="text-xs font-medium uppercase text-[var(--text-muted)] tracking-wider">Compare</span>
                    <div class="flex flex-col gap-1.5">
                      <label for="compare-view-a" class="text-[var(--text)] text-sm">View A</label>
                      <select id="compare-view-a" class="w-full appearance-none bg-[var(--surface)] border border-[var(--border)] text-[var(--text)] rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--focus-ring)]">
                        <option value="">Select view</option>
                      </select>
                    </div>
                    <div class="flex flex-col gap-1.5">
                      <label for="compare-view-b" class="text-[var(--text)] text-sm">View B</label>
                      <select id="compare-view-b" class="w-full appearance-none bg-[var(--surface)] border border-[var(--border)] text-[var(--text)] rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--focus-ring)]">
                        <option value="">Select view</option>
                      </select>
                    </div>
                    <button type="button" class="w-full mt-2 px-3 py-2 text-sm font-medium rounded-md bg-[var(--surface)] border border-[var(--border)] hover:bg-[var(--surface-hover)] hover:text-[var(--text)] text-[var(--text-muted)] transition-colors" id="compare-views">Compare views</button>
                  </div>
                </div>
              </div>
              <div class="saved-view-results-lane saved-view-panel saved-view-panel--summary flex-1 flex flex-col gap-4 border border-[var(--border)] bg-[var(--surface-sunken)] rounded-lg p-4 h-full min-h-[400px]">
                <div class="saved-view-gallery flex flex-col gap-4 overflow-y-auto" id="saved-view-gallery" aria-live="polite"></div>
                <div class="compare-summary text-sm text-[var(--text)]" id="compare-summary"></div>
              </div>
            </div>
          </section>
        </div>
      </section>

    </div>
  </section>
</template>

<script setup>
</script>
