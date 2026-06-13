import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
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

    expect(screen.queryByText('Old follow-up note kept for history only.')).not.toBeInTheDocument()
    expect(newestSeeded.compareDocumentPosition(olderSeeded) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()

    fireEvent.change(screen.getByLabelText('New comment'), {
      target: { value: 'Ready for retry once secrets land.' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Add comment' }))

    const addedComment = await screen.findByText('Ready for retry once secrets land.')
    expect(addedComment).toBeInTheDocument()
    expect(loadDb().comments.find((comment) => comment.body === 'Ready for retry once secrets land.')?.authorEmail).toBe(
      FALLBACK_EMAIL,
    )

    const addedCommentRow = addedComment.closest('.list-row')
    expect(addedCommentRow).not.toBeNull()
    fireEvent.click(within(addedCommentRow as HTMLElement).getByRole('button', { name: 'Edit' }))
    fireEvent.change(screen.getByLabelText('Edit comment'), {
      target: { value: 'Retry is queued once the secrets arrive.' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Save edit' }))

    await waitFor(() => {
      expect(loadDb().comments.some((comment) => comment.body === 'Retry is queued once the secrets arrive.')).toBe(true)
    })
    expect(await screen.findByText('Retry is queued once the secrets arrive.')).toBeInTheDocument()

    const editedCommentRow = screen.getByText('Retry is queued once the secrets arrive.').closest('.list-row')
    expect(editedCommentRow).not.toBeNull()
    fireEvent.click(within(editedCommentRow as HTMLElement).getByRole('button', { name: 'Inactivate' }))
    expect(await screen.findByRole('dialog', { name: 'Inactivate comment' })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Inactivate comment' }))

    await waitFor(() => {
      expect(screen.queryByText('Retry is queued once the secrets arrive.')).not.toBeInTheDocument()
    })
    expect(loadDb().comments.find((comment) => comment.body === 'Retry is queued once the secrets arrive.')?.active).toBe(
      false,
    )
  })
})
