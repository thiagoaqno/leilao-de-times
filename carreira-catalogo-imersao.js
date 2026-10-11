// Mais 300 acontecimentos entre rodadas. Cada linha tem história própria e efeitos reais.
// Formato: id | título | situação | efeitos | alvo (opcional) | condição (opcional).
// C = caixa em reais; M = moral; T = nota do time/rodadas; P = nota do jogador/rodadas;
// R = nota do rival no próximo jogo; I = lesão em rodadas; S = suspensão em rodadas;
// E = evolução permanente do jogador. Valores negativos pioram a situação.
const GRUPOS = [];
const grupo = (nome, icone, linhas) => GRUPOS.push(...linhas.map((linha) => {
  const [id, titulo, texto, efeitos, alvo, condicao] = linha.split("|");
  return { id: `imersao-${id}`, grupo: nome, icone, titulo, texto, efeitos, alvo: alvo || null, condicao: condicao || null };
}));

grupo("torcida", "galera", [
  "briga-classico|Briga de torcida no clássico|Uma confusão na chegada das torcidas ao estádio terminou com punição ao clube.|C:-100000,M:-2||classico",
  "sinalizadores|Sinalizadores na arquibancada|A festa da arquibancada terminou com multa pela fumaça no campo.|C:-150000,M:1||casa",
  "invasao-pos-jogo|Torcedor invadiu o gramado|Um torcedor entrou no campo e a segurança falhou.|C:-250000,M:-2||casa",
  "mosaico-desabou|Mosaico saiu errado|A estrutura do mosaico caiu antes de o time entrar.|C:-80000,M:-1||casa",
  "caravana-lotada|Caravana esgotada|A torcida levou ônibus extras para acompanhar o clube fora de casa.|C:120000,M:3||fora",
  "vaia-aquecimento|Vaiados no aquecimento|A torcida perdeu a paciência antes mesmo de a bola rolar.|M:-4,T:-1/1||derrota",
  "bandeirao-rasgado|Bandeirão rasgado|O bandeirão histórico se rasgou e o clube bancou a restauração.|C:-60000,M:-1||casa",
  "torcida-paga-ingresso|Arquibancada solidária|Torcedores compraram ingressos para distribuir a crianças do bairro.|C:90000,M:2||casa",
  "protesto-portao|Protesto no portão do CT|Um grupo bloqueou a saída do ônibus de treino.|M:-3,T:-1/1||derrota",
  "cantico-novo|Cântico novo pegou|A música criada pela torcida virou assunto no vestiário.|M:3,T:1/1",
  "pichacao-muro|Muro do estádio pichado|A limpeza e a vigilância extra passaram para a conta do clube.|C:-70000,M:-1||casa",
  "fila-ingressos|Fila virou notícia|Falha na venda de ingressos irritou sócios e gerou ressarcimentos.|C:-180000,M:-2||casa",
  "torcida-doa-sangue|Campanha de doação de sangue|A torcida lotou o hemocentro com a camisa do clube.|M:3,T:1/1",
  "fogos-concentracao|Fogos na concentração|Fogos à madrugada interromperam o sono do elenco.|T:-2/1,M:-1||fora",
  "recepcao-aeroporto|Recepção no aeroporto|Uma multidão esperou o time depois da viagem.|M:3,T:1/1||vitoria",
  "cadeiras-quebradas|Cadeiras quebradas|A confusão na arquibancada exigiu reparos antes do próximo jogo.|C:-220000,M:-2||casa",
  "coleta-uniformes|Camisas para a comunidade|Torcedores organizaram uma coleta de uniformes para projetos sociais.|M:2,C:-40000",
  "boicote-torcida|Boicote à bilheteria|Parte da torcida deixou de comprar ingresso em protesto contra o preço.|C:-350000,M:-3||casa",
  "festa-rua|Festa na rua do estádio|Comerciantes e torcedores organizaram uma festa antes da partida.|C:140000,M:2||casa",
  "torcida-mirante|Bandeiras na estrada|A torcida se reuniu na estrada para acompanhar a saída do ônibus.|M:2,T:1/1",
]);

grupo("estadio", "estadio", [
  "refletores-apagaram|Refletores apagaram|Uma pane elétrica obrigou o clube a alugar geradores de emergência.|C:-450000,T:-1/1||casa",
  "gramado-encharcado|Gramado encharcado|A drenagem falhou após chuva forte e exigiu reparo urgente.|C:-300000,T:-1/1||casa",
  "camarote-alugado|Camarote esgotado|Empresas fecharam todos os camarotes para o próximo jogo.|C:420000,M:1||casa",
  "catracas-pararam|Catracas pararam|Uma pane nas catracas atrasou a entrada e gerou reembolso.|C:-160000,M:-2||casa",
  "vestiario-inundado|Vestiário inundado|Um cano estourou e molhou equipamentos e uniformes.|C:-190000,T:-1/1||casa",
  "telão-parceria|Anúncio no telão|Uma marca comprou a exibição do intervalo.|C:210000||casa",
  "banheiros-interditados|Banheiros interditados|A fiscalização exigiu reforma antes de liberar a arquibancada.|C:-520000,M:-2||casa",
  "gramado-novo|Tapete novo|O clube concluiu uma troca de placas do gramado.|C:-680000,T:2/2||casa",
  "estacionamento-extra|Estacionamento extra|Um terreno vizinho virou estacionamento nos dias de jogo.|C:95000||casa",
  "placa-publicitaria|Placa publicitária caiu|O vento derrubou uma placa e a inspeção gerou despesas.|C:-110000||casa",
  "museu-visitas|Museu recebeu excursões|O museu do estádio teve semana recorde de visitantes.|C:125000,M:1||casa",
  "rede-gol-rasgada|Redes substituídas|As redes dos gols estavam danificadas no teste pré-jogo.|C:-50000||casa",
  "arquibancada-vistoria|Vistoria na arquibancada|Uma área foi fechada até a troca dos corrimãos.|C:-390000,M:-1||casa",
  "lanchonetes-recorde|Lanchonetes em alta|A concessão de alimentação rendeu acima do esperado.|C:170000||casa",
  "placa-homenagem|Placa de homenagem|O clube instalou uma placa para um ídolo na entrada do estádio.|C:-80000,M:2||casa",
  "vazamento-cobertura|Goteira na cobertura|Um vazamento atingiu os setores cobertos do estádio.|C:-260000||casa",
  "wifi-estadio|Wi-Fi liberado|O estádio ganhou rede para os torcedores com patrocínio local.|C:110000,M:1||casa",
  "portao-estragado|Portão de acesso quebrado|A segurança pediu troca imediata do portão principal.|C:-130000||casa",
  "visita-escolas|Escolas no estádio|Visitas de escolas locais fortaleceram a relação com o bairro.|C:55000,M:2||casa",
  "aluguel-show|Estádio recebeu um show|Um show na semana livre pagou aluguel ao clube.|C:600000,T:-1/1||casa",
]);

