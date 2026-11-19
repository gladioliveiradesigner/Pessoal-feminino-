import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { useSession, useSource } from '@/auth/session'
import type { Profile, TableName, Tables } from '@/data/types'

/** Lista todas as linhas de uma tabela da usuária (cache compartilhado entre telas). */
export function useTable<T extends TableName>(table: T) {
  const { source } = useSession()
  return useQuery({
    queryKey: [source?.kind, table],
    queryFn: () => source!.list(table),
    enabled: !!source,
  })
}

interface MutOpts { success?: string; silent?: boolean }

/** Criar / editar / excluir com atualização otimista e feedback visual. */
export function useTableMutations<T extends TableName>(table: T) {
  const source = useSource()
  const qc = useQueryClient()
  const key = [source.kind, table]
  type Row = Tables[T]

  const onError = (e: unknown) => toast.error(e instanceof Error ? e.message : 'Algo deu errado.')
  const snapshot = async () => {
    await qc.cancelQueries({ queryKey: key })
    return qc.getQueryData<Row[]>(key)
  }
  const restore = (prev: Row[] | undefined) => prev && qc.setQueryData(key, prev)
  const settle = () => qc.invalidateQueries({ queryKey: key })

  const create = useMutation({
    mutationFn: ({ row }: { row: Partial<Row> } & MutOpts) => source.insert(table, row),
    onSuccess: (_d, v) => !v.silent && toast.success(v.success ?? 'Salvo!'),
    onError,
    onSettled: settle,
  })

  const update = useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: Partial<Row> } & MutOpts) => source.update(table, id, patch),
    onMutate: async ({ id, patch }) => {
      const prev = await snapshot()
      qc.setQueryData<Row[]>(key, (rows) => rows?.map((r) => (r.id === id ? { ...r, ...patch } : r)))
      return { prev }
    },
    onSuccess: (_d, v) => !v.silent && toast.success(v.success ?? 'Alterações salvas.'),
    onError: (e, _v, ctx) => { restore(ctx?.prev); onError(e) },
    onSettled: settle,
  })

  const remove = useMutation({
    mutationFn: ({ id }: { id: string } & MutOpts) => source.remove(table, id),
    onMutate: async ({ id }) => {
      const prev = await snapshot()
      qc.setQueryData<Row[]>(key, (rows) => rows?.filter((r) => r.id !== id))
      return { prev }
    },
    onSuccess: (_d, v) => !v.silent && toast.success(v.success ?? 'Excluído.'),
    onError: (e, _v, ctx) => { restore(ctx?.prev); onError(e) },
    onSettled: settle,
  })

  return { create, update, remove }
}

export function useProfile() {
  const { source } = useSession()
  return useQuery({
    queryKey: [source?.kind, 'profile'],
    queryFn: () => source!.getProfile(),
    enabled: !!source,
  })
}

export function useUpdateProfile() {
  const source = useSource()
  const qc = useQueryClient()
  const key = [source.kind, 'profile']
  return useMutation({
    mutationFn: (patch: Partial<Profile> & { _toast?: string }) => {
      const { _toast, ...rest } = patch
      void _toast
      return source.updateProfile(rest)
    },
    onMutate: async (patch) => {
      await qc.cancelQueries({ queryKey: key })
      const prev = qc.getQueryData<Profile>(key)
      if (prev) qc.setQueryData(key, { ...prev, ...patch })
      return { prev }
    },
    onSuccess: (_d, v) => v._toast && toast.success(v._toast),
    onError: (e, _v, ctx) => {
      if (ctx?.prev) qc.setQueryData(key, ctx.prev)
      toast.error(e instanceof Error ? e.message : 'Não foi possível salvar.')
    },
    onSettled: () => qc.invalidateQueries({ queryKey: key }),
  })
}
