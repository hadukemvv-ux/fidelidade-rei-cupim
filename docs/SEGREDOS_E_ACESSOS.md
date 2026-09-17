# Segredos e acessos — padrão vigente

Atualizado em 17/09/2026. Este documento registra onde cada variável deve
existir e evita tratar chaves públicas como se fossem senhas, ou reutilizar um
segredo entre fornecedores.

| Variável | Tipo na Vercel | Escopo | Regra |
| --- | --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Config | Ambientes necessários | Pública por design; não contém privilégio. |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Config | Ambientes necessários | Pública por design; segurança depende de RLS, não de ocultação. |
| `SAIPOS_ID` | Config | Production | Identificador operacional, nunca prefixado com `NEXT_PUBLIC_`. |
| `SUPABASE_SERVICE_ROLE_KEY` | Secret | Production | Servidor somente; jamais logar, expor ao navegador ou reutilizar. |
| `CUSTOMER_SESSION_SECRET` | Secret | Production | Exclusivo para sessões de cliente, diferente da Service Role. |
| `CRON_SECRET` | Secret | Production | Exclusivo para chamadas internas de cron. |
| `SAIPOS_DATA_API_TOKEN` | Secret | Production | Exclusivo para consultar dados da Saipos; o código adiciona `Bearer `. |
| `SAIPOS_WEBHOOK_SECRET` | Secret | Production | Reservado para futuro webhook oficialmente documentado; não criar nem reutilizar por enquanto. |

## Migração segura do token Saipos

1. Criar `SAIPOS_DATA_API_TOKEN` como **Secret**, somente em Production, com o
   token bruto da API de Dados — sem aspas e sem `Bearer `.
2. Publicar o projeto e executar o diagnóstico de leitura em `/admin/saipos`.
3. Só após uma resposta válida da Saipos, excluir a Config legada
   `SAIPOS_TOKEN`. A exclusão é uma ação deliberada, registrada e irreversível
   para a configuração antiga.

Não revelar, colar em chat, incluir em captura de tela, commitar ou registrar em
logs qualquer valor Secret. Rotacionar um segredo no fornecedor quando houver
suspeita real de exposição e registrar a data, responsável e sistemas afetados.
