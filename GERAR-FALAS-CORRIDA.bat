@echo off
chcp 65001 >nul
cd /d "%~dp0"
rem Gera de uma vez tudo o que falta de voz na Corrida (ElevenLabs): o engenheiro no radio e o narrador das pistas.
rem Por padrao so gera os arquivos que ainda nao existem. Use GERAR-FALAS-CORRIDA.bat --estimar para so contar.
where node >nul 2>nul || (echo Node nao encontrado. Instale o Node 22 ou mais novo: https://nodejs.org & echo. & pause & exit /b 1)
echo %* | findstr /i /c:"--estimar" >nul
if not errorlevel 1 (
  echo === Narrador das pistas ===
  node ferramentas\narrador-pistas.js --estimar
  echo.
  pause
  exit /b
)
echo === Vozes da Corrida: engenheiro e narrador (ElevenLabs) ===
echo A chave nao e salva em nenhum arquivo: vale so para esta janela.
set /p ELEVENLABS_API_KEY=Cole a sua chave da ElevenLabs e aperte Enter: 
set REFAZER=
set /p REFAZER=Refazer TAMBEM as falas que ja existem? s/N: 
set ARG=
if /i "%REFAZER%"=="s" set ARG=--refazer
echo.
echo === 1/2 Engenheiro de equipe (radio) ===
set ELEVENLABS_VOICE_ID=pNInz6obpgDQGcFmaJgB
node ferramentas\radio-engenheiro.js %ARG%
echo.
echo === 2/2 Narrador das pistas (transmissao) ===
set ELEVENLABS_VOICE_ID=nPczCjzI2devNBz1zQrb
node ferramentas\narrador-pistas.js %ARG%
set ELEVENLABS_API_KEY=
echo.
set r=0
for %%f in (public\corrida\radio\*.mp3) do set /a r+=1
set n=0
for %%f in (public\corrida\narrador\*.mp3) do set /a n+=1
echo Radio: %r% arquivos · Narrador: %n% arquivos
pause
