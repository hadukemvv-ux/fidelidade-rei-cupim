# Roteiro mestre de testes pendentes — pré-lançamento

Atualizado em 18/09/2026. Este é o caderno único para executar testes aos poucos, sem depender da memória e sem usar clientes reais. Ele complementa os guias específicos; quando um teste for concluído, registre data, executor, ambiente, resultado e evidência na seção final.

> Regra: o piloto técnico da Roleta V2 jamais libera benefício comercial nem permite baixa de cupom. Use uma conta e um telefone de teste, e nunca compartilhe PIN, token, QR ou segredo em conversa, planilha ou captura de tela.

## Estado antes dos testes

| Frente | Estado em 16/09 | Pode testar agora? |
| --- | --- | --- |
| Acessos operacionais | Contas, papéis e auditoria existem | Sim, com e-mails de teste/reais autorizados |
| Privacidade e contenção | Implementadas, aguardam teste controlado | Sim, em horário sem uso |
| Fluxo antigo de garçons | Pausado e sem dados na tela | Sim, teste de bloqueio |
| Roleta V2 | Piloto técnico ativo, prêmio interno sem valor | Sim, apenas com QR de 10 minutos e sem baixa comercial |
| Venda paga Saipos | Aguardando resposta técnica | Não para operação real |
| Cupom V2/caixa | Implementado, precisa piloto controlado | Apenas com cupom de teste |
| WhatsApp OTP | Desligado, sem número/plataforma oficial | Não |
| Backup/restauração | Sem evidência de restauração | Planejar antes de abrir |

## Preparação comum

1. Confirme que o último deploy da Vercel está `Ready` e anote o commit.
2. Use o Supabase `asjoubgoccbvftyggunz`; o projeto Energia é fora de escopo.
3. Crie uma conta de cliente identificada como teste e, quando necessário, uma conta de operador de teste. Não transforme cadastro Saipos real em massa de teste.
4. Abra uma planilha ou registro privado de evidências com: data/hora, responsável, URL/ação, resultado, número do incidente ou evento e captura sem dados pessoais.
5. Se houver falha em segurança, duplicidade, consumo de cupom ou acesso indevido: interrompa o teste, preserve evidência e use a central `/admin/seguranca` se existir risco real.

## 1. Regressão técnica a cada entrega

Responsável: desenvolvimento.

- [ ] Checagem de tipos sem erros (`npx tsc --noEmit`).
- [ ] Lint sem erros (`npm run lint`, se disponível no pacote atual).
- [ ] Testes unitários aprovados (`npm run test:unit` ou o comando documentado no projeto).
- [ ] Deploy da Vercel concluído como `Ready`.
- [ ] Abrir páginas públicas principais sem erro: `/`, `/cadastro`, `/resgate`, `/privacidade`.
- [ ] Abrir painel autenticado sem loop de login: `/admin`, `/admin/operadores`, `/admin/auditoria`, `/admin/seguranca`.
- [ ] Confirmar que `CUSTOMER_SESSION_SECRET` existe como Secret na Vercel e que não é igual à chave de serviço.

## 1.1 Hardening de banco e rotas legadas

Execute depois de aplicar `202609160001_hardening_critico_legado.sql`; o roteiro
com consultas seguras está em `docs/AUDITORIA_TECNICA_2026-09-16.md`.

- [ ] Confirmar que apenas `service_role` executa `usar_cupom_promocional` e `usar_resgate_legado`.
- [ ] Confirmar que `garcons`, `premios_roleta` e `resgates` não têm política pública permissiva.
- [ ] Confirmar que `sorteios` está privado e não aceita upload anônimo.
- [ ] Em navegação anônima, comparar a resposta inicial de dois telefones distintos em `/resgate`: ela não pode revelar se alguém já é cliente.
- [ ] Com conta `caixa`, tentar duas baixas paralelas do mesmo cupom de teste e confirmar que somente uma é aceita e auditada.
- [ ] Ativar contenção em janela controlada e confirmar que redefinição de PIN também é bloqueada.

