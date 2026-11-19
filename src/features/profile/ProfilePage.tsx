import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router'
import { Download, KeyRound, LogOut, Moon, Monitor, Shield, Sun, Tags, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { Card, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Field, Input, Select } from '@/components/ui/field'
import { Sheet } from '@/components/ui/dialog'
import { Badge, PageHeader, PageLoader, Switch } from '@/components/ui/misc'
import { CategoryManager } from '@/features/shared/CategoryManager'
import { useProfile, useUpdateProfile } from '@/hooks/useData'
import { useSession, useSource } from '@/auth/session'
import { supabase } from '@/lib/supabase'
import { MODULES } from '@/lib/modules'
import { cn } from '@/lib/utils'
import type { Accent, ThemePref } from '@/data/types'

const ACCENTS: { v: Accent; label: string; hex: string }[] = [
  { v: 'rose', label: 'Rosa antigo', hex: '#D9A6AF' }, { v: 'lavender', label: 'Lavanda', hex: '#B9AEDC' },
  { v: 'sage', label: 'Sálvia', hex: '#A8BDA8' }, { v: 'graphite', label: 'Grafite', hex: '#33313A' },
]

function PasswordSheet({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const [pw, setPw] = useState('')
  const [pw2, setPw2] = useState('')
  const [busy, setBusy] = useState(false)
  const err = pw && pw.length < 8 ? 'Mínimo de 8 caracteres' : pw2 && pw !== pw2 ? 'As senhas não coincidem' : undefined
  const save = async () => {
    if (!supabase || err || !pw) return
    setBusy(true)
    const { error } = await supabase.auth.updateUser({ password: pw })
    setBusy(false)
    if (error) return toast.error('Não foi possível alterar a senha.')
    toast.success('Senha alterada.'); setPw(''); setPw2(''); onOpenChange(false)
  }
  return (
    <Sheet open={open} onOpenChange={onOpenChange} title="Nova senha"
      footer={<><Button variant="secondary" className="ml-auto" onClick={() => onOpenChange(false)}>Cancelar</Button><Button onClick={save} disabled={busy || !!err || !pw || !pw2}>Salvar</Button></>}>
      <div className="space-y-4 pt-1">
        <Field label="Nova senha" error={pw.length > 0 && pw.length < 8 ? err : undefined}>{(p) => <Input type="password" autoComplete="new-password" {...p} value={pw} onChange={(e) => setPw(e.target.value)} />}</Field>
        <Field label="Repita a senha" error={pw2 && pw !== pw2 ? err : undefined}>{(p) => <Input type="password" autoComplete="new-password" {...p} value={pw2} onChange={(e) => setPw2(e.target.value)} />}</Field>
      </div>
    </Sheet>
  )
}

function DeleteSheet({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const source = useSource()
  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)
  const run = async () => {
    setBusy(true)
    try { await source.deleteAccount(); toast.success('Sua conta e todos os dados foram excluídos.') }
    catch (e) { toast.error(e instanceof Error ? e.message : 'Não foi possível excluir.') }
    finally { setBusy(false) }
  }
  return (
    <Sheet open={open} onOpenChange={onOpenChange} title="Excluir conta" description="Todos os seus dados serão apagados permanentemente: perfil, agenda, tarefas, hábitos e registros."
      footer={<><Button variant="secondary" className="ml-auto" onClick={() => onOpenChange(false)}>Cancelar</Button><Button variant="danger" disabled={text !== 'EXCLUIR' || busy} onClick={run}>{busy ? 'Excluindo…' : 'Excluir tudo'}</Button></>}>
      <div className="space-y-3 pt-1 text-sm">
        <p>Sugestão: exporte seus dados antes. Essa ação não pode ser desfeita.</p>
        <Field label='Digite EXCLUIR para confirmar'>{(p) => <Input {...p} value={text} onChange={(e) => setText(e.target.value)} autoCapitalize="characters" />}</Field>
      </div>
    </Sheet>
  )
}

export function ProfilePage() {
  const { data: profile, isLoading } = useProfile()
  const save = useUpdateProfile()
  const source = useSource()
  const { email, signOut, status } = useSession()
  const [params, setParams] = useSearchParams()
  const [name, setName] = useState('')
  const [cats, setCats] = useState(false)
  const [pwOpen, setPwOpen] = useState(false)
  const [del, setDel] = useState(false)
  const demo = status === 'demo'

  useEffect(() => { if (profile) setName(profile.display_name) }, [profile?.display_name]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (params.get('nova-senha')) { setPwOpen(true); setParams({}, { replace: true }) } }, []) // eslint-disable-line react-hooks/exhaustive-deps

  if (isLoading || !profile) return <PageLoader />

  const toggleIn = (key: 'enabled_modules' | 'areas', id: string, on: boolean) => {
    const cur = profile[key]
    save.mutate({ [key]: on ? [...new Set([...cur, id])] : cur.filter((x) => x !== id) })
  }

  const exportData = async () => {
    try {
      const data = await source.exportAll()
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
      const a = document.createElement('a')
      a.href = URL.createObjectURL(blob)
      a.download = `lume-meus-dados-${new Date().toISOString().slice(0, 10)}.json`
      a.click(); URL.revokeObjectURL(a.href)
      toast.success('Arquivo com seus dados baixado.')
    } catch { toast.error('Não foi possível exportar agora.') }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <PageHeader title="Perfil" subtitle={demo ? 'Conta de demonstração' : email ?? undefined} />

      <Card>
        <CardHeader title="Seus dados" />
        <form className="flex items-end gap-2" onSubmit={(e) => { e.preventDefault(); if (name.trim()) save.mutate({ display_name: name.trim(), _toast: 'Nome atualizado.' }) }}>
          <Field label="Nome" className="flex-1">{(p) => <Input {...p} value={name} onChange={(e) => setName(e.target.value)} maxLength={80} />}</Field>
          <Button type="submit" variant="outline" disabled={!name.trim() || name.trim() === profile.display_name}>Salvar</Button>
        </form>
      </Card>

      <Card>
        <CardHeader title="Aparência" />
        <div className="grid grid-cols-3 gap-2">
          {([['light', 'Claro', Sun], ['dark', 'Escuro', Moon], ['system', 'Automático', Monitor]] as [ThemePref, string, typeof Sun][]).map(([v, l, I]) => (
            <button key={v} aria-pressed={profile.theme === v} onClick={() => save.mutate({ theme: v })}
              className={cn('flex flex-col items-center gap-1.5 rounded-2xl border p-3 text-sm font-medium transition', profile.theme === v ? 'border-primary ring-1 ring-primary' : 'hover:bg-muted')}>
              <I className="size-5" />{l}
            </button>
          ))}
        </div>
        <p className="mt-5 mb-2 text-sm font-medium">Cor principal</p>
        <div className="flex flex-wrap gap-2">
          {ACCENTS.map((a) => (
            <button key={a.v} aria-pressed={profile.accent === a.v} onClick={() => save.mutate({ accent: a.v })}
              className={cn('flex items-center gap-2 rounded-full border py-1.5 pr-3.5 pl-1.5 text-sm', profile.accent === a.v ? 'border-primary ring-1 ring-primary' : 'hover:bg-muted')}>
              <span className="size-6 rounded-full" style={{ background: a.hex }} />{a.label}
            </button>
          ))}
        </div>
        <Field label="A semana começa no" className="mt-5 max-w-xs">{(p) => (
          <Select {...p} value={profile.week_starts_on} onChange={(e) => save.mutate({ week_starts_on: Number(e.target.value) as 0 | 1 })}>
            <option value={0}>Domingo</option><option value={1}>Segunda-feira</option>
          </Select>)}
        </Field>
      </Card>

      <Card>
        <CardHeader title="Módulos" />
        <p className="-mt-2 mb-3 text-sm text-muted-foreground">Mostre só o que faz sentido para a sua rotina.</p>
        <ul className="divide-y">
          {MODULES.map((m) => (
            <li key={m.id} className="flex items-center gap-3 py-3">
              <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-muted text-primary"><m.icon className="size-5" /></span>
              <span className="min-w-0 flex-1">
                <span className="flex flex-wrap items-center gap-2 font-medium">{m.label}{!m.available && <Badge>Em breve · Fase {m.phase}</Badge>}</span>
                <span className="block text-xs text-muted-foreground">{m.available ? m.description : profile.areas.includes(m.id) ? 'Você será avisada quando chegar.' : m.description}</span>
              </span>
              {m.available
                ? <Switch label={`Ativar ${m.label}`} checked={profile.enabled_modules.includes(m.id)} onCheckedChange={(v) => toggleIn('enabled_modules', m.id, v)} />
                : <Button size="sm" variant={profile.areas.includes(m.id) ? 'secondary' : 'outline'} onClick={() => toggleIn('areas', m.id, !profile.areas.includes(m.id))}
                    aria-pressed={profile.areas.includes(m.id)}>{profile.areas.includes(m.id) ? 'Interessada' : 'Tenho interesse'}</Button>}
            </li>
          ))}
        </ul>
        <Button variant="outline" className="mt-3" onClick={() => setCats(true)}><Tags />Gerenciar categorias</Button>
      </Card>

      <Card>
        <CardHeader title="Privacidade e dados" icon={<Shield />} />
        <p className="mb-4 text-sm text-muted-foreground">Seus dados ficam protegidos e só você tem acesso a eles. Nada é vendido, compartilhado ou usado para publicidade. Dados de bem-estar e saúde são tratados como sensíveis, conforme a LGPD.</p>
        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
          <Button variant="outline" onClick={exportData}><Download />Exportar meus dados</Button>
          {!demo && <Button variant="outline" onClick={() => setPwOpen(true)}><KeyRound />Alterar senha</Button>}
          <Button variant="outline" onClick={signOut}><LogOut />{demo ? 'Sair da demonstração' : 'Sair'}</Button>
        </div>
        {!demo && (
          <div className="mt-6 border-t pt-4">
            <Button variant="ghost" className="text-danger" onClick={() => setDel(true)}><Trash2 />Excluir conta e dados</Button>
          </div>
        )}
      </Card>

      <CategoryManager open={cats} onOpenChange={setCats} />
      <PasswordSheet open={pwOpen} onOpenChange={setPwOpen} />
      <DeleteSheet open={del} onOpenChange={setDel} />
    </div>
  )
}
