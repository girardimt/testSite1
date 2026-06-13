# WorkTrack v2 - Requirements (Q&A Aligned + Status/Audit/Comments Layer)

This document is a self-contained requirement set for WorkTrack v2. It describes **what the system must do**, **what it must look like**, and **what it must explicitly exclude**. It contains no references to current implementation, file layout, or migration history — it is written as if WorkTrack v2 is being specified for the first time.

Section map:

Revision note - Q&A mapping incorporated: This aligned version incorporates the WorkTrack v1 Q&A decisions for lifecycle management, settings-driven defaults, shared persistence, validation rules, search behavior, performance thresholds, and open decisions. This update also layers in the status transition model, audit/activity history, Work Item comments, data quality severity rules, and standardized error handling.

- (a) App Summary

- (b) Visual System & Styles

- (c) Shared Functions & Components

- (d) Dialogs & Modals

- (e) Data Model — Detailed

- (f) Detailed Functional Requirements (per page)

- (g) Common Elements & Shared Component Inventory

- (h) Storage / Backend - Persistent Shared Data Layer

- (i) Non-functional Requirements (a11y, performance, motion, responsiveness)

- (j) Open Questions / Decisions Needed

- (k) Additional Layered Requirements - Status, Audit, Comments, Data Quality, Error Handling

- (l) Copilot AppBuilder Agent Instructions — SharePoint Provisioning + App Build

## (a) App Summary

### One-line description

A work-item tracking app for managing a backlog of work, the blockers attached to that work, supporting links, planned releases, and a Kanban planning board — themed to PepsiCo's brand guidelines.

### Purpose

Give a procurement / program team a single place to:

- See **what** is being worked on (work items, status, priority, category, release).

- See **why** things are stuck (blockers, validation state, expected resolution).

- See **where** supporting context lives (links to docs, tickets, Power Apps, etc.).

- **Plan** what ships in which release via a drag-and-drop Kanban.

- Maintain the core reference data (categories, blocker types, people, releases) used everywhere else.

### Primary users

- **Program / procurement leads** — own work items, drive status, plan releases.

- **Contributors / assignees** — update progress on items assigned to them.

- **Stakeholders** — read the Dashboard / Releases view for at-a-glance status.

### High-level capabilities

1.  **Dashboard** — KPI tiles (with smart navigation into pre-filtered Work Items), status donut, category bar chart, upcoming items list, active blockers list, Next Release card, Needs Planning tile.

2.  **Work Items** — URL-driven filtered list (status, statusGroup, category, release, complete, overdue), search, group-by category or release, create/edit dialog, columns for title, status, priority, assignee, category, release, goal date, progress.

3.  **Work Item Detail — inline auto-saving status control, edit dialog, panels for Blockers (log / revalidate / clear), Links, Sub-tasks, Comments, and Activity; per-blocker detail dialog.**

4.  **Planning Kanban** — columns by status, swimlanes by release, drag-and-drop to change status and/or assign to a release; Blocked guardrail (cannot move into Blocked without an active blocker, and priorStatus is preserved for un-blocking).

5.  **Blockers page** — grouped by work item, three-state validation badge (Valid / Revalidate / Cleared), read-only-style rows with inline actions, new-blocker dialog. Tables share a fixed column layout so all groups align.

6.  **Links page** — grouped by work item; per-type normalization, validation, display-name, and resolved-URL helpers.

7.  **Releases view** — work items grouped by release; OnGoing releases (null date) are rendered with an ∞ badge / "OnGoing" label.

8.  **Core Data (CRUD pages)** — Categories, Blocker Types, People (with pending state + cascade-delete behavior), Releases (incl. nullable date → "OnGoing", grouped by type in the table).

9.  **Shared system — common page header, form field, empty state, skeleton placeholders, charts, app-level providers, error boundary, toast system, validation summary, comments panel, and activity timeline.**

10. **Routing** — sidebar + mobile chip bar; the app must support being embedded under an arbitrary base path.

Status governance — central transition matrix, parent/child completion guardrails, and activity logging for every status change.

Audit & comments — append-only activity history plus Work Item comments for narrative context.

Data quality & error handling — blocking/warning/info validation severities and standardized failed-save/load behavior.

Data model (8 source entities + supporting audit/comment entities; persistent shared data layer)

- **CategoryMD** — id, name, longName, development, capex, active.

- BlockerMD - id, name, days (re-validation cadence), active.

- **PersonsCD** — id, Title (display name), email, role, active. Title and role may be temporarily empty during enrichment.

- **ReleasesCD** — id, Title, date (nullable → OnGoing), releaseType (PGT / BreakFix / Other), active.

- **WorkItem** — id, title, description, status, size, assignedToId, assignedDate, goalDate, brf, complete, categoryId, parentItemId, releaseId, lastChanged.

- **Link** — id, name (derived), workItemId, linkType, number (normalized).

- **Blocker** — id, title, workItemId, blockerTypeId, logged, assignedToId, lastValidated, blockerActive, expectedResolution, nextValidation (derived), priorStatus.

Detailed field-by-field specifications are in **section (e)**.

### Constants

- Fallback assignee: configurable in AppSettings. The default seed value may be michael.girardi@pepsico.com, but implementations must not hard-code this email in business logic. Any reassignment workflow that needs a fallback owner must read the configured fallback from Settings.

- **Status enumeration (canonical order):** Upcoming, Assigned, Execution, Testing, Await Deploy, Hypercare, Complete, Blocked, Descoped.

Deferred / Descoped mapping: the current v2 status model uses Descoped as the deferred terminal state. Saving a work item as Descoped sets complete = true. Section (j) retains an open question on whether the product language should be renamed to Deferred or kept as Descoped.

- **Status groups:** Pending (Upcoming, Assigned), In-Progress (Execution, Testing, Await Deploy, Hypercare), Complete, Blocked, Descoped.

- **Selectable statuses:** all of the above **except** Blocked. Blocked is entered only by logging an active blocker and exited only by clearing all active blockers.

- **Size values:** XS, S, M, L, XL, XXL.

- **Link types:** RITM, INC, ADO, CRF, AskMe.

Link uniqueness: a saved Link must be unique by normalized linkType + normalized number. Duplicate links must be rejected on create and update with a user-facing validation message.

- **Release types:** PGT, BreakFix, Other.

## (b) Visual System & Styles

The visual system follows PepsiCo's brand guidelines (single-family rule for badges; primary shade = \*-300; emphasis shade = \*-500). All design tokens must be exposed as CSS variables and mapped to Tailwind utilities via the framework's theme layer.

### Brand palette

Seven brand color families, each in 5 shades (100 lightest → 500 darkest), plus neutrals.

| **Family**               | **100**  | **200**  | **300**  | **400**  | **500**  |
|--------------------------|----------|----------|----------|----------|----------|
| Fresh / Blue (universal) | #A5CBEE | #71A8E3 | #3680CE | #155798 | #02355A |
| Leaf / Green             | #BFDE7D | #8EBC29 | #5E910D | #2B660F | #0F440E |
| Grain / Yellow           | #FFE8AD | #FACB5B | #EB9F0A | #C57307 | #954F09 |
| Paprika / Red            | #FBD0B7 | #F79E6E | #EE6D27 | #CA4B0C | #922F11 |
| Plum / Purple            | #E0BDEF | #C98EE1 | #AC64C9 | #813993 | #5C1E67 |
| Ice / Teal               | #A9E5DC | #65C8B7 | #2E9E8C | #156F5F | #0E4E41 |
| Grapefruit / Pink        | #F7B6BE | #EC8996 | #DF6273 | #B22E46 | #781727 |

**Neutrals:** --brand-black: #222222, --brand-gray-dark: #6A6A6A, --brand-gray: #CCCCCC, --brand-gray-light: #F5F5F5, --brand-white: #FFFFFF.

### Semantic tokens

