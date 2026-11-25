import type { ReactNode } from 'react'
import { Loader2 } from 'lucide-react'
import { Switch as S } from 'radix-ui'
import { cn } from '@/lib/utils'
import { colorOf } from '@/lib/colors'

export function Spinner({ className, label = 'Carregando' }: { className?: string; label?: string }) {
  return (
    <span role="status" className="inline-flex items-center gap-2 text-muted-foreground">
      <Loader2 className={cn('size-5 animate-spin', className)} aria-hidden />
      <span className="sr-only">{label}</span>
    </span>
  )
}

export function PageLoader() {
  return <div className="grid min-h-[40vh] place-items-center"><Spinner className="size-6" /></div>
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn('animate-pulse rounded-xl bg-muted', className)} aria-hidden />
}

export function EmptyState({ icon, title, text, action, className }: { icon: ReactNode; title: string; text?: string; action?: ReactNode; className?: string }) {
  return (
    <div className={cn('flex flex-col items-center px-6 py-10 text-center', className)}>
      <div className="mb-4 grid size-16 place-items-center rounded-full bg-primary-soft/20 text-primary [&_svg]:size-7">{icon}</div>
      <p className="font-serif text-lg">{title}</p>
      {text && <p className="mt-1 max-w-xs text-sm text-muted-foreground">{text}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  )
}

export function ErrorState({ onRetry, detail }: { onRetry?: () => void; detail?: string }) {
  return (
    <div role="alert" className="rounded-2xl border border-danger/30 bg-danger/5 p-5 text-sm">
      <p className="font-medium">Não conseguimos carregar seus dados.</p>
      <p className="mt-1 text-muted-foreground">{detail ?? 'Verifique sua conexão e tente novamente.'}</p>
      {onRetry && <button onClick={onRetry} className="mt-3 font-semibold text-primary underline-offset-4 hover:underline">Tentar de novo</button>}
    </div>
  )
}

export function Badge({ children, color, className }: { children: ReactNode; color?: string; className?: string }) {
  return (
    <span className={cn('inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium', color ? colorOf(color).soft : 'bg-muted text-muted-foreground', className)}>
      {children}
    </span>
  )
}

export function Dot({ color, className }: { color?: string | null; className?: string }) {
  return <span className={cn('inline-block size-2.5 shrink-0 rounded-full', colorOf(color).dot, className)} aria-hidden />
}

export function Switch({ checked, onCheckedChange, label, disabled }: { checked: boolean; onCheckedChange: (v: boolean) => void; label: string; disabled?: boolean }) {
  return (
    <S.Root checked={checked} onCheckedChange={onCheckedChange} aria-label={label} disabled={disabled}
      className="relative h-7 w-12 shrink-0 rounded-full bg-input transition data-[state=checked]:bg-primary disabled:opacity-50">
      <S.Thumb className="block size-6 translate-x-0.5 rounded-full bg-white shadow transition data-[state=checked]:translate-x-[22px]" />
    </S.Root>
  )
}

/** Grupo de botões exclusivos (ex.: Mês / Semana / Dia). */
export function Segmented<T extends string>({ value, onChange, options, label, className }: {
  value: T; onChange: (v: T) => void; options: { value: T; label: string }[]; label: string; className?: string
}) {
  return (
    <div role="radiogroup" aria-label={label} className={cn('inline-flex rounded-xl bg-muted p-1', className)}>
      {options.map((o) => (
        <button type="button" key={o.value} role="radio" aria-checked={value === o.value} onClick={() => onChange(o.value)}
          className={cn('h-9 flex-1 rounded-lg px-3 text-sm font-medium text-muted-foreground transition', value === o.value && 'bg-card text-foreground shadow-soft')}>
          {o.label}
        </button>
      ))}
    </div>
  )
}

export function Chip({ active, onClick, children, color }: { active: boolean; onClick: () => void; children: ReactNode; color?: string }) {
  return (
    <button onClick={onClick} aria-pressed={active}
      className={cn('inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full border px-3.5 text-sm transition',
        active ? 'border-primary bg-primary/10 font-semibold text-foreground' : 'bg-card text-muted-foreground hover:bg-muted')}>
      {color && <Dot color={color} />}
      {children}
    </button>
  )
}

export function PageHeader({ title, subtitle, action }: { title: string; subtitle?: string; action?: ReactNode }) {
  return (
    <div className="mb-5 flex items-end justify-between gap-4">
      <div>
        <h1 className="font-serif text-[28px] leading-tight font-medium tracking-tight sm:text-3xl">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>}
      </div>
      {action}
    </div>
  )
}