## 2. Contas e permissões da equipe

Objetivo: confirmar que cada pessoa opera com uma conta individual e somente dentro do seu papel.

- [ ] Com um `superadmin`, convidar uma conta de teste em `/admin/operadores` e confirmar que o e-mail chega com link para `/acesso/definir-senha`, nunca para `localhost` ou apenas para a raiz.
- [ ] Aceitar o convite, definir senha e confirmar que o acesso ao painel usa a conta recém-criada.
- [ ] Criar um operador `caixa`: ele deve conseguir usar o fluxo autorizado de caixa, mas não gerir operadores, prêmios, importação ou segurança.
- [ ] Criar um operador `gestor`: confirmar acesso somente ao que foi previsto para gestão, sem conceder administração total.
- [ ] Criar um operador `garcom`: confirmar que ele acessa `/garcom/comanda`, envia JPEG/PNG/WebP de até 5 MB e emite QR somente após duas fotos legíveis e dupla conferência do total; ele não pode consultar a fila, abrir fotos privadas, revisar comandas ou validar cupom.
- [ ] Suspender uma conta de teste e confirmar que ela perde acesso imediatamente; reativar somente se o teste exigir.
- [ ] Tentar excluir a própria conta superadmin e confirmar que o sistema recusa.
- [ ] Conferir em `/admin/auditoria` quem convidou, alterou papel, suspendeu, reativou ou excluiu a conta de teste.
- [ ] Excluir apenas uma conta criada exclusivamente para o teste, depois de confirmar que a auditoria foi preservada.

## 3. Bloqueio do fluxo antigo de garçons

Objetivo: garantir que ninguém consiga liberar roleta por senha previsível nem visualizar dados técnicos antigos.

- [ ] Abrir `/admin/garcons`: deve exibir aviso de fluxo pausado e atalhos para Acessos, Roleta V2 e Auditoria; não deve haver cadastro, ranking, prefixo ou senha.
- [ ] Abrir `/admin/garcons/alertas`: deve explicar a pausa e não mostrar telefone, IP, score artificial ou botão de “desbloquear”.
- [ ] Abrir qualquer URL antiga de perfil, por exemplo `/admin/garcons/1`: deve informar que o perfil antigo está indisponível, sem revelar dados.
- [ ] Confirmar que o menu administrativo não oferece Garçons ou Segurança antiga como fluxo operacional.
- [ ] Com uma ferramenta técnica autenticada, confirmar que `POST /api/garcons/validar` e as rotas em `/api/admin/garcons/*` retornam `410` e nenhuma informação de cliente/equipe.
- [ ] Confirmar no relatório `/admin/analytics` que “Giros da roleta” conta `roleta_giros` V2, e não a tabela histórica `historico_roleta`.

Não apagar tabelas legadas neste teste. A remoção/anonimização depende de prazo de retenção, backup e revisão de dependências.

## 4. Privacidade, consentimento e direitos

Siga o passo a passo detalhado de `docs/GUIA_TESTE_PRIVACIDADE_E_CONTENCAO.md` e registre também aqui a conclusão.

- [ ] No cadastro, confirmar que telefone e nome explicam sua finalidade antes do envio.
- [ ] Confirmar que aniversário é opcional e não bloqueia pontos nem acesso.
- [ ] Confirmar que marketing é opcional, desmarcado por padrão e separado de cadastro/aniversário.
- [ ] Com a conta de teste, revogar aniversário em `/resgate` → **Privacidade** e confirmar persistência após atualizar a página.
- [ ] Em piloto V2 autorizado, conceder marketing voluntariamente e depois revogar; confirmar que o histórico de consentimento existe e o estado atual ficou desligado.
- [ ] Conferir que pontos, cashback e benefícios não mudaram pela revogação.
- [ ] Definir, antes da abertura, canal verificável para pedidos de acesso, correção, exclusão/anônimização e descadastro; publicar no aviso de privacidade depois de revisão jurídica.

