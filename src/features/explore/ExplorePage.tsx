import { Link } from 'react-router'
import { ChevronRight } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Badge, PageHeader } from '@/components/ui/misc'
import { useProfile } from '@/hooks/useData'
import { MODULES } from '@/lib/modules'

export function ExplorePage() {
  const { data: profile } = useProfile()
  const enabled = profile?.enabled_modules ?? []
  const active = MODULES.filter((m) => m.available && enabled.includes(m.id))
  const off = MODULES.filter((m) => m.available && !enabled.includes(m.id))
  const soon = MODULES.filter((m) => !m.available)
  return (
    <div>
      <PageHeader title="Explorar" subtitle="Todas as áreas do seu espaço" />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {active.map((m) => (
          <Link key={m.id} to={m.path!} className="group">
            <Card className="flex items-center gap-4 p-4 transition group-hover:bg-muted/50">
              <span className="grid size-12 place-items-center rounded-2xl bg-primary/12 text-primary"><m.icon className="size-6" /></span>
              <span className="flex-1"><b className="block font-semibold">{m.label}</b><span className="text-sm text-muted-foreground">{m.description}</span></span>
              <ChevronRight className="size-5 text-muted-foreground" />
            </Card>
          </Link>
        ))}
      </div>
      {off.length > 0 && (
        <p className="mt-4 text-sm text-muted-foreground">
          Desativados: {off.map((m) => m.label).join(', ')}. <Link to="/perfil" className="text-primary hover:underline">Ativar no perfil</Link>
        </p>
      )}
      <h2 className="mt-10 mb-3 font-serif text-xl">Chegando em breve</h2>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {soon.map((m) => (
          <Card key={m.id} className="flex items-center gap-4 p-4 opacity-80">
            <span className="grid size-12 place-items-center rounded-2xl bg-muted text-muted-foreground"><m.icon className="size-6" /></span>
            <span className="flex-1"><b className="block font-semibold">{m.label}</b><span className="text-sm text-muted-foreground">{m.description}</span></span>
            <Badge>Fase {m.phase}</Badge>
          </Card>
        ))}
      </div>
      <p className="mt-4 text-sm text-muted-foreground"><Link to="/perfil" className="text-primary hover:underline">Marque interesse no perfil</Link> para ativar assim que estiverem prontos.</p>
    </div>
  )
}
