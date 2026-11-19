import type { HTMLAttributes, ReactNode } from 'react'
import { cn } from '@/lib/utils'

export function Card({ className, ...p }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('rounded-2xl border bg-card p-5 shadow-soft', className)} {...p} />
}

export function CardHeader({ title, icon, action, className }: { title: string; icon?: ReactNode; action?: ReactNode; className?: string }) {
  return (
    <div className={cn('mb-4 flex items-center justify-between gap-3', className)}>
      <h2 className="flex items-center gap-2 text-[15px] font-semibold">
        {icon && <span className="text-primary [&_svg]:size-[18px]">{icon}</span>}
        {title}
      </h2>
      {action}
    </div>
  )
}
