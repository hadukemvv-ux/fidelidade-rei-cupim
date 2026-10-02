# WhatsApp: hospedagem, recuperação e migração

Guia solicitado pelo responsável em 29/09/2026. Atualização em 01/10: **worker OTP revisado implantado, reconectado sem QR e piloto de dois números autorizado/ativado; cadastro/reset no celular ainda não confirmados**. Histórico abaixo preserva os gates de cada ensaio anterior.
Escolha inicial: tentar Oracle Always Free; nenhum plano pago autorizado.

## Para o responsável

- O admin deverá mostrar conexão, última verificação e ação recomendada.
- Uma queda não significa necessidade de migração: pode ser celular desvinculado,
  serviço parado, falha de rede, credencial ou limite do provedor.
- O painel do Claude está publicado para o superadmin. Monitoramento externo
  e avisos de limite ainda não existem; não contar com alertas automáticos hoje.
- Custo zero depende das cotas e disponibilidade do provedor. A Oracle pode
  recolher recursos gratuitos ociosos. Não gerar carga artificial para evitar isso.
- Mudança para plano pago ou recurso cobrado exige decisão do responsável.

## Inventário a preencher na implantação

| Item | Estado |
| --- | --- |
| Conta Oracle / região / máquina | Conta gratuita; São Paulo (`sa-saopaulo-1`); `clubecupim-whatsapp`, Ubuntu 24.04, E2.1.Micro (1 GB), disco 46,6 GB |
| Plano e custo autorizado | Always Free, R$ 0 dentro das cotas |
| Endereço HTTPS do serviço | `https://whatsapp.clubecupim.com.br`; DNS e certificado válido confirmados, controle HTTPS autenticado testado |
| Sessão e chave | Chave/token distintos na VM; sessão real do número dedicado criptografada, permissões privadas |
| Backup externo privado | Pendente de configurar e testar |
| Último pareamento persistente real | Confirmado em 29/09; reinício/reconexão sem novo QR validados em 30/09 |
| Última restauração real | Não realizada |
| Monitor externo / destino do alerta | Pendente de definir e configurar |

Não escrever neste inventário telefone, token, chave, senha ou conteúdo do QR.
As variáveis, permissões e o contrato da API estão no README.

## Instalação realizada em 29/09/2026

- A1.Flex (1 OCPU/6 GB) recusada por falta de capacidade em AD-1; E2.1.Micro
  marcada Always Free foi criada e está rodando. Não houve upgrade da conta.
- Rede exclusiva `clubecupim-whatsapp-vcn`, sub-rede pública, gateway e rota.
  SSH por chave limitado ao IP administrativo atual; TCP 80/443 liberadas no
  firewall da VM e na lista de segurança Oracle; nenhuma regra pública para 8787.
  Se o IP do responsável mudar, atualizar somente a origem `/32` da regra SSH.
- Node 24.21.0 x64 obtido do site oficial e SHA-256 verificado; dependências
  do worker instaladas com `npm ci --omit=dev --ignore-scripts` pelo lockfile.
- Código em `/opt/clubecupim/services/whatsapp-qr`; usuário sem login
  `clubecupim-wa`; sessão em `/var/lib/clubecupim-whatsapp` (0700);
  chaves em `/etc/clubecupim-whatsapp.env` (0600, root). Nunca imprimir esse arquivo.
- Unidade `clubecupim-whatsapp.service`: inicia no boot, restart em falha limitado
  a 3 tentativas/5 min, UMask 0077, sem privilégios adicionais, sistema/home
  protegidos, escrita só no diretório de sessão, core dump desligado;
  MemoryHigh=400 MB, MemoryMax=550 MB. Worker escuta **somente 127.0.0.1:8787**.
- Chave SSH e host conhecido guardados fora do repositório na pasta local
  `Documents/Codex/private-keys`; auxiliares de implantação em `Documents/Codex/oracle-tools`.
  A chave operacional é `clubecupim-oracle-user`; não copiar para Git/chat.
