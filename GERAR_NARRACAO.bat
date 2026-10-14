@echo off
chcp 65001 >nul
cd /d "%~dp0"
rem Gera as falas do narrador, a torcida e os nomes dos jogadores da partida da Carreira (ElevenLabs).
rem Exemplos: GERAR_NARRACAO.bat --estimar   |   GERAR_NARRACAO.bat --testar   |   GERAR_NARRACAO.bat --ligas todas
where node >/dev/null 2>/dev/null || (echo Node nao encontrado. Instale o Node 22 ou mais novo: https://nodejs.org & echo. & pause & exit /b 1)
node ferramentas\gerar-narracao.js %*
echo.
pause
