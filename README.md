# WorkTrack v2

WorkTrack v2 is a Vite + React + TypeScript single-page app with TanStack Query-backed localStorage data, seeded WorkTrack entities, route-based navigation, and focused helper tests.

## Commands

- `npm run dev`
- `npm run lint`
- `npm run test`
- `npm run build`

## Backend-readiness seams

- Runtime persistence remains localStorage-backed.
- `src/lib/worktrack.ts` now exposes a `WorktrackStorageAdapter` contract and a `createPersistentStorageAdapterStub()` seam for future shared backends.
- UI pages still call query/mutation hooks and do not directly reference localStorage.

### Local entity mapping to a future persistent store

| Local entity | Local ID field | Planned persistent list | Planned persistent ID |
| --- | --- | --- | --- |
| `workItems` | `workItemId` | `WorkItems` | `WorkItemId` |
| `blockers` | `blockerId` | `Blockers` | `BlockerId` |
| `links` | `linkId` | `Links` | `LinkId` |
| `categories` | `categoryId` | `Categories` | `CategoryId` |
| `blockerTypes` | `blockerTypeId` | `BlockerTypes` | `BlockerTypeId` |
| `persons` | `id` | `People` | `PersonId` |
| `releases` | `id` | `Releases` | `ReleaseId` |