- Repouso sem conexão: cerca de 49 MB no cgroup, zero reinícios inesperados.
  Isso **não** valida consumo com o WhatsApp conectado nem com envios.

Diagnóstico sem segredos, via SSH autenticado:

```sh
sudo systemctl status clubecupim-whatsapp --no-pager
sudo systemctl show clubecupim-whatsapp -p ActiveState -p MemoryCurrent -p NRestarts
sudo journalctl -u clubecupim-whatsapp -n 20 --no-pager
sudo ss -ltnp | grep ':8787'
free -m
df -h /
```

Parar de forma limpa: `sudo systemctl stop clubecupim-whatsapp`.
Reiniciar: `sudo systemctl restart clubecupim-whatsapp`. O worker atual **não
reconecta automaticamente**: depois do restart, consultar estado e usar Conectar
no admin. A reutilização da sessão salva após reinício foi validada em 30/09.
Nunca remover `session.enc`/trocar a chave para resolver um erro de lock.
Não coletar corpo do QR nem cabeçalhos de autorização nos diagnósticos.

DNS A de `whatsapp.clubecupim.com.br` salvo no Registro.br e confirmado no
servidor autoritativo; registros do site/e-mail preservados. Caddy 2.11.4 instalado
pelo repositório estável oficial, supervisionado pelo systemd; configuração em
`/etc/caddy/Caddyfile`, admin API desligada, sem access log. Só encaminha as três
rotas de controle ao worker; demais caminhos retornam 404. Regras TCP 80/443
persistidas com netfilter-persistent, sem liberar 8787.

HTTPS externo verificado com validação TLS normal: sem token/token errado 401,
Origin com token correto 400, token correto 200 (desconectado, QR nulo), demais
rotas 404 e HTTP redireciona para HTTPS com 308. Cabeçalhos de cache bloqueiam
armazenamento. Sem pareamento ou envio. Caddy ~13 MB e worker ~78 MB no cgroup,
zero reinícios inesperados na consulta; consumo conectado ainda não validado.

Responsável autorizou publicação e configuração: `WHATSAPP_QR_CONTROL_ENABLED`,
`WHATSAPP_QR_CONTROL_URL` e `WHATSAPP_QR_CONTROL_TOKEN` salvos na Vercel como
Secret somente em Production. Nenhuma chave de sessão foi enviada à Vercel;
Preview/Development não recebem o segredo de controle. Envios/OTP não habilitados.

Publicação `26a5743` confirmada Ready na Vercel: consulta sem login recusada com
401/no-store; superadmin consultou estado desconectado e gerou QR no domínio real.
Pareamento/reconexão foram confirmados posteriormente; restauração externa continua
pendente. Textos locais antigos da tela precisam de ajuste pelo Claude.
Para mudar o proxy com admin API desligada, validar
o arquivo com `caddy validate` e usar `sudo systemctl restart caddy`.
Não expor a porta 8787 nem apontar produção para HTTP/IP sem certificado.
E2.1.Micro não admite resize: aumento de capacidade exige migração para outra
VM, preservando sessão/chave e validando o destino antes de desligar a origem.

## Implantação do piloto — Codex

1. Responsável cria/entra na conta da nuvem pelo navegador; verificações de
   identidade e dados de pagamento ficam com ele. Conferir preço R$ 0 na tela
   de criação e cotas de máquina, disco e rede; não aceitar upgrade automaticamente.
2. Criar uma única máquina Linux compatível com Node 24 e armazenamento persistente.
   Instalar versão revisada do serviço e dependências pelo lockfile.
3. Configurar usuário sem privilégio, diretório privado fora do checkout, chave
   de sessão e token de controle distintos. Nunca guardar credenciais no Git.
4. Configurar serviço supervisionado e HTTPS; worker escuta só em loopback.
   Expor externamente apenas HTTPS e acesso administrativo restrito. Não registrar
   cabeçalhos de autorização ou QR em logs do proxy.