## 5. Contenção e resposta a incidente

Execute somente quando não houver pessoa usando o Clube. O roteiro completo está em `docs/GUIA_TESTE_PRIVACIDADE_E_CONTENCAO.md`.

- [ ] Com superadmin, abrir `/admin/seguranca` e registrar um incidente de teste com motivo claro.
- [ ] Ativar a contenção usando a confirmação exigida.
- [ ] Em aba anônima, tentar somente ações seguras de verificação: cadastro/resgate/roleta/cupom devem informar indisponibilidade e não criar dados.
- [ ] Confirmar que o evento e o incidente foram auditados.
- [ ] Reabrir somente após conferir que o teste não gerou registro operacional inesperado.
- [ ] Confirmar que a reabertura foi auditada e que as páginas voltaram a responder normalmente.
- [ ] Revisar os modelos e contatos do plano de incidente antes de abrir ao público; em incidente real, preservar evidências e buscar orientação jurídica para comunicação à ANPD/titulares.

## 6. Piloto de Roleta V2 e cupom

Bloqueado para venda real até a Saipos confirmar uma fonte confiável de venda paga. O fluxo a validar é:

```text
venda paga confirmada -> sessão QR curta -> telefone + aviso/consentimento
-> giro único no servidor -> cupom -> caixa -> auditoria
```

No piloto técnico já autorizado:

- [ ] Criar uma sessão QR de teste como `garcom`, `gestor` ou `superadmin` pelo fluxo de comanda; caixa não deve conseguir emitir QR.
- [ ] Confirmar que QR contém token opaco, expira e não expõe valor, nível, telefone ou dados da venda.
- [ ] Abrir o QR com o telefone de teste, conferir aviso de privacidade e deixar marketing desmarcado.
- [ ] Girar uma única vez; recarregar/tentar repetir e confirmar que não há segundo prêmio ou segundo cupom.
- [ ] Confirmar o nível calculado pelo valor e a seleção de prêmio no servidor, sem campo para o operador escolher nível manualmente.
- [ ] Verificar prazo, canal, dias úteis, feriados e restrições do cupom emitido.
- [ ] Consultar e usar o cupom com conta `caixa`; tentar uso repetido e confirmar recusa atômica.
- [ ] Conferir na auditoria a emissão, consulta, validação e o operador responsável.
- [ ] Testar recusa de cupom com motivo obrigatório quando esse fluxo for concluído.
- [ ] Fazer reconciliação: um giro = no máximo um cupom = no máximo um uso.

## 7. Saipos e venda paga

Permanecer em espera até a resposta técnica da Saipos. A mensagem pronta está em `docs/SAIPOS_VALIDACAO_COMANDA.md`.

Depois da resposta:

- [ ] Validar assinatura/autorização do webhook ou consulta individual por pedido/nota.
- [ ] Confirmar identificador único, status de pagamento, cancelamento, estorno, valor, data e telefone permitidos.
- [ ] Reenviar o mesmo evento e confirmar idempotência: nenhum ponto, sessão QR ou benefício duplicado.
- [ ] Testar cancelamento/estorno e verificar a regra aprovada para pontos e cupons já emitidos.
- [ ] Testar falha temporária do fornecedor: registrar erro, não liberar QR automaticamente e não criar duplicidade ao reprocessar.
- [ ] Confirmar que uma foto de comanda nunca é prova suficiente para liberação automática.

## 7.2 Acesso da equipe

- [ ] No Supabase, incluir `https://www.clubecupim.com.br/acesso/definir-senha` em **Authentication → URL Configuration → Redirect URLs** e confirmar que a Site URL é `https://www.clubecupim.com.br`.
- [ ] Criar convite de teste em `/admin/operadores`; abrir o e-mail e confirmar que a pessoa chega a `/acesso/definir-senha`, cria senha e entra em `/login`.
- [ ] Reenviar o acesso pelo painel e confirmar que gera nova auditoria, sem expor ou alterar a senha anterior.
- [ ] Confirmar que perfil `caixa` recebe recusa ao tentar enviar ou liberar comanda; garçom, gestor e superadmin devem conseguir operar o piloto.

