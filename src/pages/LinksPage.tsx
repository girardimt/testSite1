import { useState } from 'react'
import { Link2 } from 'lucide-react'
import {
  type Link as WorkLink,
  useLinkMutations,
  buildLinkUrl,
} from '../lib/worktrack'
import {
  PageHeader,
  WorkItemLink,
} from '../lib/ui'
import { LinkEditor, groupBy, useReferenceData } from '../app/shared'

export function LinksPage() {
  const { workItems, links } = useReferenceData()
  const linkMutations = useLinkMutations()
  const [editing, setEditing] = useState<WorkLink | null>(null)
  const [open, setOpen] = useState(false)

  const grouped = groupBy(links, (link) => link.workItemId)

  return (
    <div className="page">
      <PageHeader
        icon={<Link2 size={24} />}
        title="Links"
        subtitle="Document and normalize cross-system references by work item."
        actions={
          <button type="button" className="primary-button" onClick={() => setOpen(true)}>
            New Link
          </button>
        }
      />

      <section className="card-grid">
        {Object.entries(grouped).map(([workItemId, items]) => {
          const workItem = workItems.find((entry) => entry.workItemId === workItemId)
          return (
            <article key={workItemId} className="card">
              <div className="group-header surface-ice">
                {workItem ? <WorkItemLink to={`/work-items/${workItemId}`} title={workItem.title} subtitle={workItemId} /> : <h2>{workItemId}</h2>}
              </div>
              <div className="stack">
                {items.map((link) => (
                  <div key={link.linkId} className="list-row static">
                    <div>
                      <span className={`badge badge-${link.linkType.toLowerCase()}`}>{link.linkType}</span>
                      <a href={buildLinkUrl(link.linkType, link.number)} target="_blank" rel="noreferrer">
                        {link.name}
                      </a>
                    </div>
                    <div className="row gap wrap">
                      <small>{link.number}</small>
                      <button type="button" className="secondary-button" onClick={() => setEditing(link)}>
                        Edit
                      </button>
                      <button
                        type="button"
                        className="secondary-button"
                        onClick={async () => {
                          if (window.confirm(`Delete ${link.name}?`)) {
                            await linkMutations.remove.mutateAsync(link.linkId)
                          }
                        }}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </article>
          )
        })}
      </section>

      <LinkEditor
        open={open || !!editing}
        onClose={() => {
          setOpen(false)
          setEditing(null)
        }}
        initial={editing || undefined}
        onSubmit={async (draft) => {
          if (editing) {
            await linkMutations.update.mutateAsync(draft)
          } else {
            await linkMutations.create.mutateAsync(draft)
          }
          setOpen(false)
          setEditing(null)
        }}
      />
    </div>
  )
}
