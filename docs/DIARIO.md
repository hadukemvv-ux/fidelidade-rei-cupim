# Diário de entregas

Entrada nova no topo. No máximo 5 linhas: data, quem, o que mudou, PR/commit,
o que ficou pendente. Detalhe técnico vai no PR, não aqui.

---

**01/10/2026 — Codex** · Responsável confirmou autorização própria, ciente do backup adiado: SQL `202609290001` → `202609300001` → `202610010001` → `202610010002` aplicado com sucesso no projeto correto e permissões conferidas.
Consolidação Claude 794e672 + foto entrega 981e2ae integradas em `codex/publicacao-consolidada` para publicação autorizada; 180 testes app + 35 worker, tipos, lint e build fictício OK.
Banco permanece em modo teste, zero prêmios comerciais ativos, entregas/comercial false; sem mensagens, piloto OTP ou alteração do worker Oracle. Conferir deploy Ready após push.
Backup continua adiado por decisão do responsável; próximo passo é autorizar implantação/piloto OTP fechado, sem liberação pública nem comercial.

**01/10/2026 — Claude** · `claude/foto-entrega` (sobre `claude/consolidacao`): foto do prêmio entrega grátis = golden retriever numa moto de entrega (Unsplash, licença comercial; recorte sem o baú/bolsa com escrita). Associada por `tipo` frete_gratis, nome como reserva; teste novo, 180 OK. Dindim segue sem foto (não há equivalente sem marca nos bancos; pedir foto do restaurante). Publicar junto/depois da consolidação.

**01/10/2026 — Claude** · `claude/consolidacao`: main atual (7b6a79d) + `claude/premios-textos` (b7cd04e) + `codex/whatsapp-otp` (5ec320c) numa branch só; conflitos apenas em README/ROADMAP/DIARIO/COMECE_AQUI, resolvidos mantendo as duas frentes; backup registrado como adiado pelo responsável. Revisão do `5ec320c` (inspeção offline do relógio) OK. Não publicado nem aplicado.

**01/10/2026 — Claude** · `claude/telas-cliente`: cadastro, login/pontos, redefinir PIN e completar cadastro com as fontes da roleta (Oswald/Inter, só nessas telas; home mantém as dela) e fundo carvão alinhado. Foto da home/cadastro/login trocada pelo cupim trinchado do responsável (arquivo renomeado para não servir cache do baião). `COMECE_AQUI` atualizado com o que espera autorização. Testado em 375 px sem vazamento; lint, tipos, 100 testes e build OK.

**01/10/2026 — Claude** · `claude/premios-textos` (sobre b190f6f): `/admin/roleta` edita nome e mensagem de vitória (nome vazio barrado, um envio por clique, painel relido em erro/timeout). Roleta associa resultado à fatia por `id` e escolhe foto/aviso de cerveja por `tipo` (nome só como reserva para respostas antigas); 4 testes novos incluindo prêmio renomeado. Revisão da migração `202610010002` OK. Não publicado nem aplicado.

**01/10/2026 — Codex** · `codex/premios-textos`: integrada tela de fotos revisada `claude/upload-fotos` (4d6edda), com main atual; registrada recuperação das fotos em outro projeto Supabase.
PUT de prêmios normaliza/valida nome e mensagem, mantém campos omitidos e grava edição/auditoria juntas via RPC `202610010002`; ator/pausa/piloto reconferidos no banco.
SQL de entregas ainda não aplicado ganhou somente ID/tipo nos retornos públicos para não depender de nome editável; sem mudar elegibilidade, pesos ou quantidades.
145 testes, tipos/lint e build fictício OK; revisão Claude e campos/associação/avisos na UI pendentes; sem SQL aplicado, publicação na main ou ativação comercial/OTP.

**01/10/2026 — Claude** · Tela de upload de foto em `/admin/roleta` (branch `claude/upload-fotos`, sobre `codex/premios-imagens`): foto atual em cada prêmio, prévia antes de enviar, só superadmin troca, JPG/PNG/WebP até 2 MB, um envio por clique e painel relido após sucesso, erro ou demora. Revisão da migração `202610010001` OK. Não publicado nem aplicado.