## 7.1 Piloto: duas fotos, leitura local e QR de teste

As migrações `202609170001_fluxo_comandas_operacional.sql` e `202609170002` a
`202609170004` foram aplicadas e verificadas no Supabase em 17/09/2026. Executar
somente em modo de teste e com fotos sem documento, cartão, CPF ou dados de
cliente além do estritamente necessário na comanda.

Referência registrada em 17/09/2026 no painel **Saipos — teste de conexão**:
pedido impresso `872482756`, mesa `99`, valor esperado R$ 274,45. Ela é somente
uma âncora para consulta técnica; não substitui uma comanda emitida pelo novo
fluxo e, portanto, não cria QR, prêmio, cupom ou benefício.

- [ ] Como `garcom`, abrir `/garcom/comanda` e selecionar **duas** fotos permitidas: cabeçalho (mesa, abertura e ID) e total (valor e pagamento). Confirmar que o sistema recusa uma única foto e que não pede mesa/ID manualmente.
- [ ] Acionar “Ler comanda”. Confirmar que mesa, data, hora de abertura, ID do pedido e total são lidos; se algum faltar, a tela deve exigir novas fotos, sem abrir campos manuais para esses dados.
- [ ] Digitar somente o valor total como dupla conferência. Confirmar que valor diferente do OCR bloqueia o QR e que valor igual permite seguir.
- [ ] Confirmar que o texto integral extraído pelo OCR não é enviado para o banco nem aparece na auditoria; somente as duas imagens privadas e os campos necessários para a reconciliação entram no fluxo.
- [ ] Confirmar que o mesmo ID do pedido não pode emitir dois QR, mesmo com duas fotos novas ou outro operador.
- [ ] Como `gestor` ou `superadmin`, abrir `/admin/comandas`, ver as duas fotos privadas e a trilha de envio/confirmação. Registrar “Em análise” e conferir data, responsável e motivo na auditoria.
- [ ] Como `caixa`, tentar abrir a fila, a foto e a rota de revisão; todas devem recusar o acesso.
- [ ] Como `garcom`, tentar acessar a fila e a URL de imagem; ambas devem recusar o acesso.
- [ ] Tentar upload acima de 5 MB, de arquivo não-imagem e de conteúdo incompatível com a extensão/tipo; todos devem ser recusados.
- [ ] Confirmar que a URL de visualização expira em cerca de um minuto e que o bucket não é público.
- [ ] Com a V2 explicitamente em modo de teste, emitir um QR; conferir expiração, giro único e cupom marcado como teste. Não usar esse cupom em venda real.
- [ ] No turno seguinte, consultar a Saipos por `id_sale` usando o ID impresso, comparar valor, origem e pagamento; registrar a divergência/sucesso apenas como reconciliação, sem punição ou ajuste automático.
- [ ] Depois de aplicar as migrações, chamar manualmente o cron protegido de reconciliação com uma comanda de teste; confirmar que ele só atualiza o estado de reconciliação e cria auditoria, sem criar cliente, ponto, cupom, prêmio ou sanção.
- [ ] Em `/admin/operacao-roleta`, conferir o relatório da data: QR, compatíveis, divergentes, pendentes, nível e responsável. O sinal de atenção deve orientar revisão, nunca aplicar punição automática.
- [x] Agendamento diário `0 10 * * *` incluído na configuração de implantação em 17/09/2026. Em plano Hobby, considere a janela de 10:00–10:59 UTC, não um minuto exato. Confirmar o primeiro disparo somente depois que o deploy estiver `Ready`.
- [ ] Registrar o prazo operacional de 30 dias e implementar/testar a remoção segura das imagens expiradas antes de abrir ao público.

