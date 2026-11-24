# Agenda Pro — Barber

Sistema de gestão e agendamento para barbearias. Esta reconstrução está sendo desenvolvida em uma branch separada para preservar a versão anterior.

## Primeira entrega
- Dashboard com indicadores do dia.
- Agenda com busca e filtros por status.
- Cadastro de agendamentos, clientes e serviços.
- Alteração de status dos atendimentos.
- Interface responsiva para desktop e celular.
- Persistência local de demonstração via `localStorage`.

## Identidade visual
- Tema oficial escolhido: **preto e dourado** — visual profissional, elegante e premium.
- Fundo escuro, superfícies em carvão e detalhes dourados para ações, navegação e destaques.
- Interface responsiva com contraste adaptado para uso em desktop e celular.

## Estrutura
- `index.html`: estrutura da aplicação.
- `styles.css`: identidade visual e responsividade.
- `app.js`: interações e dados de demonstração.

## Executar
Abra `index.html` no navegador ou publique a raiz do repositório em um host estático.

## Próximas etapas antes de produção
1. Criar projeto Supabase e aplicar a migration `supabase/migrations/202611240001_initial_schema.sql` (fundação inicial já versionada).
2. Configurar autenticação Supabase e validar o isolamento por barbearia (RLS) em staging.
3. Validar disponibilidade no servidor para impedir conflitos de horário.
4. Configurar perfis, profissionais, expediente e feriados.
5. Adicionar testes e configurar deploy de produção.

**Importante:** esta primeira entrega usa dados locais de demonstração. Os dados não são compartilhados entre dispositivos e ainda não representam uma agenda multiusuário em produção.


## Modelo comercial SaaS
- Plano único: **R$ 19,90/mês**.
- Teste grátis: **7 dias por barbearia**.
- A especificação da jornada de assinatura, estados, segurança e critérios de aceite está em [docs/SAAS_BILLING.md](docs/SAAS_BILLING.md).
- Provedor escolhido: Mercado Pago. O adaptador server-side inicial está em `backend/mercadopago.js`; veja `backend/README.md`.
- O schema inicial multi-tenant do Supabase está versionado em `supabase/`; ainda falta criar/configurar o projeto remoto e validar a migration.
- A cobrança real ainda não está ativa: faltam backend hospedado/autenticado, webhook validado e testes ponta a ponta.


## Supabase Auth (interface groundwork)
- Copy `supabase-config.example.js` to `supabase-config.js` and fill in the Supabase project URL and anon/publishable key.
- Apply both SQL migrations in `supabase/migrations/` in numerical order.
- The auth screen supports email/password signup, login, password reset and first-barbershop onboarding via the protected `create_my_barbershop` RPC.
- Configure email confirmation and redirect URLs in Supabase Auth.
- `supabase-config.js` is intentionally gitignored; never put a service-role key in the browser.
- After authentication, `cloud-data.js` loads services, clients and appointments from the current barbershop tenant and persists new records/status changes through Supabase. The integration is implemented but still requires live-project validation (RLS, relationship embedding, auth redirects, and concurrent booking conflicts).


## Supabase data integration
- `cloud-data.js` loads the authenticated barbershop's services, clients and appointments under the database RLS policies.
- New clients, services and appointments are written to Supabase; appointment status changes are persisted there as well.
- Appointment creation assigns the signed-in account as the professional and checks for overlapping appointments before insert. This client-side check is a convenience, not a concurrency-safe booking lock; enforce overlap prevention server-side/database-side before production.
- The browser integration has not yet been validated against a live Supabase project. Keep demo mode until the migrations, Auth URLs and public project config are configured and tested.
