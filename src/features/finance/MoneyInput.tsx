import { forwardRef, type InputHTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

/** Campo de valor em reais, com teclado numérico no celular. */
export const MoneyInput = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement> & { big?: boolean }>(({ className, big, ...p }, ref) => (
  <div className={cn('flex items-center rounded-xl border border-input bg-card px-3.5 transition focus-within:border-primary focus-within:ring-2 focus-within:ring-ring/50', big ? 'h-16' : 'h-11', className)}>
    <span className={cn('mr-2 text-muted-foreground', big && 'text-xl')}>R$</span>
    <input ref={ref} inputMode="decimal" placeholder="0,00" autoComplete="off"
      className={cn('w-full bg-transparent tabular-nums outline-none placeholder:text-muted-foreground/60', big ? 'text-3xl font-semibold' : 'text-[15px]')} {...p} />
  </div>
))
MoneyInput.displayName = 'MoneyInput'
