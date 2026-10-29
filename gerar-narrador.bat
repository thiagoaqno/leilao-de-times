@echo off
chcp 65001 >nul
cd /d "%~dp0"
rem Gera as vozes do narrador que apresenta a pista na transmissao da Corrida (ElevenLabs).
rem Exemplos: gerar-narrador.bat   |   gerar-narrador.bat interlagos monza   |   gerar-narrador.bat --estimar
echo === Voz do narrador das pistas (ElevenLabs) ===
echo %* | findstr /i /c:"--estimar" >nul
if not errorlevel 1 (
  node ferramentas\narrador-pistas.js %*
  echo.
  pause
  exit /b
)
echo A chave nao e salva em nenhum arquivo: vale so para esta janela.
set /p ELEVENLABS_API_KEY=Cole a sua chave da ElevenLabs e aperte Enter:
set /p ELEVENLABS_VOICE_ID=ID da voz (Enter = Brian, voz grave de narrador):
if "%ELEVENLABS_VOICE_ID%"=="" set ELEVENLABS_VOICE_ID=nPczCjzI2devNBz1zQrb
set REFAZER=
set /p REFAZER=Refazer as falas que ja existem (substitui os arquivos)? s/N:
set ARG=
if /i "%REFAZER%"=="s" set ARG=--refazer
echo.
node ferramentas\narrador-pistas.js %* %ARG%
set ELEVENLABS_API_KEY=
echo.
set n=0
for %%f in (public\corrida\narrador\*.mp3) do set /a n+=1
echo Arquivos de voz na pasta: %n%
pause
