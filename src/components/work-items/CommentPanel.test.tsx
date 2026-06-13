import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import { FALLBACK_EMAIL, loadDb } from '../../lib/worktrack'
import { CommentPanel } from './CommentPanel'

const renderPanel = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  })

  return render(
    <QueryClientProvider client={queryClient}>
      <CommentPanel workItemId="wi-1004" />
    </QueryClientProvider>,
  )
}

describe('CommentPanel', () => {
  beforeEach(() => {
    window.localStorage.clear()
  })

  it('renders active comments newest-first and supports add, edit, and inactivate flows', async () => {
    renderPanel()

    const newestSeeded = await screen.findByText('ServiceNow owner confirmed rotation is scheduled for tomorrow morning.')
    const olderSeeded = screen.getByText(
      'Credential request is open with the platform team. Waiting on updated secrets to resume testing.',
    )

    expect(screen.queryByText('Old follow-up note kept for history only.')).toBeNull()
    expect(newestSeeded.compareDocumentPosition(olderSeeded) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()

    fireEvent.change(screen.getByLabelText('New comment'), {
      target: { value: 'Ready for retry once secrets land.' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Add comment' }))

    await screen.findByText('Ready for retry once secrets land.')
    const addedCommentRecord = loadDb().comments.find((comment) => comment.body === 'Ready for retry once secrets land.')
    expect(addedCommentRecord?.authorEmail).toBe(FALLBACK_EMAIL)
    if (!addedCommentRecord) {
      throw new Error('Added comment record not found')
    }

    fireEvent.click(within(screen.getByTestId(`comment-row-${addedCommentRecord.commentId}`)).getByRole('button', { name: 'Edit' }))
    fireEvent.change(screen.getByLabelText('Edit comment'), {
      target: { value: 'Retry is queued once the secrets arrive.' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Save edit' }))

    await waitFor(() => {
      expect(loadDb().comments.some((comment) => comment.body === 'Retry is queued once the secrets arrive.')).toBe(true)
    })

    await screen.findByText('Retry is queued once the secrets arrive.')
    const editedCommentRecord = loadDb().comments.find((comment) => comment.body === 'Retry is queued once the secrets arrive.')
    if (!editedCommentRecord) {
      throw new Error('Edited comment record not found')
    }

    fireEvent.click(within(screen.getByTestId(`comment-row-${editedCommentRecord.commentId}`)).getByRole('button', { name: 'Inactivate' }))
    expect(await screen.findByRole('dialog', { name: 'Inactivate comment' })).not.toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Inactivate comment' }))

    await waitFor(() => {
      expect(screen.queryByText('Retry is queued once the secrets arrive.')).toBeNull()
    })
    expect(loadDb().comments.find((comment) => comment.body === 'Retry is queued once the secrets arrive.')?.active).toBe(
      false,
    )
  })
})
