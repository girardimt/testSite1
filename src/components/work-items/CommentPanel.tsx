import { MessageSquare } from 'lucide-react'
import { useState } from 'react'
import {
  DEFAULT_APP_SETTINGS,
  formatDisplayDate,
  sortCommentsNewestFirst,
  type WorkItemComment,
  useCommentMutations,
  useSettings,
  useWorkItemComments,
} from '../../lib/worktrack'
import { Field } from '../system/Field'
import { Modal } from '../system/Modal'

const formatCommentTimestamp = (value: string) => {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? formatDisplayDate(value) : date.toLocaleString()
}

export function CommentPanel({ workItemId }: { workItemId: string }) {
  const commentsQuery = useWorkItemComments(workItemId)
  const settings = useSettings().data ?? DEFAULT_APP_SETTINGS
  const { addComment, editComment, inactivateComment } = useCommentMutations()
  const [newBody, setNewBody] = useState('')
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null)
  const [editingBody, setEditingBody] = useState('')
  const [pendingInactivation, setPendingInactivation] = useState<WorkItemComment | null>(null)

  const comments = sortCommentsNewestFirst((commentsQuery.data ?? []).filter((comment) => comment.active))

  return (
    <article className="card">
      <div className="card-header">
        <div>
          <h2>Comments</h2>
          <small>{comments.length} active comments</small>
        </div>
      </div>

      <div className="stack">
        <Field label="New comment">
          <textarea className="form-input" rows={4} value={newBody} onChange={(event) => setNewBody(event.target.value)} />
        </Field>
        <div className="comment-form__footer">
          <small>Posting as {settings.fallbackPersonEmail}</small>
          <button
            type="button"
            className="primary-button"
            disabled={!newBody.trim() || addComment.isPending}
            onClick={async () => {
              await addComment.mutateAsync({ workItemId, body: newBody })
              setNewBody('')
            }}
          >
            Add comment
          </button>
        </div>

        {comments.length ? (
          comments.map((comment) => {
            const isEditing = editingCommentId === comment.commentId
            return (
              <div key={comment.commentId} className="list-row comment-row" data-testid={`comment-row-${comment.commentId}`}>
                <div className="stack comment-content">
                  <strong>{comment.authorEmail}</strong>
                  <small className="comment-meta">
                    Created {formatCommentTimestamp(comment.createdAt)}
                    {comment.updatedAt !== comment.createdAt ? ` · Edited ${formatCommentTimestamp(comment.updatedAt)}` : ''}
                  </small>
                  {isEditing ? (
                    <>
                      <Field label="Edit comment">
                        <textarea className="form-input" rows={4} value={editingBody} onChange={(event) => setEditingBody(event.target.value)} />
                      </Field>
                      <div className="row gap wrap">
                        <button
                          type="button"
                          className="primary-button"
                          disabled={!editingBody.trim() || editComment.isPending}
                          onClick={async () => {
                            await editComment.mutateAsync({ commentId: comment.commentId, body: editingBody })
                            setEditingCommentId(null)
                            setEditingBody('')
                          }}
                        >
                          Save edit
                        </button>
                        <button
                          type="button"
                          className="secondary-button"
                          onClick={() => {
                            setEditingCommentId(null)
                            setEditingBody('')
                          }}
                        >
                          Cancel
                        </button>
                      </div>
                    </>
                  ) : (
                    <p className="comment-body">{comment.body}</p>
                  )}
                </div>
                {!isEditing ? (
                  <div className="row gap wrap comment-actions">
                    <button
                      type="button"
                      className="secondary-button"
                      onClick={() => {
                        setEditingCommentId(comment.commentId)
                        setEditingBody(comment.body)
                      }}
                    >
                      Edit
                    </button>
                    <button type="button" className="secondary-button" onClick={() => setPendingInactivation(comment)}>
                      Inactivate
                    </button>
                  </div>
                ) : null}
              </div>
            )
          })
        ) : commentsQuery.isLoading ? (
          <div className="muted-panel">Loading comments…</div>
        ) : (
          <div className="muted-panel comment-empty-state">
            <MessageSquare size={18} />
            <span>No active comments yet.</span>
          </div>
        )}
      </div>

      <Modal open={!!pendingInactivation} onClose={() => setPendingInactivation(null)} title="Inactivate comment">
        <div className="modal-form">
          <p>This keeps the comment for history but removes it from the active list.</p>
          <div className="row gap wrap">
            <button
              type="button"
              className="primary-button"
              disabled={!pendingInactivation || inactivateComment.isPending}
              onClick={async () => {
                if (!pendingInactivation) {
                  return
                }
                await inactivateComment.mutateAsync({ commentId: pendingInactivation.commentId })
                setPendingInactivation(null)
              }}
            >
              Inactivate comment
            </button>
            <button type="button" className="secondary-button" onClick={() => setPendingInactivation(null)}>
              Keep comment
            </button>
          </div>
        </div>
      </Modal>
    </article>
  )
}