grupo("imprensa", "camera", [
  "manchete-crise|Manchete de crise|Uma capa de jornal chamou o vestiário de rachado.|M:-3,T:-1/1",
  "entrevista-sincera|Entrevista sincera|O capitão explicou os erros da equipe sem atacar ninguém.|M:2,T:1/1",
  "boato-demissao|Boato de demissão|Um programa anunciou uma troca de técnico que não existe.|M:-2,T:-1/1",
  "documentario-elenco|Documentário do elenco|Uma equipe acompanhou a rotina de treinos e pagou pelo acesso.|C:230000,M:1",
  "foto-treino-vazada|Foto do treino vazou|Uma foto mostrou a estratégia de bola parada ao rival.|R:2,T:-1/1||adv",
  "podcast-idolo|Ídolo no podcast|Um ex-jogador defendeu o elenco publicamente.|M:3",
  "rumor-contrato|Rumor contratual|Uma notícia falsa sobre salários gerou perguntas no CT.|M:-2",
  "coletiva-repercutiu|Coletiva repercutiu|A fala do técnico virou motivação no vestiário.|M:2,T:1/1",
  "analise-tv|Análise na televisão|O próximo adversário teve seus pontos fracos expostos em rede nacional.|R:-1||adv",
  "microfone-aberto|Microfone aberto|Uma reclamação interna foi captada após a coletiva.|M:-3",
  "perfil-revista|Perfil em revista|Uma revista dedicou a capa ao projeto esportivo do clube.|C:95000,M:2",
  "radio-local|Rádio do bairro|Uma rádio transmitiu treino aberto e aproximou o clube da torcida.|C:50000,M:1",
  "critica-tatica|Crítica à tática|Um comentarista chamou o plano de jogo de previsível.|M:-1,T:-1/1",
  "jornal-elogia-base|Base elogiada|Uma reportagem destacou os jovens do clube.|M:2,E:1|reserva",
  "entrevista-lesionado|Entrevista atravessada|Um jogador machucado reclamou de não ter sido ouvido.|M:-2,P:-1/2|lesionado",
  "imagem-bastidor|Imagem de bastidor|Um vídeo de união do elenco viralizou.|M:3,T:1/1",
  "corte-fora-contexto|Fala fora de contexto|Um corte de entrevista criou atrito com o rival.|R:1,M:-1||adv",
  "coluna-elenco|Coluna de opinião|Uma coluna pediu paciência para a reconstrução do time.|M:2",
  "reporter-ct|Repórter no CT|Uma invasão de área restrita obrigou a reforçar credenciais.|C:-60000,M:-1",
  "melhor-coletiva|Coletiva aplaudida|O técnico respondeu com calma a uma pergunta difícil.|M:2,T:1/1",
]);

grupo("patrocinio", "moeda", [
  "patrocinador-rompeu|Patrocinador rescindiu|A marca ativou uma cláusula de saída e reteve a última parcela.|C:-2000000,M:-2",
  "bonus-engajamento|Bônus de engajamento|As redes do clube bateram a meta de alcance da marca.|C:350000",
  "campanha-camisa|Campanha da camisa|A nova campanha vendeu acima da projeção.|C:750000,M:1",
  "logo-atrasou|Uniforme atrasado|O patrocinador entregou a arte fora do prazo e bancou compensação.|C:130000",
  "patrocinio-juvenil|Apoio à base|Uma empresa local financiou o trabalho da categoria de base.|C:280000,E:1|reserva",
  "multa-contrato|Cláusula comercial|O clube descumpriu uma entrega de publicidade e pagou multa.|C:-420000",
  "evento-patrocinador|Evento da marca|O elenco compareceu a uma ação comercial cansativa.|C:300000,T:-1/1",
  "parceria-hospital|Parceria médica|Um hospital comprou espaço no estádio e ajudou o departamento médico.|C:240000,H:1|lesionado",
  "licenciamento-boneco|Bonecos do elenco|Uma linha de miniaturas licenciadas começou a render royalties.|C:180000,M:1",
  "auditoria-marca|Auditoria comercial|O patrocinador exigiu auditoria extra das ativações do contrato.|C:-90000",
  "patrocinio-tour|Patrocínio da excursão|Uma empresa pagou parte da próxima viagem.|C:220000",
  "venda-camisa-recorde|Camisa esgotada|O modelo alternativo esgotou em dois dias.|C:850000,M:2",
  "empresa-atrasa|Parcela atrasada|Um parceiro atrasou a parcela e o clube teve de antecipar crédito.|C:-160000",
  "premio-fairplay|Prêmio de conduta|Um parceiro pagou bônus por ação social do clube.|C:140000,M:2",
  "renovacao-estadio|Naming rights renovado|A marca do estádio renovou por mais uma temporada.|C:1500000",
  "multa-imagem|Uso indevido de imagem|Uma campanha saiu sem aprovação e gerou indenização.|C:-300000,M:-1",
  "loja-pop-up|Loja temporária|Uma loja na praça principal vendeu camisas oficiais.|C:260000",
  "colecao-retro|Coleção retrô|Uma camisa histórica voltou às prateleiras.|C:430000,M:1",
  "cancelamento-evento|Ação cancelada|A marca cancelou um encontro com torcedores em cima da hora.|C:-120000,M:-1",
  "patrocinador-premia|Bônus inesperado|Um parceiro premiou o crescimento da torcida no estádio.|C:500000,M:1||casa",
]);