**01/10/2026 — Codex** · `codex/premios-imagens`: reutilizada branch de baixas para preservar elegibilidade/re-roll; API superadmin de foto JPG/PNG/WebP até 2 MB, WebP até 1024 px/512 KB sem metadados.
Migração `202610010001` preparada: bucket público exclusivo de produtos, escrita só pelo backend, vínculo com ator ativo/sem contenção e auditoria atômica; conflito de troca simultânea recusado.
135 testes (incluindo decoder, RLS, falha de auditoria e imagem na elegibilidade/giro), tipos/lint e build fictício OK; sem arquivos reais, alteração de chances, SQL aplicado ou publicação na main.
Próximo: revisão Claude, tela upload no admin e implantação/ensaio autorizados; imagens anteriores/candidatas preservadas, sem delete ou retry após resultado incerto.

**01/10/2026 — Claude** · Fotos dos prêmios na roleta (Pexels, licença comercial, sem marcas; autorizadas pelo responsável): saideira (1 garrafa), expulsadeira (2), pudim, brownie e sobremesa (pudim+brownie). Tela do prêmio avisa "1/2 unidades da mesma cerveja que você consumiu", "Beba com moderação. Proibido para menores de 18 anos" e "Foto ilustrativa". Faltam fotos próprias de dindim e entrega; troca de foto pelo painel depende de `imagem_url` (Codex).

**01/10/2026 — Codex** · Continuação de `codex/whatsapp-otp`: inspeção offline do relógio sob lock, sem alterar sessão/ledgers, revelar dados privados ou conectar/enviar; guia de detecção/espera segura preparado.
Não reduzir watermark isoladamente: timestamps futuros também afetam quotas; destrave antecipado manual continua pendente de revisão específica, sem reset automático.
Responsável reafirmou pausa do backup Supabase; sem acessar sua configuração, aplicar SQL, mudar gates ou publicar; roadmap único do projeto tem versões em branches a consolidar pelo Claude.
130 testes app + 35 worker, tipos e lint OK com dados fictícios; revisão do utilitário e implantação/piloto reais ainda pendentes.

**01/10/2026 — Codex** · `codex/whatsapp-otp`: tela Claude integrada (5780ff4); ledger OTP limpa >24h sem perder quotas, sessão ou teste fixo; relógio regressivo bloqueado e falha pós-envio documentada.
130 testes app, 32 worker, cinco cenários nativos PostgreSQL com conexões distintas/espera real por locks, tipos e lint direcionado OK; sem SQL em produção, envio, ativação ou publicação na main.
Modelos editáveis, avisos consolidados e fluxo do garçom registrados como pendentes; sobremesas por produto/quantidade, sem sabores, e marcas de cerveja confirmadas sem inventar unidades.
Próximo: revisão final do ajuste, autorização de implantação e piloto cadastro/reset no celular; pontos/níveis automáticos e mensagens operacionais ainda não ligados.

**01/10/2026 — Claude** · Revisão de `codex/whatsapp-otp` (260d2d5): migração compatível (status só ganha `indeterminado`), verificação/grant atômicos e anti-replay OK; ponto a corrigir: ledger OTP do worker trava em 1.000 registros sem limpeza. Tela `WhatsappOtpVerification` em `claude/otp-tela`: separa "aceito" de "indeterminado" sem prometer entrega, nunca reenvia sozinha, código novo invalida o anterior, espera 60 s após erro. Não publicado.

**30/09/2026 — Codex** · `codex/whatsapp-otp`: OTP QR fechado (1–3 destinos), token separado, ledger persistente sem replay e confirmação/grant transacionais; Twilio preservado como padrão desligado.
Migração `202609300001` preparada: falhas contam na quota; código com HMAC/10min/5 tentativas, propósito/telefone vinculados, reenvio invalida anterior e grants exclusivos de serviço.
129 testes do app (PGlite/HTTP com socket fictício), 28 worker, tipos e lint OK; nenhuma mensagem, SQL em produção, campanha, deploy ou mudança visual nesta etapa.
Pendentes revisão Claude, concorrência com duas conexões reais, UI para envio indeterminado e implantação/piloto celular autorizados; README traz contrato/configuração sem segredos.

