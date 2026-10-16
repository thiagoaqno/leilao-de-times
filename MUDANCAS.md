# Ausência temporária na Carreira em grupo

- O painel `/admin/carreira` agora permite **Pôr no automático** um técnico que deixou a aba aberta. O clube continua reservado para ele e o jogo resolve as decisões sem esperar sua resposta. O administrador pode usar **Devolver controle**, ou o próprio técnico pode apertar **Voltar a jogar** quando retornar.
- Se o anfitrião for colocado no automático, o cargo passa a outro técnico ativo. A sala mostra quem está no automático mesmo que o celular continue conectado.
- **Dispensar** continua disponível para quem saiu de vez. Se alguém assumir novamente o mesmo clube, as compras da janela anterior seguem contando e o aporte do investidor não é pago pela segunda vez. A correção vale nas próximas dispensas, inclusive em carreiras existentes.

## Verificação

- Teste com servidor e sockets reais: ativar o automático, concluir a rodada sem esperar o técnico, devolver o controle e passar o anfitrião.
- Testes direcionados: retorno ao clube sem nova cota ou aporte; autenticação do painel e sintaxe da página administrativa.