grupo("diretoria", "maleta", [
  "auditoria-contas|Auditoria nas contas|Uma auditoria achou contratos de manutenção cobrados em duplicidade.|C:320000",
  "multa-atraso|Multa administrativa|Documentos enviados fora do prazo custaram caro ao clube.|C:-650000,M:-1",
  "premio-metas|Meta intermediária|A diretoria liberou um prêmio por objetivos parciais.|C:900000,M:2||lider",
  "reuniao-tensa|Reunião tensa|A diretoria cobrou uma reação imediata do elenco.|M:-3,T:1/1||derrota",
  "aporte-emergencial|Aporte emergencial|Os conselheiros aprovaram dinheiro para manter o projeto.|C:1800000,M:1||baixo",
  "juros-divida|Juros da dívida|A parcela atrasada acumulou encargos extras.|C:-1100000||baixo",
  "corte-viagens|Corte de custos|A direção reduziu a logística para equilibrar as contas.|C:180000,T:-1/2",
  "festa-conselho|Festa dos conselheiros|Um jantar de gala saiu do orçamento do futebol.|C:-240000,M:-1",
  "premio-estabilidade|Prêmio por estabilidade|O conselho pagou bônus pelo ambiente de trabalho.|C:300000,M:2||vitoria",
  "consultoria-cara|Consultoria externa|Uma consultoria cobrou um estudo que pouco ajudou.|C:-380000,T:-1/1",
  "novo-diretor|Novo diretor de futebol|Um diretor assumiu e fez uma boa primeira reunião.|M:2,T:1/2",
  "troca-sistema|Sistema financeiro novo|A migração dos contratos exigiu custo de implantação.|C:-270000",
  "mecenas-doa|Doação de mecenas|Um torcedor antigo fez uma doação sem condições.|C:700000,M:1",
  "comite-crise|Comitê de crise|A diretoria montou um grupo para proteger o clube da má fase.|C:-140000,M:1||derrota",
  "viagem-dirigentes|Viagem dos dirigentes|Uma comitiva excessiva viajou junto com o elenco.|C:-190000",
  "cobranca-meta|Cobrança da meta|O conselho avisou que a paciência com os resultados acabou.|M:-3,T:-1/1||baixo",
  "premio-classico|Prêmio especial do clássico|A diretoria prometeu incentivo extra ao elenco.|C:-300000,T:2/1||classico",
  "economia-contratos|Contratos renegociados|A administração reduziu custos de serviços recorrentes.|C:410000",
  "erro-contabil|Erro contábil|Um lançamento antigo revelou uma despesa não provisionada.|C:-560000",
  "voto-confianca|Voto de confiança|A diretoria respaldou o técnico diante das críticas.|M:3,T:1/1||derrota",
]);

grupo("vestiario", "escudo", [
  "lideranca-dividida|Liderança dividida|Dois veteranos discordaram sobre quem deve falar antes da partida.|M:-3,T:-1/1",
  "churrasco-elenco|Churrasco do elenco|O elenco bancou um churrasco para receber os novatos.|M:3,T:1/1",
  "atraso-reuniao|Atraso na reunião|Um titular perdeu a reunião tática depois de dormir demais.|P:-2/1,M:-1|titular",
  "carta-capitao|Carta do capitão|O capitão escreveu uma carta para unir o grupo.|M:4,T:1/2",
  "disputa-armario|Briga pelo armário|Uma discussão boba sobre espaço no vestiário virou empurra-empurra.|M:-2,P:-1/1|titular",
  "familia-no-ct|Famílias no CT|A comissão liberou uma manhã com familiares no clube.|M:3,T:1/1",
  "premio-atrasado|Premiação atrasada|Jogadores cobraram uma gratificação prometida pela direção.|C:-500000,M:-2",
  "reserva-reclamou|Reserva reclamou|Um reserva disse que merece minutos e mostrou isso no treino.|P:2/2,M:-1|reserva",
  "capitao-multou|Capitão aplicou multa|O capitão cobrou disciplina de um colega que chegou atrasado.|M:2,P:-1/1|titular",
  "grupo-corrida|Desafio de corrida|Os jogadores disputaram quem chegava primeiro no treino.|M:2,T:1/1",
  "aniversario-rouparia|Aniversário do roupeiro|O elenco surpreendeu o roupeiro com uma festa simples.|M:3",
  "celular-reuniao|Celular na reunião|Um jogador foi flagrado assistindo a vídeos durante a análise do rival.|P:-2/1,M:-2|titular",
  "promessa-coletiva|Promessa coletiva|Os líderes prometeram à torcida mudar a postura em campo.|M:2,T:2/1||derrota",
  "boas-vindas-estrangeiro|Boas-vindas em outro idioma|O grupo preparou uma recepção ao colega recém-chegado.|P:2/2,M:1|estrangeiro",
  "video-familias|Vídeo das famílias|Antes da partida, os jogadores assistiram a mensagens de casa.|M:3,T:1/1",
  "dieta-escondida|Lanche escondido|Um jogador furou a dieta do clube e passou mal no treino.|P:-2/2|titular",
  "faixa-capitao|Faixa devolvida|O capitão voltou a usar a faixa após conversa com o grupo.|P:2/2,M:2|titular",
  "mesa-separada|Mesa separada|Parte do elenco sentou longe dos companheiros na concentração.|M:-3,T:-1/1",
  "treino-por-aposta|Aposta entre setores|Defesa e ataque fizeram uma disputa saudável no treino.|M:2,T:1/2",
  "pedido-desculpas|Pedido de desculpas|Um jogador pediu desculpas ao grupo por uma atitude impulsiva.|P:2/1,M:2|titular",
]);