**30/09/2026 — Codex** · `codex/whatsapp-mensagens`: resolução do destino via `onWhatsApp`, sem alterar telefone do cadastro; recebimento real confirmado pelo responsável e print após novo ensaio autorizado.
UUID privado fixou só uma tentativa adicional; dois registros criptografados preservados após restart/reconexão, envio fechado (503), destino e autorização temporários removidos.
104 testes do app + 20 worker e tipos OK; falha/ambiguidade de consulta bloqueia envio, nenhum retry cego ou exclusão do registro anterior.
Sem publicação na main, campanha ou OTP; faltam fila/gatilhos, observabilidade das entregas e acesso administrativo entre redes.

**30/09/2026 — Codex** · Diagnóstico do piloto `603a5f5`: responsável confirmou não recebimento; aceitação do transporte não comprovou entrega.
Consulta real `onWhatsApp` do único destino reconheceu uma conta e retornou JID sem nono dígito, diferente do endereço usado pelo piloto; sem registrar telefone/JID nem novo envio.
Worker reconectado após diagnóstico; gate de envio 503, registro anterior preservado e rota pública continua não exposta.
Pendente: resolver endereço pelo provedor, distinguir estados de envio/entrega e solicitar autorização para novo teste; não remover dígitos cegamente nem apagar reserva.

**30/09/2026 — Codex** · `codex/whatsapp-mensagens`: SSH temporário /32 ajustado; um teste manual fixo aceito pelo transporte, recebimento no celular ainda pendente.
Piloto Oracle fechado após o envio: destino temporário removido, rota interna 503 e pública 404; registro criptografado único preservado após reinício/reconexão sem novo QR.
Modelos de verificação/cadastro/garçom em rascunho; 104 testes do app + 17 worker e tipos OK, sem campanha/OTP ou publicação na main.
Cópia privada local para rollback na VM não equivale a backup externo/restauração; faltam acesso entre redes, auditoria e fila/gatilhos reais.

**29/09/2026 — Codex** · Conexão QR publicada com autorização em 26a5743; main integrada preservando a roleta do Claude, 100 testes + 11 worker e tipos OK.
Vercel: três variáveis de controle como Secret, exclusivamente Production; chave de sessão permanece somente na Oracle, sem envios/OTP.
Git lê OpenSSL do `.gitconfig` do usuário e push normal da branch passou; não prova ausência de falhas futuras.
Produção Ready: API sem login 401/no-store, superadmin consulta estado e gera QR; pareamento/reconexão, auditoria, backup/monitor e envios pendentes.

**29/09/2026 — Codex** · DNS `whatsapp.clubecupim.com.br` salvo e confirmado; site/e-mail preservados, sem upgrade pago.
Caddy 2.11.4 oficial instalado, admin API/access log desligados; rotas restritas, worker segue em loopback e testes de autenticação aprovados.
TCP 80/443 liberadas na VM/Oracle; certificado externo válido, controle HTTPS 401/400/200, demais rotas 404 e HTTP→HTTPS 308; 100 testes/tipos OK.
Guia atualizado a pedido do responsável; autorização de publicação, pareamento persistente, backup/monitor e envios ainda pendentes; main preservada.

**29/09/2026 — Codex** · Tela `claude/admin-whatsapp` integrada em `d7386e6`; guard de autenticação com mensagem neutra, sem mudar permissões.
Oracle gratuita: A1 sem capacidade; E2.1.Micro criada, worker Node 24 instalado, sessão/chaves privadas e systemd, somente loopback; sem pareamento/envios.
Testes reais: 401 sem/token errado, 400 com Origin, 200 autenticado antes/depois de restart limpo; ~49 MB em repouso, sem validar carga conectada.
Guia de hospedagem atualizado a pedido do responsável; faltam DNS/HTTPS no Registro.br, auditoria de transições, pareamento persistente, backup e monitor. Não publicado na main.

