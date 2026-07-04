# Context: Dairy Farm Management App

A glossary of domain terms, resolved through grilling sessions. This file contains no implementation details — only shared meaning.

## Terms

### Farm
There is exactly **one Farm** in this system (a single shared tenant). All Users operate on the same pool of Animals and Records — there's no fixed headcount (started as ~4, but could be fewer or more). There is no per-user data isolation — anyone can view, add, or edit any Animal or Record. A User's identity is used for **attribution** (who performed an action), not for **ownership/scoping** of data.

### User
A person authorized to use the app, identified only by **full name + email** (no password, no OTP — a lightweight identification, not a secured login). Entered once on first app launch and stored in a Users table with a generated UUID and a unique Email. The number of Users isn't fixed at 4 — it's whoever is on the Farm's trusted circle at a given time (could be fewer or more).

### Attribution
Every write to an Animal or Record carries **addedBy** (User who created it) and **updatedBy** (User who last edited it), both referencing a User's UUID. This exists purely to answer "who logged this" — it is not an access-control mechanism (see Farm: no per-user data scoping).

### Record
A logged fact about an Animal at a point in time — something that **already happened** (not a scheduled/upcoming task). Always tied to exactly one Animal, one Record Type, and a Date (defaults to today, editable). Has an optional free-form **Notes** text field (e.g. vaccine brand/dose used).

### Record Type
The category of a Record. Confirmed types so far: **Vaccination**, **Deworming**, **Artificial Insemination (AI)**. Open to more types being added. Purely a logbook — no due-date scheduling or reminder logic for now (explicitly deferred).

### Animal
A cow or goat owned by the Farm. Has a **Species** (Cow, Goat — extensible later). Identified primarily by photo (see Featured Image), optionally by Tag Number and/or Name (neither required). Has an optional **Purchase Price** and **Purchase Date** (optional because some Animals are farm-born, not bought). Has a lifecycle status of **Active** or **Sold**; Sold Animals additionally have a **Sold Price** and **Sold Date**, and Profit is computed as `Sold Price − Purchase Price` (only shown if Purchase Price is present — farm-born Animals can still be marked Sold, just without a Profit figure). Sold Animals move out of the main active-herd list into a separate Sold view, but remain fully viewable with full Record history. Deleting an Animal is a **soft delete**: it disappears from the main active-herd list and moves into a **Deleted (Trash)** view, from which a User can either **Restore** it back to active or **Permanently Delete** it. **Tag Number** is optional, but when provided must be unique **among Active Animals only** (a Sold or Deleted Animal's tag number can be reused by a new Animal, mirroring how physical ear tags get reassigned). Animal also has an optional free-form **Notes** text field.

### Featured Image
The first image (by position) in an Animal's image list (max 3 images per Animal). Shown in animal listings since Animals are primarily identified by photo. Users set it by dragging any of the Animal's images into the first position; images can also be reordered freely and deleted. Local image files are kept on-device indefinitely after upload to Appwrite Storage (no cleanup) — the priority is that local and cloud data stay consistent, not conserving phone storage.

### Pregnancy Check
A Record Type that confirms or denies pregnancy resulting from a specific prior AI Record. Outcome is binary: **Confirmed Pregnant** or **Not Pregnant** (no "inconclusive" state). Always references exactly one AI Record — the app pre-selects the Animal's most recent AI Record by default, but the User can override and pick a different one from that Animal's AI history. An Animal may have multiple AI Records before one succeeds (cows: ~21 days between retry attempts if a Pregnancy Check comes back negative; confirmation is realistically only possible ~50 days after the AI Record's date). Once confirmed positive, the linked AI Record's date + the Animal's species gestation length gives the predicted delivery date/month.
