# Auditoria técnica e checkpoint — 16/09/2026

Este arquivo é o checkpoint técnico mais recente. Ele registra o que foi
inspecionado, o que foi corrigido no código e o que ainda precisa ser aplicado ou
testado. Não substitui revisão jurídica, nem autoriza lançamento público.

## Escopo e evidências

- Repositório: `hadukemvv-ux/fidelidade-rei-cupim`, branch `main`.
- Produção: projeto Vercel `fidelidade-rei-cupim`, domínio `clubecupim.com.br`.
- Banco em escopo: Supabase `asjoubgoccbvftyggunz`. O projeto Energia não faz
  parte deste trabalho.
- A Roleta V2 segue `v2_publicada=false` e `v2_modo_teste=true`. Nenhuma alteração
  desta auditoria publica roleta, libera prêmio ou exclui dados.
- Verificações anteriores ao checkpoint: TypeScript aprovado e `32/32` testes
  unitários aprovados. O lint global ainda tem pendências no legado pausado e
  precisa ser saneado antes da abertura.

## Achados críticos e decisão

| Achado | Risco | Tratamento |
| --- | --- | --- |
| RPC `usar_cupom_promocional` era `SECURITY DEFINER` e executável por `PUBLIC`, `anon` e `authenticated` | consumo/auditoria de cupom por chamada REST direta | revogar execução pública e permitir apenas `service_role` |
| `garcons` e `premios_roleta` tinham políticas públicas permissivas | leitura/alteração direta de superfícies legadas | revogar privilégios, remover as políticas e manter RLS ativa |
| Bucket `sorteios` era público e aceitava upload do cliente | exposição ou recebimento de arquivo fora do fluxo atual | torná-lo privado e remover políticas públicas; objetos não são apagados |
| Baixa do cupom legado fazia leitura e atualização separadas | dupla validação em concorrência | criar RPC atômica, com lock e evento de auditoria |
| Sessão do cliente podia derivar segredo da chave `service_role` | acoplamento perigoso entre segredo de sessão e privilégio de banco | exigir `CUSTOMER_SESSION_SECRET` exclusivo |
| Consulta de resgate revelava se um telefone tinha cadastro | enumeração de clientes | resposta pública neutra, sem consulta de cadastro |
| Redefinição de PIN não respeitava modo de contenção | ação de conta durante incidente | bloquear antes de processar a requisição |
| API administrativa aceitava allowlist de e-mail ou token compartilhado | privilégio difícil de revogar e sem papel operacional | exigir JWT + papel ativo em `perfis_operacionais` |

## Alterações locais desta entrega

1. `src/lib/customerSession.ts` e `src/lib/whatsappOtp.ts` exigem segredo de
   sessão exclusivo; não há mais fallback para a chave de serviço.
2. `/api/redefinir-pin` passa a obedecer a contenção.
3. `/api/resgate/check` não consulta nem revela status de cadastro; a interface
   segue para o PIN e oferece cadastro separado.
4. `/api/resgate` usa aleatoriedade criptográfica para código legado e devolve
   resposta neutra para conta inexistente/pré-cadastro.
5. `/api/validar` exige papel `caixa` e usa baixa atômica
   `usar_resgate_legado`.
6. O helper administrativo compatível exige papel operacional ativo. Escritas de
   produto, piloto e sincronização foram elevadas a `superadmin`.
7. A rota pública da roleta antiga responde `410`; a home não anuncia mais
   tickets/sorteio enquanto esse programa permanece congelado.
8. A migração abaixo contém as mudanças de banco. Ela é idempotente onde isso é
   seguro e não apaga registros nem arquivos:
   `supabase/migrations/202609160001_hardening_critico_legado.sql`.

## Aplicação e verificação executadas

1. A migração `202609160001_hardening_critico_legado.sql` foi aplicada no
   Supabase correto em 16/09. O rascunho não versionado de comanda/foto da
   Roleta V2 não foi aplicado.
2. A conferência abaixo foi executada sem dados de clientes:

```sql
select grantee, privilege_type
from information_schema.routine_privileges
where routine_schema = 'public'
  and routine_name in ('usar_cupom_promocional', 'usar_resgate_legado')
order by routine_name, grantee;

select tablename, policyname, roles, cmd
from pg_policies
where schemaname = 'public'
  and tablename in ('garcons', 'premios_roleta', 'resgates');

select id, public, file_size_limit, allowed_mime_types
from storage.buckets
where id = 'sorteios';
```

