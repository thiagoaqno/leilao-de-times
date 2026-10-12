# Futevôlei: mais FPS, música e fim de tarde na praia

Antes: o futevôlei rodava sempre na resolução e sombras máximas (travava em PC/celular fraco), não tinha música e a praia era sempre a mesma hora do dia.

Depois: a qualidade baixa sozinha quando o jogo fica abaixo de ~38 fps (resolução, sombra e céu animado) e fica guardada; `?leve=1` já começa no modo leve. Tem música (a mesma lista da Vila) na barra e na pausa. Na praia o sol desce devagar durante a partida (luz e céu alaranjados, ~10 min), o vento balança os coqueiros perto da quadra e as gaivotas gritam de vez em quando.

Como: `jogo.js` (`NIVEIS`, `vigiarQuadro`, `aplicarQualidade`, `Som.gaivota`), `cenarios.js` (clima do `praia`, `qualidade(n)`), `musica.js` novo (usa `/api/musicas` e a chave `galera:musica`).
