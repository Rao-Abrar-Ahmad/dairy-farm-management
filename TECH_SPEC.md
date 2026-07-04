# Technical Specification: Dairy Farm Management App

**Status:** Ready for implementation
**Companion docs:** `CONTEXT.md` (domain glossary), `docs/adr/0001-offline-first-sqlite-sync.md`, `docs/adr/0002-lightweight-identification-no-auth.md`

---

## 1. Overview

A personal, closed-circle mobile app for managing a small dairy farm's livestock (cows and goats). Used by a small trusted group of people (started at ~4, not fixed) to:

1. Track every Animal on the farm — identity, photos, purchase/sale economics.
2. Log **Records** (Vaccination, Deworming, Artificial Insemination, Pregnancy Check) so nobody has to rely on memory.
3. Surface useful derived information (pregnancy delivery predictions, recent activity, herd counts, profit) on a simple dashboard.
4. Work fully **offline** in the field, syncing to the cloud when connectivity returns.

Not published to the Play Store or App Store — distributed as a production build via **EAS Build**, installed directly (APK / ad-hoc) on each user's device.

---

## 2. Tech Stack

| Layer | Choice | Notes |
|---|---|---|
| App framework | Expo (managed workflow) + React Native | Use Expo SDK current stable at build time |
| Language | TypeScript | Strict mode on |
| Navigation | Expo Router | File-based routing; bottom tabs + stacks |
| Backend | Appwrite (Cloud or self-hosted) | Database, Storage, no Auth service used (see ADR 0002) |
| Local DB | `expo-sqlite` | Source of truth for on-device reads; mirrors Appwrite collections |
| Sync | Custom sync engine (see §6) | Queue-based, last-write-wins |
| Image handling | `expo-image-picker` + `expo-file-system` | Local URI storage, queued upload to Appwrite Storage |
| Forms | `react-hook-form` + `zod` | Validation schemas shared between forms |
| State/data | React Query (`@tanstack/react-query`) pointed at the local SQLite layer (not directly at Appwrite) | UI always reads local DB; sync engine updates local DB in the background |
| Styling | `nativewind` (Tailwind for RN) or StyleSheet with a central theme file | See §9 Design System |
| Icons/illustrations | Custom SVG (via `react-native-svg`) | Per §9 — no generic icon-pack look |
| Drag-to-reorder images | `react-native-draggable-flatlist` (or equivalent) | For the 3-image featured/reorder UI |
| Network detection | `@react-native-community/netinfo` | Triggers sync queue flush on reconnect |

---

## 3. Domain Model (Implementation View)

See `CONTEXT.md` for the conceptual definitions. This section adds concrete field-level detail.

### 3.1 User

| Field | Type | Required | Notes |
|---|---|---|---|
| `id` | UUID (string) | yes | Primary key, generated client-side on first launch |
| `fullName` | string | yes | Editable later from Profile tab |
| `email` | string | yes | **Unique** across Users |
| `profileImageLocalUri` | string | no | Local file URI |
| `profileImageUrl` | string | no | Appwrite Storage URL, set after upload |
| `createdAt` | datetime | yes | |
| `updatedAt` | datetime | yes | |

**First-launch flow:** app checks local SQLite for an existing User row (persisted device-local "who am I"). If none, show the name+email form → create User row locally → queue for sync → proceed to app. On subsequent launches, skip straight to the app (no repeated prompt), with the identity editable later from Profile.

### 3.2 Animal

| Field | Type | Required | Notes |
|---|---|---|---|
| `id` | UUID | yes | |
| `species` | enum: `cow`, `goat` | yes | Extensible — model as a string enum, not a hardcoded boolean |
| `tagNumber` | string | no | Unique **among Active Animals** (validated app-side; see §7.3) |
| `name` | string | no | |
| `notes` | text | no | Free-form |
| `purchasePrice` | number | no | Absence means farm-born or unknown |
| `purchaseDate` | date | no | |
| `status` | enum: `active`, `sold` | yes | Default `active` |
| `soldPrice` | number | no | Required only when `status = sold` |
| `soldDate` | date | no | Required only when `status = sold` |
| `isDeleted` | boolean | yes | Default `false` — soft delete flag |
| `deletedAt` | datetime | no | |
| `addedBy` | UUID → User | yes | |
| `updatedBy` | UUID → User | yes | |
| `createdAt` | datetime | yes | |
| `updatedAt` | datetime | yes | |

