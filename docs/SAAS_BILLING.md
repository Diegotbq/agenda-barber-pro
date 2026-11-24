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
4. Antes do fim do teste, a plataforma avisa que o período está terminando; não solicita cartão e não inicia cobrança automática.
5. Ao terminar o teste, a conta passa para o estado expirado/aguardando assinatura e apresenta a opção de contratar o plano por R$ 19,90/mês.
6. O cliente escolhe iniciar a assinatura, seleciona **Pix ou cartão** e conclui o pagamento em um checkout seguro. A assinatura só passa para ativa após confirmação válida do provedor.
7. Se o cliente não contratar, não há cobrança. Os dados da barbearia ficam preservados conforme a política de retenção, e a conta pode ser reativada após contratação.

## Formas de pagamento

- **Pix:** oferecer como opção de pagamento da assinatura. A experiência de renovação (por exemplo, novo pagamento a cada ciclo ou Pix recorrente, se suportado pelo provedor escolhido) será definida na integração.
- **Cartão:** oferecer checkout seguro e recorrência mensal somente após o cliente escolher contratar e autorizar essa modalidade.
- O fim do teste grátis nunca dispara cobrança por si só. Não exigir cartão no cadastro e não cobrar sem consentimento explícito.
- Não armazenar dados completos de cartão na aplicação; usar os componentes/tokenização do provedor.

## Estados de assinatura

- `trialing`: período gratuito de 7 dias em andamento, sem cartão cadastrado obrigatório.
- `awaiting_payment`: teste encerrado; cliente ainda não contratou ou está no checkout. Não cobrar automaticamente.
- `active`: assinatura paga e válida, após confirmação do provedor.
- `past_due`: pagamento de uma assinatura já contratada pendente/recusado, conforme política de tolerância.
- `canceled`: assinatura cancelada; manter acesso até o fim do período pago, conforme retorno do gateway.
- `expired`: conta sem teste ativo e sem assinatura válida, se aplicável após política de retenção.

## Regras técnicas e de segurança

- Datas, estado da assinatura e permissões são controlados no backend, nunca confiados ao relógio ou ao JavaScript do navegador.
- Cada barbearia é um tenant; usuários só podem acessar dados da própria barbearia.
- O provedor de pagamento é a fonte de verdade para cobranças. Atualizações chegam por webhooks autenticados e idempotentes.
- Criar uma página de planos/checkout, uma tela de assinatura e uma área para atualizar forma de pagamento/cancelar.
- Registrar eventos de assinatura e cobranças para auditoria.
- Não bloquear nem apagar os dados do estabelecimento por falha de pagamento; aplicar política de acesso clara e permitir reativação.

## Decisões ainda necessárias antes de ativar cobrança real

1. Provedor de pagamento que aceite Pix e cartão e atenda ao fluxo de assinatura desejado.
2. Definir se Pix será renovado por pagamento a cada ciclo ou por Pix recorrente, conforme suporte do provedor.
3. Período de tolerância após falha de pagamento de uma assinatura contratada.
4. Política de cancelamento, reembolso e comunicação ao cliente.

## Critérios de aceite

- Uma barbearia não consegue iniciar vários testes gratuitos usando a mesma conta/estabelecimento.
- O teste dura exatamente 7 dias, calculados no servidor.
- Nenhum cartão é exigido para iniciar o teste.
- Não há cobrança automática ao fim do teste; o cliente precisa escolher contratar e concluir o pagamento.
- O checkout oferece Pix e cartão.
- A assinatura só fica ativa após confirmação do pagamento pelo provedor.
- Webhooks repetidos não duplicam cobranças nem alteram incorretamente o estado.
- Uma barbearia não consegue consultar ou alterar os dados de outra.
