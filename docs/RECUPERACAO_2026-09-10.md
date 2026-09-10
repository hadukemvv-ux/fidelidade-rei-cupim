# Recuperação do ambiente — 10/09/2026

## Situação encontrada

- O repositório remoto estava íntegro no commit `4594ce8` (`main`).
- A Vercel estava publicada e o domínio `clubecupim.com.br` permanecia acessível.
- O projeto Supabase associado à Vercel (`asjoubgoccbvftyggunz`) estava ativo, porém sem tabelas públicas.
- O projeto Supabase `projeto energia` não faz parte deste produto e não foi alterado.

## Recuperação aplicada

Foi adicionada a migração de fundação `202609010000_schema_base.sql`, reconstruída a partir dos contratos usados pela aplicação e das migrações incrementais existentes.

No Supabase correto foram aplicadas a fundação e as migrações de fidelidade, resgates, segurança, OTP, consentimento de aniversário, piloto e controle da roleta. A conferência posterior encontrou 21 tabelas públicas, incluindo clientes, transações, resgates, catálogo, sorteios, roleta e OTP. A rota pública de prêmios confirmou que o catálogo histórico da roleta continua acessível.

## Atenções antes de operação real

1. A fundação é uma reconstrução: deve ser validada com cadastro, consulta de saldo, resgate e painel administrativo antes de convidar clientes reais.
2. A integração WhatsApp/OTP exige a configuração válida do provedor (Twilio Verify) na Vercel.
3. O token Saipos deve ser rotacionado e salvo como segredo na Vercel.
4. Não houve importação de dados históricos, pois nenhum backup de dados foi localizado no repositório.

## Próximo ciclo recomendado

1. Ligar o ambiente local às mesmas variáveis protegidas da Vercel e validar a aplicação localmente.
2. Fazer um teste controlado ponta a ponta com um cliente de teste.
3. Cadastrar o catálogo de recompensas, prêmios da roleta e primeiros administradores.
4. Configurar WhatsApp/OTP e executar o piloto de até 10 clientes.

Consulte também `docs/ROADMAP.md` e `STATUS_ALPHA.md` para o roteiro de produto e os riscos já registrados.
