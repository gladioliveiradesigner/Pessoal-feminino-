import { cn } from '@/lib/utils'

export function Logo({ className, compact }: { className?: string; compact?: boolean }) {
  return (
    <span className={cn('inline-flex items-center gap-2 font-serif text-xl font-medium tracking-tight', className)}>
      <svg viewBox="0 0 32 32" className="size-7 shrink-0" aria-hidden>
        <circle cx="16" cy="16" r="15" fill="#D9A6AF" opacity=".35" />
        <circle cx="16" cy="16" r="9" fill="#B9AEDC" opacity=".6" />
        <circle cx="16" cy="16" r="4" fill="#A8BDA8" />
      </svg>
      {!compact && <span>Lume</span>}
    </span>
  )
}
