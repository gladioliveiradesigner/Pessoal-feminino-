# Lume — organização da vida pessoal

App web (PWA) para organizar rotina, agenda, tarefas e hábitos em um espaço pessoal, privado e acolhedor.

**Fase 1:** login e cadastro, onboarding, Meu dia (widgets reorganizáveis), Agenda (mês, semana, dia e lista, com recorrência, lembretes e categorias), Tarefas (prioridade, subtarefas, recorrência, etiquetas, filtros e busca), Hábitos e rotinas (manhã/tarde/noite, metas por dia, sequências, calendário, percentuais), check-in de humor, perfil (tema claro/escuro, cor principal, módulos visíveis, categorias, exportar dados, excluir conta) e modo demonstração.

**Fase 2 (em andamento):** Finanças — receitas e despesas em reais, categorias, formas de pagamento, contas a pagar e a receber, contas fixas que geram os lançamentos sozinhas, orçamento mensal (total e por categoria), metas de economia, gráficos, histórico com filtros por período e despesa rápida pelo botão +.

## Rodar localmente

```bash
npm install
cp .env.example .env.local   # preencha com a URL e a chave publicável do Supabase
npm run dev
```

Sem `.env.local`, o app abre e oferece apenas o **modo demonstração** (dados fictícios em memória, nada é salvo).

## Banco de dados (Supabase)

1. Crie um projeto no Supabase.
2. Aplique os arquivos de `supabase/migrations/` **em ordem** (pelo SQL Editor ou `supabase db push`).
3. Em *Authentication → URL Configuration*, cadastre a URL do app (para confirmação de e-mail e recuperação de senha).

Todas as tabelas têm **RLS**: cada usuária lê e altera apenas as próprias linhas. Visitantes anônimos não têm acesso a nenhuma tabela. A exclusão de conta (`delete_my_account`) apaga o usuário e, em cascata, todos os dados.

## Scripts

| Comando | O que faz |
| --- | --- |
| `npm run dev` | servidor de desenvolvimento |
| `npm run build` | checagem de tipos + build de produção com service worker |
| `npm test` | testes de unidade (recorrência, filtros, sequências) |
| `npm run db:test` | aplica a migration num PostgreSQL local e testa as políticas RLS |
| `npm run icons` | gera os ícones PNG do PWA a partir de `public/icons/icon.svg` |

## Estrutura

```
src/
  auth/         sessão (Supabase ou demonstração)
  data/         tipos e fontes de dados (supabaseSource, demoSource)
  hooks/        useTable / useTableMutations / useProfile (TanStack Query)
  lib/          datas, recorrência, regras de domínio, módulos, cores
  components/   ui/ (botões, campos, modais) e layout/ (menu, barra inferior, +)
  features/     dashboard, agenda, tasks, habits, onboarding, profile, explore, auth
supabase/migrations/   esquema, gatilhos e RLS
```

Para adicionar um módulo (ex.: Finanças): crie a migration com RLS, registre a tabela em `data/types.ts` (`Tables`), crie a pasta em `features/`, a rota em `App.tsx` e marque o módulo como `available` em `lib/modules.ts`.

Veja `docs/ARQUITETURA.md` para decisões, privacidade/LGPD e próximos passos.
