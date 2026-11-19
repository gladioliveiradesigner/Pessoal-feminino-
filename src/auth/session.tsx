import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import type { Session } from '@supabase/supabase-js'
import { useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { createSupabaseSource } from '@/data/supabaseSource'
import { createDemoSource } from '@/data/demoSource'
import type { DataSource } from '@/data/types'

type Status = 'loading' | 'signed-out' | 'signed-in' | 'demo'

interface SessionCtx {
  status: Status
  session: Session | null
  source: DataSource | null
  email: string | null
  startDemo: () => void
  exitDemo: () => void
  signOut: () => Promise<void>
}

const Ctx = createContext<SessionCtx | null>(null)

export function SessionProvider({ children }: { children: ReactNode }) {
  const qc = useQueryClient()
  const [session, setSession] = useState<Session | null>(null)
  const [demo, setDemo] = useState<DataSource | null>(null)
  const [ready, setReady] = useState(!supabase)

  useEffect(() => {
    if (!supabase) return
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setReady(true)
    })
    const { data } = supabase.auth.onAuthStateChange((_e, s) => {
      setSession((prev) => {
        if (prev?.user.id !== s?.user.id) qc.clear()
        return s
      })
    })
    return () => data.subscription.unsubscribe()
  }, [qc])

  const userId = session?.user.id
  const source = useMemo<DataSource | null>(() => {
    if (demo) return demo
    if (supabase && userId) return createSupabaseSource(supabase, userId)
    return null
  }, [demo, userId])

  const startDemo = useCallback(() => {
    qc.clear()
    setDemo(createDemoSource())
  }, [qc])
  const exitDemo = useCallback(() => {
    qc.clear()
    setDemo(null)
  }, [qc])
  const signOut = useCallback(async () => {
    if (demo) return exitDemo()
    await supabase?.auth.signOut()
    qc.clear()
  }, [demo, exitDemo, qc])

  const status: Status = !ready ? 'loading' : demo ? 'demo' : session ? 'signed-in' : 'signed-out'

  return (
    <Ctx.Provider value={{ status, session, source, email: session?.user.email ?? null, startDemo, exitDemo, signOut }}>
      {children}
    </Ctx.Provider>
  )
}

export function useSession() {
  const v = useContext(Ctx)
  if (!v) throw new Error('useSession fora do SessionProvider')
  return v
}

export function useSource() {
  const { source } = useSession()
  if (!source) throw new Error('Fonte de dados indisponível')
  return source
}
