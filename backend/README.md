# Backend — Mercado Pago

Este diretório contém o adaptador inicial de servidor. Ele **não deve ser executado no navegador**.

## O que já está preparado

- Cliente HTTP server-side para a API oficial do Mercado Pago.
- Criação de checkout hospedado para assinatura mensal de R$ 19,90.
- Consulta do estado de uma assinatura.
- Referência externa vinculada ao identificador da barbearia.
- Validação básica dos parâmetros e suporte a chave de idempotência.
- O teste grátis permanece sob controle do Agenda Pro; nenhuma assinatura é criada durante o cadastro/teste.

## Configuração local

Requisitos: Node.js 18 ou superior.

Configure a variável de ambiente no servidor:

```bash
MERCADOPAGO_ACCESS_TOKEN=TEST-...
```

Nunca coloque Access Token em `index.html`, `app.js`, arquivos públicos, commits, logs ou variáveis prefixadas como `VITE_`/ `NEXT_PUBLIC_`.

## Uso pelo backend autenticado

```js
const { createSubscriptionCheckout } = require('./mercadopago');

const checkout = await createSubscriptionCheckout({
  email: authenticatedUser.email,
  tenantId: authenticatedUser.tenantId,
  backUrl: 'https://SEU-DOMINIO/assinatura/retorno',
  idempotencyKey: requestId,
});

// Persistir checkout.subscriptionId e tenantId no banco antes de devolver checkoutUrl.
// Redirecionar o navegador para checkout.checkoutUrl.
```

O exemplo é um contrato de integração, não uma rota HTTP pronta. A rota real deve exigir sessão autenticada, verificar que o usuário administra aquele tenant e confirmar que o teste terminou ou que o usuário escolheu contratar. Não aceitar `tenantId`, preço ou status enviados livremente pelo navegador.

## Ainda necessário antes de produção

1. Definir e configurar o backend hospedado e o banco de dados multi-tenant.
2. Criar rota autenticada para iniciar checkout e persistir a associação tenant/assinatura.
3. Implementar endpoint de Webhooks, validar assinatura/origem e consultar o recurso na API antes de alterar o estado local.
4. Implementar idempotência e processamento de eventos repetidos.
5. Validar Pix e cartão no checkout de teste da conta brasileira do Mercado Pago, incluindo renovação e estados pendentes.
6. Implementar cancelamento, falha, reembolso, tolerância e auditoria.
7. Só ativar produção após testes ponta a ponta.

A criação de assinatura no Mercado Pago usa `POST /preapproval`; consulta usa `GET /preapproval/{id}`. O checkout hospedado devolve `init_point`. Consulte a documentação oficial antes de atualizar o contrato da API.
