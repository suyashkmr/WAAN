# Relay Architecture

This note describes the current server relay module boundaries.

## Module Map

- `apps/server/src/relay/relayManager.js`
  - Runtime orchestrator and state owner.
  - Handles lifecycle transitions, status snapshots, and top-level sync flow.
- `apps/server/src/relay/syncStrategy.js`
  - Chat-list sync strategy (`auto`, `primary`, `fallback`).
  - Primary retry/backoff and fallback handoff logic.
- `apps/server/src/relay/relayData.js`
  - Relay data transforms:
    - JID normalization
    - chat metadata patch building/persistence helpers
    - message serialization
- `apps/server/src/relay/relayLifecycle.js`
  - Client construction and event wiring (`qr`, `ready`, `message`, etc.).
- `apps/server/src/relay/relayBrowserWindow.js`
  - Platform-specific relay browser show/open behavior.

## Performance Notes

- `syncChats()` now collects metadata updates and uses `chatStore.upsertChatMetaBulk()` when available.
- This reduces metadata file write amplification during large chat-list syncs.
- Status metrics expose:
  - `lastSyncDurationMs`
  - `lastSyncPersistDurationMs`