Resultado confirmado: as duas RPCs só listam `service_role` e `postgres`; não
restam políticas públicas em `garcons`, `premios_roleta` ou `resgates`; o bucket
`sorteios` está `public=false`.

3. Na Vercel, `CUSTOMER_SESSION_SECRET` foi criado como **Secret** em Production
   com valor aleatório independente. Ele não reutiliza a
   `SUPABASE_SERVICE_ROLE_KEY`. Se forem criados deploys Preview, cadastrar um
   segredo diferente antes de usar rotas de sessão nesses ambientes.
4. A variável `SAIPOS_TOKEN` está marcada pela Vercel como possível segredo. Sem
   expor o valor atual, convertê-la para **Secret** se a interface preservar o
   valor; se não preservar, gerar/obter token novo na Saipos, gravá-lo como Secret
   e testar o webhook antes de revogar o antigo.
5. O próximo passo é enviar o commit e confirmar o deploy como `Ready`.

## Testes de regressão deste hardening

- Sem JWT ou com JWT de cliente, chamadas às rotas administrativas devem receber
  `401/403`; papel `caixa` não pode gerir pessoas, produtos ou sincronização.
- Uma conta `caixa` pode consultar e baixar um cupom de teste; duas baixas
  paralelas devem produzir no máximo uma confirmação.
- Um POST anônimo para as RPCs antigas deve ser recusado por privilégio.
- Em navegação anônima, dois telefones distintos em `/resgate` devem receber a
  mesma resposta inicial, sem mensagem que confirme cadastro.
- Com contenção ativa, redefinição de PIN, resgate e rotas públicas críticas não
  criam registros.
- Depois do deploy, abrir `/`, `/resgate`, `/privacidade` e `/admin` com a conta
  de teste; as sessões de cliente devem usar o novo segredo sem erro.

O roteiro detalhado e espaço para evidências estão em
`docs/TESTES_PENDENTES_PRE_LANCAMENTO.md`.

## Pendências não resolvidas por código

1. **Regras de nível:** há duas escalas intencionais, mas com nomes próximos: a
   fidelidade tem quatro níveis por gasto em 90 dias; a Roleta V2 fechada tem
   cinco faixas por valor da compra. A documentação foi esclarecida, mas antes do
   piloto deve-se decidir se os nomes serão diferenciados na experiência do
   cliente para evitar interpretação de que uma faixa altera o saldo.
2. **Saipos:** falta contrato técnico para identificar venda paga, cancelada e
   estornada em tempo confiável. Foto de comanda não pode liberar QR automático.
3. **Roleta V2:** continua fechada até piloto ponta a ponta, custo/prêmios e
   revisão jurídica da mecânica aleatória.
4. **LGPD:** aviso e contenção existem, mas o controlador, canal de direitos,
   retenção, contratos de operadores e revisão jurídica devem ser concluídos
   antes da coleta pública. Em incidente com risco ou dano relevante, a LGPD/ANPD
   exigem análise e comunicação nos termos aplicáveis; o plano interno contém os
   modelos e o registro de incidente.
5. **Autenticação Supabase:** habilitar manualmente a proteção contra senhas
   vazadas e revisar URLs de redirecionamento, SMTP e MFA. Esta auditoria não
   mudou configurações de conta por interface.
6. **Dependências:** `npm audit --omit=dev` apontou vulnerabilidades altas em
   `xlsx` e em `ws` indireto do Supabase. A atualização deve ocorrer numa entrega
   isolada, com testes de importação e sincronização.
7. **Legado:** tabelas e rotas antigas foram isoladas, não apagadas. A exclusão
   ou anonimização depende de mapa de retenção, backup/restauração testado e
   confirmação de ausência de referência, conforme `docs/LIMPEZA_DO_LEGADO.md`.

## Fonte normativa a consultar na etapa jurídica

- LGPD, especialmente art. 48: https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2018/lei/l13709compilado.htm
- ANPD — comunicação de incidente: https://www.gov.br/anpd/pt-br/canais_atendimento/agente-de-tratamento/comunicado-de-incidente-de-seguranca-cis
