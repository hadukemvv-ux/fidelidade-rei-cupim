# WhatsApp: hospedagem, recuperação e migração

Guia solicitado pelo responsável em 29/09/2026. Estado: **preparação**, não implantado.
Escolha inicial: tentar Oracle Always Free; nenhum plano pago autorizado.

## Para o responsável

- O admin deverá mostrar conexão, última verificação e ação recomendada.
- Uma queda não significa necessidade de migração: pode ser celular desvinculado,
  serviço parado, falha de rede, credencial ou limite do provedor.
- O painel de conexão ainda depende da entrega do Claude. Monitoramento externo
  e avisos de limite ainda não existem; não contar com alertas automáticos hoje.
- Custo zero depende das cotas e disponibilidade do provedor. A Oracle pode
  recolher recursos gratuitos ociosos. Não gerar carga artificial para evitar isso.
- Mudança para plano pago ou recurso cobrado exige decisão do responsável.

## Inventário a preencher na implantação

| Item | Estado |
| --- | --- |
| Conta Oracle / região / máquina | Pendente de acesso e disponibilidade |
| Plano e custo autorizado | Always Free, R$ 0 dentro das cotas |
| Endereço HTTPS do serviço | Pendente; não usar localhost em produção |
| Sessão e chave | Ainda não criadas para o piloto persistente |
| Backup externo privado | Pendente de configurar e testar |
| Último pareamento persistente real | Não realizado |
| Última restauração real | Não realizada |
| Monitor externo / destino do alerta | Pendente de definir e configurar |

Não escrever neste inventário telefone, token, chave, senha ou conteúdo do QR.
As variáveis, permissões e o contrato da API estão no README.

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

O serviço atual só conecta/desconecta. Não há envio implementado nesse worker.
Antes do primeiro envio: implementar transporte restrito aos destinatários de
teste aprovados, limites e tratamento de resultado incerto; depois ligar OTP.

## Como interpretar um problema

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

| Ensaio | Resultado até 29/09/2026 |
| --- | --- |
| QR temporário local | Responsável confirmou conexão; sem mensagens |
| Sessão criptografada e reinício | Teste automatizado com dados fictícios aprovado |
| Controle HTTP autenticado | Teste local com conexão simulada aprovado |
| Hospedagem Oracle / HTTPS | Pendente |
| Reinício com número dedicado | Pendente |
| Backup/restauração real | Pendente |
| Migração entre máquinas | Pendente |
| Aviso externo de falha | Pendente |
| OTP de cliente / mensagem ao garçom | Pendente |

Referência de cotas e recolhimento: [Oracle Always Free](https://docs.oracle.com/en-us/iaas/Content/FreeTier/freetier_topic-Always_Free_Resources.htm).
O guia deve ser atualizado após cada ensaio e mudança de provedor.
