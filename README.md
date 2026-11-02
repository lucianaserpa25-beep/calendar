# Luciana Content Studio

Aplicação Next.js App Router + TypeScript + Tailwind para o planejamento de @lucianaserpaoficial. Kanban com dnd-kit, calendário mensal/semanal/lista, biblioteca, checklist, Stories diários, métricas manuais e backup.

## Rodar

Requer Node.js 22.12+ (validado com 24.19) e npm 11. Use o checkout existente, sem criar worktree.

```bash
cd /workspace/calendar
npm ci
npm run dev
```

Para produção: `npm run build` e `npm run start`. O servidor usa a porta 3000. Os scripts usam o compilador Webpack suportado pelo Next.js porque o Turbopack pode exigir portas de processamento indisponíveis em ambientes restritos. Fontes Inter e Cormorant Garamond são hospedadas localmente via pacotes npm.

## Dados iniciais reais

O arquivo original está em `src/data/luciana_calendario_30_dias_seed.json`, sem alterações. São 30 registros: **12 Reels, 10 Carrosséis e 8 dias só de Stories**, mais **30 tarefas independentes de Stories**, com IDs estáveis e vínculo ao conteúdo do respectivo dia. A campanha se chama **Plano Editorial — Novembro 2026**, mas suas datas originais vão de **03/11/2026 a 02/12/2026**; foram preservadas.

Na primeira abertura, o seed completo é gravado no IndexedDB ou, após autenticação autorizada, no Postgres. Não depende de um clique para preencher. Roteiro e legenda vazios no JSON continuam vazios, sem texto inventado. A restauração em Configurações pede confirmação e recupera apenas IDs ausentes, preservando edições e conclusão de tarefas existentes. Publicação confirmada é independente da coluna do Kanban. Nenhuma ação publica no Instagram.

## Modo local (padrão sem Supabase)

Não exige conta externa. O armazenamento é **IndexedDB, somente neste perfil de navegador e nesta origem**. Há aviso visível de que não existe login nem sincronização neste modo. Navegação privada, limpeza de dados, troca de domínio ou de porta podem eliminar ou isolar a base. Use Configurações → Exportar backup JSON regularmente. Os anexos locais de até 5 MB são incluídos como dados no backup; limites de espaço do navegador continuam aplicáveis. A aplicação mostra falhas de gravação e só confirma salvamento após completar a transação.

Se a nuvem estiver configurada mas indisponível, a tela de acesso oferece abertura **explícita de uma base local separada**. Não há migração silenciosa nem mistura entre contas e base local. Para transferir o planejamento, exporte o JSON na origem e importe no destino. Referências a anexos remotos continuam exigindo acesso ao projeto/conta original; arquivos locais importados em uma base de nuvem continuam embutidos nesse documento até que sejam reenviados pelo editor.

## Supabase: Postgres, Auth, Storage e RLS

1. Crie um projeto Supabase e execute `supabase/migrations/202611020001_studio.sql` no SQL Editor (ou aplique via Supabase CLI).
2. No Auth, desabilite cadastros públicos e convide/crie a conta autorizada no painel. Adicione o e-mail real em minúsculas à allowlist:
   ```sql
   insert into public.studio_members(email) values ('email-real@example.com') on conflict do nothing;
   ```
   O e-mail acima é ilustrativo; use a conta convidada. O login da aplicação usa magic link com `shouldCreateUser: false`.
3. Configure Auth → URL Configuration com a origem do app como Site URL e a mesma origem entre Redirect URLs. Configure a entrega de e-mails do Supabase se necessário.
4. Copie `.env.example` para `.env.local` e preencha **somente** `NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_ANON_KEY` (ou a chave pública publishable equivalente). Reinicie o servidor; para produção, gere novo build. Esses identificadores são públicos por definição. **Nunca coloque service_role, senha do banco ou outros segredos em variáveis NEXT_PUBLIC.**
5. Libere o domínio exato do projeto Supabase nas configurações de rede do ambiente, se houver allowlist. Nenhuma chave foi solicitada em chat ou incluída no código.
6. Entre pelo e-mail convidado. O primeiro acesso grava automaticamente o seed completo no Postgres.

O Postgres mantém um documento JSONB por proprietária em `studio_states`, com campanhas, conteúdos e tarefas validados por Zod. Este MVP não compartilha automaticamente a base entre contas. RLS exige `auth.uid() = owner_id` **e** e-mail em `studio_members`. Clientes não podem ler/editar a allowlist; apenas SQL administrativo pode alterá-la. Revisão otimista impede sobrescrita silenciosa em edição simultânea (inclusive entre abas locais): recarregue ao receber um conflito. O bucket `studio-assets` é privado, com caminho iniciado pelo UUID da conta, RLS e URLs assinadas por 60 segundos.

Remover um anexo do cartão remove a referência, mas não apaga imediatamente o objeto remoto: isso evita destruir um arquivo ainda citado por outro conteúdo ou backup. Faça a limpeza de órfãos e o backup dos objetos no painel do Supabase. O JSON não contém os bytes dos objetos remotos. Não existe chave administrativa na aplicação.

