# Relay Architecture

Authority note:
- This file is current high-level relay/server guidance.
- Use this with `docs/relay-troubleshooting.md` and `docs/release-smoke-checklist.md` for current operational flow.

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

## Runtime Contract Notes

- The relay exposes a control/status surface on the relay port and chat/API surface on the API port.
- Reuse/startup logic must treat both client and backend processes as build-specific, not merely port-compatible.
- Release validation should cover:
  - relay lifecycle transitions
  - export integrity
  - packaged startup/reuse behavior
  - recovery actions from degraded relay states

## Performance Notes

- `syncChats()` now collects metadata updates and uses `chatStore.upsertChatMetaBulk()` when available.
- This reduces metadata file write amplification during large chat-list syncs.
- Status metrics expose:
  - `lastSyncDurationMs`
  - `lastSyncPersistDurationMs`
