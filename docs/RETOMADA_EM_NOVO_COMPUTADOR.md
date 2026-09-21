# Retomada em novo computador

Atualizado em 21/09/2026. Este guia permite recuperar o trabalho sem depender
do computador anterior, de histórico de conversa ou de memória.

## Estado exato deste checkpoint

- Repositório oficial: `https://github.com/hadukemvv-ux/fidelidade-rei-cupim`.
- Branch de trabalho: `main`.
- Última alteração funcional publicada: `f436a6d` (`fix: route staff to their
  operational access`), confirmada como `Ready` na Vercel em 18/09/2026.
- Produção: `https://www.clubecupim.com.br`; projeto Vercel
  `fidelidade-rei-cupim`.
- Banco correto: Supabase `asjoubgoccbvftyggunz`. Não usar o projeto Energia.
- Roleta V2 continua em **piloto técnico não comercial**: QR de 10 minutos,
  prêmio interno sem custo e sem baixa de cupom, pontos ou benefício real.
- O próximo teste operacional está pausado a pedido do responsável. Não há
  lembrete ativo para executá-lo.

## Preparar a máquina

1. Instale Git, Node.js LTS e um editor de código.
2. Faça login nas mesmas contas do GitHub, Vercel e Supabase. Ative MFA e não
   compartilhe senhas, códigos ou tokens em chat.
3. Clone o código e confira a base:

```bash
git clone https://github.com/hadukemvv-ux/fidelidade-rei-cupim.git
cd fidelidade-rei-cupim
git branch --show-current
git log -1 --oneline
git status --short
```

O resultado esperado é `main`, um commit mais recente ou igual a `f436a6d` e
nenhuma alteração local. Se vier de uma cópia antiga do projeto, o arquivo
`supabase/migrations/202609120001_comandas_roleta_v2.sql` pode aparecer como
não rastreado: é um rascunho local, não foi aplicado nem enviado ao GitHub e
não deve ser incluído em commit, executado ou apagado sem revisão dedicada.

## Configurar segredos sem expô-los

Para desenvolvimento, crie um `.env.local` que nunca será enviado ao GitHub.
As chaves devem ser recuperadas nos painéis autorizados, sem copiar valores para
documentos, commits ou conversas.

Nomes necessários no projeto:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SAIPOS_DATA_API_TOKEN`
- `CUSTOMER_SESSION_SECRET`
- `CRON_SECRET`

`SAIPOS_DATA_API_TOKEN`, `SUPABASE_SERVICE_ROLE_KEY`,
`CUSTOMER_SESSION_SECRET` e `CRON_SECRET` são segredos de servidor: nunca
devem começar com `NEXT_PUBLIC_`, ir para o navegador ou aparecer em tela.
Na Vercel, preservar valores diferentes para ambientes quando houver Preview;
em qualquer dúvida, não rotacionar nem sobrescrever uma chave de produção.

## Verificar antes de alterar

```bash
npm install
npx tsc --noEmit
npm run test:unit
npm run dev
```

Na última checagem, tipos passaram e a suíte tinha `40/40` testes aprovados.
O lint global ainda contém pendências em módulos legados pausados; registrar
qualquer nova falha em vez de escondê-la. O build local só é útil depois que as
variáveis de ambiente estiverem corretas.

## Ordem obrigatória de leitura

1. `docs/COMECE_AQUI.md`
2. `docs/ROADMAP.md`
3. `docs/PERMISSOES_OPERACIONAIS.md`
4. `docs/TESTES_PENDENTES_PRE_LANCAMENTO.md`
5. `docs/SAIPOS_VALIDACAO_COMANDA.md`
6. `docs/PRIVACIDADE_E_RESPOSTA_A_INCIDENTES.md`

Documentos datados antes de 18/09/2026 explicam a história, mas não substituem
essa sequência.

## Onde o trabalho parou

O fluxo foi preparado, mas não está aberto ao público. O teste que falta deve
ser feito só quando autorizado:

1. Confirmar login de uma conta de cada papel: garçom vai para
   `/garcom/comanda`; caixa para `/caixa`; gestor para `/admin` sem escrita;
   superadmin para `/admin` com escrita.
2. Como garçom, enviar duas fotos privadas de uma comanda: cabeçalho com mesa,
   abertura e ID do Pedido; e total com valor/pagamento. O sistema lê os campos
   e a pessoa digita somente o total para conferência antes de gerar QR de
   teste.
3. Escanear o QR em outro telefone e realizar um giro único de teste. Não usar
   o cupom em venda, não liberar pontos e não fazer divulgação.
4. No dia seguinte, conferir a reconciliação em `/admin/operacao-roleta` e a
   consulta em `/admin/saipos`. A rotina Vercel roda na janela de 07:00–07:59
   BRT e só registra compatibilidade/divergência; não concede benefício nem
   pune operador.

Já foi confirmado que o ID de pedido da comanda é útil para conferência
posterior: pedido `872482756`, Mesa 99, R$ 274,45. Ainda falta provar a
latência de cada tipo de venda e a representação de uma venda realmente
cancelada; número físico da mesa não é uma chave confiável.

## Regra de entrega de qualquer mudança

1. Trabalhar em uma frente pequena.
2. Rodar verificações proporcionais ao risco.
3. Atualizar `README.md`, o roadmap e o caderno de testes quando o estado mudar.
4. Conferir `git status`, deixando segredos e rascunhos fora do commit.
5. Enviar para `main` e confirmar o deploy `Ready` na Vercel.

Se houver incidente ou suspeita de acesso indevido, não improvisar: abrir
`docs/PRIVACIDADE_E_RESPOSTA_A_INCIDENTES.md` e usar o procedimento de
contenção documentado.
