import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { FlaskConical, Lock } from 'lucide-react'
import { toast } from 'sonner'
import { Logo } from '@/components/layout/Logo'
import { Button } from '@/components/ui/button'
import { Field, Input } from '@/components/ui/field'
import { Segmented } from '@/components/ui/misc'
import { isSupabaseConfigured, supabase } from '@/lib/supabase'
import { useSession } from '@/auth/session'

type Mode = 'signin' | 'signup' | 'reset'

const schema = z.object({
  name: z.string().max(80).optional(),
  email: z.string().trim().email('Informe um e-mail válido'),
  password: z.string().optional(),
})

function translate(msg: string) {
  if (/Invalid login/i.test(msg)) return 'E-mail ou senha incorretos.'
  if (/already registered/i.test(msg)) return 'Esse e-mail já tem cadastro. Tente entrar.'
  if (/Email not confirmed/i.test(msg)) return 'Confirme seu e-mail pelo link que enviamos.'
  if (/rate limit/i.test(msg)) return 'Muitas tentativas. Aguarde um pouco e tente de novo.'
  if (/fetch/i.test(msg)) return 'Sem conexão com o servidor.'
  return 'Não foi possível continuar. Tente novamente.'
}

export function AuthPage() {
  const { startDemo } = useSession()
  const [mode, setMode] = useState<Mode>('signin')
  const [busy, setBusy] = useState(false)
  const [sent, setSent] = useState<string | null>(null)
  const { register, handleSubmit, setError, formState: { errors } } = useForm<z.infer<typeof schema>>({ resolver: zodResolver(schema) })

  const onSubmit = async (v: z.infer<typeof schema>) => {
    if (!supabase) return
    if (mode !== 'reset' && (!v.password || v.password.length < 8)) {
      setError('password', { message: 'A senha precisa ter pelo menos 8 caracteres' })
      return
    }
    setBusy(true)
    try {
      if (mode === 'signin') {
        const { error } = await supabase.auth.signInWithPassword({ email: v.email, password: v.password! })
        if (error) throw error
      } else if (mode === 'signup') {
        const { data, error } = await supabase.auth.signUp({
          email: v.email, password: v.password!,
          options: { data: { display_name: v.name?.trim() ?? '' }, emailRedirectTo: window.location.origin },
        })
        if (error) throw error
        if (!data.session) setSent('Enviamos um link de confirmação para o seu e-mail. Depois de confirmar, é só entrar.')
      } else {
        const { error } = await supabase.auth.resetPasswordForEmail(v.email, { redirectTo: `${window.location.origin}/perfil?nova-senha=1` })
        if (error) throw error
        setSent('Se esse e-mail tiver cadastro, você vai receber um link para criar uma nova senha.')
      }
    } catch (e) {
      toast.error(translate(e instanceof Error ? e.message : ''))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="grid min-h-dvh lg:grid-cols-2">
      <div className="relative hidden overflow-hidden bg-[#f3ece3] lg:block dark:bg-[#24232a]">
        <div className="absolute -top-24 -left-24 size-[420px] rounded-full bg-rose/40 blur-3xl" />
        <div className="absolute right-0 bottom-0 size-[380px] rounded-full bg-lavender/40 blur-3xl" />
        <div className="absolute top-1/2 left-1/3 size-[260px] rounded-full bg-sage/40 blur-3xl" />
        <div className="relative flex h-full flex-col justify-between p-12">
          <Logo />
          <div className="max-w-md">
            <p className="font-serif text-4xl leading-tight">Um espaço só seu para cuidar do tempo, da rotina e de você.</p>
            <p className="mt-4 text-muted-foreground">Agenda, tarefas e hábitos em um lugar leve, privado e bonito.</p>
          </div>
          <p className="flex items-center gap-2 text-sm text-muted-foreground"><Lock className="size-4" /> Seus dados são privados e só você tem acesso.</p>
        </div>
      </div>

      <div className="pt-safe flex flex-col justify-center px-5 py-10 sm:px-10">
        <div className="mx-auto w-full max-w-sm">
          <div className="mb-8 lg:hidden"><Logo /></div>
          <h1 className="font-serif text-3xl">{mode === 'signup' ? 'Crie sua conta' : mode === 'reset' ? 'Recuperar senha' : 'Que bom te ver'}</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {mode === 'signup' ? 'Leva menos de um minuto.' : mode === 'reset' ? 'Vamos enviar um link para o seu e-mail.' : 'Entre para continuar organizando seu dia.'}
          </p>

          {!isSupabaseConfigured ? (
            <div className="mt-8 rounded-2xl border bg-card p-5 text-sm">
              <p className="font-medium">O servidor de dados ainda não foi conectado.</p>
              <p className="mt-1 text-muted-foreground">Enquanto isso, você pode conhecer o app no modo demonstração.</p>
            </div>
          ) : sent ? (
            <div role="status" className="mt-8 rounded-2xl border bg-card p-5 text-sm">
              <p>{sent}</p>
              <Button variant="link" className="mt-2" onClick={() => { setSent(null); setMode('signin') }}>Voltar para entrar</Button>
            </div>
          ) : (
            <>
              {mode !== 'reset' && (
                <Segmented className="mt-8 w-full" label="Acesso" value={mode} onChange={setMode}
                  options={[{ value: 'signin', label: 'Entrar' }, { value: 'signup', label: 'Criar conta' }]} />
              )}
              <form onSubmit={handleSubmit(onSubmit)} className="mt-6 space-y-4" noValidate>
                {mode === 'signup' && <Field label="Como podemos te chamar?">{(p) => <Input {...p} {...register('name')} autoComplete="given-name" />}</Field>}
                <Field label="E-mail" error={errors.email?.message}>{(p) => <Input type="email" inputMode="email" autoComplete="email" {...p} {...register('email')} />}</Field>
                {mode !== 'reset' && (
                  <Field label="Senha" error={errors.password?.message} hint={mode === 'signup' ? 'Mínimo de 8 caracteres' : undefined}>
                    {(p) => <Input type="password" autoComplete={mode === 'signup' ? 'new-password' : 'current-password'} {...p} {...register('password')} />}
                  </Field>
                )}
                <Button type="submit" size="lg" className="w-full" disabled={busy}>
                  {busy ? 'Aguarde…' : mode === 'signup' ? 'Criar conta' : mode === 'reset' ? 'Enviar link' : 'Entrar'}
                </Button>
              </form>
              <div className="mt-4 text-center text-sm">
                {mode === 'reset'
                  ? <button className="text-primary hover:underline" onClick={() => setMode('signin')}>Voltar</button>
                  : <button className="text-muted-foreground hover:text-foreground hover:underline" onClick={() => setMode('reset')}>Esqueci minha senha</button>}
              </div>
            </>
          )}

          <div className="mt-8 border-t pt-6">
            <Button variant="outline" className="w-full" onClick={startDemo}><FlaskConical /> Explorar com dados de exemplo</Button>
            <p className="mt-2 text-center text-xs text-muted-foreground">Dados fictícios, nada é salvo.</p>
          </div>
          {mode === 'signup' && (
            <p className="mt-6 text-xs leading-relaxed text-muted-foreground">
              Ao criar a conta, você concorda que seus dados sejam guardados para o funcionamento do app. Eles não são vendidos, compartilhados nem usados para publicidade. Você pode exportar ou excluir tudo quando quiser.
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
