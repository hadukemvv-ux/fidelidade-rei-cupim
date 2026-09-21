# Permissões operacionais

Atualizado em 21/09/2026. Esta matriz define as permissões vigentes do Clube.
O servidor confere o papel ativo em cada rota sensível; botões ocultos são apenas
uma ajuda visual, nunca a proteção principal.

| Papel | Pode fazer | Não pode fazer |
| --- | --- | --- |
| `garcom` | Entrar em `/garcom/comanda`, enviar duas fotos legíveis, confirmar somente o total e emitir o QR de teste vinculado à comanda | Abrir `/admin`, ver filas/fotos privadas, revisar comandas, validar cupom, administrar pessoas ou alterar regras/prêmios |
| `caixa` | Entrar em `/caixa`, consultar e validar cupom; a operação fica auditada | Abrir `/admin`, enviar comanda, emitir QR ou alterar catálogo/configuração/equipe |
| `gestor` | Abrir `/admin` em **somente consulta**: clientes, relatórios, equipe, comandas/fotos, operação da roleta, auditoria e histórico de incidentes | Criar QR, enviar/revisar comanda, validar cupom, convidar/suspender/excluir pessoas, editar prêmio, catálogo, piloto, importação ou contenção |
| `superadmin` | Todas as ações acima e toda alteração administrativa, sempre auditada | Não deve operar com conta compartilhada nem distribuir a própria senha |

## Rotas de entrada após login

- Garçom: `/garcom/comanda`.
- Caixa: `/caixa`.
- Gestor e superadmin: `/admin`.

Se uma conta estiver ativa, mas sem perfil operacional, o login é encerrado e a
tela informa que o superadmin precisa atribuir uma função. Isso evita uma conta
autenticada sem permissões claras.

O encaminhamento acima é aplicado pelo servidor e pelo login desde o checkpoint
`f436a6d`, publicado e confirmado como `Ready`. Em um novo computador, testar
primeiro o login de uma conta por papel antes de iniciar qualquer piloto.

## Regras para o piloto da roleta

1. Garçom fotografa o cabeçalho e o total da comanda.
2. O navegador precisa reconhecer mesa, abertura, ID do Pedido e valor; não há
   edição manual desses campos.
3. O garçom digita apenas o total para dupla conferência e emite o QR de teste.
4. Gestão acompanha as evidências e a reconciliação, mas não interfere no
   registro. Superadmin pode revisar em situação excepcional.
5. Caixa não emite QR. Ele só validará cupom quando existir campanha comercial
   aprovada; no piloto atual, cupom de teste é bloqueado para uso.

Qualquer expansão dessa matriz requer revisão de privacidade, trilha de
auditoria, teste por papel e atualização deste documento.
