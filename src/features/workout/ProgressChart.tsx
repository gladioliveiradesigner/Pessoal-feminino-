import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { useIsDark } from '@/hooks/useIsDark'
import { fmt } from '@/lib/dates'
import { formatKg } from '@/lib/workout'

/** Evolução da maior carga de um exercício (uma série, sem legenda: o título nomeia). */
export function ProgressChart({ name, data }: { name: string; data: { date: string; day: Date; weight: number }[] }) {
  const dark = useIsDark()
  const stroke = dark ? '#8f9ce6' : '#5A6FD0'
  const ink = dark ? '#a8a3ae' : '#6f6a76'
  const rows = data.map((d) => ({ label: fmt(d.day, 'dd/MM'), full: fmt(d.day, "d 'de' MMMM 'de' yyyy"), weight: d.weight }))
  return (
    <div className="h-56" role="img" aria-label={`Evolução da carga em ${name}`}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={rows} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid vertical={false} stroke={dark ? '#37353d' : '#ebe4da'} />
          <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fill: ink, fontSize: 12 }} minTickGap={16} />
          <YAxis tickLine={false} axisLine={false} width={44} tick={{ fill: ink, fontSize: 11 }} domain={[(min: number) => Math.max(0, Math.floor((min - 1) / 5) * 5), (max: number) => Math.ceil((max + 1) / 5) * 5]} allowDecimals={false}
            tickFormatter={(v: number) => `${Math.round(v)}`} />
          <Tooltip cursor={{ stroke: ink, strokeDasharray: '3 3' }}
            contentStyle={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 12, color: 'var(--foreground)', fontSize: 13 }}
            labelFormatter={(_l, p) => (p?.[0]?.payload as { full?: string } | undefined)?.full ?? ''}
            formatter={(v) => [formatKg(Number(v)), 'Carga']} />
          <Line type="monotone" dataKey="weight" stroke={stroke} strokeWidth={2} dot={{ r: 4, fill: stroke, stroke: 'var(--card)', strokeWidth: 2 }} activeDot={{ r: 6 }} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