grupo("treino", "bola", [
  "treino-finalizacao|Finalização extra|Os atacantes ficaram depois do treino para aprimorar o chute.|P:2/2|ataque",
  "treino-bola-parada|Bola parada ensaiada|A comissão encontrou uma jogada nova para escanteios.|T:2/2",
  "gps-quebrado|GPS dos atletas falhou|A comissão perdeu dados de carga de treino e dosou mal o esforço.|T:-1/2",
  "campo-treino-ruim|Campo de treino irregular|O gramado do CT prejudicou os trabalhos da semana.|T:-2/1,C:-90000",
  "coletivo-intenso|Coletivo intenso|O elenco fez um coletivo forte e terminou bem preparado.|T:2/1,M:1",
  "treino-portoes-abertos|Treino aberto|A torcida compareceu ao treino e fez barulho para apoiar.|M:2,T:1/1",
  "bola-nova|Bolas novas|A comissão comprou bolas iguais às da competição.|C:-70000,T:1/2",
  "analise-individual|Análise individual|Um jovem recebeu um plano de evolução personalizado.|E:1|reserva",
  "circuito-defensivo|Circuito defensivo|Os zagueiros repetiram coberturas até o fim da tarde.|P:2/3|defesa",
  "treino-penaltis|Treino de pênaltis|O goleiro trabalhou leitura de cobranças com a comissão.|P:2/2|goleiro",
  "chuteira-escorregou|Chuteira errada|Um titular usou travas inadequadas e escorregou no coletivo.|P:-2/1|titular",
  "treino-substitutos|Reservas em foco|A comissão reservou um dia só para os jogadores do banco.|P:3/2|reserva",
  "amigavel-interno|Amistoso interno|O grupo disputou um jogo treino com intensidade de campeonato.|T:1/2,M:1",
  "treino-curto|Treino encurtado|A chuva forte obrigou a terminar a sessão antes do previsto.|T:-1/1",
  "video-adversario|Vídeo do adversário|A análise encontrou um padrão de saída de bola do próximo rival.|R:-2||adv",
  "lateral-invertido|Experimento tático|Um lateral se adaptou bem a uma função nova no treino.|P:2/2|defesa",
  "cobranca-faltas|Faltas após o treino|Um meia repetiu cobranças por uma hora depois do grupo sair.|P:2/2|meio",
  "treino-forte-demais|Carga exagerada|Uma sessão intensa demais deixou o grupo pesado.|T:-2/1,M:-1",
  "rotina-recuperacao|Treino regenerativo|A comissão trocou intensidade por recuperação e leveza.|T:1/1,M:1",
  "simulacao-pressao|Treino sob pressão|A equipe treinou com barulho artificial de arquibancada.|T:1/2,M:1",
]);

grupo("saude", "alerta", [
  "virose-hotel|Virose no hotel|Um titular passou a noite doente e não treinou.|P:-3/1|titular",
  "exame-muscular|Exame muscular|Um titular precisou ficar dois jogos fora por uma lesão no treino.|I:2|titular",
  "fisioterapia-avanço|Fisioterapia avançou|O tratamento de um atleta machucado terminou antes do previsto.|H:1,M:1|lesionado",
  "nutricionista-cardapio|Cardápio renovado|A nutricionista ajustou a alimentação para a sequência de jogos.|T:1/3,C:-100000",
  "gripe-vestiario|Gripe no vestiário|Um resfriado atingiu o grupo em semana de jogo.|T:-2/1",
  "cirurgia-reserva|Cirurgia inesperada|Um reserva precisou de procedimento após sentir dor persistente.|I:4|reserva",
  "sono-monitorado|Sono monitorado|A comissão ajustou horários e melhorou a recuperação do elenco.|T:1/2,M:1",
  "exames-contaminados|Exames repetidos|O laboratório perdeu amostras e todos refizeram os testes.|C:-150000,T:-1/1",
  "medico-retorna|Médico retornou|O médico titular voltou de licença e acelerou os tratamentos.|H:1|lesionado",
  "dente-quebrado|Choque no treino|Um titular quebrou um dente no treino e precisou de atendimento.|C:-50000,P:-1/1|titular",
  "alergia-hotel|Crise alérgica|Um jogador reagiu à comida do hotel e ficou sem condição de treino.|P:-2/1|titular",
  "vacina-elenco|Vacinação do elenco|O clube organizou vacinação preventiva para a comissão e jogadores.|C:-90000,T:1/2",
  "ligamento-reserva|Lesão no ligamento|Um reserva sofreu lesão séria durante um coletivo.|I:6,M:-2|reserva",
  "tratamento-inovador|Tratamento novo|Uma clínica ofereceu método de recuperação com bons resultados.|C:-260000,H:2|lesionado",
  "fadiga-acumulada|Fadiga acumulada|Os exames apontaram sinais claros de desgaste no grupo.|T:-2/2",
  "medicina-preventiva|Avaliação preventiva|Uma avaliação impediu que uma dor pequena virasse lesão.|P:1/2|titular",
  "desidratacao|Desidratação|O calor no treino derrubou o rendimento de um jogador.|P:-2/1|titular",
  "analise-biomecanica|Análise biomecânica|Um atacante corrigiu o movimento de corrida com os fisioterapeutas.|E:1|ataque",
  "piscina-recuperacao|Piscina terapêutica|A comissão levou o grupo para recuperação na água.|C:-60000,T:1/2",
  "surto-ct|Surto no CT|A equipe médica isolou parte do elenco por precaução.|T:-3/1,C:-180000",
]);

