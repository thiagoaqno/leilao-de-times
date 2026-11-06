# Central da carreira F1 limpa, com modo escuro

Refaz a Central da carreira (`/corrida/temporada/`, solo e em grupo) pelas imagens de referência: menos informação, poucos números em faixas separadas por filetes, fundo claro de estúdio e o carro grande. O tema continua sendo sempre o da equipe do jogador: escudo, nome, relevo do emblema, linhas e botões.

## O que mudou

- **Modo escuro:** a engrenagem do topo liga e desliga, guardado em `corrida:tema`. O padrão é claro.
- **`temporada/estudio3d.js`:** o carro real do jogo, com a pintura da equipe, num canvas transparente em cima do fundo do CSS. Por isso o tema troca na hora. Só aparece na Central e no Desenvolvimento e desenha só quando algo muda. A `garagem3d.js` do menu da Corrida não muda.
- **`temporada/central.css`** foi reescrito com tokens para os dois temas; `central-abas.css` ficou só com a porta de entrada, que segue no tema antigo.
- **Central:** o rival, o resumo do campeonato e os cartões saíram; ficam a próxima etapa e três números (campeonato, desenvolvimento e objetivo).
- **Classificação, Análise, Desenvolvimento e Contratos:** as mesmas ações de antes, com subabas sublinhadas e sem cartões. O caixa saiu do topo e foi para a engrenagem e para o Desenvolvimento.

## Adaptado das imagens, porque o jogo não tem o dado

- Número do carro (27): vira a nota geral do carro.
- Previsão de Sex/Sáb/Dom com temperatura: vira a previsão real do GP, com a chance de chuva.
- "PR" e "melhoria em andamento": viram os pontos livres e os pontos usados. As melhorias entram na hora, sem prazo nem porcentagem.
- Quatro áreas no Desenvolvimento: seguem os seis níveis de `f1-equipes.js`.
- Troca 8 GPs / 4 GPs: o formato é escolhido ao criar a carreira, então só aparece o atual.
- Salário em €: seguem a verba e o bônus em R$ do jogo.

## Omitido das imagens

- "Ver replay", "Explorar dados" e "Comparar pilotos" nos botões (a comparação segue no seletor da Análise).
- Temperatura do ar e da pista na Análise.
- A asa do carro desfocada no canto das outras abas.
- Patrocinadores e o cavalo em relevo com detalhes: o fundo é o logo de cada equipe em cinza suave, um pouco à direita do centro.
- As dicas A/B/Y só aparecem com controle conectado; no teclado aparecem Q/E, Esc e M.

## Verificação

Sintaxe conferida e prints das 6 abas nos dois temas, no celular e na sala em grupo, com o console sem erros. Os resultados nos prints foram injetados só no navegador, para ver a tela com a temporada andando. A suíte fica para o CI.

## Tela em grupo e abas

- A Central não pisca mais quando outra pessoa age na sala: `Central.pintar` atualiza só o que mudou (e nada, se a tela é a mesma), em vez de recriar a tela a cada `estado`.
- A troca de aba tem animação: o conteúdo entra deslizando do lado para onde se foi, bloco a bloco, e o sublinhado anda sozinho; `prefers-reduced-motion` desliga.
