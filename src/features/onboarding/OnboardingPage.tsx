import { useState } from 'react'
import { useNavigate } from 'react-router'
import { ArrowLeft, Check, Moon, Monitor, Sun } from 'lucide-react'
import { Logo } from '@/components/layout/Logo'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/field'
import { useProfile, useUpdateProfile } from '@/hooks/useData'
import { applyTheme } from '@/hooks/useTheme'
import { MODULES } from '@/lib/modules'
import { cn } from '@/lib/utils'
import { DEFAULT_WIDGETS, type Accent, type ThemePref } from '@/data/types'

const GOALS = ['Organizar a rotina', 'Ter mais tempo para mim', 'Criar bons hábitos', 'Não esquecer compromissos', 'Cuidar da saúde', 'Ser mais produtiva', 'Controlar o dinheiro', 'Realizar sonhos']
const ACCENTS: { v: Accent; label: string; hex: string }[] = [
  { v: 'rose', label: 'Rosa antigo', hex: '#D9A6AF' },
  { v: 'lavender', label: 'Lavanda', hex: '#B9AEDC' },
  { v: 'sage', label: 'Sálvia', hex: '#A8BDA8' },
  { v: 'graphite', label: 'Grafite', hex: '#33313A' },
]

function Choice({ on, onClick, children, className }: { on: boolean; onClick: () => void; children: React.ReactNode; className?: string }) {
  return (
    <button type="button" aria-pressed={on} onClick={onClick}
      className={cn('flex items-center gap-3 rounded-2xl border bg-card p-3.5 text-left text-[15px] transition', on ? 'border-primary bg-primary/8 ring-1 ring-primary' : 'hover:bg-muted', className)}>
      <span className={cn('grid size-5 shrink-0 place-items-center rounded-md border', on && 'border-primary bg-primary text-primary-foreground')}>{on && <Check className="size-3.5" strokeWidth={3} />}</span>
      <span className="min-w-0 flex-1">{children}</span>
    </button>
  )
}