**29/09/2026 — Codex** · A pedido do responsável, guia `WHATSAPP_HOSPEDAGEM_E_RECUPERACAO.md` registra implantação gratuita inicial, recuperação, migração e evidências pendentes.
Oracle Always Free é o ponto de partida; plano pago depende de decisão. Conta, máquina, HTTPS, monitor externo e backup real ainda não configurados.
Guia diferencia testes simulados de pareamento/restauração reais; envio/OTP continuam pendentes. Nenhuma infraestrutura criada.

**29/09/2026 — Claude** · `claude/admin-whatsapp` (sobre `codex/whatsapp-qr` 9b0da87): tela `/admin/whatsapp` só superadmin, consulta a cada 3 s só com a tela visível, QR apenas em memória (some ao expirar/esconder), sessão vencida separada de serviço desligado, desconectar com confirmação. Revisão do worker/API OK (só 127.0.0.1, sem envio). Estados testados no navegador com respostas simuladas; pareamento real pendente. Não publicado.

**29/09/2026 — Codex** · `codex/whatsapp-qr`: worker local com sessão AES-GCM, lock exclusivo, QR transitório e API superadmin de conexão/desconexão.
Contrato da tela e configuração no README; 100 testes do app + 11 do serviço, tipos/lint OK, incluindo reinício criptografado e HTTP autenticado.
Sem envio/OTP; não conectado ao WhatsApp real nesta etapa. Faltam tela do Claude, endpoint HTTPS contínuo e teste de pareamento persistente.
Nada publicado na main; serviço permanece desligado até configuração do piloto.

**29/09/2026 — Codex** · `codex/whatsapp-qr`: número separado pareado em ensaio local segundo o responsável; QR não oficial para verificação/avisos, não chatbot.
Sessão temporária sem envio/importação; base criptográfica para OTP adicionada, 5 testes do serviço + 92 do app, tipos/lint aprovados.
Dependência Baileys 7.0.0-rc14 fixada, audit npm sem vulnerabilidades conhecidas nesta consulta; não elimina risco de bloqueio/desconexão.
Faltam conferir encerramento no celular, fila/envio/verificação OTP, transporte permanente e hospedagem; produção não foi alterada.
Checkpoint de baixas separado: branch `codex/baixas-reais`, commit `bf1d409`, 99 testes; pedir revisão Claude e validar SQL isolado antes de aplicar.
**29/09/2026 — Claude** · Roleta "Brasa Premium" (escolha do responsável): roda bicolor osso/grafite só com texto, seta vermelha, fontes Oswald + Inter, fundo carvão com foto e faíscas, comemoração com faíscas de brasa em vez de confete. Também: correção de setor trocado (c414c34) e Git do usuário com `http.sslBackend=openssl` para testar o erro ao publicar. Visual em iteração com o responsável.
**29/09/2026 — Codex** · `codex/baixas-reais`: incorporada a main da roleta interativa e avaliada a segunda revisão do Claude (re-roll resolvido).
A sessão usa sempre a elegibilidade do SQL; sem ela, falha fechado se houver físico ativo. `imagem_url` local validada na API e devolvida à roda.
113 testes (8 SQL isolados), tipos e lint OK. Faltam concorrência PostgreSQL multissessão, painel/catálogo e campo visual no admin.
Nada aplicado ao banco ou publicado na main; conexão WhatsApp por QR no site ainda não implementada.

**29/09/2026 — Codex** · `codex/baixas-reais`: correção do bloqueante identificado pelo Claude; físico inelegível sai do sorteio antes do resultado e a roda mostra a mesma lista.
Exceção operacional vira pendência bloqueada, sem re-roll; ativação recusa cupom físico antigo aberto sem ledger.
Opções paginadas em lotes, pré-checagem de papel explícita e SECURITY DEFINER com busca vazia; 109 testes (8 SQL isolados), tipos/lint OK.
Migração não aplicada; falta nova revisão Claude, concorrência em PostgreSQL multissessão, catálogo/opções reais e painel.
Decisão pendente do responsável: quem assume entrega quando o garçom sai do turno; piloto mantém só superadmin.

