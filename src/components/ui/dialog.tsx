import type { ReactNode } from 'react'
import { Dialog as D } from 'radix-ui'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'

/**
 * Modal responsivo: folha inferior no celular, janela central no computador.
 */
export function Sheet({ open, onOpenChange, title, description, children, footer, className }: {
  open: boolean
  onOpenChange: (o: boolean) => void
  title: string
  description?: string
  children: ReactNode
  footer?: ReactNode
  className?: string
}) {
  return (
    <D.Root open={open} onOpenChange={onOpenChange}>
      <D.Portal>
        <D.Overlay className="fixed inset-0 z-50 bg-graphite/35 backdrop-blur-[2px] data-[state=open]:animate-[fade-in_180ms_ease-out]" />
        <D.Content
          className={cn(
            'fixed z-50 flex max-h-[92dvh] flex-col bg-card shadow-2xl focus:outline-none',
            'inset-x-0 bottom-0 rounded-t-3xl data-[state=open]:animate-[sheet-up_260ms_cubic-bezier(.2,.8,.2,1)]',
            'sm:inset-x-auto sm:bottom-auto sm:left-1/2 sm:top-1/2 sm:w-full sm:max-w-lg sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-3xl sm:data-[state=open]:animate-[zoom-in_200ms_ease-out]',
            className,
          )}
        >
          <div className="mx-auto mt-2.5 h-1 w-10 rounded-full bg-border sm:hidden" aria-hidden />
          <div className="flex items-start justify-between gap-4 px-5 pt-4 pb-2 sm:px-6 sm:pt-6">
            <div>
              <D.Title className="font-serif text-xl font-medium">{title}</D.Title>
              {description ? <D.Description className="mt-1 text-sm text-muted-foreground">{description}</D.Description> : <D.Description className="sr-only">{title}</D.Description>}
            </div>
            <D.Close className="-mr-2 grid size-10 place-items-center rounded-full text-muted-foreground hover:bg-muted" aria-label="Fechar">
              <X className="size-5" />
            </D.Close>
          </div>
          <div className="flex-1 overflow-y-auto px-5 pb-4 sm:px-6">{children}</div>
          {footer && <div className="flex gap-2 border-t px-5 py-3 pb-[max(.75rem,env(safe-area-inset-bottom))] sm:px-6 sm:pb-4">{footer}</div>}
        </D.Content>
      </D.Portal>
    </D.Root>
  )
}
