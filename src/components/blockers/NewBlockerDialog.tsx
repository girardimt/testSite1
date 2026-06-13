import type { WorkItem } from '../../lib/worktrack'
import { BlockerDialogBase } from './BlockerDialogBase'

export function NewBlockerDialog({
  open,
  onClose,
  workItem,
  onSubmit,
}: {
  open: boolean
  onClose: () => void
  workItem?: WorkItem
  onSubmit: (draft: { title: string; blockerTypeId: string; expectedResolution: string; assignedToId: string | null }, workItemId?: string) => Promise<void>
}) {
  return <BlockerDialogBase open={open} onClose={onClose} workItem={workItem} onSubmit={onSubmit} />
}
