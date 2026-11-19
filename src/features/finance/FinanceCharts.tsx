import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { useIsDark } from '@/hooks/useIsDark'
import { CHART } from '@/lib/finance'
import { formatBRL, formatBRLCompact } from '@/lib/money'
import { capitalize, fmt } from '@/lib/dates'
import { colorOf } from '@/lib/colors'
import type { FinanceCategory } from '@/data/types'

/** Receitas x despesas pagas nos últimos meses (um eixo, duas séries, legenda + tooltip). */
export function MonthlyChart({ data }: { data: { month: Date; income: number; expense: number }[] }) {
  const dark = useIsDark()
  const c = dark ? CHART.dark : CHART.light
  const rows = data.map((d) => ({ label: capitalize(fmt(d.month, 'MMM')), full: capitalize(fmt(d.month, "MMMM 'de' yyyy")), income: d.income, expense: d.expense }))
  const ink = dark ? '#a8a3ae' : '#6f6a76'
  return (
    <div className="h-64" role="img" aria-label="Gráfico de receitas e despesas dos últimos 6 meses">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={rows} barGap={2} barCategoryGap="28%" margin={{ top: 8, right: 4, left: 0, bottom: 0 }}>
          <CartesianGrid vertical={false} stroke={dark ? '#37353d' : '#ebe4da'} />
          <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fill: ink, fontSize: 12 }} />
          <YAxis tickLine={false} axisLine={false} width={56} tick={{ fill: ink, fontSize: 11 }} tickFormatter={(v: number) => formatBRLCompact(v)} />
          <Tooltip cursor={{ fill: dark ? '#ffffff0d' : '#33313a0a' }}
            contentStyle={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 12, color: 'var(--foreground)', fontSize: 13 }}
            labelFormatter={(_l, p) => (p?.[0]?.payload as { full?: string } | undefined)?.full ?? ''}
            formatter={(v, n) => [formatBRL(Number(v)), n === 'income' ? 'Receitas' : 'Despesas']} />
          <Legend iconType="circle" iconSize={8} formatter={(v) => <span style={{ color: 'var(--foreground)', fontSize: 13 }}>{v === 'income' ? 'Receitas' : 'Despesas'}</span>} />
          <Bar dataKey="income" fill={c.income} radius={[4, 4, 0, 0]} maxBarSize={22} />
          <Bar dataKey="expense" fill={c.expense} radius={[4, 4, 0, 0]} maxBarSize={22} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

/** Despesas por categoria: barras horizontais com valor escrito (legível sem cor e sem hover). */
export function CategoryBars({ rows, cats, budgets }: { rows: { category_id: string | null; cents: number }[]; cats: FinanceCategory[]; budgets?: Map<string | null, number> }) {
  const max = Math.max(...rows.map((r) => Math.max(r.cents, budgets?.get(r.category_id) ?? 0)), 1)
  return (
    <ul className="space-y-3">
      {rows.map((r) => {
        const cat = cats.find((c) => c.id === r.category_id)
        const b = budgets?.get(r.category_id)
        return (
          <li key={r.category_id ?? 'none'} title={`${cat?.name ?? 'Sem categoria'}: ${formatBRL(r.cents)}`}>
            <div className="mb-1 flex items-baseline justify-between gap-3 text-sm">
              <span className="truncate">{cat?.name ?? 'Sem categoria'}</span>
              <span className="shrink-0 tabular-nums">{formatBRL(r.cents)}{b ? <span className="text-muted-foreground"> / {formatBRLCompact(b)}</span> : null}</span>
            </div>
            <div className="relative h-2 rounded-full bg-muted">
              <div className="h-full rounded-full" style={{ width: `${(r.cents / max) * 100}%`, background: colorOf(cat?.color).hex }} />
              {b ? <span className="absolute top-[-3px] h-[14px] w-0.5 rounded bg-foreground/50" style={{ left: `${Math.min(100, (b / max) * 100)}%` }} aria-hidden /> : null}
            </div>
          </li>
        )
      })}
    </ul>
  )
}
