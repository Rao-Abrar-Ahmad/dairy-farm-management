# ADR 0001: Offline-First Architecture with Local SQLite + Sync Queue

## Status
Accepted

## Context
The app is used in the field (on a farm) where connectivity is unreliable. The core workflows — adding/editing/deleting Animals, and logging Records (vaccination, deworming, AI) — must all work with no internet connection, with data syncing to Appwrite once connectivity returns.

There are only 4 known Users, and it's been confirmed that concurrent edits to the *same* Animal by two offline Users at the same time is not a realistic concern for this app. This means we can avoid building real conflict-resolution logic (e.g. CRDTs, vector clocks, merge UI).

## Decision
- The app will use a **local SQLite database** (via Expo, e.g. `expo-sqlite`) as the on-device store for Animals and Records.
- All writes (create/edit/soft-delete) happen locally first, then get pushed to Appwrite through a **sync queue** (pending-operations table) that flushes when connectivity is detected.
- Conflict resolution strategy: **last-write-wins**, no merge UI, no CRDTs — justified by the confirmed low-concurrency, trusted-small-team usage pattern.
- Reads are always served from the local SQLite cache; sync keeps it eventually consistent with Appwrite.

## Consequences
- Simpler to build and reason about than a full bi-directional sync engine.
- If the "no simultaneous conflicting edits" assumption is ever wrong (e.g. app grows beyond 4 trusted users), stale overwrites are possible with no warning to the user. Acceptable for current scale.
- Image uploads (Appwrite Storage) need their own offline-queue handling since they can't be stored as rows in SQLite — local file URI is stored and queued for upload separately (to be detailed later).