## 8. WhatsApp e OTP

Não usar WhatsApp pessoal automatizado. O teste começa somente após número comercial e provedor oficial (Meta Cloud API ou BSP) configurados.

- [ ] Configurar templates, remetente, webhooks, opt-in/opt-out e custos no provedor oficial.
- [ ] Testar envio para os próprios números, sem campanha para clientes.
- [ ] Confirmar expiração do código, limite por telefone/IP e rejeição de código errado.
- [ ] Confirmar que logs guardam hashes e não o conteúdo do código, telefone bruto ou token.
- [ ] Revogar marketing e confirmar que campanhas futuras não usam o número; OTP de autenticação deve ter finalidade separada.
- [ ] Registrar custo por mensagem e limite mensal antes de abrir o envio.

## 9. Backup, restauração e fornecedores

- [ ] Definir responsável, frequência e local protegido para backup do Supabase; GitHub não é backup de dados.
- [ ] Criar um backup de teste sem expor segredos em computador pessoal.
- [ ] Restaurar em ambiente isolado e confirmar integridade de usuários, permissões, cupons e auditoria sem afetar produção.
- [ ] Documentar tempo de restauração, lacunas e responsável pela decisão de retomar.
- [ ] Revisar acessos e MFA de GitHub, Vercel e Supabase; remover pessoas sem necessidade.
- [ ] Revisar contratos/termos e lista de operadores de Saipos, Supabase, Vercel e futuro provedor WhatsApp.

## Conclusão exigida antes do primeiro cliente real

Nenhum item abaixo pode ficar sem resposta formal:

- [ ] Venda paga confirmada por fonte confiável.
- [ ] Piloto ponta a ponta aprovado sem duplicidade ou exposição indevida.
- [ ] Regras comerciais, prêmios, validade e custos aprovados pelo negócio.
- [ ] Política/aviso de privacidade, marketing e atendimento de direitos revisados juridicamente.
- [ ] Contenção, reabertura e auditoria testadas.
- [ ] Backup e restauração validados.
- [ ] Acessos individuais, MFA e treinamento mínimo de caixa/gestão concluídos.
- [ ] Revisão jurídica específica sobre a mecânica aleatória da roleta e seus prêmios concluída.

## Registro de execuções

Use uma linha por sessão de teste; não inclua PIN, telefone inteiro, token ou QR.

| Data/hora | Teste/seção | Executor | Resultado | Evidência/ID | Pendência ou correção |
| --- | --- | --- | --- | --- | --- |
| 18/09/2026 08:50 BRT | 7.1 / conferência Saipos posterior | Superadmin | Compatível, somente leitura | Pedido 872482756; valor R$ 274,45; pagamento retornado; não cancelada | Não mede latência imediata; o cron diário só reconcilia comandas que passarem pelo novo fluxo QR. |
| 18/09/2026 manhã BRT | 7.1 / mesas encerradas e canceladas | Superadmin | Inconclusivo, somente leitura | Dois pedidos da Mesa 199 encerrados sem itens e buscas pelos números físicos 50/200 retornaram zero venda | Capturar o ID impresso de uma comanda realmente cancelada. Número físico da mesa não é chave suficiente. Repetir experimento de três mesas às 15:00 BRT. |
| 18/09/2026 manhã BRT | 6 e 7.1 / preparação do piloto | Superadmin | Ativo somente para teste | V2 publicada em modo de teste; QR de 10 min; prêmio interno R$ 0,00; sem baixa comercial | Executar o primeiro giro pelo fluxo de comanda e conferir a reconciliação do dia seguinte. |
| 18/09/2026 manhã BRT | 2 e 7.2 / acesso por convite | Superadmin | Correção aplicada | Redirect URL `https://www.clubecupim.com.br/acesso/definir-senha` incluída no Supabase; deploy `2338ca6` Ready | Usar **Reenviar acesso** e validar o novo link; o e-mail antigo não é evidência válida. |
