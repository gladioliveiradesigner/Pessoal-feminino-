import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from 'sonner'
import { SessionProvider } from '@/auth/session'
import { ErrorBoundary } from '@/components/layout/ErrorBoundary'
import App from './App'
import './index.css'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 60_000, retry: 1, refetchOnWindowFocus: true },
    mutations: { retry: 0 },
  },
})

if (!import.meta.env.VITE_PREVIEW) import('virtual:pwa-register').then((m) => m.registerSW({ immediate: true }))

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <SessionProvider>
          <App />
          <Toaster position="top-center" richColors closeButton toastOptions={{ className: 'font-sans rounded-2xl' }} />
        </SessionProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  </StrictMode>,
)