grupo("viagens", "aviao", [
  "voo-cancelado|Voo cancelado|O time precisou fretar outro avião em cima da hora.|C:-700000,T:-1/1||fora",
  "onibus-quebrou|Ônibus quebrado|O ônibus parou na estrada e o elenco chegou tarde ao hotel.|C:-120000,T:-1/1||fora",
  "hotel-surpresa|Hotel melhor que o previsto|Uma parceria colocou o elenco em quartos mais confortáveis.|T:1/1,M:1||fora",
  "bagagem-extraviada|Bagagem extraviada|Parte das chuteiras não chegou com a delegação.|C:-65000,T:-1/1||fora",
  "escala-longa|Escala longa|Uma conexão de voo prolongou a viagem do elenco.|T:-2/1||fora",
  "patrocinador-fretou|Fretamento patrocinado|Um parceiro pagou o transporte para o próximo jogo.|C:450000,T:1/1||fora",
  "chuva-estrada|Estrada alagada|O ônibus desviou do caminho e a delegação perdeu horas.|T:-1/1,C:-80000||fora",
  "atraso-imigracao|Atraso na imigração|A burocracia atrasou a chegada ao hotel.|T:-1/1||fora",
  "torcida-hotel|Torcida no hotel|Torcedores locais prepararam recepção calorosa para a delegação.|M:2,T:1/1||fora",
  "quarto-barulhento|Quartos barulhentos|Uma obra no hotel atrapalhou o descanso de todo o elenco.|T:-2/1||fora",
  "comida-atrasou|Jantar atrasou|O fornecedor do hotel não preparou a refeição no horário.|T:-1/1,C:-50000||fora",
  "viagem-antecipada|Viagem antecipada|O clube chegou um dia antes e treinou no clima local.|C:-180000,T:2/1||fora",
  "mala-uniformes|Mala de uniformes|O kit de jogo ficou preso em outro aeroporto.|C:-110000,M:-1||fora",
  "turbulencia-forte|Turbulência forte|O voo difícil deixou a delegação tensa e sem sono.|T:-1/1,M:-1||fora",
  "onibus-novo|Ônibus novo|O clube estreou transporte mais confortável.|C:-350000,T:1/2",
  "fretamento-dividido|Voo dividido|Dois clubes dividiram custos de fretamento para a mesma cidade.|C:160000||fora",
  "protesto-aeroporto|Aeroporto fechado|Uma manifestação cancelou embarques e exigiu nova rota.|C:-380000,T:-1/1||fora",
  "treino-hotel|Treino no hotel|O espaço do hotel permitiu manter a preparação apesar da viagem.|T:1/1||fora",
  "mala-tatica|Material tático perdido|As pranchetas e vídeos da comissão ficaram em bagagem extraviada.|T:-1/1||fora",
  "retorno-facilitado|Retorno tranquilo|Um voo direto liberou mais tempo de recuperação ao elenco.|T:1/2||fora",
]);

grupo("arbitragem", "apito", [
  "relatorio-sumula|Súmula contestada|O clube recorreu de um relatório disciplinar e pagou custas.|C:-110000,M:-1",
  "multa-reclamacao|Reclamação na coletiva|Críticas à arbitragem renderam multa ao técnico.|C:-100000,M:1",
  "cartao-revisto|Cartão revisto|Um recurso retirou a suspensão de um atleta.|U:1|suspenso",
  "arbitro-interrompeu|Jogo interrompido|Uma falha no protocolo de segurança gerou punição financeira.|C:-270000||casa",
  "treino-regra|Palestra de regras|Um ex-árbitro explicou mudanças de interpretação ao elenco.|T:1/2,C:-55000",
  "var-polemica|VAR virou debate|A polêmica da rodada mexeu com o foco do grupo.|M:-2,T:-1/1",
  "multa-banco|Banco exaltado|A comissão recebeu multa por reclamações insistentes.|C:-130000,M:-1",
  "recurso-aceito|Recurso aceito|O tribunal anulou uma punição administrativa antiga.|C:170000,M:1",
  "objetos-campo|Objeto no gramado|A súmula registrou um objeto lançado da arquibancada.|C:-300000,M:-1||casa",
  "delegado-partida|Fiscalização reforçada|O clássico exigiu operação extra de arbitragem e segurança.|C:-220000||classico",
  "aviso-disciplina|Alerta disciplinar|Os atletas foram lembrados do risco de cartões bobos.|T:1/1,M:1",
  "protesto-formal|Protesto formal|O clube protocolou reclamação e arcou com taxas.|C:-75000,R:-1||adv",
  "carrinho-revisado|Lance revisado|A comissão explicou no vídeo onde os defensores exageraram nos carrinhos.|P:1/2|defesa",
  "delegacao-punida|Delegação punida|Um membro da comissão desrespeitou área restrita.|C:-140000",
  "recurso-negado|Recurso negado|O tribunal manteve a sanção e cobrou despesas adicionais.|C:-210000,M:-1",
  "arbitragem-amistoso|Árbitro no treino|Um árbitro apitou o coletivo e ajudou a corrigir faltas.|T:1/1,C:-50000",
  "relatorio-elogio|Relatório elogiou conduta|A federação elogiou o comportamento da equipe.|M:2",
  "atraso-sumula|Súmula atrasada|Um erro administrativo impediu registrar o elenco no prazo.|C:-90000,T:-1/1",
  "suspensao-comissao|Comissão suspensa|Um auxiliar foi suspenso depois de protestar na área técnica.|C:-120000,T:-1/1",
  "reuniao-federacao|Reunião com a federação|O clube recebeu orientações que evitaram problemas futuros.|T:1/2,M:1",
]);

