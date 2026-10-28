# Corrida: a torcida senta nos degraus da arquibancada

Na reta dos boxes, a torcida 3D (`vida.js`) era posta no chão, a 10–26 u do muro. Nas pistas com arquibancadas do kit (`kit/arquibancadas.js`), esse espaço é justamente a rampa dos degraus, então os bonecos ficavam no chão, por baixo dela.

- `kit/arquibancadas.js` guarda onde ficam os degraus de cada trecho (`tr.arqDegraus`: trecho, lado, distância e número de degraus).
- `vida.js`: na frente de uma arquibancada do kit, cada fileira da torcida senta num degrau (as 3 primeiras fileiras, na altura e na distância do degrau). Fora delas, tudo fica como antes.

Vale para todas as pistas que usam o kit de arquibancadas. Não conferido no navegador.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