export function OnboardingPage() {
  const { data: profile } = useProfile()
  const save = useUpdateProfile()
  const nav = useNavigate()
  const [step, setStep] = useState(0)
  const [name, setName] = useState(profile?.display_name ?? '')
  const [goals, setGoals] = useState<string[]>([])
  const [modules, setModules] = useState<string[]>(['agenda', 'tasks', 'habits'])
  const [interests, setInterests] = useState<string[]>([])
  const [theme, setTheme] = useState<ThemePref>('system')
  const [accent, setAccent] = useState<Accent>('rose')
  const toggle = (arr: string[], set: (v: string[]) => void, v: string) => set(arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v])

  const steps = [
    {
      title: 'Como você gostaria de ser chamada?',
      text: 'Vamos usar só o seu primeiro nome nas saudações.',
      valid: name.trim().length > 0,
      body: <Input autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder="Seu nome" maxLength={80} className="h-13 text-lg" aria-label="Seu nome"
        onKeyDown={(e) => e.key === 'Enter' && name.trim() && setStep(1)} />,
    },
    {
      title: 'O que você quer conquistar?',
      text: 'Escolha quantos quiser. Isso ajuda a montar seu início.',
      valid: true,
      body: <div className="grid gap-2 sm:grid-cols-2">{GOALS.map((g) => <Choice key={g} on={goals.includes(g)} onClick={() => toggle(goals, setGoals, g)}>{g}</Choice>)}</div>,
    },
    {
      title: 'O que você quer organizar agora?',
      text: 'Você pode mudar isso a qualquer momento nas configurações.',
      valid: true,
      body: <div className="grid gap-2">{MODULES.filter((m) => m.available).map((m) => (
        <Choice key={m.id} on={modules.includes(m.id)} onClick={() => toggle(modules, setModules, m.id)}>
          <span className="flex items-center gap-2 font-semibold"><m.icon className="size-4 text-primary" />{m.label}</span>
          <span className="block text-sm text-muted-foreground">{m.description}</span>
        </Choice>))}
      </div>,
    },
    {
      title: 'E mais para frente?',
      text: 'Esses módulos estão chegando. Todos são opcionais e só aparecem se você ativar. Marque os que te interessam.',
      valid: true,
      body: <div className="grid gap-2 sm:grid-cols-2">{MODULES.filter((m) => !m.available).map((m) => (
        <Choice key={m.id} on={interests.includes(m.id)} onClick={() => toggle(interests, setInterests, m.id)}>
          <span className="flex items-center gap-2 font-semibold"><m.icon className="size-4 text-primary" />{m.label}</span>
          <span className="block text-xs text-muted-foreground">{m.description}{m.sensitive ? ' · dados sensíveis, protegidos' : ''}</span>
        </Choice>))}
      </div>,
    },
    {
      title: 'Como você prefere ver o app?',
      text: 'Escolha o tema e a cor principal.',
      valid: true,
      body: (
        <div className="space-y-6">
          <div className="grid grid-cols-3 gap-2">
            {([['light', 'Claro', Sun], ['dark', 'Escuro', Moon], ['system', 'Automático', Monitor]] as const).map(([v, l, I]) => (
              <button key={v} aria-pressed={theme === v} onClick={() => { setTheme(v); applyTheme(v, accent) }}
                className={cn('flex flex-col items-center gap-2 rounded-2xl border bg-card p-4 text-sm font-medium', theme === v && 'border-primary ring-1 ring-primary')}>
                <I className="size-5" />{l}
              </button>
            ))}
          </div>
          <div className="flex flex-wrap gap-3">
            {ACCENTS.map((a) => (
              <button key={a.v} aria-pressed={accent === a.v} onClick={() => { setAccent(a.v); applyTheme(theme, a.v) }}
                className={cn('flex items-center gap-2 rounded-full border bg-card py-2 pr-4 pl-2 text-sm', accent === a.v && 'border-primary ring-1 ring-primary')}>
                <span className="size-6 rounded-full" style={{ background: a.hex }} />{a.label}
              </button>
            ))}
          </div>
        </div>
      ),
    },
  ]

  const finish = async () => {
    const widgets = DEFAULT_WIDGETS.map((w) => ({
      ...w,
      visible: (w.id === 'tasks' && !modules.includes('tasks')) || (w.id === 'events' && !modules.includes('agenda')) || (w.id === 'habits' && !modules.includes('habits')) ? false : w.visible,
    }))
    try {
      await save.mutateAsync({
        display_name: name.trim(), goals, areas: interests, enabled_modules: modules,
        theme, accent, dashboard_widgets: widgets, onboarded_at: new Date().toISOString(),
      })
      nav('/', { replace: true })
    } catch { /* aviso exibido */ }
  }

  const s = steps[step]
  const last = step === steps.length - 1
  return (
    <div className="pt-safe pb-safe mx-auto flex min-h-dvh max-w-xl flex-col px-5 py-6">
      <div className="flex items-center justify-between">
        <Logo />
        <span className="text-sm text-muted-foreground">{step + 1} de {steps.length}</span>
      </div>
      <div className="mt-4 h-1 overflow-hidden rounded-full bg-muted" aria-hidden>
        <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${((step + 1) / steps.length) * 100}%` }} />
      </div>
      <div key={step} className="animate-fade-up flex-1 pt-10">
        <h1 className="font-serif text-[28px] leading-tight">{s.title}</h1>
        <p className="mt-2 mb-7 text-muted-foreground">{s.text}</p>
        {s.body}
      </div>
      <div className="sticky bottom-0 flex gap-3 bg-background py-4">
        {step > 0 && <Button variant="secondary" size="lg" onClick={() => setStep(step - 1)} aria-label="Voltar"><ArrowLeft /></Button>}
        <Button size="lg" className="flex-1" disabled={!s.valid || save.isPending} onClick={() => (last ? finish() : setStep(step + 1))}>
          {last ? (save.isPending ? 'Preparando…' : 'Começar') : 'Continuar'}
        </Button>
      </div>
    </div>
  )
}