grupo("base", "estrela", [
  "joia-subiu|Joia chamou atenção|Um jovem do banco treinou acima do nível do elenco principal.|E:1|reserva",
  "olheiro-escola|Olheiro na escola|Uma visita a torneio escolar abriu novos contatos.|C:-70000,M:1",
  "torneio-base|Base venceu torneio|A categoria de base levantou um troféu regional.|C:120000,M:2",
  "alojamento-reforma|Alojamento reformado|Os quartos dos jovens passaram por reforma necessária.|C:-520000,M:1",
  "professor-voluntario|Professor voluntário|Um ex-jogador ofereceu aulas de posicionamento aos jovens.|E:1|reserva",
  "familia-jovem|Família do jovem|A família de um atleta da base visitou o CT e renovou sua motivação.|P:2/3|reserva",
  "bolsa-estudos|Bolsas de estudo|O clube abriu bolsas para atletas jovens concluírem a escola.|C:-250000,M:2",
  "base-amistoso|Amistoso da base|Os reservas ganharam minutos contra um time sub-20.|P:2/2|reserva",
  "promessa-lesionou|Promessa lesionada|Um jovem sentiu o joelho durante treino extra.|I:3|reserva",
  "seletiva-local|Seletiva lotada|O clube abriu testes e recebeu dezenas de candidatos.|C:-95000,M:1",
  "treino-mental|Treino mental dos jovens|Uma psicóloga trabalhou tomada de decisão com os reservas.|P:2/3|reserva",
  "categoria-sem-van|Van da base quebrou|A equipe juvenil precisou alugar transporte para um torneio.|C:-80000",
  "premio-formacao|Prêmio de formação|Um antigo atleta rendeu compensação de formação ao clube.|C:400000",
  "jovem-capitao|Capitão da base|Um reserva mostrou liderança ao comandar um jogo treino.|P:2/2,M:1|reserva",
  "intercambio-base|Intercâmbio juvenil|O clube bancou uma semana de treinos em outra cidade.|C:-310000,E:1|reserva",
  "campeonato-junior|Título juvenil|A base foi campeã e a festa contagiou o profissional.|M:3,T:1/1",
  "escolinha-bairro|Escolinha no bairro|O clube ajudou a abrir uma escolinha comunitária.|C:-120000,M:2",
  "goleiro-promessa|Goleiro promissor|O goleiro do elenco aproveitou treino com os jovens e evoluiu.|E:1|goleiro",
  "analise-base|Relatório da base|Os analistas apontaram um reserva pronto para ganhar espaço.|P:3/2|reserva",
  "bolsa-patrocinada|Bolsa patrocinada|Uma empresa local pagou os estudos de atletas da base.|C:130000,M:1",
]);

grupo("mercado", "troca", [
  "olheiro-viagem|Olheiro em viagem|O clube enviou um olheiro para observar uma competição distante.|C:-160000||janela",
  "empresario-vazou|Empresário vazou conversa|Uma negociação reservada apareceu na imprensa.|M:-2,T:-1/1||janela",
  "renovacao-salario|Renovação valorizada|Um titular aceitou renovar após reajuste salarial.|F:1.15,P:2/3|titular",
  "multa-agente|Taxa de empresário|Uma cláusula antiga obrigou o clube a pagar comissão.|C:-520000||janela",
  "proposta-retirada|Proposta retirada|Um clube desistiu de negociar e o vestiário respirou.|M:1||janela",
  "observador-externo|Observador visitante|Um olheiro de outro clube apareceu no treino aberto.|P:2/1|titular",
  "clausula-esquecida|Cláusula esquecida|Uma venda antiga acionou pagamento inesperado.|C:-850000||janela",
  "recompensa-venda|Percentual de venda|Um ex-atleta foi negociado e o clube recebeu sua parte.|C:1100000||janela",
  "ligacao-olheiro|Indicação do olheiro|Um observador conseguiu desconto para contratar um jogador de outro clube.|D:1|outro|janela",
  "contrato-falso|Contrato suspeito|A equipe jurídica identificou documento falso antes da assinatura.|C:-100000,M:1||janela",
  "jogador-quer-sair|Pedido de transferência|Um reserva pediu para ser colocado na lista de venda.|V:1,M:-1|reserva|janela",
  "agente-recuou|Agente recuou|Um empresário desistiu de cobrar comissão extra.|C:240000||janela",
  "avaliacao-medica|Exames da negociação|Uma contratação cancelada deixou a conta dos exames com o clube.|C:-75000||janela",
  "bonus-negociacao|Bônus de negociação|Uma antiga compra bateu metas e acionou parcela adicional.|C:-690000||janela",
  "percentual-solidario|Mecanismo de solidariedade|A venda de um ex-jogador gerou receita de formação.|C:360000||janela",
  "boato-reforco|Boato de reforço|O elenco ouviu que um craque pode chegar para a mesma posição.|P:-1/1,M:-1|titular|janela",
  "observador-acertou|Olheiro acertou|A equipe de análise identificou uma fraqueza de mercado no rival.|R:-1||adv",
  "contrato-revisado|Contrato revisado|Uma revisão jurídica eliminou taxas de um acordo pendente.|C:190000||janela",
  "disputa-agentes|Agentes em disputa|Dois agentes pressionaram o clube por uma mesma negociação.|C:-130000,M:-1||janela",
  "janela-fechando|Último dia da janela|A correria final elevou o custo de logística do departamento.|C:-90000,T:-1/1||janela",
]);