### Verificação de acesso antes de disponibilizar a nuvem

Use duas contas convidadas e uma não convidada em perfis separados. Confirme que cada convidada vê sua própria base, que a não convidada não consegue inserir/ler `studio_states`, e que requisições anônimas não leem a tabela nem os arquivos. Remova um e-mail da allowlist e confirme a perda de acesso. Esta validação exige projeto e credenciais reais; não foi executada no ambiente sem Supabase.

## Uso

- **Dashboard:** contagens reais, confirmações de publicação, atraso, progresso de checklists, distribuição de formatos e próximos conteúdos. “Publicado” no quadro não conta como publicação confirmada.
- **Meu Dia:** escolha a data, abra o conteúdo para concluir etapas ou reagendar e edite/conclua a tarefa de Stories independentemente. A campanha começa no dia 3; o dia 2 não recebe um conteúdo inventado.
- **Kanban:** arraste pela alça ou use o menu “Mover para” em qualquer tamanho de tela. As alterações são persistidas imediatamente.
- **Calendário:** navegue entre meses/semanas, escolha lista ou crie um conteúdo em uma data. Para mover, editar ou duplicar, abra o cartão.
- **Biblioteca:** busca por texto e filtros por formato, objetivo e status; drawer com todos os campos, anexos, métricas e checklist. “Salvar conteúdo” persiste a edição.
- **Resultados:** métricas manuais por post, formato ou tema; ausência de dados nunca vira zero fictício. Metricool é apenas uma integração futura, não conectada.
- **Configurações:** novas campanhas com todas as tarefas diárias do mês, preferências, restauração e importação/exportação JSON.

Importação JSON valida estrutura, datas, IDs únicos, referências e valores não negativos antes de substituir a base inteira, com confirmação. Exporte antes de importar. O CSV de métricas pode ser exportado como modelo em Resultados. A primeira coluna deve ser `id`, seguida de uma ou mais: `reach,views,likes,comments,saves,shares,profileVisits,whatsappClicks,appointments`. Campos vazios preservam valores anteriores; zero explícito é um dado coletado. IDs desconhecidos, duplicados, valores negativos ou colunas inválidas rejeitam a operação inteira. JSON/CSV não importam conteúdo de redes sociais automaticamente.

## Validação

```bash
npm run typecheck
npm test
npm run build
npm run test:e2e
```

Os testes de domínio conferem **todos os campos originais dos 30 registros**, contagens, tarefas, idempotência, progresso, duplicação/exclusão, validação de backup, CSV e datas. Os testes Playwright exercitam a aplicação real com IndexedDB, edição após recarregar, movimentação por menu, tarefas, CRUD, busca, calendário, métricas, exportação, campanhas e layout móvel. Cada teste usa um contexto de navegador isolado.

O Playwright usa `/usr/bin/chromium` neste ambiente. Em outra máquina, instale Chromium (`npx playwright install chromium`) e ajuste `PLAYWRIGHT_CHROMIUM_PATH` para o executável instalado, ou remova o `executablePath` da configuração para usar o navegador padrão do Playwright. Ele inicia o servidor de produção quando necessário; gere o build antes. Nenhuma verificação de Supabase real é simulada como aprovada.

## Resultado desta entrega

Validado em 02/11/2026: instalação reproduzível com `npm ci`, TypeScript, build de produção, **7 testes de domínio e 5 cenários de navegador aprovados**, incluindo arraste real, persistência após recarregar, CRUD, importação/exportação JSON/CSV, anexos e layout móvel. O JSON original também foi comparado byte a byte com o arquivo enviado, sem diferenças. Supabase não estava configurado nesta sessão; Auth, Postgres, Storage e RLS estão preparados no código/migração, mas exigem a validação com um projeto real descrita acima.

## Deploy na Vercel

Importe o repositório `lucianaserpa25-beep/calendar` na Vercel, usando a branch `main`, diretório raiz do repositório e framework Next.js. `vercel.json` define instalação via lockfile e build; não há diretório de saída customizado.

Antes do deploy, cadastre no projeto Vercel:

- `NEXT_PUBLIC_SUPABASE_URL`: `https://xuiqozvgukocxbpzkmdj.supabase.co`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: chave pública anon/publishable do projeto Supabase.

Sem as duas variáveis, o site usará o modo local sem login. Para usar acesso privado em nuvem, confirme a migração e os convites/allowlist descritos acima. Após a Vercel fornecer o domínio real de produção, configure esse domínio em Supabase → Authentication → URL Configuration, tanto em Site URL quanto em Redirect URLs. Não invente um domínio antes da publicação. Refaça o deploy se alterar variáveis NEXT_PUBLIC.

O deploy exige autorização na conta Vercel da proprietária. O envio de código ao GitHub não constitui publicação na Vercel.
