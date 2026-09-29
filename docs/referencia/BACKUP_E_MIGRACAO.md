# Backup, restauração e migração do banco

Atualizado em 29/09/2026. Preços conferidos nos sites oficiais nesta data, em
dólar e **sem impostos**; conferir de novo antes de contratar.

## Decisão atual

- **Agora (testes):** continuar no Supabase Free, com backup diário próprio
  pelo GitHub Actions (`.github/workflows/backup-supabase.yml`).
- **Na abertura comercial (Fase 1):** subir para **Supabase Pro**. É um botão no
  painel: mesmo projeto, mesmo endereço, sem mudar código e sem tirar o site do ar.
- **Sair do Supabase:** só se o custo ou alguma limitação justificar. O passo a
  passo está no fim deste documento e o backup diário já gera tudo o que ele precisa.

## Opções de banco de dados

| Opção | Custo mensal | Qualidades | Defeitos e riscos |
| --- | --- | --- | --- |
| **Supabase Free** (atual) | US$ 0 | Grátis; tudo o que o site usa (banco, login da equipe, arquivos) | **Sem backup**; **pausa após 1 semana sem uso**; 500 MB; suporte só comunitário; não recomendado para dados reais de clientes |
| **Supabase Pro** (recomendado na abertura) | US$ 25 (inclui 1 servidor Micro) | Backup diário guardado 7 dias; sem pausa; 8 GB; suporte por e-mail; limite de gasto ligado por padrão; zero trabalho de migração | Custo em dólar; backup de 7 dias só volta o banco inteiro (voltar a um minuto exato é extra, a partir de US$ 100) |
| **Neon** (Postgres puro) | Pago pelo uso; um site pequeno costuma ficar em poucos dólares | Barato em uso baixo; restauração instantânea; desliga sozinho quando parado | **Não tem login nem arquivos**: teria que refazer o login da equipe e o armazenamento de fotos. Semanas de trabalho e risco de bug |
| **Servidor próprio** (Supabase instalado num VPS) | ~US$ 5 a 15 | Mais barato; controle total | Você vira o "zelador": atualizações, segurança, backup e quedas são problema seu. Só com um técnico dedicado |

**Resumo:** a troca que vale a pena é Free → Pro. As outras economizam pouco e
custam muito trabalho e risco.

## Hospedagem do site (Vercel)

| Opção | Custo mensal | Observação |
| --- | --- | --- |
| Vercel Hobby (atual) | US$ 0 | **Proibido para uso comercial** pelas regras da Vercel |
| **Vercel Pro** (recomendado na abertura) | US$ 20 (inclui US$ 20 de uso) | Permite uso comercial; limite de gastos; sem mudança de código |

**Custo estimado na abertura:** Supabase Pro + Vercel Pro = **US$ 45/mês**,
cerca de R$ 250 com dólar a R$ 5,50 e IOF do cartão. WhatsApp e domínio são à parte.

## Como funciona o backup diário

Todo dia às 06:00 (Fortaleza) o GitHub Actions:

1. Exporta o banco: papéis (`roles.sql`), estrutura (`schema.sql`) e dados
   (`data.sql`), incluindo os logins da equipe.
2. Copia os arquivos do Storage, **exceto** `comandas-roleta`. As fotos de
   comanda são apagadas em 36 horas pela política de privacidade, e guardá-las
   por 30 dias quebraria essa promessa.
3. Criptografa tudo com AES-256 usando a senha `BACKUP_PASSPHRASE`.
4. Guarda o arquivo por **30 dias** em Actions → execução → Artifacts.
5. **Testa a restauração:** sobe um Supabase descartável, carrega o backup e
   confere, tabela por tabela, se o número de linhas bate.

Se qualquer passo falhar, o GitHub manda e-mail avisando.

Limites: artefatos do GitHub duram no máximo 90 dias, e o espaço gratuito de um
repositório privado é limitado. Com o banco atual (~33 MB) cabe com folga.

### Configuração (uma vez só, feita pelo responsável)

No GitHub: repositório → **Settings** → **Secrets and variables** → **Actions**
→ **New repository secret**. Criar três:

| Nome | Onde pegar |
| --- | --- |
| `SUPABASE_DB_URL` | Supabase → botão **Connect** no topo → **Session pooler** → copiar a URI e trocar `[YOUR-PASSWORD]` pela senha do banco. Se ninguém souber a senha: Project Settings → Database → Reset password (o site não usa essa senha, então trocar é seguro). |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → Project Settings → API Keys → chave `service_role`. É o mesmo valor que já está na Vercel. |
| `BACKUP_PASSPHRASE` | Uma frase longa criada por você. **Guardar fora do GitHub** (gerenciador de senhas ou papel no cofre). Sem ela, nenhum backup abre. |

Depois: aba **Actions** → **Backup Supabase** → **Run workflow** para o primeiro teste.

Use o **Session pooler**, não a conexão direta: a conexão direta do Supabase só
funciona por IPv6, e os robôs do GitHub não têm IPv6.

### Privacidade

O backup contém telefones e dados de clientes (LGPD). Por isso: criptografia,
30 dias de retenção, acesso restrito a quem administra o repositório e fotos de
comanda excluídas. O prazo de 30 dias precisa constar na política de privacidade.

## Restaurar ou migrar para outro projeto Supabase

Use em caso de desastre ou mudança de conta/organização.

1. Criar o projeto novo no Supabase, na mesma região do atual.
2. Baixar o backup mais recente (Actions → execução → Artifacts) e abrir:
   `gpg -d supabase-DATA.tar.gz.gpg | tar -xz`
3. Carregar no projeto novo, usando a URI do Session pooler dele:
   ```bash
   psql --single-transaction --variable ON_ERROR_STOP=1 --file db/roles.sql --file db/schema.sql --command 'SET session_replication_role = replica' --file db/data.sql --dbname "URI_DO_PROJETO_NOVO"
   ```
4. Recriar os buckets e reenviar os arquivos de `storage/`.
5. Na Vercel, trocar `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   e `SUPABASE_SERVICE_ROLE_KEY` pelos do projeto novo e fazer redeploy.
6. No Supabase novo: Authentication → URL Configuration → incluir
   `https://www.clubecupim.com.br/acesso/definir-senha`; revisar modelos de e-mail.
7. Testar: login de cada papel, consulta de cliente, roleta de teste, crons.
8. Atualizar o ID do projeto em `AGENTS.md`, `docs/COMECE_AQUI.md` e neste arquivo.

As senhas da equipe continuam valendo, porque vão junto nos dados. Quem estava
logado precisa entrar de novo.

## Pendências relacionadas

- Registrar o histórico de migrações no Supabase (hoje não existe pelo CLI). Dono: Codex.
- Incluir o prazo de retenção dos backups na política de privacidade. Dono: responsável.
