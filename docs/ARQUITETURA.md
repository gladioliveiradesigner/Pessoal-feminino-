# Arquitetura

## Visão geral
- **SPA** React 19 + TypeScript + Vite, rotas com React Router e carregamento sob demanda por tela.
- **Dados** via `DataSource` (interface única). Duas implementações:
  - `supabaseSource`: PostgreSQL do Supabase protegido por RLS.
  - `demoSource`: memória da aba, com dados fictícios claramente identificados. Nunca chega ao servidor.
  Uma futura integração bancária, cache offline ou backend próprio entra como outra implementação, sem mexer nas telas.
- **Estado do servidor** com TanStack Query: cache compartilhado entre telas, atualização otimista (marcar tarefa/hábito responde na hora) e reversão automática com aviso em caso de erro.
- **Formulários** com react-hook-form + zod (mensagens em português).
- **PWA** com vite-plugin-pwa: manifesto, ícones, tela de abertura, cache da interface para abrir offline e aviso quando cai a conexão. Dados pessoais **não** são guardados no cache do service worker.
- Pronto para **Capacitor**: SPA estática, sem dependência de servidor Node, áreas seguras (`env(safe-area-inset-*)`) já respeitadas.

## Modelo de dados (Fase 1)
| Tabela | Conteúdo |
| --- | --- |
| `profiles` | nome, objetivos, interesses, tema, cor, módulos ativos, widgets do início, início da semana, data do onboarding |
| `categories` | categorias de tarefas e compromissos (6 sugeridas criadas no cadastro, editáveis) |
| `events` | compromissos com horário, duração, local, categoria, recorrência (diária/semanal/mensal/anual, intervalo, até) e lembretes |
| `tasks` | tarefas com prioridade, data/hora, categoria, etiquetas, recorrência, conclusão; subtarefas via `parent_id` |
| `habits` | hábitos com ícone, cor, dias da semana, meta diária, unidade, período (manhã/tarde/noite) e arquivamento |
| `habit_logs` | registro diário de cada hábito (único por hábito e dia) |
| `mood_entries` | humor e energia do dia (dado sensível) |

### Finanças (Fase 2)
| Tabela | Conteúdo |
| --- | --- |
| `finance_categories` | categorias de receita e despesa (sugeridas no cadastro, editáveis) |
| `payment_methods` | Pix, débito, crédito, dinheiro e outras, com arquivamento |
| `transactions` | lançamentos em centavos; `status = pending` vira conta a pagar/receber; `source`/`external_id` preparados para importação bancária futura |
| `recurring_transactions` | contas fixas; o app gera as ocorrências até o fim do próximo mês, sem duplicar (índice único) |
| `budgets` | orçamento do mês, total (`category_id` nulo) ou por categoria |
| `savings_goals` | metas de economia com valor guardado e prazo |

Gatilho `assert_same_owner` impede referenciar categoria, tarefa-mãe ou hábito de outra pessoa.

## Privacidade e LGPD
- RLS em todas as tabelas; `anon` sem acesso.
- Sem analytics, sem logs de dados pessoais; mensagens de erro genéricas.
- Exportação completa em JSON e exclusão definitiva da conta pelo próprio app.
- Módulos sensíveis (bem-estar, ciclo, remédios) serão opt-in e terão políticas próprias.

## Recorrência
- Compromissos: expandidos no cliente para o intervalo visível. Editar ou excluir altera a série toda (exceções por ocorrência ficam para uma próxima versão).
- Tarefas: ao concluir uma tarefa recorrente, a próxima é criada com a nova data (e as subtarefas são copiadas em aberto).

## Roadmap
- **Fase 2:** ~~Finanças~~ (pronto), Metas, Diário, Casa, Treino e academia, Filhos, Pets.
- **Fase 3:** Bem-estar (humor, sono, autocuidado), Ciclo menstrual, Remédios, Skin care, notificações push, offline avançado.