**29/09/2026 — Codex** · `codex/baixas-reais`: checkpoint da base/API e proposta SQL, gates desligados; 99 testes, tipos e lint dos novos arquivos aprovados.
Faltam execução isolada do SQL (inclusive concorrência/RLS), catálogo/opções por conta, painel e revisão Claude; nada aplicado em produção.
SPA, FAQ 59: benefício objetivo sem aleatoriedade difere de promoção com sorte; pontos sorteados não têm dispensa confirmada.
Fonte: https://www.gov.br/fazenda/pt-br/composicao/orgaos/secretaria-de-premios-e-apostas/promocao-comercial/promocao-comercial
Nenhuma mudança de mecânica, prêmios ou aprovação jurídica decidida.

**29/09/2026 — Claude** · Roleta interativa: arrastar com o dedo, botão PARAR, parada automática em 4 s, desaceleração lenta com pinos e som, confete nas cores da marca e revelação com foto. Resultado continua 100% do servidor (a animação só decide o caminho). Demonstração sem registro em `/roleta/demo`. Física com 900 combinações testadas; fluxo testado no navegador. Faltam fotos reais e celulares reais.

**29/09/2026 — Claude** · Revisão de `codex/baixas-reais` (bf1d409): 99 testes, tipos e lint OK; permissões e ordem de locks revisadas (revisão de código, sem teste real de concorrência). Bloqueante: gatilho aborta o giro depois do sorteio em QR manual sem comanda, permitindo girar de novo. Recado enviado ao Codex.

**29/09/2026 — Claude** · Backup diário do Supabase no GitHub Actions: banco + arquivos (sem fotos de comanda), criptografado, 30 dias, com teste de restauração automático. Guia com opções e custos em `docs/referencia/BACKUP_E_MIGRACAO.md`. Aguarda 3 segredos no GitHub para a 1ª execução.

**29/09/2026 — Claude** · Ícones do site trocados pelo foguinho oficial: favicon (16/32/48), ícone 256 e ícone de tela inicial do iPhone (fundo escuro). Recorte em `public/brand/logo-foguinho.png`. Arte original tem ~125 px: pedir versão vetorial.

**28/09/2026 — Claude** · Lint zerado (era 23 erros e 16 avisos): `any` trocado por tipos reais, variáveis sem uso removidas, texto alternativo em imagem e exceções justificadas em comentário onde o padrão atual está correto. Sem mudança de regra ou dado. Lint, tipos, 87/87 testes e build OK.

**28/09/2026 — Claude** · Limpeza do legado, parte 1: removidas rotas mortas (`/api/test-env`, `/api/debug`, `/teste`, pasta `src/pages`), o controle antigo de garçons (telas e rotas que só respondiam "desativado") e imagens sem uso. Banco não foi tocado. 87/87 testes, tipos e build OK. Pendente: roleta V1, sorteio e `/validar` após o piloto.

**28/09/2026 — Claude** · Documentação reorganizada: `AGENTS.md` com divisão de trabalho
e fluxo de branches/PR; novos `COMECE_AQUI`, `ROADMAP` por fases com dono e este diário.
Documentos de tema movidos para `docs/referencia/`, antigos para `docs/historico/`.
Nenhum código alterado.

**28/09/2026 — Codex** · Landing: mensagem única de benefícios (pontos para produtos +
cashback para descontos) e tabela de equivalência corrigida, preservando o layout.
Commits `66196b3` e `08197e0`, deploy confirmado.

**28/09/2026 — Codex** · Simulador `/admin/baixas` (dados fictícios em memória) publicado
em `2cb51fe`; contraste dos botões corrigido em `0916cb3`. Bot e migração da inbox
continuam desligados/não aplicados.