5. Validar certificado, rejeição sem autenticação, acesso exclusivo de superadmin
   e contenção. Configurar o endereço na API do site somente após revisão/publicação.
6. Escanear QR do número dedicado. Reiniciar o serviço e reconectar à sessão salva.
   Confirmar estado no celular e no admin; testar desvinculação e novo pareamento.
7. Fazer backup privado e teste de restauração antes de depender do serviço.
8. Configurar verificação externa com alerta que não dependa deste WhatsApp.
   Medir memória, disco e disponibilidade; acompanhar também notificações da Oracle.

Em 30/09, piloto de mensagem fixa instalado no worker Oracle com destino aprovado.
Um envio inicial foi aceito pelo transporte, mas o responsável informou não recebimento.
Consulta real do único destinatário retornou endereço interno sem nono dígito,
diferente do endereço montado no piloto. Correção usa somente o endereço retornado
pelo WhatsApp para o destino autorizado, sem alterar o telefone cadastrado.
Responsável autorizou um novo ensaio e confirmou recebimento com print depois dele.
Um UUID privado fixou a tentativa adicional; não há liberação por novo UUID arbitrário,
retry de rede ou reinício. Os dois registros anteriores continuam preservados.
Modo de teste encerrado, destino e autorização temporários removidos; gate interno retorna 503,
rota pública retorna 404. Nenhum envio automático/OTP/campanha foi habilitado.
Os dois registros criptografados foram preservados após reinício, sem outro QR.
Código permanece na branch de trabalho, não publicado na main da Vercel.
Cópia de código, configuração e sessão em diretório privado de rollback na mesma VM
não substitui backup externo nem ensaio de restauração. Não restaurar cópia anterior
ao envio como forma de apagar sua reserva e repetir uma mensagem.
Antes de OTP: fila persistente, limites antiabuso, reserva/expiração e revisão do fluxo.

## Como interpretar um problema

OTP QR implantado em 01/10, **restrito aos dois números aprovados**: o worker limpa somente
reservas OTP com mais de 24h antes de admitir novos envios. Preserva limites,
sessão e registros do teste fixo; payload expira em 10min. Não remover registros
manualmente para reenviar. Se o relógio retroceder, reserva bloqueada até corrigir
o relógio e alcançar o último horário persistido; corrigir o NTP sozinho não
reduz `otpLastReservationAt`. Não apagar o marcador para contornar a proteção.
Se a mensagem for aceita mas falhar a finalização no banco, o código pode chegar
inutilizável (status ainda `reservado`). Esperar 60s e pedir novo código explicitamente,
sem retry do transporte nem edição manual do status. Não registrar o código em logs.

### Relógio avançou e depois voltou — procedimento seguro

Diagnóstico validado na VM em 01/10 durante implantação com serviço parado: relógio seguro, zero reservas OTP, sessão intacta. Piloto fechado de dois números foi ativado depois da inspeção; recuperação de relógio regressivo real não foi necessária/testada.
Uma resposta 503 não prova falha de relógio: também pode ser rede, configuração
ou quota. Conferir primeiro `date -u` e `timedatectl status` por SSH; o relógio
deve estar sincronizado com uma fonte confiável, sem avançá-lo artificialmente.

1. Suspender novas solicitações OTP no app/worker pelos gates; não reabrir
   enquanto houver diagnóstico inconclusivo. Não alterar status de códigos no banco.
2. Parar o processo com `sudo systemctl stop clubecupim-whatsapp` (não clicar
   em Desconectar, que revoga a sessão). Não rodar duas instâncias na mesma pasta.