Derived (not stored): **Profit** = `soldPrice - purchasePrice`, computed and displayed only if both are present.

### 3.3 AnimalImage

Images are modeled as their own table/collection (not a JSON array on Animal) so ordering and per-image sync state are easy to manage.

| Field | Type | Required | Notes |
|---|---|---|---|
| `id` | UUID | yes | |
| `animalId` | UUID → Animal | yes | |
| `position` | integer (0, 1, 2) | yes | `0` = Featured Image. Max 3 images per Animal enforced app-side |
| `localUri` | string | yes | Always populated immediately on add |
| `remoteUrl` | string | no | Populated once uploaded to Appwrite Storage |
| `syncStatus` | enum: `pending`, `synced` | yes | |
| `createdAt` | datetime | yes | |

Reordering = updating `position` values among an Animal's images (drag first image slot to change Featured).

### 3.4 Record

| Field | Type | Required | Notes |
|---|---|---|---|
| `id` | UUID | yes | |
| `animalId` | UUID → Animal | yes | |
| `recordType` | enum: `vaccination`, `deworming`, `ai`, `pregnancy_check` | yes | Extensible enum |
| `date` | date | yes | Defaults to today in the UI, editable |
| `notes` | text | no | e.g. vaccine brand/dose |
| `linkedAiRecordId` | UUID → Record | conditionally | **Required when `recordType = pregnancy_check`**; must point to a Record where `recordType = ai` for the same `animalId`. Null for all other types |
| `pregnancyResult` | enum: `confirmed`, `not_confirmed` | conditionally | **Required when `recordType = pregnancy_check`**. Null for all other types |
| `addedBy` | UUID → User | yes | |
| `updatedBy` | UUID → User | yes | |
| `createdAt` | datetime | yes | |
| `updatedAt` | datetime | yes | |

**Validation rules:**
- `pregnancy_check` records must reference an `ai` record belonging to the *same* Animal.
- An Animal can have multiple `ai` records; the "Add Pregnancy Check" form pre-selects the most recent `ai` record for that Animal as the default `linkedAiRecordId`, with a picker to override.

### 3.5 Derived: Pregnancy / Delivery Prediction

Not stored — computed at read time:

```
gestationDays = species === 'cow' ? 283 : 150   // goat

For each Animal with a pregnancy_check Record where pregnancyResult === 'confirmed':
  linkedAi = the Record referenced by linkedAiRecordId
  predictedDeliveryDate = linkedAi.date + gestationDays
```

Display as an approximate month/date (e.g. "Expected: ~Oct 2026"), clearly labeled as an estimate — never as a guaranteed date, since real gestation varies by ±a week or more.

---

## 4. Appwrite Setup

### 4.1 Collections

Create four collections in a single Appwrite Database (e.g. `farm_db`):

- `users`
- `animals`
- `animal_images`
- `records`

Attributes per collection mirror §3 above 1:1 (Appwrite attribute types: `string`, `integer`, `double`, `boolean`, `datetime`, `enum`).

