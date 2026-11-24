# Agenda Pro — Modelo SaaS e assinaturas

## Oferta comercial

- Produto: Agenda Pro para barbearias.
- Plano: único, chamado **Agenda Pro**.
- Preço: **R$ 19,90 por mês**.
- Avaliação gratuita: **7 dias por conta/barbearia**.
- Sem planos adicionais ou limites artificiais por funcionalidade nesta primeira oferta.

## Jornada de assinatura

1. A barbearia cria sua conta e informa os dados do estabelecimento.
2. O sistema cria uma assinatura em avaliação, registrando início e fim do teste no servidor.
3. Durante os 7 dias, a conta tem acesso aos recursos do plano.
4. Antes do fim do teste, a plataforma informa a data de início da cobrança e solicita a forma de pagamento.
5. Ao terminar o teste, a assinatura passa para ativa somente após confirmação válida do provedor de pagamento.
6. Em caso de pagamento recusado ou assinatura cancelada/expirada, a plataforma aplica um estado de acesso restrito, preservando os dados para reativação conforme política definida.

## Estados de assinatura

- `trialing`: período gratuito em andamento.
- `active`: assinatura paga e válida.
- `past_due`: pagamento pendente/recusado, em período de tolerância se configurado.
- `canceled`: cancelada; manter acesso até o fim do período pago, conforme retorno do gateway.
- `expired`: teste encerrado sem conversão ou assinatura encerrada.

## Regras técnicas e de segurança

- Datas, estado da assinatura e permissões são controlados no backend, nunca confiados ao relógio ou ao JavaScript do navegador.
- Cada barbearia é um tenant; usuários só podem acessar dados da própria barbearia.
- O provedor de pagamento é a fonte de verdade para cobranças. Atualizações chegam por webhooks autenticados e idempotentes.
- Não armazenar dados completos de cartão na aplicação.
- Criar uma página de planos/checkout, uma tela de assinatura e uma área para atualizar forma de pagamento/cancelar.
- Registrar eventos de assinatura e cobranças para auditoria.
- Não bloquear nem apagar os dados do estabelecimento por falha de pagamento; aplicar política de acesso clara e permitir reativação.

## Decisões ainda necessárias antes de ativar cobrança real

1. Provedor de pagamento e métodos aceitos (cartão, Pix ou ambos).
2. Se o cartão será solicitado no início do teste ou apenas ao final.
3. Período de tolerância após falha de pagamento.
4. Política de cancelamento, reembolso e comunicação ao cliente.

## Critérios de aceite

- Uma barbearia não consegue iniciar vários testes gratuitos usando a mesma conta/estabelecimento.
- O teste dura exatamente 7 dias, calculados no servidor.
- Não há cobrança antes do fim do teste, conforme a oferta apresentada no checkout.
- O sistema só ativa a assinatura mediante confirmação do provedor.
- Webhooks repetidos não duplicam cobranças nem alteram incorretamente o estado.
- Uma barbearia não consegue consultar ou alterar os dados de outra.