3. Depois de implantar o utilitário revisado, inspecionar com ambiente privado,
   sem imprimir o arquivo de configuração nem passar a chave na linha de comando:

   ```sh
   sudo systemd-run --quiet --wait --pipe --collect --unit=clubecupim-otp-clock-check \
     --property=User=clubecupim-wa \
     --property=EnvironmentFile=/etc/clubecupim-whatsapp.env \
     --property=WorkingDirectory=/opt/clubecupim/services/whatsapp-qr \
     /opt/node24/bin/node inspect-otp-clock.mjs --inspect --worker-stopped
   ```

   O utilitário usa o lock normal e só lê `session.enc`: não conecta WhatsApp,
   não envia, não regrava credenciais e não retorna telefones, códigos ou hashes.
   Saída 0: relógio sem regressão detectada (não significa conexão/quota OK).
   Saída 2: horário atual anterior ao marcador ou a alguma reserva retida.
   Saída 1: diagnóstico indisponível; preservar sessão/chave/lock e investigar.
4. A recuperação suportada é manter o horário correto e aguardar que alcance
   `otp_last_reservation_at` e `newest_retained_reservation_at`. As quotas
   normais ainda valem. `conservative_resume_after` é o maior desses horários
   +24h+1ms: sem novas reservas, nesse momento todos os registros antigos já
   ficam fora da janela diária. Não é uma promessa de disponibilidade da rede.
5. Repetir inspeção com worker parado. Quando o relógio estiver seguro, iniciar
   o serviço e reconectar pelo admin à sessão salva. Reabrir o piloto somente
   após verificar os gates/destinos aprovados; pedir código novo explicitamente,
   nunca repetir envio de resultado incerto ou restaurar estado anterior ao envio.

**Não basta diminuir o watermark:** reservas com `createdAt` futuro continuam
participando do cooldown e das quotas. Um salto também pode ter podado reservas
anteriores; resetá-lo às cegas enfraquece a proteção contra repetição. Destrave
antecipado editando o arquivo criptografado não está implementado/autorizado;
se a espera for impraticável, manter OTP fechado e revisar uma recuperação
offline específica antes de qualquer mudança. Nunca apagar `session.enc`,
`otpSends` ou o histórico de mensagens de teste para resolver esse problema.

| Sinal | Verificação e ação |
| --- | --- |
| QR expirou | Atualizar o estado e obter QR vigente |
| Desconectado | Conferir rede e Aparelhos conectados; reconectar pelo admin |
| Serviço inacessível | Conferir máquina, processo, certificado e rede |
| Erro de chave/sessão | Preservar arquivo; recuperar chave correta, sem resetar às cegas |
| Lock após interrupção abrupta | Confirmar que nenhuma instância usa a pasta antes de remover só o lock |
| Aviso de cota / recurso recolhido | Conferir provedor e escolher recuperar, redimensionar ou migrar |
| Memória/disco insuficientes | Medir uso real antes de contratar capacidade |

## Backup e recuperação — procedimento a validar

1. Parar o worker de forma limpa, sem clicar em desconectar (isso revoga o vínculo).
2. Copiar `session.enc` para armazenamento privado separado da máquina. Guardar
   a chave correspondente em cofre separado; arquivo sem a chave não restaura.
   Não copiar QR temporário, logs, lock ou arquivo temporário de escrita.
3. Registrar data, versão do código e integridade da cópia sem registrar conteúdo.
4. Restaurar em ambiente privado com a mesma versão e chave, mantendo origem parada.
5. Conectar, conferir que a sessão recupera e que a API continua restrita.
   Caso o WhatsApp tenha invalidado a sessão, será necessário novo QR.
6. Só marcar recuperação validada após esse ensaio real. Os testes locais de
   criptografia já passam, mas não substituem a restauração com conta real.

## Migração com possibilidade de voltar

1. Aprovar destino/custo e preparar máquina, dependências, permissões e HTTPS.
2. Pausar novas solicitações, parar a origem e produzir cópia final da sessão.
3. Restaurar no destino sem executar duas instâncias da mesma sessão.
4. Conferir autenticação, pareamento e reinício no destino. Atualizar endereço do
   worker no site e testar pelo admin. Manter segredos fora de chats e logs.