grupo("comunidade", "palmas", [
  "escola-visita|Visita à escola|O capitão conversou com crianças de uma escola pública.|M:2,P:1/2|titular",
  "enchente-bairro|Enchente no bairro|O clube abriu o estádio para abrigar famílias atingidas.|C:-420000,M:3",
  "campanha-alimentos|Campanha de alimentos|Torcedores arrecadaram alimentos com apoio do clube.|C:-70000,M:2",
  "hospital-infantil|Hospital infantil|Jogadores visitaram crianças em tratamento.|M:3,T:1/1",
  "praça-adotada|Praça adotada|O clube ajudou a reformar uma praça próxima ao estádio.|C:-220000,M:2",
  "biblioteca-clube|Biblioteca comunitária|O estádio abriu espaço de leitura em dias sem jogo.|C:-180000,M:2",
  "dia-acessibilidade|Dia da acessibilidade|O clube instalou sinalização e melhorou o acesso ao estádio.|C:-350000,M:2",
  "corrida-beneficente|Corrida beneficente|Uma corrida com a camisa do clube arrecadou fundos e novos sócios.|C:120000,M:2",
  "abrigo-animais|Apoio a abrigo|O clube doou suprimentos a um abrigo de animais.|C:-60000,M:1",
  "festival-bairro|Festival do bairro|O estádio recebeu uma feira local com receita de aluguel.|C:150000,M:1",
  "projeto-inclusao|Projeto de inclusão|Jovens com deficiência participaram de um treino adaptado.|C:-85000,M:3",
  "doacao-uniformes|Uniformes doados|Camisas antigas foram entregues a times de várzea.|C:-45000,M:2",
  "memoria-torcedor|Memória de torcedor|O clube homenageou um sócio que frequentava o estádio há décadas.|M:2",
  "reciclagem-estadio|Reciclagem no estádio|A operação de coleta seletiva gerou receita modesta.|C:60000,M:1||casa",
  "curso-arbitragem|Curso comunitário|O clube ofereceu curso básico de arbitragem para jovens.|C:-120000,M:2",
  "mutirao-limpeza|Mutirão de limpeza|Torcedores e funcionários limparam o entorno do estádio.|C:-50000,M:2||casa",
  "doacao-roupas|Roupas de inverno|A delegação levou doações para famílias da região.|C:-90000,M:2",
  "acoes-escola|Aulas com ex-atletas|Ídolos deram aulas gratuitas de futebol no bairro.|C:-100000,M:2",
  "feira-emprego|Feira de empregos|O estádio sediou uma feira e recebeu aluguel simbólico.|C:75000,M:2||casa",
  "projeto-torcida|Projeto da torcida|Torcedores financiaram material para a escolinha do clube.|C:85000,M:2",
]);

grupo("competicao", "taca", [
  "premio-transmissao|Bônus de transmissão|Uma emissora escolheu a partida para horário nobre.|C:650000||adv",
  "multa-inscricao|Inscrição fora do prazo|O clube corrigiu uma inscrição de atleta e pagou taxa.|C:-250000||adv",
  "calendario-apertou|Calendário apertado|Uma mudança de data encurtou a preparação para o próximo jogo.|T:-2/1||adv",
  "jogo-adiado|Partida adiada|A organização cobrou custos de operação de um jogo remarcado.|C:-210000||adv",
  "premio-tv-extra|Jogo na TV aberta|A exposição trouxe uma cota adicional ao clube.|C:390000,M:1||adv",
  "viagem-copa|Viagem de copa|Um compromisso eliminatório exigiu logística acima do orçamento.|C:-480000||adv",
  "classico-premiado|Clássico em destaque|A transmissão do clássico vendeu patrocínios extras.|C:520000,M:1||classico",
  "protesto-tabela|Protesto contra a tabela|O clube contestou intervalo curto entre partidas e pagou taxa.|C:-80000,M:-1||adv",
  "licenca-federacao|Licença renovada|A federação cobrou atualização de documentos do estádio.|C:-190000||casa",
  "rodada-solidaria|Rodada solidária|A liga destinou parte da receita do jogo a uma causa social.|C:-120000,M:2||casa",
  "bonus-audiencia|Audiência recorde|O jogo anterior bateu recorde de audiência e gerou bônus.|C:280000",
  "mudanca-mando|Mudança de mando|O clube precisou adaptar sua operação a um novo horário.|C:-110000,T:-1/1||adv",
  "premio-disciplina|Prêmio disciplinar|A liga premiou a conduta do clube na rodada.|C:100000,M:1",
  "taxa-organizacao|Taxa de organização|A competição cobrou despesas adicionais de operação.|C:-170000||adv",
  "patrocinio-copa|Apoio para a copa|Um parceiro entrou apenas para a campanha atual.|C:460000||adv",
  "bolas-oficiais|Bolas oficiais atrasaram|O fornecedor enviou o material fora do prazo.|C:-60000,T:-1/1||adv",
  "reuniao-tecnica|Reunião técnica|A comissão aproveitou a reunião da liga para estudar o regulamento.|T:1/1||adv",
  "fase-decisiva|Semana decisiva|A proximidade da decisão deixou o elenco concentrado.|T:2/1,M:1||lider",
  "premio-federacao|Premiação inesperada|Uma verba de participação entrou antes do previsto.|C:720000",
  "multa-protocolo|Protocolo descumprido|A competição multou o clube por atraso no acesso ao campo.|C:-130000,M:-1",
]);

