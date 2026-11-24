# Agenda Pro — Barber

Sistema de gestão e agendamento para barbearias. Esta reconstrução está sendo desenvolvida em uma branch separada para preservar a versão anterior.

## Primeira entrega
- Dashboard com indicadores do dia.
- Agenda com busca e filtros por status.
- Cadastro de agendamentos, clientes e serviços.
- Alteração de status dos atendimentos.
- Interface responsiva para desktop e celular.
- Persistência local de demonstração via `localStorage`.

## Estrutura
- `index.html`: estrutura da aplicação.
- `styles.css`: identidade visual e responsividade.
- `app.js`: interações e dados de demonstração.

## Executar
Abra `index.html` no navegador ou publique a raiz do repositório em um host estático.

## Próximas etapas antes de produção
1. Criar projeto Supabase e aplicar schema SQL.
2. Implementar autenticação e isolamento dos dados por barbearia (RLS).
3. Validar disponibilidade no servidor para impedir conflitos de horário.
4. Configurar perfis, profissionais, expediente e feriados.
5. Adicionar testes e configurar deploy de produção.

**Importante:** esta primeira entrega usa dados locais de demonstração. Os dados não são compartilhados entre dispositivos e ainda não representam uma agenda multiusuário em produção.


## Modelo comercial SaaS
- Plano único: **R$ 19,90/mês**.
- Teste grátis: **7 dias por barbearia**.
- A especificação da jornada de assinatura, estados, segurança e critérios de aceite está em [docs/SAAS_BILLING.md](docs/SAAS_BILLING.md).
- A cobrança real ainda depende da escolha e configuração do provedor de pagamento; a versão de demonstração não cobra clientes.