**Indexes:**
- `users.email` — unique index
- `animals.tagNumber` — index (uniqueness enforced app-side against Active animals only, since Appwrite unique indexes can't easily express "unique among a filtered subset")
- `animal_images.animalId` — index
- `records.animalId` — index
- `records.recordType` — index (for querying, e.g., all `ai` records for an animal)

### 4.2 Storage

One Appwrite Storage bucket, e.g. `animal-images`, plus a second bucket `profile-images` (or reuse one bucket with a naming/folder convention — either is fine). Store the returned file ID/URL in `AnimalImage.remoteUrl` / `User.profileImageUrl`.

### 4.3 Permissions

Per ADR 0002, there is no real per-user authentication. Configure collection-level permissions to allow read/write broadly (any client with the app's Appwrite endpoint + project ID can read/write) — consistent with the single-shared-Farm, trusted-closed-circle model. Do not attempt to build per-user row-level restriction logic; it isn't needed here (see CONTEXT.md: Farm).

> **Security note for whoever implements this:** this means the Appwrite API key/endpoint embedded in the app effectively grants full read/write to anyone who has the app. This is an accepted, explicit trade-off (ADR 0002), appropriate only because this app is never distributed beyond a small trusted circle.

---

## 5. Local SQLite Schema

Mirrors §3 exactly, plus one additional table for sync bookkeeping:

```sql
CREATE TABLE users (
  id TEXT PRIMARY KEY,
  fullName TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  profileImageLocalUri TEXT,
  profileImageUrl TEXT,
  createdAt TEXT NOT NULL,
  updatedAt TEXT NOT NULL
);

CREATE TABLE animals (
  id TEXT PRIMARY KEY,
  species TEXT NOT NULL CHECK (species IN ('cow', 'goat')),
  tagNumber TEXT,
  name TEXT,
  notes TEXT,
  purchasePrice REAL,
  purchaseDate TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'sold')),
  soldPrice REAL,
  soldDate TEXT,
  isDeleted INTEGER NOT NULL DEFAULT 0,
  deletedAt TEXT,
  addedBy TEXT NOT NULL REFERENCES users(id),
  updatedBy TEXT NOT NULL REFERENCES users(id),
  createdAt TEXT NOT NULL,
  updatedAt TEXT NOT NULL
);

CREATE TABLE animal_images (
  id TEXT PRIMARY KEY,
  animalId TEXT NOT NULL REFERENCES animals(id),
  position INTEGER NOT NULL CHECK (position IN (0, 1, 2)),
  localUri TEXT NOT NULL,
  remoteUrl TEXT,
  syncStatus TEXT NOT NULL DEFAULT 'pending' CHECK (syncStatus IN ('pending', 'synced')),
  createdAt TEXT NOT NULL
);

CREATE TABLE records (
  id TEXT PRIMARY KEY,
  animalId TEXT NOT NULL REFERENCES animals(id),
  recordType TEXT NOT NULL CHECK (recordType IN ('vaccination', 'deworming', 'ai', 'pregnancy_check')),
  date TEXT NOT NULL,
  notes TEXT,
  linkedAiRecordId TEXT REFERENCES records(id),
  pregnancyResult TEXT CHECK (pregnancyResult IN ('confirmed', 'not_confirmed')),
  addedBy TEXT NOT NULL REFERENCES users(id),
  updatedBy TEXT NOT NULL REFERENCES users(id),
  createdAt TEXT NOT NULL,
  updatedAt TEXT NOT NULL
);

-- Sync bookkeeping: one row per pending local mutation awaiting push to Appwrite
CREATE TABLE sync_queue (
  id TEXT PRIMARY KEY,               -- UUID for the queue entry itself
  entityType TEXT NOT NULL CHECK (entityType IN ('user', 'animal', 'animal_image', 'record')),
  entityId TEXT NOT NULL,            -- id of the row in the relevant table above
  operation TEXT NOT NULL CHECK (operation IN ('create', 'update', 'delete')),
  payload TEXT NOT NULL,             -- JSON snapshot of the row at queue time
  attempts INTEGER NOT NULL DEFAULT 0,
  lastError TEXT,
  createdAt TEXT NOT NULL
);
```

---

## 6. Offline Sync Architecture

Per ADR 0001: local SQLite is the source of truth for reads; all writes go local-first; a queue pushes changes to Appwrite when online.

### 6.1 Write path

1. User performs an action (e.g. adds a Record).
2. App writes directly to the relevant local SQLite table.
3. App inserts one row into `sync_queue` describing the change (`entityType`, `entityId`, `operation`, JSON `payload`).
4. UI updates immediately from local SQLite (via React Query reading local data) — no waiting on network.
5. If online, the sync engine attempts to flush the queue immediately; if offline, it waits for a network-restored event.

### 6.2 Sync engine (flush loop)

- Listens to `NetInfo` connectivity changes; on transition to "connected," runs a flush pass.
- Also runs a flush pass on app foreground/launch, as a safety net.
- Processes `sync_queue` rows **in `createdAt` order**, oldest first, per entity type ordering: `user` → `animal` → `animal_image` → `record` (so foreign keys like `animalId`/`addedBy` always resolve on the server before dependent rows sync).
- For each row: call the corresponding Appwrite SDK method (`createDocument` / `updateDocument` / `deleteDocument`) using the JSON `payload`.
  - On success: delete the `sync_queue` row.
  - On failure: increment `attempts`, store `lastError`, leave the row queued for retry on the next flush pass. After a reasonable number of failed attempts (e.g. 10), surface a non-blocking "sync issue" indicator in the UI (see §7.6) rather than silently retrying forever.
- **Images** are handled as a distinct sub-step: for any `animal_images` row with `syncStatus = 'pending'`, upload the file at `localUri` to Appwrite Storage, then update the row's `remoteUrl` and `syncStatus = 'synced'` both locally and via the queue.

### 6.3 Conflict handling

Per ADR 0001: **last-write-wins**, no merge logic. If a document is updated both locally and remotely between syncs (accepted as low-probability given the small trusted user base), the last successful write to Appwrite simply overwrites. No user-facing conflict resolution UI is required for v1.

### 6.4 Initial pull / multi-device consistency

On first launch (after identity is created) and periodically thereafter (e.g. app foreground), pull all collections from Appwrite and upsert into local SQLite, so a device that was offline for a while catches up on changes made by other Users on other devices. A simple `updatedAt`-based upsert (skip if local `updatedAt` is newer — consistent with last-write-wins) is sufficient.

---

## 7. Screens & Navigation

### 7.1 Navigation structure

```
Root
├── Onboarding (name + email) — shown once, before first entry into tabs
└── Tabs (bottom navigation)
    ├── Home
    ├── Animals
    │   ├── Animals List (segmented: Active | Sold | Trash, + search bar)
    │   ├── Animal Detail
    │   ├── Add / Edit Animal (form)
    │   └── Add Record (form, opened from Animal Detail)
    └── Profile (name + photo editing)
```

### 7.2 Onboarding

- Simple single-screen form: Full Name, Email.
- Validates email format and uniqueness (query local SQLite first, then rely on sync to catch a rare cross-device collision — acceptable given the trusted, small-scale context).
- On submit: create User row locally + sync queue entry, persist "this device's user id" in local storage (e.g. `expo-secure-store` or plain SQLite flag table), navigate to Tabs.

### 7.3 Animals List

- Segmented control: **Active | Sold | Trash**, defaulting to Active.
- Search bar filtering by `name`, `tagNumber`, and `species` (client-side filter over local SQLite — dataset size is small, no need for server-side search).
- Each row: Featured Image thumbnail (or species silhouette placeholder if no image yet), Name/Tag, Species icon.
- Floating action button or header "+" → Add Animal.
- Trash rows show Restore / Permanently Delete actions (swipe actions or inline buttons).
- **Tag uniqueness validation**: on Add/Edit Animal, when a `tagNumber` is provided, check against other Animals where `status != 'sold'... ` — precisely: check uniqueness among Animals where `isDeleted = false` (Trash and Sold both count as "not active" for reuse eligibility — confirm this matches "Active Animals only" wording: only truly `status = 'active' AND isDeleted = false` Animals block reuse of a tag).

### 7.4 Animal Detail

Sections, top to bottom:
1. Image carousel (the up-to-3 images, swipeable), with an "Edit Photos" entry point (add/reorder/delete, drag first slot = Featured).
2. Core info: Species icon, Name, Tag Number, Notes.
3. Economics: Purchase Price/Date if present; Sold Price/Date + computed Profit if sold; a "Mark as Sold" action if still Active.
4. **Record timeline**: reverse-chronological list of all Records for this Animal, each showing Record Type icon, date, notes, and attribution ("Logged by {addedBy.fullName}"). Pregnancy Check entries show their linked AI Record's date and result.
5. If any Confirmed Pregnancy Check exists with no subsequent delivery-superseding event, show the predicted delivery estimate prominently near the top of the timeline (not buried).
6. "+ Add Record" button, always visible (e.g. floating or sticky footer).
7. Edit / Delete (soft-delete) actions.

### 7.5 Add Record (form)

- Animal is pre-selected (from Animal Detail context) or selectable (if reached from a generic "+" elsewhere — optional for v1, not required since the spec's stated primary entry point is from Animal Detail).
- Record Type selector: Vaccination / Deworming / AI / Pregnancy Check.
- Date field, defaults to today, editable via date picker.
- Notes field (optional, free text).
- **If Record Type = Pregnancy Check**: show an additional required picker for "Which AI attempt?" — pre-populated with the Animal's most recent `ai` Record, with the full list of that Animal's `ai` Records available to pick a different one — plus a required Confirmed/Not Confirmed toggle.
- Validation: Pregnancy Check requires an existing `ai` Record for that Animal to select; if none exists, show a clear inline message (e.g. "No AI record found for this animal yet — add an AI record first") rather than a silent dead-end.

### 7.6 Home (Dashboard)

Top to bottom:
1. **Header**: current User's name, email, small welcome message, profile avatar (tap → Profile tab).
2. **Summary cards** (4, horizontally scrollable or 2x2 grid):
   - Active Cows (count)
   - Active Goats (count)
   - Confirmed Pregnant (count of Animals with an unresolved confirmed pregnancy)
   - Total Profit — **shown only if at least one Sold Animal has a computable profit**; otherwise this card is omitted entirely (per discussion: profit is a nice-to-have, not core).
3. **Upcoming Deliveries**: list of Animals with confirmed pregnancies, sorted by soonest predicted delivery date, showing Animal thumbnail/name/tag + predicted month.
4. **Recent Activity**: latest N Records across the whole farm (any Animal, any type), most recent first, each showing Animal name/thumbnail, Record Type icon, date, and who logged it.
5. A small, unobtrusive **sync status indicator** (e.g. a subtle icon/badge) reflecting whether the sync queue is empty (all synced), pending (offline or catching up), or has persistent errors — keeps the offline-first behavior transparent without being alarming.

### 7.7 Profile

- Display + edit: Full Name, Profile Photo (single image, same local-first/upload pattern as Animal images, just one slot instead of three).
- Email shown but **not editable** (it's the unique identifier — changing it is out of scope for v1; if truly needed later, treat as a delete-and-recreate User).
- No other settings needed for v1 (no logout concept, since there's no real auth per ADR 0002).

---

## 8. Business Logic Summary

| Rule | Logic |
|---|---|
| Tag uniqueness | Reject Add/Edit if another Animal with `status = 'active' AND isDeleted = false` already has the same `tagNumber` |
| Max images | Reject adding a 4th image; UI should disable/hide the "add image" affordance once 3 exist |
| Featured image | Always the image at `position = 0` |
| Profit | `soldPrice - purchasePrice`, only computed/displayed if both fields are non-null |
| Pregnancy prediction | `linked ai Record's date + (species === 'cow' ? 283 : 150) days`, only shown for Records where `pregnancyResult = 'confirmed'` |
| Soft delete | Sets `isDeleted = true`, `deletedAt = now`; Restore sets `isDeleted = false`, `deletedAt = null`; Permanently Delete removes the row (and cascades to its Records/Images) both locally and via a `delete` sync_queue entry |
| Sold transition | Setting `status = 'sold'` requires `soldPrice` and `soldDate`; Animal moves from Active list to Sold list immediately (local read), history stays intact |

---

## 9. Design System

Distinctive, warm, farm-grounded visual identity — not a generic template look.

### 9.1 Color tokens

| Token | Hex | Usage |
|---|---|---|
| `color.primary` | `#3D4F3D` | Deep moss green — primary actions, active tab, headers |
| `color.background` | `#FBF7F0` | Warm oat/cream app background |
| `color.accent` | `#B5654A` | Soft clay/rust — key CTAs (Add Record, Sold badge) |
| `color.highlight` | `#C9A15A` | Muted gold — pregnancy/highlight moments, prediction callouts |
| `color.textPrimary` | `#2E2A25` | Deep charcoal-brown, not pure black |
| `color.textSecondary` | `#6B6357` | Muted brown-grey for secondary text |
| `color.surface` | `#FFFFFF` | Card backgrounds |
| `color.border` | `#E8E0D3` | Hairline dividers, subtle card borders |
| `color.danger` | `#A6432F` | Delete/Trash actions |

### 9.2 Typography

- **Display/headers**: a rounded geometric humanist sans (e.g. a font like Sora or Manrope) — friendly, confident, legible at a glance for dashboard numbers.
- **Body/UI text**: a clean, highly legible sans (e.g. Inter or the same family as display, lighter weight) for form labels, list text, notes.
- **Numeric emphasis**: dashboard card counts use a heavier weight and larger scale than surrounding labels, since these are meant to be read at a glance.

### 9.3 Iconography

Custom line-based SVGs (via `react-native-svg`), not stock icon packs, for:
- Record Types: syringe (Vaccination), leaf/pill (Deworming), droplet (AI), small heart-pin (Pregnancy Check)
- Species: simple cow silhouette, simple goat silhouette — reused both as list icons and as **empty-state / placeholder images** when an Animal has no photo yet (the app's signature visual element, tying the UI back to real animals rather than generic photo-upload iconography)

### 9.4 Layout feel

- Generous whitespace, soft-rounded cards (medium radius, not sharp, not pill-shaped/playful), minimal hairline borders (`color.border`) instead of heavy shadows.
- One clear accent color per action — avoid multiple competing bright colors on one screen.
- Bottom tab bar: 3 tabs (Home, Animals, Profile), icons + labels, primary color for active state.

---

## 10. Explicitly Out of Scope for v1

(Captured here so a coding agent doesn't accidentally over-build.)

- No due-date scheduling or push notifications/reminders for vaccination/deworming cycles.
- No real authentication (password/OTP) — see ADR 0002.
- No per-user data scoping/permissions — see CONTEXT.md: Farm.
- No conflict-resolution UI for simultaneous edits — see ADR 0001.
- No support for species beyond Cow/Goat in v1 (though the `species` enum should be easy to extend later).
- No expense tracking beyond the simple Purchase Price / Sold Price profit calculation.
- No editable email (User identity is create-once for v1).

---

## 11. Suggested Build Order

1. Local SQLite schema + basic navigation shell (empty screens, tab bar).
2. Onboarding flow (User creation, local persistence of "who am I").
3. Animal CRUD (local-only first, no sync yet) — List, Detail, Add/Edit, soft delete/Trash/Restore.
4. Image handling (local picker, 3-image drag-reorder, Featured logic) — still local-only.
5. Record CRUD (Vaccination/Deworming/AI first — simpler, no linking), then Pregnancy Check (with AI-linking picker + prediction calc).
6. Home dashboard (cards, Upcoming Deliveries, Recent Activity) — all reading from local SQLite.
7. Appwrite project setup (collections, storage buckets, permissions per §4).
8. Sync engine (§6): queue writer, flush loop, NetInfo integration, initial pull.
9. Design pass: apply tokens/typography/custom SVGs (§9) across all screens built in steps 1–6.
10. EAS Build configuration for production builds; distribute directly to devices.