grupo("estrutura", "guindaste", [
  "gerador-ct|Gerador do CT queimou|Treinos ficaram sem iluminação até a troca do equipamento.|C:-340000,T:-1/1",
  "lavanderia-parou|Lavanderia parou|O clube precisou contratar serviço emergencial para lavar os uniformes.|C:-100000",
  "academia-reformada|Academia reformada|A nova sala de musculação abriu para o elenco.|C:-800000,T:2/3",
  "cozinha-vistoria|Vistoria na cozinha|Uma irregularidade exigiu reforma e multa.|C:-450000,M:-1",
  "campo-ct|Campo do CT recuperado|O gramado de treino passou por manutenção completa.|C:-310000,T:1/3",
  "sala-video|Sala de vídeo nova|A comissão ganhou espaço melhor para análise tática.|C:-280000,T:1/3",
  "telhado-ct|Telhado do CT vazou|A chuva atingiu equipamentos de treino.|C:-230000,T:-1/1",
  "seguranca-reforcada|Segurança reforçada|O clube contratou vigilância extra após tentativas de invasão.|C:-170000,M:1",
  "energia-solar|Energia solar|Painéis novos reduziram as despesas operacionais.|C:190000,M:1",
  "camera-ct|Câmeras no CT|O sistema de segurança ganhou monitoramento nos acessos.|C:-260000,T:1/1",
  "almoxarifado|Almoxarifado organizado|A equipe encontrou material que seria comprado novamente.|C:85000",
  "encanamento-ct|Cano do CT rompeu|Um vazamento interditou parte da área de recuperação.|C:-210000,T:-1/1",
  "internet-ct|Internet do CT caiu|A comissão ficou sem acessar vídeos de análise por dois dias.|T:-1/1,C:-55000",
  "laboratorio-novo|Laboratório esportivo|Equipamentos de análise física chegaram ao clube.|C:-600000,T:2/2",
  "sala-fisioterapia|Fisioterapia ampliada|Uma reforma permitiu atender mais atletas ao mesmo tempo.|C:-420000,H:1|lesionado",
  "estoque-chuteiras|Estoque de chuteiras|O fornecedor fez desconto num lote de material esportivo.|C:90000",
  "iluminacao-ct|Luzes do CT trocadas|Treinos noturnos ganharam iluminação adequada.|C:-180000,T:1/2",
  "servidor-dados|Servidor de análise falhou|A comissão perdeu relatórios de desempenho da semana.|C:-120000,T:-1/1",
  "piscina-ct|Piscina do CT reabriu|A área de recuperação voltou a funcionar após reparo.|C:-240000,T:1/2",
  "contrato-limpeza|Contrato de limpeza|Uma renegociação reduziu o custo da manutenção do CT.|C:150000",
]);

const CONDICOES = {
  casa: (x) => x.casa, fora: (x) => !!x.adv && !x.casa, adv: (x) => !!x.adv,
  classico: (x) => !!x.classico, janela: (x) => x.janela,
  lider: (x) => x.posicao > 0 && x.posicao <= 4,
  baixo: (x) => x.posicao >= 15 || x.caixaAtual < 0,
  derrota: (x) => x.derrotas > 0, vitoria: (x) => x.vitorias > 0,
};
function aplicar(x, titulo, efeitos) {
  const resultado = [];
  for (const bruto of efeitos.split(",")) {
    const [tipo, valor] = bruto.split(":");
    const [n, rodadas] = valor.split("/").map(Number);
    if (tipo === "C") { x.caixa(titulo, n); resultado.push(`${n < 0 ? "Despesa" : "Receita"}: ${x.din(Math.abs(n))}.`); }
    else if (tipo === "M") { x.moral(n); resultado.push(`Moral ${n > 0 ? "+" : ""}${n}.`); }
    else if (tipo === "T") { x.time(n, rodadas); resultado.push(`Time ${n > 0 ? "+" : ""}${n} por ${rodadas} jogo(s).`); }
    else if (tipo === "P") { x.jogador(n, rodadas); resultado.push(`${x.n} ${n > 0 ? "+" : ""}${n} por ${rodadas} jogo(s).`); }
    else if (tipo === "R") { x.rival(n); resultado.push(`Próximo rival ${n > 0 ? "+" : ""}${n} no jogo.`); }
    else if (tipo === "I") { if (n > 0) { x.lesao(n); resultado.push(`${x.n} lesionado por ${n} jogo(s).`); } }
    else if (tipo === "S") { x.suspender(n); resultado.push(`${x.n} fora por ${n} jogo(s).`); }
    else if (tipo === "E") { x.evoluir(n); resultado.push(`${x.n} evoluiu ${n} ponto(s).`); }
    else if (tipo === "H") { x.curarTodos(n); resultado.push(`Tratamentos adiantados em ${n} jogo(s).`); }
    else if (tipo === "U") { x.save.suspensos[x.j.id] && delete x.save.suspensos[x.j.id]; resultado.push(`${x.n} teve a suspensão revista.`); }
    else if (tipo === "F") { x.salario(n); resultado.push(`Salário de ${x.n} reajustado.`); }
    else if (tipo === "V") { x.listar(); resultado.push(`${x.n} entrou na lista de venda.`); }
    else if (tipo === "D") { x.indicar(x.j.id); resultado.push(`O olheiro abriu desconto para ${x.n}.`); }
  }
  return resultado.join(" ");
}
const IMERSAO = GRUPOS.map(({ efeitos, condicao, ...dados }) => ({
  ...dados,
  ...(condicao ? { quando: CONDICOES[condicao] } : {}),
  efeito: (x) => aplicar(x, dados.titulo, efeitos),
}));
module.exports = { IMERSAO };