| **Token**            | **Value**                                        |
|----------------------|--------------------------------------------------|
| --background         | #FFFFFF                                         |
| --foreground         | Blue-500 (#02355A)                               |
| --card / --popover   | #FFFFFF                                         |
| --primary            | Blue-500                                         |
| --primary-foreground | #FFFFFF                                         |
| --secondary          | #EAF2FB                                         |
| --accent             | Blue-300 (#3680CE)                               |
| --destructive        | Paprika-400 (#CA4B0C)                            |
| --muted              | #F5F5F5 / --muted-foreground #6A6A6A           |
| --border             | #E2E8F0                                         |
| --input              | #D9E2EE                                         |
| --ring               | Blue-300                                         |
| Chart series 1–5     | Blue-300, Blue-500, Blue-200, Blue-400, Blue-100 |

**Sidebar tokens** (used by the dark sidebar):

- Sidebar background: Blue-500.

- Sidebar foreground: Blue-100.

- Sidebar primary (logo tile bg / fg): Blue-100 / Blue-500.

- Sidebar accent (hover surface): color-mix(white 12%, Blue-500).

- Active sidebar item: mix(white 14%, Blue-500) background + 3px Blue-200 left border, white text, semibold.

### Radius scale

- Base radius: 0.75rem.

- Scale: sm = 0.375rem, md = 0.75rem, lg = 1.125rem, xl = 1.5rem, 2xl = 2.25rem, full = 9999px.

### Motion tokens

- Durations: --dur-fast: 120ms, --dur-medium: 200ms, --dur-slow: 360ms.

- Easing: --ease-standard: cubic-bezier(.2, 0, .2, 1).

- prefers-reduced-motion: reduce must collapse all animations/transitions to 1ms.

### Typography (Style Guide → web fallbacks)

| **Role**     | **Print spec**    | **Web stack**                                                                       | **Weight** |
|--------------|-------------------|-------------------------------------------------------------------------------------|------------|
| Title        | GT Pressura Heavy | "Barlow Semi Condensed", "Univers Condensed", "Arial Narrow", system-ui, sans-serif | 900        |
| Section head | Gilroy SemiBold   | "Poppins", "Gilroy", Arial, system-ui, sans-serif                                   | 500        |
| Body         | Gilroy Medium     | "Poppins", "Gilroy", Arial, system-ui, sans-serif                                   | 400        |

**Letter-spacing tokens:** --tracking-title: -0.01em, --tracking-section: -0.005em.

### Heading rules (must be set globally):

- h1 — Barlow Semi Condensed, 900, **UPPERCASE**, --tracking-title, Blue-500, line-height 1.05.

- h2 / h3 / h4 — Poppins 500, sentence case, --tracking-section, Blue-500.

- Body text — Poppins 400, Blue-500.

### Page background

Fixed-attachment composition of three radial gradients in soft Blue-100 over white:

- Top-left at 0% 0% (55% mix).

- Top-right at 100% 0% (35% mix).

- Bottom-right at 100% 100% (35% mix).

### Gradient utility classes (single-family rule)

Each family must expose a 135° gradient from \*-400 → \*-200:

- .gradient-primary / .gradient-fresh (blue), .gradient-leaf, .gradient-grain, .gradient-paprika, .gradient-plum, .gradient-ice, .gradient-grapefruit.

- .gradient-text — 90° Blue-500 → Blue-300, clipped to text.

### Tinted surface classes

Soft horizontal washes from mix(\*-100, white, 55%) → mix(\*-100, white, 20%):

- .surface-fresh, .surface-leaf, .surface-grain, .surface-paprika, .surface-plum, .surface-ice, .surface-grapefruit.

- Matching readable-text colors: .surface-{family}-text uses the family's \*-400.

### Badges (single-family)

Two variants per family, plus neutral and validation-specific:

- **Standard** (.badge-{family}): bg = mix(\*-100, white, 55%), text = \*-500, border = \*-300.

- **Soft** (.badge-{family}-soft): bg = \*-100, text = \*-500, border = \*-200.

- **Neutral** (.badge-neutral, .badge-neutral-soft): gray-light / gray-dark.

- **Validation:**

  - .badge-cleared — white bg, green-400 text, green-300 border.

  - .badge-valid — green-100 bg, green-500 text, green-300 border.

  - .badge-revalidate — red-100 bg, red-500 text, red-300 border.

### Other required utility classes

- **.card-hover** — lifts a card by 2px and adds a Blue-500 (30% alpha) shadow on hover, with medium-duration easing.

- **.form-input** — full-width input with radius - 2px, white bg, Blue-500 text, Blue-300 focus border + 3-px focus ring; .form-input-sm is a compact variant.

- **.nav-item-active** — sidebar active row treatment described above.

- **.pending-row** — used by People CRUD while a row is being created or awaiting enrichment: muted background, opacity 0.6, child .pending-content is pointer-events-none.

- **Kanban tokens** — .kanban-column-drag-over (Blue-100 wash) and .kanban-swimlane-divider (1px dashed Blue-200).

## (c) Shared Functions & Components

This section defines the cross-page contract: helpers, hooks, and primitives that multiple pages depend on. Changing any of these signatures is a breaking change for every consumer.

### c.1 — Shared library functions

### Date helpers

All date storage must use **local yyyy-mm-dd** strings (no UTC) so the same calendar day shows everywhere regardless of timezone.

| **Function**       | **Signature**                                                | **Purpose**                                                                                                                                        |
|--------------------|--------------------------------------------------------------|----------------------------------------------------------------------------------------------------------------------------------------------------|
| parseLocalDate     | (value: string \| null \| undefined) => Date \| null        | Parses yyyy-mm-dd into a local-midnight Date. Returns null on empty / invalid input. Falls back to new Date(value) if the string isn't yyyy-mm-dd. |
| todayISO           | () => string                                                | Today as yyyy-mm-dd, **local time**.                                                                                                               |
| todayLocalMidnight | () => Date                                                  | Today's Date at local 00:00:00. Used for "is overdue?" / "days remaining" math so comparisons aren't off-by-one across timezones.                  |
| daysRemaining      | (goalDate: string \| null \| undefined) => number \| null   | Whole days from today → goalDate. Negative = overdue. null if no date.                                                                             |
| addDaysISO         | (base: string \| null \| undefined, days: number) => string | Returns yyyy-mm-dd for base + days. If base is null, uses today.                                                                                   |
| formatDate         | (value) => string                                           | Locale long-ish date (e.g. Sep 14, 2025). Returns — for null/invalid.                                                                              |
| formatReleaseDate  | (value) => string                                           | Like formatDate but **null → "OnGoing"**. Must be used everywhere release dates are rendered.                                                      |
| formatTimestamp    | (value) => string                                           | Full locale date+time for ISO timestamps (e.g. lastChanged). Returns — if null/invalid.                                                            |

### Blocker helpers

| **Function**            | **Signature**                                                                                      | **Purpose**                                                                                                                                                                                            |
|-------------------------|----------------------------------------------------------------------------------------------------|--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| blockerBadgeStatus      | (active: boolean, nextValidation: string \| null) => "Cleared" \| "Valid" \| "Revalidate"         | The three-state validation status derived from blockerActive + nextValidation vs. today. Drives the badge across the Blockers page, the Dashboard active-blockers list, and the Work Item detail page. |
| blockerBadgeClass       | (status) => string                                                                                | Maps the three states to CSS classes .badge-cleared / .badge-valid / .badge-revalidate.                                                                                                                |
| blockerValidationStatus | (lastValidated: string, days: number) => { status: "Valid" \| "Invalid"; nextValidation: string } | When validating, recomputes nextValidation = lastValidated + days and whether it's still in the future.                                                                                                |
| computeNextValidation   | (lastValidated, days) => string                                                                   | Pure helper: nextValidation = lastValidated + days.                                                                                                                                                    |
| computePriorStatus      | (workItem, activeBlockers[]) => string                                                          | Resolves the status a work item should fall back to when un-blocking. Returns the first active blocker's non-Blocked priorStatus, else "Execution".                                                    |

### Blocker type ordering

Blocker type lifecycle: BlockerMD includes active. Inactive blocker types are excluded from create/edit pickers but continue to resolve historical blockers.

| **Function**              | **Signature**                            | **Purpose**                                                                                                                                                   |
|---------------------------|------------------------------------------|---------------------------------------------------------------------------------------------------------------------------------------------------------------|
| sortBlockerTypesForDialog | (types: BlockerMD[]) => BlockerMD[] | Stable, deterministic order for the "Log blocker" dropdown and the Blocker Types CRUD list: **Hard → Soft → Potential**, then alphabetical for anything else. |

### Link helpers

Per-type behavior table:

| **Link type** | **Normalization**                       | **Validation**                        | **Display name** | **Resolved URL**                                                                     |
|---------------|-----------------------------------------|---------------------------------------|------------------|--------------------------------------------------------------------------------------|
| RITM          | strip spaces/dashes, ensure RITM prefix | digits, optionally prefixed with RITM | RITM12345        | https://pepsico.service-now.com/now/nav/ui/search/{value}                            |
| INC           | strip spaces/dashes, ensure INC prefix  | digits, optionally prefixed with INC  | INC98765         | https://pepsico.service-now.com/now/nav/ui/search/{value}                            |
| AskMe         | digits only                             | requires at least one digit           | AskMe {n}        | https://pepsico.sharepoint.com/sites/NexusBacklog/Lists/Backlog/DispForm.aspx?ID={n} |
| ADO           | passthrough                             | none                                  | ADO {n}          | https://dev.azure.com/\_workitems/edit/{n}                                           |
| CRF           | passthrough                             | none                                  | CRF {n}          | https://crf.example.com/{n}                                                          |

Required functions:

Link uniqueness helper: validateLinkUniqueness(type, normalizedNumber, existingLinks, currentLinkId?) => string \| null. It returns an error when another Link already has the same normalized linkType + normalized number.

- normalizeLinkNumber(type, raw): string — applied on blur / save.

- validateLinkNumber(type, raw): string \| null — returns a user-facing error string or null.

- deriveLinkDisplayName(type, number): string — the label rendered everywhere.

- buildLinkUrl(type, number): string — the href the chip points at.

### Style helpers

Pure functions that map enum-like values to CSS classes so the look stays consistent across pages.

| **Function**       | **Signature**                        | **Maps to**                                                                                                                                                                                                     |
|--------------------|--------------------------------------|-----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| statusColor        | (status: string) => string          | A .badge-\* class per status. Upcoming = neutral, Assigned = fresh, Execution = ice, Testing = grain, Await Deploy = plum, Hypercare = grapefruit, Complete = leaf, Blocked = paprika, Descoped = neutral-soft. |
| sizeColor          | (size: SizeValue \| null) => string | Tailwind classes for XS/S → Blue-100, M/L → Blue-200, XL → Blue-300/white, XXL → Blue-500/white.                                                                                                                |
| releaseTypeColor   | (type) => string                    | PGT = plum, BreakFix = paprika, Other = neutral.                                                                                                                                                                |
| linkTypeColor      | (type) => string                    | RITM = fresh, INC = paprika, ADO = plum, CRF = grain, AskMe = ice.                                                                                                                                              |
| statusToGroupColor | (status) => string                  | Alias of statusColor for clarity at call sites that group-by status.                                                                                                                                            |
| statusGroupSurface | (status) => { surface, text }       | Larger-surface variant returning surface-\* + surface-\*-text classes; used by Kanban columns and Releases swimlane headers.                                                                                    |

### Constants

- STATUS_OPTIONS — canonical full order, includes Blocked.

- STATUS_OPTIONS_SELECTABLE — same list minus Blocked.

- STATUS_GROUPS — maps each status to one of Pending / In-Progress / Complete / Blocked / Descoped.

- SIZE_OPTIONS — XS, S, M, L, XL, XXL.

- LINK_TYPE_OPTIONS — RITM, INC, ADO, CRF, AskMe.

- RELEASE_TYPE_OPTIONS — PGT, BreakFix, Other.

- SETTINGS.fallbackPersonEmail - default seed may be michael.girardi@pepsico.com, but every call site must read from AppSettings rather than hard-coding the fallback identity.

### Data access hooks

- Read hooks (one per source list): useCategories, useBlockerTypes, usePersons, useReleases, useWorkItems, useLinks, useBlockers.

  - **Persons polling requirement:** while any person row has empty Title or role (the pending-enrichment window), usePersons must auto-refetch every 3 seconds and stop polling once all rows are enriched.

- Mutation bundles: transactional rows may expose { create, update, remove } only where deletion remains in scope. Lifecycle-managed master data (Categories, BlockerTypes, Persons, Releases) must expose { create, update, inactivate/reactivate } and must not expose destructive removal in the UI.

  - useWorkItemMutations.update must stamp lastChanged on every change.

- Person lifecycle mutation: enriched PersonsCD rows are retained and inactivated, not deleted. For a personId:

  1.  Read fallback owner from AppSettings when a reassignment workflow requires one; do not assume a hard-coded fallback user.

  2.  Set PersonsCD.active = false for enriched records; keep historical WorkItem.assignedToId references intact unless the user explicitly reassigns ownership.

  3.  Keep historical Blocker.assignedToId references intact unless an active-ownership reassignment workflow is invoked; that workflow must use the configured fallback owner from AppSettings.

  4.  Remove only pending, unenriched person rows that have not completed enrichment; enriched rows are inactivated only.

  5.  Invalidate the persons, workItems, and blockers caches. Returns { unassigned, reassigned, personName } for the success toast.

### Utility

- cn(...inputs: ClassValue[]): string — class joiner combining clsx-style conditional inputs with Tailwind class de-duplication. Used by every component.

### c.2 — Shared system components

These are generic UI primitives with **no knowledge of the data model**. They are consumed by every page.

| **Component**                    | **Props**                                                                              | **Notes**                                                                                                                                                                                                                                                                                 |
|----------------------------------|----------------------------------------------------------------------------------------|-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| PageHeader                       | { title, subtitle?, icon?: LucideIcon, actions?: ReactNode }                           | Renders an h1 in title font + optional gradient icon tile + right-aligned actions slot.                                                                                                                                                                                                   |
| Field                            | { label, required?, hint?, error?, children, className? }                              | Form-row layout: uppercase label, optional \*, child input, hint OR error (error wins).                                                                                                                                                                                                   |
| EmptyState                       | { icon?, title, description?, actionLabel?, onAction? }                                | Centered icon tile + title + description + optional primary action.                                                                                                                                                                                                                       |
| Shimmer, CardShimmer, RowShimmer | Shimmer: { className? }, CardShimmer: { className? }, RowShimmer: { count?: number }   | Skeleton placeholders. The app must render its chrome instantly and swap shimmers for content as data resolves (see the loading strategy in (i)).                                                                                                                                         |
| StatusDonut                      | { data: { label, value, color }[], size?: number }                                   | D3 donut with center total, padded slices, native \<title\> tooltips, legend underneath. Must render a "No data" fallback.                                                                                                                                                                |
| CategoryBar                      | { data: { label, value, id? }[], height?: number, onBarClick?(d) }                   | Horizontal bars; clicking a bar must trigger onBarClick.                                                                                                                                                                                                                                  |
| PeopleChip                       | { person?, size?: "sm"\|"md"\|"lg", showEmail?, variant?: "chip"\|"row", unassigned? } | Deterministic 7-family palette keyed off the person id; renders italic "Unassigned" if no person; spins a dashed ring + spinner icon while the person is in the pending-enrichment state (Title or role empty).                                                                           |
| PersonPicker                     | { value: string \| null, onChange(id: string \| null), allowClear?, className? }       | Popover button + filterable list of active people. Built-in "+ Add person" mini-dialog validates email against AppSettings.allowedEmailDomains when AppSettings.enforceEmailDomain is true; creates the row in pending state and selects it immediately (downstream polling enriches it). |
| AppProviders                     | { children }                                                                           | App-level provider wrapper (reserved for future cross-cutting providers). The query client and router live above this component.                                                                                                                                                          |
| AppErrorBoundary                 | { children }                                                                           | Class component that catches uncaught render errors. On error, posts a structured ErrorMessage to window.parent (so a hosting iframe is notified) and shows a Retry button.                                                                                                               |

### c.3 — Cross-page feature components

Each of these is reused by ≥ 2 pages and behaves like a primitive:

- **WorkItemDialog** — create/edit a Work Item. Used by the Work Items page, the Releases view, the Planning Kanban ("new item in lane"), and the Work Item Detail page.

- **BlockerDialogs** — the Log / Edit / Revalidate / Clear / Detail flows. Used by the Blockers page and the Work Item Detail page.

- **LinkDialog** — Create / Edit a Link. Used by the Links page and the Work Item Detail page.

Full contracts are in **section (d)**.

### c.4 — Conventions enforced by these shared functions

1.  **Dates are local yyyy-mm-dd strings**, never Date objects or ISO timestamps (the single exception is WorkItem.lastChanged).

2.  **Status badges go through statusColor / statusGroupSurface** — never inline a bg-\* class for status.

3.  **Blocked is never user-selectable.** It can only be entered by creating an active blocker, and exited by clearing all active blockers (which restores priorStatus).

4.  **OnGoing releases** (date === null) must render via formatReleaseDate — the string "OnGoing" must never be hand-written elsewhere.

5.  **People are referenced by personId** everywhere; render with PeopleChip so pending state and palette stay consistent.

6.  Inactivating an enriched person must go through the settings-aware person lifecycle mutation

## (d) Dialogs & Modals

This section specifies every modal/dialog. All dialogs share the following conventions; they are not restated per dialog.

#### Universal dialog conventions

- **State pattern** — each dialog is controlled via open: boolean + onOpenChange(open) props. Form state lives **inside** the dialog and must be reset/seeded from initial (when present) on every transition from closed → open.

- **ID generation** — new records get "{prefix}-" + Date.now() ids (wi-, blk-, lnk-, cat-, bt-, rel-, per-). Editing reuses the existing id.

- **Footer pattern** — left: Cancel (outline) calls onOpenChange(false). Right: primary action (gradient-primary text-white) disabled until the dialog's canSubmit predicate is true.

- **On submit** — dialog calls its onSubmit(record) prop with the fully-shaped domain object, then onOpenChange(false). The host page wires onSubmit to the appropriate mutation hook (create or update).

- **Field rendering** — every input is wrapped in \<Field label hint? error? required?\>.

- **Autofocus** — the first text input gets autoFocus.

- **Validation** — disabled-button validation is the norm; inline error= on \<Field\> is used for surgical date / format checks.

### d.1 — WorkItemDialog (create / edit Work Item)

**Title:** "New Work Item" / "Edit Work Item" · **Width:** sm:max-w-2xl · **Used by:** Work Items list (new), Releases view (new in a release), Planning Kanban (new in lane), Work Item Detail (edit).

#### Props

- open, onOpenChange

- initial?: WorkItem \| null — if present, dialog is in **edit** mode.

- categories: CategoryMD[], releases: ReleasesCD[], allWorkItems: WorkItem[] — for select options.

- defaultReleaseId?: string \| null — prefilled release when creating from a release-scoped surface.

- onSubmit(item: WorkItem) => void.

#### Fields (grid 2-col, max-h-[65vh] scroll)

| **Field**     | **Control**                           | **Required**  | **Notes**                                                                                                                  |
|---------------|---------------------------------------|---------------|----------------------------------------------------------------------------------------------------------------------------|
| Title         | text (autofocus)                      | yes           | Trimmed; empty disables submit.                                                                                            |
| Description   | textarea (3 rows)                     | no            |                                                                                                                            |
| Status        | select from STATUS_OPTIONS_SELECTABLE | yes           | **Locked when initial.status === "Blocked"**; shows hint "Locked while this item is Blocked — resolve the blockers first." |
| Size          | select SIZE_OPTIONS + blank           | no            |                                                                                                                            |
| Category      | select active categories              | no            |                                                                                                                            |
| Parent item   | select all work items except self     | **edit only** | Excludes the item being edited.                                                                                            |
| Assigned to   | PersonPicker                          | no            | Spans 2 cols in create, 1 col in edit.                                                                                     |
| Assigned date | \<input type="date"\>                 | **edit only** | In create mode, computed automatically.                                                                                    |
| Goal date     | \<input type="date"\>                 | no            |                                                                                                                            |
| Release       | select active releases                | no            |                                                                                                                            |
| BRF           | Switch                                | no            |                                                                                                                            |
| Complete      | Switch                                | no            | OR'd with status === "Complete" on submit.                                                                                 |

#### Behavior

- On open, seed all fields from initial (or defaults in create mode). In create mode, releaseId uses defaultReleaseId ?? "".

- lockedStatus = isEdit && initial.status === "Blocked" drives the disabled status select.

- **On submit:**

  - Refuse to submit if title.trim() is empty.

  - finalComplete = status === "Complete" \|\| complete (toggling Complete OR picking Complete status both mark it).

  - finalAssignedDate:

    - Edit: keep existing assignedDate; else if newly assigned to someone use todayISO(); else null.

    - Create: todayISO() if assigned, else null.

  - Build the full WorkItem (new workItemId if create) and call onSubmit.

**Submit predicate:** !!title.trim().

### d.2 — LogBlockerDialog (log a new blocker on an item)

**Title:** "Log a Blocker" (with shield icon) · **Width:** sm:max-w-xl · **Used by:** Work Item Detail (Blockers panel).

#### Props

- open, onOpenChange

- workItem: WorkItem — the item this blocker is against.

- blockerTypes: BlockerMD[]

- activeBlockers: Blocker[] — used to compute priorStatus.

- onSubmit(blocker: Blocker, updatedWorkItem: WorkItem) => void — the work item is the (possibly updated) WI whose status should flip to Blocked.

#### Fields (grid 2-col)

| **Field**           | **Control**                       | **Required** | **Notes**                                                                                        |
|---------------------|-----------------------------------|--------------|--------------------------------------------------------------------------------------------------|
| Title               | text (autofocus)                  | yes          | Spans 2 cols.                                                                                    |
| Blocker type        | select                            | yes          | Pre-sorted via sortBlockerTypesForDialog (Hard→Soft→Potential). Option text: "{name} ({days}d)". |
| Expected resolution | \<input type="date"\>             | yes          |                                                                                                  |
| Assigned to         | PersonPicker                      | no           | Defaults to workItem.assignedToId; spans 2 cols.                                                 |
| Logged date         | \<input type="date"\> (read-only) | —            | Pinned to todayISO().                                                                            |
| Last validated      | \<input type="date"\> (read-only) | —            | Pinned to todayISO().                                                                            |
| Blocker active      | Switch (checked + disabled)       | —            | Always true on creation.                                                                         |

**Live preview banner** at the bottom: "Next validation date will be **{formatDate(nextValidation)}**." where nextValidation = computeNextValidation(today, selectedType.days).

#### Behavior on submit

- Guard on canSubmit = title.trim() && typeId && expectedResolution.

- Compute priorStatus = computePriorStatus(workItem, activeBlockers) so the work item's pre-Blocked status is remembered.

- Build the Blocker with logged = lastValidated = todayISO(), blockerActive: true, nextValidation = computeNextValidation(today, selectedType.days).

- If the work item is not already Blocked, set updatedWorkItem.status = { Value: "Blocked" }; otherwise pass the WI through unchanged.

- Call onSubmit(blocker, updatedWorkItem).

**Submit predicate:** title.trim() && typeId && expectedResolution.

### d.3 — RevalidateDialog (revalidate an active blocker)

**Title:** "Revalidate Blocker" (with refresh icon) · **Used by:** Work Item Detail (row action on a Revalidate-state blocker).

**Props** — open, onOpenChange, blocker: Blocker, blockerType?: BlockerMD, onSubmit(updated: Blocker) => void.

#### Fields

| **Field**           | **Control**           | **Required** | **Notes**                                                                                               |
|---------------------|-----------------------|--------------|---------------------------------------------------------------------------------------------------------|
| Blocker             | text (disabled)       | —            | Shows blocker.title for context.                                                                        |
| Expected resolution | \<input type="date"\> | yes          | Validated to be **strictly after today**; otherwise shows inline error="Must be strictly after today.". |
| Assigned to         | PersonPicker          | no           |                                                                                                         |

#### Behavior on submit (when erValid && blockerType):

- lastValidated = todayISO().

- nextValidation = computeNextValidation(todayISO, blockerType.days).

- Call onSubmit({ ...blocker, lastValidated, nextValidation, assignedToId, expectedResolution }).

**Submit predicate:** erValid (parseLocalDate(expectedResolution) \> todayLocalMidnight()).

### d.4 — ClearBlockerDialog (mark blocker inactive)

**Title:** "Clear Blocker" (destructive) · **Used by:** Work Item Detail (row action).

**Props** — open, onOpenChange, blocker: Blocker, onSubmit(): void.

#### Body

- Read-only Blocker field with the title.

- Explanatory copy: *"Clearing this blocker marks it inactive and updates Last Validated to today. If no other active blockers remain on this work item, its status will be restored."*

**Footer** — destructive Clear blocker button calls onSubmit() then onOpenChange(false). The host page must:

1.  Mutate the blocker with { blockerActive: false, lastValidated: todayISO() }.

2.  If no other active blockers remain on the work item and the WI status is still Blocked, restore the WI status to blocker.priorStatus (or "Execution" as a safety net).

**Submit predicate:** always enabled (it is a confirm).

### d.5 — BlockerDetailDialog (read-only blocker view)

**Title:** the blocker's title · **Width:** sm:max-w-lg · **Used by:** Work Item Detail (click a blocker row).

**Props** — open, onOpenChange, blocker, blockerType?, person?.

#### Read-only layout

- Top badge row: blocker-type plum badge "{name} · {days}d", validation-state badge (blockerBadgeClass(blockerBadgeStatus(...))), Active/Inactive badge.

- 2-col grid of labelled values: Assigned (PeopleChip), Logged, Last Validated, Next Validation, Expected Resolution (all via formatDate), Prior Status (rendered as a statusColor badge or —).

No submit — dialog is informational only; closes via onOpenChange(false).

### d.6 — LinkDialog (create / edit Link)

**Title:** "Document a Link" / "Edit Link" · **Used by:** Links page, Work Item Detail (Links panel).

#### Props

- open, onOpenChange

- initial?: Link \| null — edit mode if present.

- workItems: WorkItem[] — options for the work-item dropdown.

- fixedWorkItemId?: string — when present, hides the work-item picker and pins the link to that item.

- onSubmit(link: Link).

#### Fields

| **Field**   | **Control**              | **Required** | **Notes**                                                 |
|-------------|--------------------------|--------------|-----------------------------------------------------------|
| Type        | select LINK_TYPE_OPTIONS | yes          | Drives placeholder and validation.                        |
| Number / ID | text                     | yes          | Placeholders per type (e.g. "e.g. RITM123545 or 123545"). |
| Work item   | select                   | yes          | **Hidden when fixedWorkItemId is supplied.**              |

**Live preview panels** at the bottom of the body:

- If validateLinkNumber(type, raw) returns a string → red AlertTriangle banner with the message.

- Else if normalized non-empty → green banner: "Will be saved as: {normalized}" + "Display name: {deriveLinkDisplayName(type, normalized)}".

#### Behavior

- Recompute the warning on a 500ms debounce as the user types; force an immediate validation on the Number field's onBlur.

- normalized = normalizeLinkNumber(type, raw); display = deriveLinkDisplayName(type, normalized).

- On submit, build Link with name = display, number = normalized, linkType: { Value: type }, and fixed workItemId if provided.

**Submit predicate:** !!normalized && !warning && !!workItemId.

### d.7 — CategoryDialog

**Title:** "New Category" / "Edit Category" · **Used by:** Categories page only.

#### Fields

| **Field**   | **Control**      | **Required** | **Notes**                                  |
|-------------|------------------|--------------|--------------------------------------------|
| Name        | text (autofocus) | yes          | Hint: "Short display name / abbreviation". |
| Long name   | text             | no           |                                            |
| Development | Switch           | no           | 3-up grid with CAPEX and Active.           |
| CAPEX       | Switch           | no           |                                            |
| Active      | Switch           | no           | Defaults to true for new.                  |

**Submit predicate:** !!name.trim(). Build CategoryMD (new cat-{ts} id on create).

### d.8 — BlockerTypeDialog

**Title:** "New Blocker Type" / "Edit Blocker Type" · **Used by:** Blocker Types page only.

#### Fields

| **Field**                 | **Control**      | **Required** | **Notes**                                                                                                                   |
|---------------------------|------------------|--------------|-----------------------------------------------------------------------------------------------------------------------------|
| Name                      | text (autofocus) | yes          | Placeholder: "e.g. Hard, Soft, Potential".                                                                                  |
| Validation cadence (days) | number, min={1}  | yes          | Hint: "Days before this blocker needs re-validation." Submit clamps to max(1, floor(days)).                                 |
| Active                    | Switch           | no           | Defaults to true for new. Inactive blocker types are hidden from new blocker pickers but still resolve historical blockers. |

**Submit predicate:** !!name.trim(). Build BlockerMD (new bt-{ts} id on create).

### d.9 — ReleaseDialog

**Title:** "New Release" / "Edit Release" · **Used by:** Releases CRUD page only.

#### Fields

| **Field**       | **Control**                 | **Required**                | **Notes**                                                               |
|-----------------|-----------------------------|-----------------------------|-------------------------------------------------------------------------|
| Title           | text (autofocus)            | yes                         |                                                                         |
| OnGoing release | Switch                      | —                           | When ON, clears date and **disables** the Date field. Saves date: null. |
| Date            | \<input type="date"\>       | required **unless** OnGoing | Hint when OnGoing: "Disabled while OnGoing is on."                      |
| Release type    | select RELEASE_TYPE_OPTIONS | yes                         | PGT / BreakFix / Other.                                                 |
| Active          | Switch                      | no                          | Defaults to true for new.                                               |

**Behavior** — On open, ongoing initializes to !initial.date. On submit, write date: ongoing ? null : date. Toggling OnGoing ON clears the date.

**Submit predicate:** !!Title.trim() && (ongoing \|\| !!date).

### d.10 — PersonDialog

**Title:** "New Person" / "Edit Person" · **Used by:** People page only.

### Two distinct modes

*Create mode (!initial)* — only one field:

| **Field** | **Control**      | **Required** | **Notes**                                                                                                                                                                                                                                              |
|-----------|------------------|--------------|--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| Email     | text (autofocus) | yes          | Validated against AppSettings.allowedEmailDomains when AppSettings.enforceEmailDomain is true. Default seed domain is @pepsico.com. Name & Role are populated by Power Automate. Submitted record has empty Title/role (the pending-enrichment state). |

*Edit mode (initial)* — full record:

| **Field** | **Control** | **Required** | **Notes**                                                                                                                                                                                                        |
|-----------|-------------|--------------|------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| Name      | text        | no           |                                                                                                                                                                                                                  |
| Email     | text        | yes          | Validated against AppSettings.allowedEmailDomains when AppSettings.enforceEmailDomain is true. Existing records may be edited only if the resulting email passes the configured rule or enforcement is disabled. |
| Role      | text        | no           |                                                                                                                                                                                                                  |
| Active    | Switch      | no           |                                                                                                                                                                                                                  |

**Submit predicate:** the email regex passes. In create mode, Title and role are forced to "" so the host's enrichment polling kicks in.

### d.11 - People pending-row removal and enriched-person inactivation dialog

Title: "Remove pending person?" for pending rows; "Inactivate person?" for enriched rows.

Body - pending rows: explain that the unenriched row will be removed. Enriched rows: explain that the person will be marked inactive, excluded from future pickers, and retained on historical work items/blockers.

Footer - Cancel plus destructive Remove for pending rows, or primary Inactivate for enriched rows. On pending remove, delete only the unenriched row. On enriched inactivation, update active = false and retain the person record.

### d.12 — NewBlockerDialog (Blockers page)

**Title:** "New Blocker" · **Width:** sm:max-w-xl · **Used by:** Blockers page only.

Similar to LogBlockerDialog but adds a Work Item picker (since the page is global, not item-scoped).

#### Fields

| **Field**           | **Control**           | **Required** | **Notes**                                                             |
|---------------------|-----------------------|--------------|-----------------------------------------------------------------------|
| Title               | text (autofocus)      | yes          | 2-col span.                                                           |
| Work item           | select                | yes          | Must exclude items with status === "Complete".                        |
| Blocker type        | select                | yes          | Sorted via sortBlockerTypesForDialog. Option text "{name} ({days}d)". |
| Expected resolution | \<input type="date"\> | yes          |                                                                       |
| Assigned to         | PersonPicker          | no           | Defaults to the selected work item's assignedToId on submit if unset. |

**Behavior on submit** — mirrors LogBlockerDialog: compute priorStatus, compute nextValidation, set updatedWi = { ...wi, status: { Value: "Blocked" } } if the WI isn't already Blocked. Host then runs both mutations.

**Submit predicate:** title.trim() && workItemId && typeId && expectedResolution && selectedType.

### d.13 — SubtaskDialog

**Title:** "Create a Subtask" · **Used by:** Work Item Detail only.

#### Fields

| **Field**   | **Control**                      | **Required** | **Notes**               |
|-------------|----------------------------------|--------------|-------------------------|
| Title       | text (autofocus)                 | yes          |                         |
| Description | textarea (2 rows)                | no           |                         |
| Status      | select STATUS_OPTIONS_SELECTABLE | no           | Defaults to "Upcoming". |
| Size        | select XS…XXL                    | no           |                         |
| Assigned to | PersonPicker                     | no           |                         |
| Goal date   | \<input type="date"\>            | no           |                         |

#### Inherited from parent (not editable in the dialog)

- categoryId, releaseId — copied from the parent.

- parentItemId — set to the parent's workItemId.

- brf: false.

- complete = status === "Complete".

- assignedDate = todayISO() if an assignee is set, else null.

**Submit predicate:** !!title.trim().

### d.14 — WorkItemDetailsDialog (read-only quick-look)

**Title:** the item's title (with checklist icon) · **Width:** sm:max-w-2xl max-h-[90vh] overflow-y-auto · **Used by:** Planning Kanban.

**Read-only summary** with badges and sections:

- Status badge (statusColor), Size chip, BRF / Development / CAPEX / Complete badges.

- Description (or italic "No description.").

- 2-col grid: Assigned to (PeopleChip row), Goal date (with overdue/≤7d coloring), Release (badge + formatReleaseDate), Parent item (if any), Last changed (formatTimestamp).

- Blockers list — each row shows title, type, validation badge.

- Links list — each row shows link-type badge, name, opens in new tab via buildLinkUrl.

- Sub-tasks list (if any) — title + status badge.

#### Footer

- Close (outline) — closes.

- Open full details (primary) — navigates to /work-items/{id} and closes.

### d.15 — + Add Person mini-dialog (inside PersonPicker)

**Title:** "Add a person" · **Used by:** any dialog or page that uses PersonPicker.

### Field

| **Field** | **Control**      | **Required** | **Notes**                                                                                                             |
|-----------|------------------|--------------|-----------------------------------------------------------------------------------------------------------------------|
| Email     | text (autofocus) | yes          | Must pass ^[^@\s]+@pepsico\\com\$. Hint: "Must end with @pepsico.com. Name & Role are filled in by Power Automate." |

#### Behavior

- Generate per-{ts} id.

- Create PersonsCD with empty Title/role (pending state).

- Call usePersonMutations.create.mutate(newPerson).

- Call onChange(newId) on the parent picker to **immediately select** the new person.

- Close both the inner add dialog and the outer picker popover.

**Submit predicate:** the email regex passes.

### d.16 — InlineAssigneePicker (Planning card chip pop-out)

*Popover, not a Dialog.* Mounted via a React portal into document.body with z-index: 2147483647. Used by the Planning Kanban card assignee chip.

The surface is a fixed-position panel anchored to the chip via getBoundingClientRect(), must **flip above the trigger** if there's not enough room below, and must **clamp to the viewport** on the right edge. Position must be re-synced on scroll/resize.

#### Behavior

- Search input filters active persons by name or email (max 20 results).

- Selecting an option (or "Unassigned") sets a draft, then schedules a commit:

  - Saves nothing if draft === original.

  - Otherwise sets state pending (clock icon), waits **ASSIGN_COMMIT_DELAY_MS = 1200ms**, calls onCommit(newId), then flashes saved (check icon for 800ms).

- Click-outside (mousedown outside the picker root) or Escape calls flushAndClose() — which fires any pending commit immediately and closes.

- The Done button does the same.

**Why a portal:** the app may be hosted inside an iframe and inside parent stacking contexts. Portaling into document.body with the maximum z-index guarantees the picker overlaps host content. The position must be recomputed on scroll/resize so it stays attached to the chip.

### d.17 - Confirmation prompts (inactivation and remaining delete actions)

The following pages must surface a confirmation prompt before lifecycle changes or remaining destructive deletes:

| **Page**      | **Prompt**                        |
|---------------|-----------------------------------|
| Categories    | Inactivate category "{name}"?     |
| Blocker Types | Inactivate blocker type "{name}"? |
| Releases CRUD | Inactivate release "{Title}"?     |
| Links         | Delete link "{name}"?             |

On confirm, Categories, Blocker Types, and Releases must inactivate/reactivate via update/inactivate mutations. Links may still call remove.mutate(linkId). People uses the bespoke pending-row removal / enriched-person inactivation dialog

## (e) Data Model — Detailed

There are 8 source entities

### e.0 — Cross-cutting conventions

| **Topic**                                     | **Rule**                                                                                                                                                                                                                                                                    |
|-----------------------------------------------|-----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| Primary keys                                  | Strings only. Prefixes: cat- (Categories), bt- (BlockerTypes), per- / p- (Persons), rel- (Releases), wi- (WorkItems), lnk- / blk- (Links / Blockers).                                                                                                                       |
| Foreign keys                                  | Plain string ids on the child row (no embedded objects). Always nullable when the relationship is optional (e.g. WorkItem.categoryId, WorkItem.releaseId, WorkItem.assignedToId, WorkItem.parentItemId).                                                                    |
| Choice columns                                | Stored as { Value: "..." } (a Choice\<T\> wrapper). Applies to WorkItem.status, ReleasesCD.releaseType, Link.linkType. Never store the raw string.                                                                                                                          |
| Dates                                         | Local yyyy-mm-dd strings; **never** Date objects, **never** UTC ISO. Nullable when absent.                                                                                                                                                                                  |
| Timestamps                                    | Only WorkItem.lastChanged is a full ISO timestamp (set on every mutation by useWorkItemMutations.update).                                                                                                                                                                   |
| Booleans                                      | Real boolean (true / false), never "true" strings.                                                                                                                                                                                                                          |
| Title (capital T)                             | Reserved field name on PersonsCD and ReleasesCD to mirror the SharePoint convention (Title = display name).                                                                                                                                                                 |
| Soft delete vs. hard delete                   | Categories, BlockerTypes, Persons, and Releases are lifecycle-managed by active/inactive state. The application UI must not hard-delete these records. Inactive records are excluded from new-selection controls but continue to resolve historical foreign keys.           |
| Person inactivation                           | Enriched PersonsCD rows are retained and set active = false. Existing Work Items and Blockers retain their personId for historical accuracy unless an explicit reassignment workflow is invoked. Pending unenriched rows may be removed through the bespoke pending-row UX. |
| Category / Release / BlockerType inactivation | No hard delete. Set active = false; Work Items / Blockers keep their FK; the UI tolerates inactive references and renders their historical labels when available.                                                                                                           |
| Settings-driven behavior                      | Fallback assignee and email-domain enforcement are stored in AppSettings. Business logic must read these values from settings, not constants.                                                                                                                               |
| Shared data layer                             | Data is shared across users by default. Optional @me filters may personalize views without changing the underlying shared dataset.                                                                                                                                          |

### e.1 — CategoryMD (Category Master Data)

**Storage key:** wt2:categories.

| **Field**   | **Type** | **Required** | **Default**  | **Notes**                                                                                         |
|-------------|----------|--------------|--------------|---------------------------------------------------------------------------------------------------|
| categoryId  | string   | yes          | new cat-{ts} | Primary key.                                                                                      |
| name        | string   | yes          | —            | Short label / abbreviation. Trimmed on save. Used in selects.                                     |
| longName    | string   | no           | ""           | Long display name; shown next to name on Work Item detail and the dashboard category bar.         |
| development | boolean  | yes          | false        | When true, work items in this category render a badge-plum "Development" badge.                   |
| capex       | boolean  | yes          | false        | When true, work items in this category render a badge-ice "CAPEX" badge.                          |
| active      | boolean  | yes          | true         | Inactive categories are excluded from Category selects in dialogs but still resolve historic FKs. |

### Relationships

- 1 → N WorkItem.categoryId.

### Validation / UI rules

- name is required and trimmed in CategoryDialog.

- Only active === true categories appear in the Work Item dialog's Category select.

### e.2 - BlockerMD (Blocker Type Master Data)

**Storage key:** wt2:blockerTypes.

| **Field**     | **Type** | **Required** | **Default** | **Notes**                                                                                                                  |
|---------------|----------|--------------|-------------|----------------------------------------------------------------------------------------------------------------------------|
| blockerTypeId | string   | yes          | new bt-{ts} | Primary key.                                                                                                               |
| name          | string   | yes          | —           | Display name. The three canonical names — Hard, Soft, Potential — drive sortBlockerTypesForDialog.                         |
| days          | number   | yes          | 1           | Re-validation cadence in days. Used by computeNextValidation(lastValidated, days). Clamped to max(1, floor(days)) on save. |
| active        | boolean  | yes          | true        | Inactive blocker types are excluded from Log/New Blocker pickers but still resolve historical blockers.                    |

### Relationships

- 1 → N Blocker.blockerTypeId.

Required seed export values

- bt-hard - Hard, 1 day, active = true.

- bt-soft - Soft, 2 days, active = true.

- bt-potential - Potential, 3 days, active = true.

Validation / UI rules

Only active === true blocker types appear in new blocker pickers. Historical blockers whose type is inactive still render the type name when available.

### e.3 — PersonsCD (People Core Data)

**Storage key:** wt2:persons.

| **Field** | **Type** | **Required**          | **Default**  | **Notes**                                                                                                                                                                                                       |
|-----------|----------|-----------------------|--------------|-----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| personId  | string   | yes                   | new per-{ts} | Primary key. Seed rows use stable ids: p-michael, p-steven, p-justin, p-rafael, p-sarah, p-michael-h, p-pedro, p-nick.                                                                                          |
| Title     | string   | yes (post-enrichment) | "" on create | Full name. **Empty on creation** — the "+ Add person" flow stores an empty Title and lets Power Automate fill it in; the UI shows a pending state until both Title and role are filled.                         |
| email     | string   | yes                   | —            | Validated against AppSettings.allowedEmailDomains when AppSettings.enforceEmailDomain is true. Default seed domain is @pepsico.com. Enforced by both PersonDialog (CRUD) and the picker add-person mini-dialog. |
| role      | string   | yes (post-enrichment) | "" on create | Job role / title. Same pending behavior as Title.                                                                                                                                                               |
| active    | boolean  | yes                   | true         | Inactive people are excluded from the PersonPicker and inline picker.                                                                                                                                           |

### Derived: "pending" state

- pending = !Title \|\| !role — used by PeopleChip (dashed spinner), the People CRUD card (pending-row class + "Pending enrichment" badge), and usePersons (polls every 3s while any row is pending).

### Relationships

- 1 → N WorkItem.assignedToId (nullable on the WI side).

- 1 → N Blocker.assignedToId (nullable on the blocker side).

Fallback owner - settings-driven

- The fallback owner is configured in AppSettings. The default seed may point to p-michael / michael.girardi@pepsico.com, but requirements must not assume that identity is permanent.

Inactivation behavior - see c.1:

1.  Set active = false for enriched people; keep historical WorkItem assignment fields intact unless the user explicitly reassigns.

2.  Keep historical Blocker assignments intact unless explicit reassignment is invoked; reassignment reads the fallback owner from AppSettings.

3.  Remove the person.

4.  Invalidate persons / workItems / blockers / settings-aware queries after inactivation or reassignment.

### e.4 — ReleasesCD (Releases Core Data)

**Storage key:** wt2:releases.

| **Field**   | **Type**                                 | **Required**    | **Default**      | **Notes**                                                                                                                         |
|-------------|------------------------------------------|-----------------|------------------|-----------------------------------------------------------------------------------------------------------------------------------|
| releaseId   | string                                   | yes             | new rel-{ts}     | Primary key.                                                                                                                      |
| Title       | string                                   | yes             | —                | Display name. Trimmed on save.                                                                                                    |
| date        | string \| null                           | **conditional** | —                | Local yyyy-mm-dd, **or null for "OnGoing"**. Required unless the OnGoing toggle is on. Rendered everywhere via formatReleaseDate. |
| releaseType | Choice\<"PGT" \| "BreakFix" \| "Other"\> | yes             | { Value: "PGT" } | Drives releaseTypeColor and Planning Kanban's swimlane filter.                                                                    |
| active      | boolean                                  | yes             | true             | Inactive releases are excluded from the Work Item dialog's Release select but still resolve historic FKs.                         |

### Derived behavior

- **OnGoing visibility on Planning Kanban** — a release with date === null is **always visible** (never auto-hidden), regardless of past/future logic.

- Release auto-hide threshold on Planning Kanban remains an open decision. Do not hard-code a past-release hiding threshold until section (j) is resolved.

- **Drag onto release auto-populates Goal Date** — only if the release has a concrete date (OnGoing releases never overwrite goalDate).

- **Sort order** in dropdowns and swimlanes: **OnGoing first**, then by date ascending; ties resolved alphabetically by Title.

### Relationships

- 1 → N WorkItem.releaseId (nullable on the WI side).

### e.5 — WorkItem

**Storage key:** wt2:workItems.

| **Field**    | **Type**                                           | **Required** | **Default**           | **Notes**                                                                                                                                                                                                                                                                   |
|--------------|----------------------------------------------------|--------------|-----------------------|-----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| workItemId   | string                                             | yes          | new wi-{ts}           | Primary key.                                                                                                                                                                                                                                                                |
| title        | string                                             | yes          | —                     | Trimmed; empty disables submit on every dialog that creates a WI.                                                                                                                                                                                                           |
| description  | string                                             | yes          | ""                    | Plain text (newlines preserved via whitespace-pre-wrap).                                                                                                                                                                                                                    |
| assignedToId | string \| null                                     | no           | null                  | FK -\> PersonsCD.personId. Historical assignments are retained if a person is inactivated; active pickers exclude inactive people. Optional reassignment workflows use the AppSettings fallback owner.                                                                      |
| assignedDate | string \| null                                     | no           | null                  | Local yyyy-mm-dd. **Stamped automatically** to todayISO() when an assignee is set (create flow + edit flow when previously empty); cleared to null when assignee is cleared.                                                                                                |
| goalDate     | string \| null                                     | no           | null                  | Local yyyy-mm-dd. Drives daysRemaining, overdue coloring, and dashboard upcoming/needs-planning logic.                                                                                                                                                                      |
| brf          | boolean                                            | yes          | false                 | "Business Request Form" flag. Renders the badge-grain BRF badge.                                                                                                                                                                                                            |
| complete     | boolean                                            | yes          | false                 | Forced to true whenever status.Value === "Complete" or status.Value === "Descoped" on save. Descoped is the current deferred terminal state unless the open Deferred/Descoped naming decision changes it. Used by Planning Kanban and list filters to hide completed items. |
| categoryId   | string \| null                                     | no           | null                  | FK → CategoryMD.categoryId.                                                                                                                                                                                                                                                 |
| parentItemId | string \| null                                     | no           | null                  | Self-FK for sub-tasks. Set by SubtaskDialog; editable from the Work Item dialog (edit mode only).                                                                                                                                                                           |
| releaseId    | string \| null                                     | no           | null                  | FK → ReleasesCD.releaseId.                                                                                                                                                                                                                                                  |
| size         | "XS" \| "S" \| "M" \| "L" \| "XL" \| "XXL" \| null | no           | null                  | T-shirt size. Drives sizeColor.                                                                                                                                                                                                                                             |
| status       | Choice\<StatusValue\>                              | yes          | { Value: "Upcoming" } | One of the 9 statuses (see e.5.1).                                                                                                                                                                                                                                          |
| lastChanged  | string? (ISO timestamp)                            | derived      | unset on create       | Set by useWorkItemMutations.update on every mutation. Surfaces in the detail view and the Planning quick-look.                                                                                                                                                              |

#### e.5.1 — Status enum & groups

| **Status**   | **Group**   | **Selectable in dropdowns?** | **Notes**                                                                                                                                                 |
|--------------|-------------|------------------------------|-----------------------------------------------------------------------------------------------------------------------------------------------------------|
| Upcoming     | Pending     | yes                          | Default for new items.                                                                                                                                    |
| Assigned     | Pending     | yes                          |                                                                                                                                                           |
| Execution    | In-Progress | yes                          | Default fallback when un-blocking with no priorStatus.                                                                                                    |
| Testing      | In-Progress | yes                          |                                                                                                                                                           |
| Await Deploy | In-Progress | yes                          |                                                                                                                                                           |
| Hypercare    | In-Progress | yes                          |                                                                                                                                                           |
| Complete     | Complete    | yes                          | Picking this also flips complete to true.                                                                                                                 |
| Blocked      | Blocked     | **no**                       | Entered only by logging an active blocker; exited only by clearing all active blockers.                                                                   |
| Descoped     | Descoped    | yes                          | Current deferred terminal state. Selecting Descoped sets complete = true. Open question: confirm whether product language should be Deferred or Descoped. |

#### e.5.2 — Cross-field invariants

1.  **Blocked guardrail** — status === "Blocked" ⇔ **≥1 active blocker exists for this work item**. The Planning Kanban must refuse drags into Blocked and refuse drags **out of** Blocked until all active blockers are cleared. Work Item detail's status dropdown must be disabled while Blocked.

2.  complete mirrors terminal status

3.  **assignedDate mirrors assignedToId** — setting an assignee from null stamps today; clearing assignee clears the date.

4.  **parentItemId cannot be self** — the Work Item dialog must filter the parent select to exclude the current id.

Parent completion guard - a parent Work Item cannot be marked complete until all child Work Items are complete or Descoped. The WorkItemDialog and inline status control must block parent completion and show a user-facing explanation.

5.  **releaseId auto-population** — dragging a card onto a dated release on the Kanban sets releaseId and goalDate = release.date. OnGoing releases never overwrite goalDate.

### e.6 — Link

**Storage key:** wt2:links.

| **Field**  | **Type**                                               | **Required** | **Default**       | **Notes**                                                                                                                                                                                       |
|------------|--------------------------------------------------------|--------------|-------------------|-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| linkId     | string                                                 | yes          | new lnk-{ts}      | Primary key.                                                                                                                                                                                    |
| name       | string                                                 | yes          | derived           | The display label. Set by deriveLinkDisplayName(type, number) on save — never accept a user-typed name.                                                                                         |
| workItemId | string                                                 | yes          | —                 | FK → WorkItem.workItemId. Hidden in the Link dialog when fixedWorkItemId is supplied.                                                                                                           |
| linkType   | Choice\<"RITM" \| "INC" \| "ADO" \| "CRF" \| "AskMe"\> | yes          | { Value: "RITM" } | Drives normalization, validation, display name, and URL.                                                                                                                                        |
| number     | string                                                 | yes          | normalized        | The canonical id. Set by normalizeLinkNumber(type, raw) on save. The normalized linkType + normalized number pair must be unique across Link records; duplicates are rejected on create/update. |

**Per-type rules** — see the c.1 link-helpers table for full details (normalization, validation, display, URL).

Completed-parent filtering - Global Links and Blockers views exclude records whose associated Work Item has complete === true or status in { Complete, Descoped } by default. Links are not cascade-deleted, and Work Items are not removed through the app.

### e.7 — Blocker

**Storage key:** wt2:blockers.

| **Field**          | **Type**            | **Required** | **Default**                     | **Notes**                                                                                                                                                                                                                                     |
|--------------------|---------------------|--------------|---------------------------------|-----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| blockerId          | string              | yes          | new blk-{ts}                    | Primary key.                                                                                                                                                                                                                                  |
| title              | string              | yes          | —                               | Trimmed on save.                                                                                                                                                                                                                              |
| workItemId         | string              | yes          | —                               | FK → WorkItem.workItemId.                                                                                                                                                                                                                     |
| blockerTypeId      | string              | yes          | first sorted                    | FK → BlockerMD.blockerTypeId. Combined with BlockerMD.days to compute nextValidation.                                                                                                                                                         |
| logged             | string (yyyy-mm-dd) | yes          | todayISO()                      | Date the blocker was created. **Pinned** at creation — not editable.                                                                                                                                                                          |
| assignedToId       | string \| null      | no           | workItem.assignedToId (default) | FK -\> PersonsCD.personId. Defaults to the WI assignee but can be overridden. Historical assignment is retained if a person is inactivated unless an explicit reassignment workflow is invoked; reassignment uses AppSettings fallback owner. |
| lastValidated      | string (yyyy-mm-dd) | yes          | todayISO() on create            | Updated to today on RevalidateDialog submit and on ClearBlockerDialog submit.                                                                                                                                                                 |
| blockerActive      | boolean             | yes          | true on create                  | true while active, false once cleared. Drives blockerBadgeStatus.                                                                                                                                                                             |
| expectedResolution | string (yyyy-mm-dd) | yes          | —                               | User-provided. On revalidate, must be **strictly after today**.                                                                                                                                                                               |
| nextValidation     | string (yyyy-mm-dd) | yes          | derived                         | computeNextValidation(lastValidated, blockerType.days). Drives the Valid / Revalidate / Cleared three-state badge.                                                                                                                            |
| priorStatus        | string              | yes          | computePriorStatus(...)         | The WI status *before* this blocker pushed it to Blocked. Used to restore the WI status when all active blockers are cleared.                                                                                                                 |

#### e.7.1 — Derived three-state validation badge

blockerBadgeStatus(blockerActive, nextValidation):

| **Inputs**                                              | **Result**                         |
|---------------------------------------------------------|------------------------------------|
| blockerActive === false                                 | **Cleared** (.badge-cleared)       |
| blockerActive === true && nextValidation \>= todayISO() | **Valid** (.badge-valid)           |
| blockerActive === true && nextValidation \< todayISO()  | **Revalidate** (.badge-revalidate) |

#### e.7.2 — Lifecycle

1.  **Create** (Log a Blocker) — logged = lastValidated = todayISO(), blockerActive = true, nextValidation = logged + type.days, priorStatus = computePriorStatus(wi, activeBlockers). Flips the WI to Blocked if not already.

2.  **Revalidate** — lastValidated = todayISO(), nextValidation = today + type.days, may update assignedToId and expectedResolution (which must be **strictly \> today**).

3.  **Clear** — blockerActive = false, lastValidated = todayISO(). If no other active blockers remain on the WI, restore the WI's status to priorStatus (or "Execution" if priorStatus is missing / "Blocked").

4.  **Delete** — not exposed in the UI; the row stays for history.

### e.8 — Seed data summary

Seed data is handled as a separate export task and must not be auto-seeded by the app on first load. The export can still provide the realistic interlinked starter dataset summarized below.

| Export dataset | Rows | Notable                                                                                                                                                                                                                        |
|----------------|------|--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| Categories     | 10   | cat-coe, cat-ar, cat-poppi (dev+capex), cat-rts (dev+capex), cat-clm (dev), cat-car1a / cat-car1b (capex), cat-ci, cat-sustain, cat-career.                                                                                    |
| BlockerTypes   | 3    | bt-hard (1d, active), bt-soft (2d, active), bt-potential (3d, active).                                                                                                                                                         |
| Persons        | 8    | Includes the fallback p-michael plus seven realistic teammates with full names, @pepsico.com emails, and roles.                                                                                                                |
| Releases       | 5    | rel-pgt-q3 (+18d), rel-bf-aug (+5d), rel-other-pilot (+32d), rel-pgt-q4 (+72d), **rel-other-ongoing** (date: null, OnGoing). Dates are relative to todayISO() at seed time.                                                    |
| WorkItems      | 12   | Mix of statuses (including one Blocked and one Complete), 1 sub-task (wi-1005 whose parentItemId === "wi-1004"), 1 with no goalDate, 1 with size XXL. Releases cover PGT Q3 / Q4, August BreakFix, Pilot Wave, and unassigned. |
| Links          | 5    | One of each type — RITM123545, INC987654, ADO 88811, AskMe 4421, CRF 7081 — wired to specific work items.                                                                                                                      |
| Blockers       | 3    | One active Hard (blk-1 on wi-1002, hence its Blocked status), one Cleared Soft (blk-2), one active Potential (blk-3).                                                                                                          |
| AppSettings    | 1    | Shared app settings row with default fallback owner, email-domain enforcement, allowed domains, and defaultPageSize. Generated by the seed export task, not by automatic in-app seeding.                                       |

### e.9 — Entity-relationship overview

CategoryMD (1) ----< WorkItem (N)

ReleasesCD (1) ----< WorkItem (N)

PersonsCD (1) ----< WorkItem.assignedToId (N, nullable)

PersonsCD (1) ----< Blocker.assignedToId (N, nullable, fallback on cascade delete)

WorkItem (1) ----< WorkItem.parentItemId (N self-FK, sub-tasks)

WorkItem (1) ----< Link (N)

WorkItem (1) ----< Blocker (N; ≥1 active ⇔ WorkItem.status = "Blocked")

BlockerMD (1) ----< Blocker (N)

### e.10 - Storage/backend mapping (persistent shared layer and SharePoint appendix)

The app assumes a persistent shared data layer. The logical data model must use generic entity/field terminology; SharePoint-specific list mapping is implementation guidance and belongs in the backend appendix. The mapping must preserve:

- the **Title (capital T)** field on PersonsCD and ReleasesCD (SharePoint convention);

- the **Choice\<T\> wrapper** as the column shape for status, releaseType, linkType (so SharePoint Choice columns map 1:1);

- the **nullable date** on ReleasesCD for OnGoing;

- the **string FKs** so SharePoint Lookup columns (which store an id + a denormalized title) can be normalized to id-only on read.

Detailed backend requirements are specified in section (h); SharePoint list structures are implementation mapping guidance, not the canonical data model.

## (f) Detailed Functional Requirements (per page)

Each page section is structured as:

- **Route(s)** — URL path(s) handled.

- **Purpose** — one-line statement.

- **Layout** — top-down composition.

- **Data dependencies** — hooks consumed.

- **MUST include** — hard requirements (failing any of these is a defect).

- **MUST NOT include** — explicit exclusions.

- **Interactions** — every user-initiated action, with effects and side-effects.

- **States** — loading / empty / error / special states.

- **URL parameters** — query-string contract (if any).

#### Universal exclusions that apply to every page (not restated per-page):

- No native browser scrollbars on the body other than the main content area.

- No dark mode toggle and no theme switcher (single-theme app).

- No multi-select bulk actions anywhere.

- No undo / restore UI for confirmed Link deletion or lifecycle inactivation. Master-data records are inactivated, not hard-deleted.

- No optimistic UI that diverges from server state.

- No user-typed URLs or arbitrary external links (links are entered as type + id and rendered via buildLinkUrl).

- No raw Date objects in state — always yyyy-mm-dd strings (except lastChanged).

### f.1 — Dashboard (/)

**Purpose:** At-a-glance view of backlog health, blockers, and what's coming next.

### Layout (top → bottom)

1.  PageHeader — title "Dashboard", subtitle, dashboard icon.

2.  **KPI tile row (4 tiles)** — Total Work Items, In Progress, Complete, Blocked.

3.  **Charts row (2-up)** — Status Distribution donut (2/5), Items by Category bar (3/5).

4.  **Lists row (2-up)** — Upcoming Goal Dates, Active Blockers.

5.  **Glance cards row (2-up)** — Next Release, Needs Planning.

**Data dependencies:** useWorkItems, useBlockers, useCategories, usePersons, useReleases.

#### MUST include

- 4 KPI tiles, each rendered as a clickable Card with role="button", keyboard activation on Enter/Space.

- Status Distribution donut grouping statuses via STATUS_GROUPS into Pending / In-Progress / Complete / Blocked.

- Category bar limited to the top 8 categories by count, sorted descending.

- Upcoming Goal Dates list: max 6 items, ascending by goalDate, excluding complete items and status === "Complete".

- Active Blockers list: max 5 items, only blockerActive === true. Status badge derived via blockerBadgeStatus.

- Next Release card: earliest active release whose date is **today or in the future**. OnGoing releases (date === null) are **excluded** from "next release" selection (they have no calendar position).

- Needs Planning count: deduped set of workItemIds where (not complete && status !== "Complete") AND (!assignedToId OR 0 \<= daysRemaining(goalDate) \<= 14).

- Loading state: render the page chrome immediately; replace tiles/charts with CardShimmer until data resolves.

#### MUST NOT include

- **No editing** of any record from this page (no inline status changes, no delete buttons, no dialogs).

- No filters or search controls.

- No raw counts of Descoped. Descoped is **excluded** from the donut and from KPI tiles.

- **No** Blocked items in the In-Progress KPI (they are counted in the dedicated Blocked tile, not double-counted).

- No "mark all complete", "clear all blockers", or other batch actions.

- No links to external systems (no buildLinkUrl consumption) — links surface only on detail pages.

#### Interactions

| **Action**                      | **Effect**                                                                                      |
|---------------------------------|-------------------------------------------------------------------------------------------------|
| **Click Total Work Items tile** | Navigate to /work-items (no filter).                                                            |
| **Click In Progress tile**      | Navigate to /work-items?statusGroup=In-Progress.                                                |
| **Click Complete tile**         | Navigate to /work-items?complete=1.                                                             |
| **Click Blocked tile**          | Navigate to /work-items?status=Blocked.                                                         |
| Tile shortcut behavior          | If the filter resolves to **exactly one** work item, jump straight to /work-items/{id} instead. |
| Click a Category bar            | Navigate to /work-items?category={id}.                                                          |
| Click an Upcoming row           | Navigate to /work-items/{id}.                                                                   |
| Click an Active Blocker row     | Navigate to /work-items/{workItemId} (or /blockers if the work item is missing).                |
| **Click Next Release card**     | Navigate to /releases.                                                                          |
| **Click Needs Planning card**   | Navigate to /planning.                                                                          |

#### States

- **Loading:** 4 KPI shimmers + chart shimmers; lists show 4 row shimmers each.

- **Empty charts:** "No categorized items yet." under the Category bar; donut renders "No data" via the StatusDonut fallback.

- **Empty lists:** "All clear — no upcoming goals." / "No active blockers." / "No upcoming releases." as appropriate.

- **Error:** caught by AppErrorBoundary.

### f.2 — Work Items list (/work-items)

**Purpose:** Filtered, searchable, optionally-grouped table of all work items.

### Layout (top → bottom)

1.  PageHeader with **+ New Item** action.

2.  **Filter card** — search input (left), group-by toggle (right), then three filter rows: Status, Category, Release. Active-chip strip with Clear all at the bottom when filters are set.

3.  **Table** — columns: Title, Status, Category, Size, Assigned, Goal, Remaining, Release. Rows are full-row clickable.

**Data dependencies:** useWorkItems, useCategories, useReleases, usePersons, useWorkItemMutations (create only).

#### MUST include

- A + New Item button that opens WorkItemDialog in create mode (see d.1).

- Search box performs broad-based matching across work item title, description, status, category name/longName, release title, assignee Title, assignee email, and documented link display names/numbers

Search result rows must indicate why the row matched by showing a compact field label and highlighted matched text, for example: [Assigned To] Charles Chafee or [Work Item] New Characteristic.

- Status filter chips drawn from STATUS_OPTIONS_SELECTABLE (so **Blocked is NOT shown as a selectable filter chip** — but ?status=Blocked set via URL is still honored, per the Dashboard's Blocked tile).

- Category and Release filter chips show only active === true items.

- Group-by toggle with two mutually-exclusive modes: "By category" / "By release" (re-clicking the active mode clears it).

- Group headers: surface tint (surface-fresh for category, surface-plum for release), uppercase label, item count in parens.

- Goal-date cell colors: overdue = red-400, ≤7 days = yellow-400, else muted.

- URL-as-source-of-truth filters: status, statusGroup, category, release, complete, overdue. All updated via setSearchParams(..., { replace: true }) so back-button doesn't accumulate intermediate states.

- Active-chip strip surfacing statusGroup, complete=1, and overdue=1 (status / category / release are reflected by the lit-up filter chip themselves).

#### MUST NOT include

- **No inline editing** of any cell (status, assignee, dates).

- **No row delete action** — work items can only be created here; deletes are not exposed in this app at all (see f.14).

- **No bulk select** / checkboxes / multi-row actions.

- **No Blocked chip** in the Status filter row (it must be entered via the URL or by clicking the Dashboard tile).

- **No Descoped chip suppression** — Descoped IS shown as a filter chip (it's in STATUS_OPTIONS_SELECTABLE).

- No unbounded rendering beyond 100 matching rows - list pages must paginate, virtualize, or otherwise avoid rendering more than 100 rows at once.

- **No CSV export.**

- **No saved views / pinned filters.**

#### Interactions

| **Action**                                              | **Effect**                                                          |
|---------------------------------------------------------|---------------------------------------------------------------------|
| Type in search                                          | Filters the table in-memory (no URL change).                        |
| Click a Status chip                                     | Toggles ?status=\<value\> in the URL.                               |
| Click a Category chip                                   | Toggles ?category=\<id\>.                                           |
| Click a Release chip                                    | Toggles ?release=\<id\>.                                            |
| Click "By category" / "By release"                      | Toggles groupBy (local state only — not persisted in URL).          |
| Click an active-chip (statusGroup / complete / overdue) | Removes that key from the URL.                                      |
| Click "Clear all"                                       | Resets URL to /work-items.                                          |
| Click a row (or Enter key)                              | Navigate to /work-items/{id}.                                       |
| Click + New Item                                        | Opens WorkItemDialog in create mode; on submit calls create.mutate. |

#### URL parameters

| **Param**   | **Values**                                            | **Notes**                                                       |
|-------------|-------------------------------------------------------|-----------------------------------------------------------------|
| status      | one of STATUS_OPTIONS (incl. Blocked)                 | Singular; chip UI only sets selectable values.                  |
| statusGroup | Pending / In-Progress / Complete / Blocked / Descoped | Set by Dashboard "In Progress" tile.                            |
| category    | a categoryId                                          |                                                                 |
| release     | a releaseId                                           |                                                                 |
| complete    | 1                                                     | Filters to \`complete                                           |
| overdue     | 1                                                     | Filters to daysRemaining(goalDate) \< 0 && status !== Complete. |

#### States

- **Loading:** 6-row RowShimmer.

- **Empty (filtered):** EmptyState with "No work items match" and a + New Item action.

- **Empty (filter list):** "No categories" / "No releases" italic text in the filter row.

### f.3 — Work Item Detail (/work-items/:id)

### Purpose: Full editable view of a single work item with its blockers, links, sub-tasks, comments, and activity history.

### Layout (top → bottom)

1.  Back to Work Items ghost button.

2.  PageHeader with the item title, category subtitle (if any), and **Edit** action.

3.  **Badge strip** — size chip, BRF, Development, CAPEX, Complete (conditional).

4.  **Two-column row** — Description card (2/3) + Details card (1/3) with inline status select, assignee chip, goal date with overdue coloring, release pill, parent link, last-changed timestamp.

5.  **Two-column row** — Blockers panel + Links panel.

6.  **Sub-tasks panel (full width), followed by Comments panel and Activity timeline.**

7.  Dialogs: WorkItemDialog (edit), LogBlockerDialog, RevalidateDialog, ClearBlockerDialog, BlockerDetailDialog, LinkDialog, SubtaskDialog. Comments use an inline composer rather than a modal.

### Data dependencies: all base read hooks plus useWorkItemComments and useActivityLog; relevant mutation bundles include useWorkItemMutations, useBlockerMutations, useLinkMutations, useCommentMutations, and audit/event logging via the mutation layer.

#### MUST include

- Inline status dropdown that **auto-saves on change** with a 1200ms debounce:

  - State machine: idle → pending (clock) → saving (spinner) → saved (check, 1500ms) → idle.

  - On error: revert draft to the last saved value and show a **Retry** link that resubmits.

  - On blur: flush the pending debounce immediately.

- **Blocked guardrail:** when item.status === "Blocked", the status select is **disabled** and shows the hint "Locked while this item is Blocked — resolve the blockers first."

- **Clear-blocker un-block:** clearing the last active blocker on a Blocked item restores its status to priorStatus (or "Execution" if the priorStatus is missing / "Blocked").

- **Log Blocker** opens LogBlockerDialog and on submit flips the WI to Blocked if it isn't already.

- Sub-tasks card: items where parentItemId === item.workItemId, sorted by insertion order; each row links to its detail page. Parent items cannot be moved to Complete or Descoped until all child items are complete or descoped.

- Links list opens each link in a new tab with rel="noopener noreferrer" and uses buildLinkUrl(linkType, number) to construct the href.

Comments panel must allow adding, editing, and inactivating Work Item comments according to section (k.3).

Activity timeline must show audit events for the current Work Item, newest first, according to section (k.2).

#### MUST NOT include

- **No delete button for the work item itself.** Work items are not deletable.

- **No delete button for blockers** — only Revalidate and Clear (which sets blockerActive = false). Blockers are history-preserving.

- **No bulk operations** on sub-tasks (no "Mark all complete").

- **No manual override of priorStatus** in the UI — it's computed when the blocker is logged and only consumed when clearing.

- **No raw URL editing** for links (links are always rendered via buildLinkUrl).

- **No manual lastChanged field** — stamped automatically by mutations.

- **No status field for Blocked in the dropdown** (filtered out of STATUS_OPTIONS_SELECTABLE; the only path into Blocked is logging a blocker).

#### Interactions

| **Action**                                   | **Effect**                                                                                                        |
|----------------------------------------------|-------------------------------------------------------------------------------------------------------------------|
| **Click Edit**                               | Opens WorkItemDialog in edit mode. On submit, update.mutate({ id, changes }) and dialog closes.                   |
| Change Status dropdown                       | Schedules an auto-save (1200ms debounce).                                                                         |
| **Click status Retry**                       | Immediately re-attempts the commit with the current draft.                                                        |
| **Click Log a Blocker**                      | Opens LogBlockerDialog. On submit: create blocker, optionally update WI status to Blocked.                        |
| Click a blocker title                        | Opens BlockerDetailDialog (read-only).                                                                            |
| Click row Revalidate icon (Revalidate state) | Opens RevalidateDialog.                                                                                           |
| Click row Check icon (Clear)                 | Opens ClearBlockerDialog.                                                                                         |
| **Click Document a Link**                    | Opens LinkDialog with fixedWorkItemId={item.workItemId} (the WI picker is hidden).                                |
| Click a link chip                            | Opens external URL in a new tab.                                                                                  |
| **Click Create a Subtask**                   | Opens SubtaskDialog. On submit, the new WI inherits categoryId + releaseId from the parent and sets parentItemId. |
| Click a sub-task row                         | Navigate to its /work-items/{id}.                                                                                 |
| **Click Back to Work Items**                 | Navigate to /work-items.                                                                                          |

#### States

- **Loading:** title shimmer + 2-column body shimmer.

- **Not found:** ghost back button + EmptyState with "Work item not found".

- **Blocker list empty:** "No blockers logged." centered text.

- **Links empty:** "No links yet."

- **Sub-tasks empty: "No sub-tasks yet." Comments empty: "No comments yet." Activity empty: "No activity recorded yet."**

### f.4 — Planning Kanban (/planning)

**Purpose:** Drag-and-drop board to change status and assign work items to releases, scoped to a single release type.

### Layout (top → bottom)

1.  PageHeader.

2.  **Toolbar card** — Release-type select (PGT / BreakFix / Other) and a summary count on the right (N releases · M unassigned items).

3.  **"Items without a release" swimlane** (always present) — 6 status columns: Upcoming, Assigned, Execution, Testing, Await Deploy, Hypercare.

4.  **One swimlane per visible release** — same 6 columns, prefixed by a sticky header (release title, type badge, formatted date, status pill: OnGoing / Past / N days to release).

5.  DragOverlay for the dragged card.

6.  WorkItemDetailsDialog (quick-look, see d.14).

**Data dependencies:** useWorkItems, usePersons, useReleases, useCategories, useBlockers, useBlockerTypes, useLinks, useWorkItemMutations.

#### MUST include

- Default board statuses are currently Upcoming -\> Assigned -\> Execution -\> Testing -\> Await Deploy -\> Hypercare. Final Planning column visibility remains an open decision in section (j); do not treat this default as a closed product decision.

- Hidden items (never rendered on the board): any work item where complete === true OR status ∈ { Complete, Descoped, Blocked }.

- Release visibility rules for the current releaseType filter are partially defined; release auto-hide threshold remains open in section (j):

  - OnGoing release (date === null) → **always visible**, **sorted first**.

  - Dated release with date \>= today → visible.

  - Dated release with date \< today - visibility depends on the unresolved release auto-hide threshold decision in section (j).

  - Empty past release auto-hide is not finalized and must not be implemented as a hard requirement until section (j) is resolved.

  - Ordering: OnGoing first, then dated ascending by date; ties resolved by Title.localeCompare.

- "Items without a release" swimlane is **always rendered**, regardless of the selected release type.

- Drag-and-drop with a 5-pixel activation distance so clicks on cards still open the quick-look.

- Inline assignee picker on each card (portaled InlineAssigneePicker, see d.16) with 1200ms debounced commit and flushAndClose semantics on outside-click / Escape / Done.

- Card open-quick-look gesture: pointerdown + pointerup within 4px movement, outside the assignee chip, while not dragging.

#### MUST NOT include

- **No drag into / out of Blocked** — dragging a Blocked card into a non-Blocked column raises a native alert("This item is Blocked — clear its blockers before changing status.") and is reverted. Blocked is not a column on the board.

- **No drop on the swimlane header** — droppable targets are columns only.

- **No drag of completed / descoped items** (they're not rendered on the board).

- **No bulk re-assignment, no row deletion, no inline title edit, no inline status edit** on the card (only via the quick-look → Open full details or the assignee chip).

- **No goalDate overwrite when dragging onto an OnGoing release** — OnGoing releases never propagate a date.

- **No persistence of the selected release type** beyond the URL.

- **No multi-release-type view** — exactly one release type is shown at a time.

#### Interactions

| **Action**                                          | **Effect**                                                                                                                          |
|-----------------------------------------------------|-------------------------------------------------------------------------------------------------------------------------------------|
| Change Release type select                          | Updates ?releaseType= and re-filters visible swimlanes.                                                                             |
| Click a card (no movement)                          | Opens WorkItemDetailsDialog (quick-look).                                                                                           |
| Click "Open full details" in quick-look             | Navigate to /work-items/{id}.                                                                                                       |
| Drag a card to a different column in the same lane  | Updates status only (no release change), complete = false.                                                                          |
| Drag a card to a column in a different release lane | Updates releaseId and (if the new release has a date) goalDate = release.date. May also update status if the target column differs. |
| Drag a card onto the "Items without a release" lane | Sets releaseId = null. Does NOT clear goalDate.                                                                                     |
| Click the assignee chip                             | Opens InlineAssigneePicker (portaled, max-z-index).                                                                                 |
| Pick a person / Unassigned                          | Debounced commit (1200ms). Setting from null → person stamps assignedDate = todayISO(); → null clears both.                         |
| Escape / outside-click on picker                    | Flushes pending commit and closes.                                                                                                  |
| Scroll / resize while picker is open                | Picker position re-anchors to the chip and flips above if no room below.                                                            |

#### URL parameters

| **Param**   | **Values**                       | **Notes**     |
|-------------|----------------------------------|---------------|
| releaseType | PGT (default) / BreakFix / Other | One required. |

#### States

- **Loading:** 6 column shimmers.

- **No visible releases for the selected type:** info card "No active {type} releases. Add a release or switch to another release type." The "Items without a release" lane is still shown above it.

- **Empty column:** "Drop here" italic text inside the column.

### f.5 — Blockers (/blockers)

**Purpose:** Cross-WI view of all blockers, grouped by work item, with a single create flow.

### Layout (top → bottom)

1.  PageHeader with **+ New Blocker** action.

2.  **Toolbar card** — Show only active toggle (default ON), count summary on the right.

3.  **One Card per work item** with grouped blockers. Inside each card: a plum-tinted work-item header row (links to /work-items/{id}), then a fixed-layout \<table\> with a shared \<colgroup\> so column widths are identical across all groups.

4.  NewBlockerDialog (page-scoped, see d.12).

**Data dependencies:** useBlockers, useBlockerTypes, useWorkItems, usePersons, useBlockerMutations, useWorkItemMutations.

#### MUST include

- Fixed-layout tables with column widths: Type 160px, Assigned 180px, Next Validation 150px, Expected Resolution 170px, Status 130px; Blocker title column flexes.

- Three-state validation badge (Valid / Revalidate / Cleared) per row via blockerBadgeStatus.

- Group header: plum tinted bar, work-item title links to /work-items/{wiId} (external-link icon), count of blockers in the group on the right.

- Show only active toggle filters to blockerActive === true. Default is ON.

Parent completion filter: by default, the global Blockers page excludes blocker groups whose associated Work Item has complete === true or status in { Complete, Descoped }. Work Item Detail remains the authoritative place to view complete-item blocker history.

- \+ New Blocker opens NewBlockerDialog with the work-item picker filtered to **exclude items with status === "Complete"**. On submit: create blocker AND, if WI isn't already Blocked, update WI status to Blocked.

- Min-width 860px on the inner table; horizontal scroll on small viewports so alignment is preserved.

- Long cell content uses truncate so a single long row doesn't push columns out of alignment.

#### MUST NOT include

- **No delete action on blocker rows.** Blockers are append-only / clear-only (clearing sets blockerActive = false; the row persists for history).

- **No inline edit** on the rows. To revalidate or clear, the user goes to the work item's detail page.

- **No reassignment** of a blocker from this page.

- **No bulk "clear all".**

- **No sort / column-sort headers** — row order within a group is insertion order.

- No unbounded rendering beyond 100 blocker rows - grouped tables must paginate, virtualize, or otherwise cap visible rows once the result set exceeds 100.

#### Interactions

| **Action**                                  | **Effect**                                                                                               |
|---------------------------------------------|----------------------------------------------------------------------------------------------------------|
| Toggle Show only active                     | Re-filters all groups.                                                                                   |
| Click the work-item title in a group header | Navigate to /work-items/{wiId}.                                                                          |
| **Click + New Blocker**                     | Opens NewBlockerDialog. On submit, creates the blocker and (if needed) updates the WI status to Blocked. |

#### States

- **Loading:** 5-row shimmer.

- **No blockers:** EmptyState with "All clear! Create a blocker if work gets stuck." + + New Blocker action.

- **No completable WIs in the picker:** the New Blocker dialog still opens; the picker shows only non-Complete items.

### f.6 — Links (/links)

**Purpose:** Cross-WI view of external links (RITM / INC / ADO / CRF / AskMe), grouped by work item.

### Layout (top → bottom)

1.  PageHeader with **+ New Link** action.

2.  **Two-column grid** of work-item cards. Each card has an ice-tinted header (links to /work-items/{id}) and a list of links underneath.

3.  LinkDialog (shared, see d.6).

**Data dependencies:** useLinks, useWorkItems, useLinkMutations.

#### MUST include

- Per-link row: type badge (color from linkTypeColor), display name from deriveLinkDisplayName, external-link icon, normalized number on the right (hidden \< sm), Edit and Delete icon buttons.

Parent completion filter: by default, the global Links page excludes links whose associated Work Item has complete === true or status in { Complete, Descoped }. Links remain attached to the Work Item record for historical detail views.

- Anchor href built via buildLinkUrl, opens in a new tab with rel="noopener noreferrer".

- Delete confirmation prompt; on confirm: remove.mutate(linkId).

Create/update must enforce normalized linkType + normalized number uniqueness before saving. Duplicate submissions keep the dialog open and show a user-facing validation error.

- \+ New Link opens LinkDialog with no fixedWorkItemId, so the user must pick a work item.

#### MUST NOT include

- **No "copy URL" affordance** — the link itself is the click target.

- **No "move to another work item" action** — to re-parent, edit the link and change the Work Item select.

- **No type re-derivation prompts** if the saved type doesn't match the number format — the LinkDialog's save logic is the only validator.

- **No bulk delete / multi-select.**

- **No grouping toggles** (only grouped-by-WI view).

- **No raw URL field.**

#### Interactions

| **Action**                     | **Effect**                                        |
|--------------------------------|---------------------------------------------------|
| Click the WI header in a group | Navigate to /work-items/{wiId}.                   |
| Click the link name            | Opens the resolved URL in a new tab.              |
| Click Pencil                   | Opens LinkDialog in edit mode.                    |
| Click Trash                    | Confirmation prompt → remove.mutate.              |
| **Click + New Link**           | Opens LinkDialog in create mode (with WI picker). |

#### States

- **Loading:** 5-row shimmer.

- **Empty:** EmptyState "No links yet" + + New Link action.

- **Unknown WI in group header:** label reads "Unknown" (no link).

### f.7 — Releases view (/releases)

**Purpose:** Work-items-by-release reading view, grouped first by release type, then by release.

### Layout (top → bottom)

1.  PageHeader with **+ New work item** action (creates with no release pre-set).

2.  **One large table** with three header tiers:

    - **Release-type header row** (plum tinted, full-width) — one per type that has at least one release.

    - **Release sub-header row** (muted, full-width) — per release, with title, formatted date, item count, and a **+ Add work item** button that opens WorkItemDialog with defaultReleaseId set.

    - **Work-item rows** — columns: Release (small text), Status badge, Title, Assigned, Size, Goal.

3.  **"No Release" section** at the bottom — only rendered if there is ≥1 work item with releaseId === null.

4.  WorkItemDialog reused for both header-level and per-release "+ Add".

**Data dependencies:** useReleases, useWorkItems, useCategories, usePersons, useWorkItemMutations (create only).

#### MUST include

- active releases only.

- Type order is fixed: PGT → BreakFix → Other. Types with zero active releases are omitted entirely.

- Within a type, releases sorted by date ascending (OnGoing releases sort with empty-string → first in the type group).

- OnGoing releases render the date column as formatReleaseDate(null) === "OnGoing".

- Per-release sub-header includes a "+ Add work item" button that opens WorkItemDialog with that release pre-selected.

- Empty release block: a row reading "No items slotted into this release yet."

- Goal-date color rules consistent with the Work Items table.

#### MUST NOT include

- **No editing / delete** of releases on this page (use /releases-md).

- **No editing of work items inline** (clicking a row navigates to detail).

- **No filters** (status / category / assignee). Use /work-items for filtering.

- **No completed-only / past-only toggles** — all active releases are listed, regardless of date.

- **No grouping by category or assignee** on this page.

- **No drag-and-drop.**

- **No CSV / export.**

#### Interactions

| **Action**                              | **Effect**                                                |
|-----------------------------------------|-----------------------------------------------------------|
| Click a WI row                          | Navigate to /work-items/{id}.                             |
| **Click page-level + New work item**    | Opens WorkItemDialog with defaultReleaseId = null.        |
| **Click a per-release + Add work item** | Opens WorkItemDialog with defaultReleaseId = r.releaseId. |
| Click the "No Release" Add button       | Opens WorkItemDialog with defaultReleaseId = null.        |

#### States

- **Empty (no active releases):** EmptyState "No active releases. Create one in Core Data → Releases." (no action button).

- **Empty release block:** in-row note as above.

### f.8 — Categories CRUD (/categories)

Group: **Core Data**.

**Purpose:** Manage CategoryMD rows.

#### Layout

- PageHeader with **+ New Category** action.

- 3-column responsive grid of cards (1 / 2 / 3 cols at sm / md / lg).

- Each card: name + longName, Development / CAPEX / Active badges, Edit icon, and an Inactivate/Reactivate lifecycle control.

- CategoryDialog.

#### MUST include

- Both create and edit through CategoryDialog.

- Inactivate confirmation prompt when setting active = false; reactivate does not require destructive confirmation.

- Empty state when no rows.

#### MUST NOT include

- No hard delete or cascade behavior on inactivation

- **No drag-to-reorder.**

- **No CSV import.**

- **No bulk operations.**

- No hard-delete quick action on the card

#### Interactions

| **Action**               | **Effect**                           |
|--------------------------|--------------------------------------|
| **Click + New Category** | Opens dialog in create mode.         |
| Click Pencil             | Opens dialog in edit mode.           |
| Click Trash              | Confirmation prompt → remove.mutate. |

### f.9 — Blocker Types CRUD (/blocker-types)

Group: **Core Data**.

**Purpose:** Manage BlockerMD (name + days cadence).

#### Layout

- PageHeader with **+ New Type** action.

- 3-column responsive grid of cards.

- Each card: name, cadence badge "Re-validate every N day(s)", Active badge, Edit icon, and Inactivate/Reactivate lifecycle control.

- Cards rendered via sortBlockerTypesForDialog (Hard → Soft → Potential, then alpha).

- BlockerTypeDialog.

#### MUST include

- days field clamped to Math.max(1, Math.floor(days)) on save.

- Sort applied to the list, not just the dialog.

#### MUST NOT include

- No hard delete or cascade behavior on inactivation - existing blockers keep their blockerTypeId; inactive types still resolve historical labels.

- **No color picker** (blocker type color is fixed to the plum family).

- **No drag-to-reorder** (sort is the deterministic helper).

- No destructive delete - BlockerMD uses active/inactive lifecycle state.

### f.10 — People CRUD (/people)

Group: **Core Data**.

**Purpose:** Manage the PersonsCD directory with a pending-enrichment workflow.

#### Layout

- PageHeader with **+ New Person** action.

- App-wide toast region below the header, using the shared toast system.

- 3-column responsive grid of cards.

- Per card: PeopleChip (row variant), role / active / pending badges, and **one** icon button on the right — either X (if pending) or Pencil (if enriched).

- PersonDialog.

- Custom pending-row removal / enriched-person inactivation dialog (d.11).

#### MUST include

- Create-mode dialog accepts **only** email; Title and role are stored empty and rendered as "Pending enrichment".

- Edit-mode dialog allows editing Name / Email / Role / Active.

- Email validation is driven by AppSettings.enforceEmailDomain and AppSettings.allowedEmailDomains. The default seed allows @pepsico.com.

- The pending state visual: .pending-row (muted background + opacity 0.6) on the card, child wrapped in .pending-content (pointer-events-none).

- Polling: usePersons auto-refetches every 3s while ≥1 row is pending.

- Delete UI:

  - For pending rows: only an X button (no Pencil).

  - For enriched rows: Pencil plus lifecycle Active/Inactive control; no hard delete.

- Pending-row confirm dialog (d.11) removes only unenriched rows; enriched-person inactivation updates active = false

#### MUST NOT include

- **No name / role fields in create mode** (those are enrichment-only).

- No hard-coded @pepsico.com-only rule; domain enforcement is settings-driven

- No direct hard delete on enriched people

- **No bulk add** from a paste-in list of emails.

- **No avatar upload** (avatar is the deterministic 7-family palette in PeopleChip).

- **No "resend enrichment"** button — enrichment is the responsibility of the Power Automate flow, not the UI.

#### Interactions

| **Action**                  | **Effect**                                                                                                                                                                   |
|-----------------------------|------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| **Click + New Person**      | Opens dialog (create mode); on submit, mutation creates row with empty Title/role; polling kicks in.                                                                         |
| Click Pencil (enriched row) | Opens dialog in edit mode.                                                                                                                                                   |
| Click X (pending row)       | Opens Remove pending person? confirm; on confirm, removes only the unenriched pending row.                                                                                   |
| Click Cancel in confirm     | Dismisses dialog, no mutation.                                                                                                                                               |
| Click Remove in confirm     | Pending rows: remove the unenriched row and invalidate persons. Enriched rows are not hard-deleted; lifecycle changes set active = false and preserve historical references. |

#### States

- **Pending enrichment:** card has pending-row styling, shows spinner inside the PeopleChip, and a grain "Pending enrichment" badge.

- **Toast (success):** green-100 background, green-500 text, auto-dismiss after 4s.

### f.11 — Releases CRUD (/releases-md)

Group: **Core Data**.

**Purpose:** Manage ReleasesCD rows, grouped by type.

#### Layout

- PageHeader with **+ New Release** action.

- Single table with two header tiers:

  - **Type header row** (plum tinted) per type with at least one release. Order: PGT → BreakFix → Other.

  - **Release rows** sorted: OnGoing (null) first, then date ascending.

- Columns: Title, Date, Type badge, Status (Active / Inactive), Actions (Pencil + Inactivate/Reactivate).

- ReleaseDialog.

#### MUST include

- OnGoing rendering: Infinity icon + bold "OnGoing" in the Date column when r.date === null.

- OnGoing toggle on the dialog clears + disables the Date field; saving with toggle ON writes date: null.

- Inactivate confirmation prompt when setting active = false; reactivate does not require destructive confirmation.

- Type-grouped layout that hides empty-type rows entirely.

#### MUST NOT include

- No hard delete or cascade behavior on inactivation - work items keep their releaseId;

- **No bulk operations.**

- **No "clone release".**

- **No release-type creation** — the three types (PGT / BreakFix / Other) are hard-coded.

- **No change-history view.**

#### Interactions

| **Action**               | **Effect**                                                                                                     |
|--------------------------|----------------------------------------------------------------------------------------------------------------|
| **+ New Release**        | Opens ReleaseDialog in create mode.                                                                            |
| Pencil                   | Opens dialog in edit mode.                                                                                     |
| Inactivate               | Confirmation prompt -\> update active = false. Reactivate sets active = true without destructive confirmation. |
| Toggle OnGoing in dialog | Clears date and disables the Date field while ON.                                                              |

### f.12 — Not Found (\*)

**Purpose:** Graceful fallback for bad URLs.

#### MUST include

- Centered compass icon, "Page Not Found" title, explanatory paragraph.

- **Go to Dashboard** button navigating to /.

#### MUST NOT include

- No automatic redirect (the user clicks the button).

- No error reporting / telemetry on this page (the actual error path is the AppErrorBoundary).

### f.13 — Layout / Navigation chrome (every page)

**Purpose:** App shell — sidebar on desktop, chip bar on mobile, header, and main outlet.

#### MUST include

- Desktop sidebar (md+): sticky, full-height, Blue-500 background, sparkles tile + brand mark + "Workspace" subtitle.

- Three top-level leaves: Dashboard, Work Items, Planning.

- Two collapsible groups: **Views** (Blockers, Links, Releases) and **Core Data** (Categories, Blocker Types, People, Releases).

- Group auto-expansion: a group is expanded when the current path starts with any of its children's paths.

- Active item style: .nav-item-active (mix(white 14%, Blue-500) background + 3px Blue-200 left border, white text, semibold).

- Mobile chip bar: scrolls horizontally, shows all leaves flattened, active chip uses bg-primary text-primary-foreground.

- Sidebar footer tip card: "Use Planning to drag items across statuses. Blocked items unlock once you clear their blockers."

- The main outlet centers at max-w-[1400px] with horizontal padding px-4 md:px-8 and vertical py-6 md:py-8.

#### MUST NOT include

- **No user avatar / login** chrome — no auth UI.

- **No global search bar** in the header. Search is per-page (Work Items only).

- No notification bell or persistent toast tray. The app must still provide an application-wide toast system for transient success/error/warning/info messages.

- **No theme toggle** in the sidebar.

- **No "new item" global FAB** — creation lives on its respective pages.

- **No persisted group-expansion** across reloads (it's derived from the current URL).

### f.14 — Universal exclusions (cross-page)

In addition to the per-page exclusions above, the following actions / surfaces are NOT part of this app:

1.  Deleting Work Items. Once created, work items persist; if a WI is irrelevant, set its status to Descoped (the current deferred terminal state).

2.  **Deleting Blockers.** Clearing (blockerActive: false) is the only "removal" path — history is preserved.

3.  **Editing Blocker logged / lastValidated directly.** Both are stamped by the dialogs; not user-editable.

4.  **Editing priorStatus** anywhere.

5.  **Editing lastChanged** anywhere.

6.  **Free-form URL links** — every Link goes through the type + number + helper-derived URL pipeline.

7.  **User authentication / authorization UI. No login, profile management, or per-row permission editor is included; however, audit events must capture actor identity from the hosting/authenticated context when available.**

8.  **Multi-tenancy / workspaces.** A single dataset for the whole app.

9.  **Localization / i18n.** English-only copy, US date format via toLocaleDateString.

10. **Real-time collaboration / presence** indicators.

11. **Export to CSV / Excel / PDF.**

12. Custom fields / extensibility - the core entities and their fields are fixed unless the requirements are revised.

13. **Blocker-specific or global discussion threads. Comments are Work Item-scoped in this version; activity history is system-generated, not a free-form social feed.**

14. **Attachments / file uploads.**

15. **Email or Teams notifications** — enrichment for People runs out-of-band; the UI itself never sends a message.

## (g) Common Elements & Shared Component Inventory

The goal of this section is to define which UI surfaces are app-aware shared components and where they live, so every page consumes a single source of truth.

### g.0 — Folder taxonomy

src/

components/

system/ ← generic, app-agnostic UI primitives (Shimmer, EmptyState, etc.)

common/ ← app-aware shared components (badges, chips, day-remaining cells, surface headers, status select)

work-items/ ← work-item feature components (dialog)

blockers/ ← blocker feature components (dialogs)

links/ ← link feature components (dialog)

ui/ ← shadcn primitives

lib/ ← pure helpers, hooks, constants

pages/ ← route components

### Rules of the road

- components/system/ = primitives with **zero** knowledge of the data model (Shimmer, Field, EmptyState, PageHeader, AppProviders, AppErrorBoundary).

- components/common/ = primitives that **do** know about the data model (e.g. "given a WorkItem, render its goal-date cell").

- components/\<feature\>/ = feature-scoped dialogs (WorkItemDialog, BlockerDialogs, LinkDialog).

### g.1 — Shared component catalog

Grouped by responsibility. Each component is small, prop-driven, and stateless (unless flagged "with state").

### System primitives (components/system/):

- PageHeader

- Field

- EmptyState

- Shimmer, CardShimmer, RowShimmer

- StatusDonut

- CategoryBar

- PeopleChip

- PersonPicker

- AppProviders

- AppErrorBoundary

### Badges & pills (components/common/):

- StatusBadge.tsx — props: value: StatusValue. Wraps Badge + statusColor.

- SizeChip.tsx — props: value: SizeValue \| null, size?: "sm" \| "md". Returns null when value is null.

- ReleaseTypePill.tsx — props: type: ReleaseType.

- LinkTypePill.tsx — props: type: LinkType.

- BlockerStatusBadge.tsx — props: blocker: Blocker. Internally calls blockerBadgeStatus + blockerBadgeClass.

- ActiveBadge.tsx — props: active: boolean. "Active" / "Inactive".

- WorkItemBadges.tsx — props: item: WorkItem, category?: CategoryMD. Renders Size, BRF, Development, CAPEX, Complete in the canonical order.

### Cells & inline content:

- DaysRemaining.tsx — props: goalDate: string \| null, variant?: "inline" \| "badge". Single source of truth for the color thresholds (\< 0 red, ≤ 7 yellow, else muted).

- GoalDateCell.tsx — props: goalDate: string \| null. Renders "MM/DD/YYYY (3d left)" styled per DaysRemaining.

- MetaRow.tsx — props: label: string, children. The small uppercase-label / value pattern on detail pages and dialogs.

### Surfaces & headers:

- SurfaceHeader.tsx — props: surface: "plum" \| "ice" \| "fresh" \| "grain" \| "neutral", title, right?, optional href (renders title as a RouterLink w/ external-link affordance).

- WorkItemGroupCard.tsx — props: workItemId, title, tone, right?, children. Wraps a Card with the tinted top strip used on /blockers and /links.

- SwimlaneHeader.tsx — props: icon, title, meta?, right?. The sticky planning swimlane bar.

### Inputs & filters:

- SearchInput.tsx — props: value, onChange, placeholder?.

- FilterChip.tsx — props: label, active, colorClass?, onClick.

- FilterChipRow.tsx — props: label, options, activeKey, onToggle, empty?.

- ActiveFilters.tsx — props: chips: { key; label; onRemove }[], onClearAll?.

- ToggleGroupPills.tsx — props: options: { key; label }[], value, onChange. The "By category / By release" pair.

### Glance & summary:

- KpiTile.tsx — props: label, value, icon, gradient: "primary" \| "ice" \| "leaf" \| "paprika" \| "plum" \| "grain", onClick. Keyboard-activatable.

### Link rendering:

- LinkRow.tsx — props: link: Link, compact?: boolean. Renders the type pill + anchor + number, using buildLinkUrl internally.

### Auto-save plumbing:

- SaveStateIndicator.tsx — props: state: "idle" \| "pending" \| "saving" \| "saved" \| "error", onRetry?: () => void. **Stateless.**

- InlineStatusSelect.tsx — *with state.* Props: value: StatusValue, lockedReason?: string, onCommit: (next: StatusValue) => Promise\<void\> \| void, debounceMs?: number (default 1200). Owns the debounce + the state machine and renders SaveStateIndicator inline.

### Confirmations & toasts:

- ConfirmDialog.tsx — props: open, onOpenChange, title, body?, confirmLabel?, destructive?: boolean, onConfirm.

- useConfirm.tsx — imperative wrapper exposing confirm({ title, body, destructive, confirmLabel }) returning Promise\<boolean\>. Used by every destructive prompt in the app.

- ToastBanner.tsx — props: tone: "success" \| "info" \| "warning" \| "destructive", message, onDismiss?.

ErrorState.tsx — props: title, message, retryLabel?, onRetry?. Used for page-level load failures and unrecoverable data states.

ValidationSummary.tsx — props: issues: { severity, field?, message }[]. Displays blocking errors, warnings, and informational notices in a consistent order.

CommentPanel.tsx — props: workItemId, comments, onCreate, onUpdate, onInactivate. Owns inline comment composer behavior.

ActivityTimeline.tsx — props: entityType, entityId, events. Renders audit events newest first with actor, action, timestamp, and concise field-change text.

### Navigation:

- BackLink.tsx — props: to, label.

### g.2 — Page-by-page expected usage

| **Page**                           | **Shared components used**                                                                                                                                                    |
|------------------------------------|-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| Dashboard (/)                      | KpiTile (×4), StatusBadge, ReleaseTypePill, BlockerStatusBadge, MetaRow                                                                                                       |
| Work Items (/work-items)           | SearchInput, FilterChipRow (×3), ActiveFilters, ToggleGroupPills, SurfaceHeader (group rows), StatusBadge, SizeChip, ReleaseTypePill, GoalDateCell                            |
| Work Item Detail (/work-items/:id) | BackLink, InlineStatusSelect, SaveStateIndicator, WorkItemBadges, MetaRow (×6+), BlockerStatusBadge, LinkRow, StatusBadge, SizeChip, ReleaseTypePill, GoalDateCell            |
| Planning (/planning)               | SwimlaneHeader, StatusBadge, SizeChip, ReleaseTypePill, GoalDateCell, SaveStateIndicator (inside InlineAssigneePicker), LinkRow (quick-look), BlockerStatusBadge (quick-look) |
| Blockers (/blockers)               | WorkItemGroupCard, BlockerStatusBadge, ConfirmDialog (via useConfirm)                                                                                                         |
| Links (/links)                     | WorkItemGroupCard, LinkRow, ConfirmDialog                                                                                                                                     |
| Releases view (/releases)          | SurfaceHeader (type header), StatusBadge, SizeChip, GoalDateCell, ReleaseTypePill                                                                                             |
| Categories (/categories)           | ActiveBadge, ConfirmDialog                                                                                                                                                    |
| Blocker Types (/blocker-types)     | ActiveBadge, ConfirmDialog                                                                                                                                                    |
| People (/people)                   | ToastBanner, ActiveBadge, ConfirmDialog                                                                                                                                       |
| Releases CRUD (/releases-md)       | SurfaceHeader, ReleaseTypePill, ActiveBadge, ConfirmDialog                                                                                                                    |

### g.3 — Page-local components (must remain page-scoped)

Not every repeated visual block deserves extraction. The following must remain local to their page:

- **Planning WorkItemCard** — deeply coupled to drag-and-drop hooks, pointer gesture math, and the assignee chip portal logic.

- **Planning WorkItemDetailsDialog** — single consumer; large; specific to the Kanban quick-look gesture.

- **SubtaskDialog** — inherits parent context (category + release) that does not generalize.

- **NewBlockerDialog** (Blockers page) — has the work-item picker (unlike LogBlockerDialog).

- **Layout sidebar / mobile chip nav** — single consumer (the root layout). The nav config is the variability point, not the chrome.

### g.4 — Naming, prop, and styling conventions

1.  **Naming.** PascalCase filename matches the default export. No "Shared" / "Common" prefix on the component name itself — the folder communicates that.

2.  **Props.** Use data-model types directly (StatusValue, Blocker, WorkItem, etc.) rather than restating fields. Boolean props default to false.

3.  **Class composition.** Always cn("base classes", className) so callers can extend.

4.  **No data fetching.** common/ components never call hooks like useWorkItems. The parent passes the data in.

5.  **No router knowledge** except for components that explicitly take to?: string props (BackLink, SurfaceHeader with optional href).

6.  **Single source of truth for styling.** Components must use the existing helpers (statusColor, sizeColor, releaseTypeColor, linkTypeColor, statusGroupSurface). Never restate Tailwind class strings inline.

7.  **A11y.** Every interactive shared component must accept aria-label / aria-labelledby props; clickable cards (KpiTile) must include role="button" + Enter/Space handlers.

8.  **Stateless by default.** Stateful exceptions are explicitly enumerated above (InlineStatusSelect, useConfirm).

## (h) Storage / Backend - Persistent Shared Data Layer

Backing store: WorkTrack assumes a persistent shared database layer. The application must not rely on browser-local storage as the authoritative store.

Generic canonical model: requirements must describe generic entities, fields, relationships, and lifecycle rules. SharePoint-specific terminology is implementation mapping guidance only.

Shared data: the dataset is shared across users. Views may support optional @me filters, but @me filtering must not create per-user copies or change the canonical data.

Technology neutrality: do not tightly couple the logical requirements to a specific database product. Implementation may map to SharePoint lists, SQL tables, Dataverse tables, or another persistent backend if the contract is preserved.

Settings: AppSettings is a shared configuration entity. It stores fallback assignee, email-domain enforcement, allowed domains, default page size, and related application-level defaults.

Seed data: seed data is handled as a separate export task. The app must not auto-seed production or empty environments without an explicit import/export operation.

SharePoint appendix: when implemented in SharePoint, map Title fields, Choice\<T\> values, nullable dates, and lookup ids carefully, but do not make SharePoint field names the only canonical language in the core requirements.

Audit and comment records are part of the shared persistence layer. They must not be stored only in client state, browser storage, or transient UI memory.

| Field               | Type           | Required    | Default                                    | Notes                                                                                                             |
|---------------------|----------------|-------------|--------------------------------------------|-------------------------------------------------------------------------------------------------------------------|
| settingsId          | string         | yes         | app-settings                               | Primary key for the shared settings row.                                                                          |
| fallbackPersonId    | string \| null | conditional | p-michael in seed export                   | Preferred FK to PersonsCD.personId for fallback ownership workflows.                                              |
| fallbackPersonEmail | string \| null | conditional | michael.girardi@pepsico.com in seed export | Fallback email used when personId cannot be resolved. Must be configurable.                                       |
| enforceEmailDomain  | boolean        | yes         | true                                       | When true, Person email validation uses allowedEmailDomains.                                                      |
| allowedEmailDomains | string[]     | yes         | ["pepsico.com"]                          | Allowed email domains for Person create/edit and add-person picker flows.                                         |
| defaultPageSize     | number         | yes         | 100                                        | Maximum visible list size before pagination/virtualization.                                                       |
| active              | boolean        | yes         | true                                       | Allows the settings row to follow common active/inactive patterns if future multi-settings support is introduced. |

## (i) Non-functional Requirements (a11y, performance, motion, responsiveness)

Accessibility: all interactive controls must be keyboard reachable, have accessible names, and preserve visible focus states. Keyboard shortcuts are not finalized and remain an open question in section (j).

Performance: list/table views must not render more than 100 visible records at once. When the result set exceeds 100 records, use pagination, virtualization, or an equivalent bounded-rendering approach.

Browser support: support modern evergreen browsers only (current Microsoft Edge, Chrome, Safari, and Firefox). Legacy browsers, Internet Explorer, and compatibility modes are out of scope.

Responsive behavior: the design is desktop-centric and modern-browser-first. Layouts must reflow gracefully for narrower screens, with mobile CSS support as needed, but mobile is not the primary product target.

Motion: honor prefers-reduced-motion by collapsing transitions/animations to effectively instant motion.

Print/export: print, CSV, Excel, and PDF export functionality are out of scope for this version unless explicitly added through a future requirement.

State consistency: no optimistic UI should leave the rendered state divergent from the shared backend state after a failed mutation. Errors must be surfaced through the app-wide toast system or an inline error where appropriate.

Failed saves must preserve user-entered form state wherever practical. The user must be able to retry or cancel without silently losing typed input.

## (j) Open Questions / Decisions Needed

| Decision                          | Current status | Notes / impact                                                                                                                                                                      |
|-----------------------------------|----------------|-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| Sub-task depth limit              | Open           | No final decision. Until resolved, prevent self-parenting and consider limiting nesting in implementation to avoid recursive UI issues.                                             |
| Release auto-hide threshold       | Open           | No final decision. Do not hard-code a past-release threshold or automatic hide rule beyond OnGoing/current/future basics until resolved.                                            |
| Planning Kanban column visibility | Open           | No final decision. The six-column default is provisional. Confirm whether Complete, Descoped/Deferred, or other columns should be shown/hidden.                                     |
| Keyboard shortcuts                | Open           | General keyboard accessibility is required; dedicated shortcut keys are not finalized.                                                                                              |
| Deferred vs. Descoped terminology | Open           | Q&A uses Deferred; current status enum uses Descoped. Current aligned requirement treats Descoped as the deferred terminal state and sets complete = true, pending naming decision. |

### Open items retained from Q&A alignment

- Sub-task depth limit — no final decision. Until resolved, the UI must prevent self-parenting and circular parentage, but may allow only one visible parent/child level.

- Release auto-hide threshold — no final decision. Any auto-hide behavior must remain easy to disable or revise without changing the release data model.

- Planning Kanban column visibility — no final decision. The current column model remains documented, but hidden/visible status columns may be revisited.

- Keyboard shortcuts — no final decision. Base keyboard accessibility is required; app-specific accelerator shortcuts remain open.

- Deferred vs. Descoped terminology — the current model treats Descoped as the deferred terminal state; confirm whether the product label should remain Descoped or change to Deferred.

- Reopening Complete or Descoped work items — not approved for v1. Until explicitly decided, the UI must not provide a direct user-facing transition out of Complete or Descoped.

## (k) Additional Layered Requirements - Status, Audit, Comments, Data Quality, Error Handling

This section layers in additional requirements approved after the Q&A alignment pass. These requirements clarify and extend sections (c), (e), (f), (g), (h), and (i). Where a prior exclusion conflicts with this section, this section controls.

### k.1 - Status transition model

Status changes must be governed by a central transition model. UI controls, drag-and-drop behavior, dialogs, and backend mutations must use the same rules rather than reimplementing status logic per page.

- Required helper: canTransitionStatus(workItem, nextStatus, context) => { allowed: boolean; severity?: "blocking" \| "warning" \| "info"; reason?: string }.

- Every successful status change must create an ActivityLog event with old status, new status, actor, timestamp, and source.

- Blocked remains system-mediated: users cannot select Blocked directly. The only path into Blocked is logging an active blocker; the only path out is clearing all active blockers.

- Complete and Descoped both set complete = true. Descoped is the current deferred terminal state unless the terminology decision changes in section (j).

- Parent completion guard: a parent Work Item cannot be moved to Complete or Descoped while any child Work Item remains incomplete and not descoped.

| **Current status** | **Allowed next status**                      | **Rules / notes**                                                                                                        |
|--------------------|----------------------------------------------|--------------------------------------------------------------------------------------------------------------------------|
| Upcoming           | Assigned, Execution, Descoped                | Descoped sets complete = true. Moving beyond Upcoming may trigger planning warnings if assignee or goal date is missing. |
| Assigned           | Upcoming, Execution, Testing, Descoped       | Returning to Upcoming is allowed before execution starts. Descoped sets complete = true.                                 |
| Execution          | Assigned, Testing, Await Deploy, Descoped    | Blocked is not directly selectable; log a blocker to enter Blocked.                                                      |
| Testing            | Execution, Await Deploy, Hypercare, Descoped | Backward move to Execution is allowed for rework.                                                                        |
| Await Deploy       | Testing, Hypercare, Descoped                 | Backward move to Testing is allowed for failed validation or deployment delay.                                           |
| Hypercare          | Await Deploy, Complete, Descoped             | Complete requires child-completion guard to pass.                                                                        |
| Blocked            | Prior status only                            | Allowed only after all active blockers are cleared. Restore blocker.priorStatus or Execution as safety net.              |
| Complete           | None in v1                                   | Terminal in v1 unless a future reopening rule is approved.                                                               |
| Descoped           | None in v1                                   | Terminal deferred state in v1 unless a future reopening rule is approved.                                                |

### k.2 - Audit / activity history

WorkTrack must maintain an append-only activity history for significant changes. Activity history is not a user-editable discussion feed; it is system-generated evidence of what changed, when, and by whom.

| **Field**        | **Type**                     | **Requirement / notes**                                                                                                                        |
|------------------|------------------------------|------------------------------------------------------------------------------------------------------------------------------------------------|
| activityId       | string                       | Primary key, generated as act-{timestamp or backend id}.                                                                                       |
| entityType       | string                       | WorkItem, Blocker, Link, CategoryMD, BlockerMD, PersonsCD, ReleasesCD, AppSettings, or WorkItemComment.                                        |
| entityId         | string                       | Primary id of the changed entity.                                                                                                              |
| parentWorkItemId | string \| null               | Populated when the event should appear on a Work Item Activity timeline, including blocker/link/comment events.                                |
| actionType       | string                       | create, update, status-change, assign, release-change, inactivate, reactivate, comment-add, comment-edit, comment-inactivate, settings-change. |
| fieldName        | string \| null               | Changed field for field-level updates. Null for create or compound events.                                                                     |
| oldValue         | string \| null               | Human-readable prior value, redacted if needed.                                                                                                |
| newValue         | string \| null               | Human-readable new value, redacted if needed.                                                                                                  |
| actorPersonId    | string \| null               | Best available person id from the hosting/authenticated context.                                                                               |
| actorEmail       | string \| null               | Best available actor email; system events may use system/worktrack.                                                                            |
| timestamp        | ISO timestamp                | Full timestamp; unlike business dates, audit timestamps may use ISO datetime.                                                                  |
| source           | "ui" \| "import" \| "system" | Identifies the source of the change.                                                                                                           |

- Minimum audited events: Work Item create/edit/status/assignee/release/goal-date changes; Blocker log/revalidate/clear; Link create/update/inactivate; Comment add/edit/inactivate; reference data inactivate/reactivate; Settings changes.

- Activity must be retained even when a related entity is inactive, complete, descoped, or hidden from default views.

- Activity rows are append-only through the UI. The app must not expose edit/delete actions for ActivityLog records.

- Work Item Detail must render an Activity timeline newest first. Dashboard, list pages, and Kanban cards do not need to render full activity history.

### k.3 - Work Item comments / notes

WorkTrack must support Work Item-scoped comments for narrative context that does not belong in structured fields. Comments are intentionally narrower than attachments, chat, or a global feed.

| **Field**         | **Type**              | **Requirement / notes**                                                                                  |
|-------------------|-----------------------|----------------------------------------------------------------------------------------------------------|
| commentId         | string                | Primary key, generated as cmt-{timestamp or backend id}.                                                 |
| workItemId        | string                | Required FK to WorkItem.workItemId.                                                                      |
| body              | string                | Required plain text. Trimmed on save. Rich text, file attachments, and embedded images are out of scope. |
| createdByPersonId | string \| null        | Best available person id from hosting/authenticated context.                                             |
| createdByEmail    | string \| null        | Best available actor email.                                                                              |
| createdAt         | ISO timestamp         | Set on create.                                                                                           |
| modifiedAt        | ISO timestamp \| null | Set when body is edited.                                                                                 |
| active            | boolean               | False when a comment is inactivated. Comments are not hard-deleted through the UI.                       |

- Work Item Detail must include a Comments panel below the core detail panels. Comments render newest first by default.

- Users may add comments, edit their own recent comments if the implementation can identify ownership, and inactivate comments through a confirm prompt. If ownership cannot be reliably determined, editing may be limited to all-or-none by role/future auth requirements.

- Inactivated comments remain retained for audit/history but are hidden by default. The panel may show a compact "Show inactive comments" control if needed.

- Creating, editing, or inactivating a comment must create an ActivityLog event.

- Blocker-specific comments, @mentions, notifications, reactions, attachments, and rich text are out of scope for this version.

### k.4 - Data quality and validation severity

Validation rules must distinguish blocking errors from warnings and informational notices. Blocking errors prevent save. Warnings allow save but must be visible before or during save. Informational notices explain derived behavior without implying user error.

| **Rule area**                  | **Severity** | **Requirement**                                                                                                                                           |
|--------------------------------|--------------|-----------------------------------------------------------------------------------------------------------------------------------------------------------|
| Required title/body fields     | blocking     | Work Item title, Blocker title, Link normalized number, Release title, Category name, Blocker Type name, and Comment body cannot be blank after trimming. |
| Person email uniqueness        | blocking     | A Person email must be unique across active and inactive PersonsCD records after lowercase normalization.                                                 |
| Configurable email domains     | blocking     | When AppSettings.enforceEmailDomain is ON, person email domains must match AppSettings.allowedEmailDomains.                                               |
| Link uniqueness                | blocking     | linkType.Value + normalized number must be unique across active/non-deprecated Link records.                                                              |
| Parent completion guard        | blocking     | A parent Work Item cannot be saved as Complete or Descoped while any child item is incomplete and not descoped.                                           |
| Status guardrail               | blocking     | Blocked cannot be selected directly; direct attempts to set Blocked outside blocker logging must be rejected.                                             |
| Self/circular parentage        | blocking     | A Work Item cannot be its own parent, and circular parent relationships must be rejected.                                                                 |
| Assignee after planning start  | warning      | Moving a Work Item to Assigned or later without an assignee should warn but not block unless future role rules require it.                                |
| Goal date after planning start | warning      | Moving a Work Item to Execution or later without a goal date should warn but not block.                                                                   |
| Inactive reference data        | info         | Historical records may resolve inactive categories, releases, blocker types, or people. New pickers exclude inactive values.                              |
| Derived complete flag          | info         | Saving status Complete or Descoped sets complete = true and should be visible to the user as derived behavior.                                            |

- All dialogs and inline editors must use the same validation severity model. Avoid page-specific one-off validation copy unless the page has a unique context.

- ValidationSummary must display blocking items first, then warnings, then informational notices. Inline Field errors are still required for field-specific blocking validation.

- Normalization must run before uniqueness checks. This is especially important for links, person emails, and configurable email domains.

### k.5 - Error handling and failed-save behavior

The app must provide consistent, plain-language error handling for load, save, validation, conflict, and permission-like failures. Failed operations must not silently discard user input.

| **Scenario**                        | **User-facing behavior**                                                                                                                       |
|-------------------------------------|------------------------------------------------------------------------------------------------------------------------------------------------|
| Validation failed                   | Show inline Field errors and/or ValidationSummary. Do not submit the mutation until blocking errors are resolved.                              |
| Save failed                         | Keep the dialog/editor open, preserve typed values, show destructive/error toast, and provide Retry when practical.                            |
| Inline auto-save failed             | Revert visual saved state to error, keep the user-visible draft when safe, and show Retry near the edited control.                             |
| Load failed                         | Show page-level ErrorState with a retry action. Do not render misleading stale empty states as if no data exists.                              |
| Conflict / stale data               | If the backend reports a stale write or conflict, explain that the record changed elsewhere and ask the user to reload or retry after refresh. |
| Permission or configuration failure | Show plain-language explanation. For missing settings/fallback owner, route the user toward Settings when appropriate.                         |
| Network unavailable / timeout       | Show retryable error copy. Do not clear forms or navigate away automatically.                                                                  |
| Unexpected render error             | AppErrorBoundary displays safe fallback UI, posts structured ErrorMessage to window.parent, and offers Retry.                                  |

- Technical details may be logged to ActivityLog only when they describe a user/business event. Raw stack traces, internal IDs, and transport errors should be logged to implementation diagnostics, not shown directly to end users.

- Toasts are for transient feedback; persistent errors that block page use require ErrorState or inline validation. A toast alone is not sufficient for a failed page load.

- Mutation code should return structured error objects where practical: { code, message, field?, severity?, retryable? }.

- Import/export or backend batch operations must produce row-level error details when they fail validation, even though export itself remains out of scope for the core UI.

## (l) Copilot AppBuilder Agent Instructions — SharePoint Provisioning + App Build

### l.1 — Agent purpose

These instructions are intended for Microsoft Copilot's AppBuilder agent. The agent must use this requirements document as the source of truth for building WorkTrack v2.

The agent must perform three coordinated tasks:

1. **Provision a SharePoint site** for WorkTrack v2.
2. **Create the appropriate SharePoint lists** and columns needed by the WorkTrack v2 data model.
3. **Build the WorkTrack v2 application** against those lists using the functional, visual, lifecycle, validation, and non-functional requirements in this document.

If the AppBuilder agent cannot directly perform a provisioning action, it must generate the exact setup steps, schema definitions, and any required administrator-facing instructions rather than silently omitting the requirement.

### l.2 — Site provisioning instructions

Provision a dedicated SharePoint site for WorkTrack v2.

| **Item** | **Requirement** |
|---|---|
| Site name | WorkTrack v2 |
| Site purpose | Shared operational backlog, blocker, release, link, comment, and activity tracking |
| Site type | Team site or equivalent collaborative SharePoint site |
| Data ownership | Shared team data layer, not per-user storage |
| Permissions model | Members may contribute based on app role rules; viewers may read only; owners/admins manage lists, settings, and reference data |
| App hosting assumption | The application may be embedded under an arbitrary base path and may be hosted inside Microsoft 365 surfaces |
| Data persistence | SharePoint lists serve as the persistent backing store for this build unless the agent is explicitly instructed to use another database layer |

The SharePoint site must not be treated as a temporary seed/demo site. It is the persistent shared backing store for the application.

### l.3 — SharePoint implementation principles

The AppBuilder agent must follow these implementation principles:

- Use the **canonical requirements document** for behavior, UX, validation, and lifecycle rules.
- Use SharePoint lists as the backing data store, but keep the app model generic enough that it is not tightly coupled to SharePoint-specific terminology in the UI.
- Use SharePoint's built-in `ID` as the primary backend identifier where possible.
- When the app requires a string id, normalize SharePoint `ID` to a string in the app layer.
- Preserve SharePoint's built-in `Title` column where the requirements explicitly use `Title`, especially for `PersonsCD` and `ReleasesCD`.
- Do not expose destructive delete actions for lifecycle-managed master data. Use `Active` flags and inactivation/reactivation patterns.
- Do not auto-seed data on empty app load. Initial seed/import is a separate export/import task.
- Keep date-only business fields as local date values. Use DateTime only for audit timestamps, created/modified timestamps, and system activity history.
- Enforce validation and normalization before save, especially for links, email domains, parent/child relationships, and status transitions.
- Use SharePoint lookups for relationships where practical, but the app layer must work with normalized ids.

### l.4 — Required SharePoint lists

Create the following SharePoint lists. List display names may be user-friendly, but internal names should remain stable and predictable.

| **Display name** | **Suggested internal name** | **Purpose** |
|---|---|---|
| WorkTrack Categories | `WT_CategoryMD` | Category reference/master data |
| WorkTrack Blocker Types | `WT_BlockerMD` | Blocker type reference/master data and revalidation cadence |
| WorkTrack People | `WT_PersonsCD` | People/assignee reference data |
| WorkTrack Releases | `WT_ReleasesCD` | Release reference data and planning swimlanes |
| WorkTrack Work Items | `WT_WorkItems` | Primary backlog/work item records |
| WorkTrack Links | `WT_Links` | Supporting references to RITM, INC, ADO, CRF, and AskMe records |
| WorkTrack Blockers | `WT_Blockers` | Blockers associated with Work Items |
| WorkTrack Settings | `WT_AppSettings` | Application configuration and fallback/default behavior |
| WorkTrack Activity Log | `WT_ActivityLog` | Append-only audit/activity events |
| WorkTrack Comments | `WT_WorkItemComments` | Work Item-scoped comments/notes |

### l.5 — List schema: WorkTrack Categories (`WT_CategoryMD`)

| **Column** | **SharePoint type** | **Required** | **Notes** |
|---|---:|---:|---|
| Title | Single line of text | Yes | Short category name / abbreviation. Maps to `name`. |
| LongName | Single line of text | No | Longer display name. |
| Development | Yes/No | Yes | Default false. |
| CAPEX | Yes/No | Yes | Default false. |
| Active | Yes/No | Yes | Default true. Inactive categories remain for historical FK resolution but are excluded from new pickers. |

### l.6 — List schema: WorkTrack Blocker Types (`WT_BlockerMD`)

| **Column** | **SharePoint type** | **Required** | **Notes** |
|---|---:|---:|---|
| Title | Single line of text | Yes | Blocker type display name. Maps to `name`. |
| Days | Number | Yes | Revalidation cadence in days. Minimum 1. |
| Active | Yes/No | Yes | Default true. Inactive blocker types remain for history but are excluded from new blocker pickers. |

Required canonical blocker type rows should be provided through the separate seed/import task, not hard-coded into app startup:

- Hard — 1 day
- Soft — 2 days
- Potential — 3 days

### l.7 — List schema: WorkTrack People (`WT_PersonsCD`)

| **Column** | **SharePoint type** | **Required** | **Notes** |
|---|---:|---:|---|
| Title | Single line of text | Conditional | Full display name. May be blank during enrichment/pending state. |
| Email | Single line of text | Yes | Must be unique after lowercase normalization. Domain enforcement is settings-driven. |
| Role | Single line of text | Conditional | May be blank during enrichment/pending state. |
| Active | Yes/No | Yes | Default true. Inactive people are excluded from assignment pickers but remain for historical resolution. |

The app must support pending People rows where `Title` or `Role` is blank. Pending rows must render with pending state and must be re-queried according to the polling requirements in this document.

### l.8 — List schema: WorkTrack Releases (`WT_ReleasesCD`)

| **Column** | **SharePoint type** | **Required** | **Notes** |
|---|---:|---:|---|
| Title | Single line of text | Yes | Release display name. |
| ReleaseDate | Date only | Conditional | Null/blank means OnGoing. Required unless OnGoing is true. |
| OnGoing | Yes/No | Yes | True means ReleaseDate must be blank and the app renders OnGoing/∞. |
| ReleaseType | Choice | Yes | Choices: PGT, BreakFix, Other. |
| Active | Yes/No | Yes | Default true. Inactive releases are excluded from new pickers but still resolve historical Work Item relationships. |

### l.9 — List schema: WorkTrack Work Items (`WT_WorkItems`)

| **Column** | **SharePoint type** | **Required** | **Notes** |
|---|---:|---:|---|
| Title | Single line of text | Yes | Work Item title. |
| Description | Multiple lines of text | No | Plain text; preserve line breaks. |
| Status | Choice | Yes | Upcoming, Assigned, Execution, Testing, Await Deploy, Hypercare, Complete, Blocked, Descoped. Blocked is system-mediated, not directly selectable. |
| Size | Choice | No | XS, S, M, L, XL, XXL. |
| AssignedTo | Lookup to `WT_PersonsCD` | No | Assignee/person relationship. |
| AssignedDate | Date only | No | Set/cleared according to assignee rules. |
| GoalDate | Date only | No | Drives overdue/upcoming/needs-planning logic. |
| BRF | Yes/No | Yes | Default false. |
| Complete | Yes/No | Yes | Default false. Set true when status is Complete or Descoped. |
| Category | Lookup to `WT_CategoryMD` | No | Category relationship. |
| ParentItem | Lookup to `WT_WorkItems` | No | Parent/sub-task relationship. Must prevent self and circular parentage. |
| Release | Lookup to `WT_ReleasesCD` | No | Release relationship. |
| LastChanged | Date and time | No | Updated on every Work Item mutation. |
| Active | Yes/No | Yes | Default true if implemented. Do not use hard delete for operational history. |

The app must enforce the status transition matrix, parent completion guard, blocked guardrail, and derived `Complete` behavior described in this document.

### l.10 — List schema: WorkTrack Links (`WT_Links`)

| **Column** | **SharePoint type** | **Required** | **Notes** |
|---|---:|---:|---|
| Title | Single line of text | Yes | Derived display name. Do not allow user-typed arbitrary display name. |
| WorkItem | Lookup to `WT_WorkItems` | Yes | Parent Work Item. |
| LinkType | Choice | Yes | RITM, INC, ADO, CRF, AskMe. |
| Number | Single line of text | Yes | Normalized canonical id. |
| Active | Yes/No | Yes | Default true. Inactivate rather than hard-delete if lifecycle control is needed. |

The app must normalize link numbers before save and enforce uniqueness on `LinkType + Number` across active/non-deprecated link records.

### l.11 — List schema: WorkTrack Blockers (`WT_Blockers`)

| **Column** | **SharePoint type** | **Required** | **Notes** |
|---|---:|---:|---|
| Title | Single line of text | Yes | Blocker title. |
| WorkItem | Lookup to `WT_WorkItems` | Yes | Parent Work Item. |
| BlockerType | Lookup to `WT_BlockerMD` | Yes | Determines validation cadence. |
| Logged | Date only | Yes | Date blocker was created. |
| AssignedTo | Lookup to `WT_PersonsCD` | No | Defaults to Work Item assignee when possible. |
| LastValidated | Date only | Yes | Updated on revalidate and clear. |
| BlockerActive | Yes/No | Yes | True while active, false when cleared. |
| ExpectedResolution | Date only | Yes | Must be strictly after today on revalidate. |
| NextValidation | Date only | Yes | Derived from LastValidated + blocker type Days. |
| PriorStatus | Single line of text or Choice | Yes | Status to restore when final active blocker is cleared. |

Cleared blockers must remain retained for history. Do not expose a reopen action. If the issue recurs, users must create a new blocker.

### l.12 — List schema: WorkTrack Settings (`WT_AppSettings`)

| **Column** | **SharePoint type** | **Required** | **Notes** |
|---|---:|---:|---|
| Title | Single line of text | Yes | Use a single row titled `Default Settings` unless a future multi-profile model is approved. |
| FallbackPerson | Lookup to `WT_PersonsCD` | Yes | Configurable fallback person for blocker reassignment and safety-net behavior. |
| FallbackPersonEmail | Single line of text | Yes | Denormalized email for resilience and display. |
| EnforceEmailDomain | Yes/No | Yes | Controls whether person emails must match allowed domains. |
| AllowedEmailDomains | Multiple lines of text | Yes | Store one domain per line, for example `pepsico.com`. |
| DefaultPageSize | Number | Yes | Default 100. Used for pagination/virtualization threshold. |
| Active | Yes/No | Yes | Default true. |

The app must include a Settings page that reads/writes this list. Fallback assignee and email-domain enforcement must not be hard-coded.

### l.13 — List schema: WorkTrack Activity Log (`WT_ActivityLog`)

| **Column** | **SharePoint type** | **Required** | **Notes** |
|---|---:|---:|---|
| Title | Single line of text | Yes | Human-readable event summary. |
| EntityType | Choice or single line text | Yes | WorkItem, Blocker, Link, CategoryMD, BlockerMD, PersonsCD, ReleasesCD, AppSettings, WorkItemComment. |
| EntityId | Single line of text | Yes | Primary id of changed entity; SharePoint ID normalized to string is acceptable. |
| ParentWorkItem | Lookup to `WT_WorkItems` | No | Populated when event should appear on Work Item Activity timeline. |
| ActionType | Choice or single line text | Yes | create, update, status-change, assign, release-change, inactivate, reactivate, comment-add, comment-edit, comment-inactivate, settings-change. |
| FieldName | Single line of text | No | Changed field for field-level updates. |
| OldValue | Multiple lines of text | No | Human-readable previous value. |
| NewValue | Multiple lines of text | No | Human-readable new value. |
| ActorPerson | Lookup to `WT_PersonsCD` | No | Best available person from authenticated context. |
| ActorEmail | Single line of text | No | Best available email; system events may use `system/worktrack`. |
| EventTimestamp | Date and time | Yes | Full event timestamp. |
| Source | Choice | Yes | ui, import, system. |

ActivityLog is append-only through the app UI. Do not expose edit/delete actions for activity events.

### l.14 — List schema: WorkTrack Comments (`WT_WorkItemComments`)

| **Column** | **SharePoint type** | **Required** | **Notes** |
|---|---:|---:|---|
| Title | Single line of text | Yes | Short generated summary, such as first 60 characters of Body. |
| WorkItem | Lookup to `WT_WorkItems` | Yes | Parent Work Item. |
| Body | Multiple lines of text | Yes | Required plain text. Rich text, attachments, and embedded images are out of scope. |
| CreatedByPerson | Lookup to `WT_PersonsCD` | No | Best available person from authenticated context. |
| CreatedByEmail | Single line of text | No | Best available actor email. |
| CreatedAt | Date and time | Yes | Set on create. |
| ModifiedAt | Date and time | No | Set on edit. |
| Active | Yes/No | Yes | Default true. Inactivate rather than hard-delete. |

Creating, editing, or inactivating a comment must create an ActivityLog event.

### l.15 — Recommended SharePoint views

Create useful default views for administrators and troubleshooting. The app itself should control primary UX, but SharePoint list views should make data review practical.

| **List** | **Recommended views** |
|---|---|
| `WT_WorkItems` | All Items, Active Open Items, Blocked Items, Complete/Descoped Items, Needs Planning |
| `WT_Blockers` | Active Blockers, Revalidation Due, Cleared Blockers, All Blockers |
| `WT_Links` | Active Links, Links by Work Item, All Links |
| `WT_ReleasesCD` | Active Releases, OnGoing Releases, Inactive Releases |
| `WT_PersonsCD` | Active People, Pending Enrichment, Inactive People |
| `WT_ActivityLog` | Recent Activity, Activity by Work Item, Settings Changes |
| `WT_WorkItemComments` | Active Comments, Inactive Comments, Comments by Work Item |

### l.16 — App build instructions

After provisioning the SharePoint site and lists, build the WorkTrack v2 app using this requirements document.

The app must include these pages/routes:

| **Page / route** | **Build requirement** |
|---|---|
| Dashboard `/` | KPI tiles, charts, active blockers, upcoming goals, next release, needs planning navigation |
| Work Items `/work-items` | Search, URL filters, grouping, pagination/virtualization threshold, create dialog |
| Work Item Detail `/work-items/:id` | Status control, edit dialog, blockers, links, sub-tasks, comments, activity timeline |
| Planning Kanban `/planning` | Drag/drop planning by status and release, blocked guardrail, release swimlanes |
| Blockers `/blockers` | Grouped blocker list, active/default filtering, revalidation and clear actions |
| Links `/links` | Grouped link list, normalization, validation, link display helpers |
| Releases `/releases` | Release-grouped work items and release readiness context |
| Category MD `/categories` | Inactivate/reactivate category reference data, no hard delete |
| Blocker Type MD `/blocker-types` | Inactivate/reactivate blocker type reference data, no hard delete |
| People `/people` | Pending enrichment, inactivation/reactivation, no destructive delete for enriched people |
| Release MD `/releases-md` | Inactivate/reactivate releases, no hard delete |
| Settings `/settings` | Fallback person, email domain enforcement, allowed domains, default page size |

The app must implement:

- PepsiCo-themed visual system and design tokens from section (b).
- Shared components and helpers from section (c).
- Dialog/modal contracts from section (d).
- Data model and lifecycle rules from section (e).
- Page-level requirements from section (f).
- Storage/backend rules from section (h).
- Non-functional requirements from section (i).
- Open decisions from section (j), without inventing final decisions where the document marks them open.
- Additional layered requirements from section (k), especially status governance, audit log, comments, data quality severity, and error handling.

### l.17 — AppBuilder acceptance criteria

The AppBuilder agent's output is acceptable only if all of the following are true:

1. A dedicated SharePoint site or site setup plan is produced.
2. All required SharePoint lists are created or fully specified.
3. Required columns, data types, relationships/lookups, and choices are included.
4. AppSettings is implemented; fallback assignee and email-domain enforcement are not hard-coded.
5. Category, Release, Blocker Type, and enriched Person lifecycle uses Active/inactive state rather than hard delete.
6. The Work Item status transition matrix is implemented.
7. Blocked cannot be selected directly and can only be entered/exited through blocker lifecycle actions.
8. Parent Work Items cannot be completed/descoped while incomplete child items remain.
9. Link normalization and uniqueness are enforced.
10. Work Item comments are supported and create activity events.
11. ActivityLog records are created for significant events and are append-only through the UI.
12. The Work Items list does not render unbounded rows beyond the 100-item threshold; pagination or virtualization is required.
13. The app includes a Settings page.
14. The app includes consistent validation, toast, and error-handling behavior.
15. The app does not auto-seed data on empty load; seed/import remains a separate task.

### l.18 — Agent constraints and clarifications

- Do not resolve open questions by assumption. Where this document marks a decision as open, implement the safest neutral behavior or surface the decision for user confirmation.
- Do not remove requirements from earlier sections unless they are directly contradicted by this AppBuilder appendix. If a contradiction exists, prefer the latest explicit lifecycle and AppBuilder instructions in this section and flag the conflict.
- Do not build export/print features for v1.
- Do not add arbitrary external link entry. Links must use the controlled Link Type + Number model.
- Do not expose batch actions or bulk destructive operations.
- Do not implement dark mode or theme switching.
- Do not expose raw SharePoint list mechanics to ordinary app users unless needed for admin troubleshooting.
