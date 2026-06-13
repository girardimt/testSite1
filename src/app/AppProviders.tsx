import { QueryClient } from '@tanstack/react-query'
import { BrowserRouter } from 'react-router-dom'
import { AppErrorBoundary } from '../lib/ui'
import { AppRouter } from './router'

export const queryClient = new QueryClient()

const deriveBasename = () => {
  if (import.meta.env.DEV) {
    return undefined
  }
  const firstSegment = window.location.pathname.split('/').filter(Boolean)[0]
  return firstSegment ? `/${firstSegment}` : undefined
}

export default function AppProviders() {
  return (
    <BrowserRouter basename={deriveBasename()}>
      <AppErrorBoundary>
        <AppRouter />
      </AppErrorBoundary>
    </BrowserRouter>
  )
}
