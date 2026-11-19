import { AlertDialog as A } from 'radix-ui'
import type { ReactNode } from 'react'
import { buttonVariants } from './button'

export function Confirm({ trigger, title, text, confirmLabel = 'Excluir', onConfirm, open, onOpenChange }: {
  trigger?: ReactNode; title: string; text?: string; confirmLabel?: string; onConfirm: () => void
  open?: boolean; onOpenChange?: (o: boolean) => void
}) {
  return (
    <A.Root open={open} onOpenChange={onOpenChange}>
      {trigger && <A.Trigger asChild>{trigger}</A.Trigger>}
      <A.Portal>
        <A.Overlay className="fixed inset-0 z-[60] bg-graphite/40" />
        <A.Content className="fixed top-1/2 left-1/2 z-[60] w-[calc(100%-2rem)] max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-3xl bg-card p-6 shadow-2xl">
          <A.Title className="font-serif text-lg">{title}</A.Title>
          <A.Description className="mt-2 text-sm text-muted-foreground">{text ?? 'Essa ação não pode ser desfeita.'}</A.Description>
          <div className="mt-6 flex justify-end gap-2">
            <A.Cancel className={buttonVariants({ variant: 'ghost' })}>Cancelar</A.Cancel>
            <A.Action className={buttonVariants({ variant: 'danger' })} onClick={onConfirm}>{confirmLabel}</A.Action>
          </div>
        </A.Content>
      </A.Portal>
    </A.Root>
  )
}