5. Registrar resultado e somente então indicar migração concluída.
6. Para voltar: parar destino e avaliar a sessão mais recente antes de restaurar
   origem; uma cópia antiga pode não continuar válida. Aceitar novo pareamento
   quando necessário. Não destruir a origem antes de validar o destino.

## Registro dos ensaios

| Ensaio | Resultado até 01/10/2026 |
| --- | --- |
| QR temporário local | Responsável confirmou conexão; sem mensagens |
| Sessão criptografada e reinício | Teste automatizado com dados fictícios aprovado |
| Controle HTTP autenticado | Teste local com conexão simulada aprovado |
| Hospedagem Oracle / HTTPS | VM, worker, DNS e Caddy instalados; ingress 80/443 e certificado externo aprovados nos testes |
| Controle HTTPS real | 401 sem/token errado, 400 com Origin, 200 autenticado; demais rotas 404, HTTP→HTTPS 308; nenhum envio |
| Autenticação na VM / isolamento | Sem token e token errado: 401; Origin presente: 400; autenticado: 200; somente loopback |
| Reinício real do processo, sem pareamento | Aprovado: serviço ativo e controle autenticado após reinício limpo |
| Reinício com número dedicado | Aprovado em 30/09: sessão recuperada sem QR antes/depois dos testes manuais |
| Mensagem fixa manual | Destino resolvido pelo WhatsApp; responsável confirmou recebimento com print após novo ensaio autorizado; envio fechado, dois registros preservados |
| Backup/restauração real | Pendente |
| Migração entre máquinas | Pendente |
| Aviso externo de falha | Pendente |
| OTP de cliente / mensagem ao garçom | Piloto OTP de dois números ativado em 01/10; cadastro/reset completos e recebimento do código pendentes; mensagem ao garçom ainda não implementada |
| OTP QR: retenção e concorrência | 01/10: retenção testada além de 1.000 reservas; duas conexões nativas PostgreSQL locais validaram reserva, confirmação, consumo, tentativas e preparação concorrentes; sem acesso ao Supabase/WhatsApp de produção |
| OTP QR: diagnóstico de relógio | 01/10: ensaios fictícios aprovados; inspeção real com worker parado confirmou relógio seguro e sessão intacta; recuperação após regressão real/destrave manual não testados |

## Piloto OTP de 01/10 — operação atual

Responsável autorizou separadamente o piloto para dois telefones; lista e chaves ficam só na configuração privada. Worker revisado instalado sem reinstalar dependências; sessão reutilizada e dois registros fixos preservados. Vercel usa a main `7bbcbc0` com oito Secrets exclusivos de Production; deploy `CuH8PsmYEBubrXowuJckFgY5tZyj` Ready.
O Caddy agora também encaminha somente **POST `/messages/otp`**, corpo até 512 bytes, HTTPS normal e token próprio distinto do controle; não expõe `/messages/test` nem porta 8787. Sem token/token de controle no OTP: 401; token OTP não controla sessão; Origin: 400; GET OTP/outras rotas: 404; destino externo recusado sem reserva. Site real: fora da lista 403, corpo inválido 400/no-store. Código/PIN são digitados pelo participante no próprio site, nunca coletados pelo agente.
Para suspender novas verificações: fechar `WHATSAPP_OTP_ENABLED` e `WHATSAPP_QR_OTP_ENABLED` em Production e redeploy; fechar também `WHATSAPP_QR_OTP_ENABLED` no ambiente privado da VM e reiniciar/reconectar pelo admin. Não revogar pareamento nem apagar sessão/ledgers para interromper envios. Ampliação da lista exige autorização específica. Campanhas, mensagens operacionais e prêmios comerciais continuam desligados.

Referência de cotas e recolhimento: [Oracle Always Free](https://docs.oracle.com/en-us/iaas/Content/FreeTier/freetier_topic-Always_Free_Resources.htm).
O guia deve ser atualizado após cada ensaio e mudança de provedor.
