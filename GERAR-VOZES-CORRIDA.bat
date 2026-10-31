@echo off
setlocal EnableExtensions EnableDelayedExpansion
chcp 65001 >nul
cd /d "%~dp0"
rem Gera as vozes da Corrida com a ElevenLabs: o narrador das pistas (transmissao) e o engenheiro de equipe (radio).
rem A chave e pedida aqui, sem aparecer na tela, e vive so nesta janela (variavel de ambiente deste processo): nunca vai para arquivo nem para log.
rem Uso: GERAR-VOZES-CORRIDA.bat   (sem argumentos: pergunta tudo)
rem O que sobrou dos .bat antigos (gerar-radio.bat, gerar-narrador.bat, GERAR-FALAS-CORRIDA.bat) chama este.
where node >nul 2>nul || (echo Node nao encontrado. Instale o Node 22 ou mais novo: https://nodejs.org & echo. & pause & exit /b 1)

set "VOZ_NARRADOR_PADRAO=nPczCjzI2devNBz1zQrb"
set "VOZ_ENGENHEIRO_PADRAO=pNInz6obpgDQGcFmaJgB"

echo ============================================================
echo   Vozes da Corrida (ElevenLabs)
echo ============================================================
echo.
echo O que gerar?
echo   1) Narrador das pistas (transmissao)
echo   2) Radio do engenheiro
echo   3) Tudo
set "O=3"
set /p "O=Escolha 1, 2 ou 3 (Enter = 3): "
if not "%O%"=="1" if not "%O%"=="2" if not "%O%"=="3" set "O=3"

echo.
echo Gerar so as falas que faltam, ou refazer todas (substitui os arquivos)?
echo   1) So as que faltam
echo   2) Refazer todas
set "M=1"
set /p "M=Escolha 1 ou 2 (Enter = 1): "
set "REF="
if "%M%"=="2" set "REF=--refazer"

set "VN=%VOZ_NARRADOR_PADRAO%"
set "VE=%VOZ_ENGENHEIRO_PADRAO%"
echo.
if not "%O%"=="2" (
  set /p "VN=Voice ID do NARRADOR (Enter = padrao Brian %VOZ_NARRADOR_PADRAO%): "
  if "!VN!"=="" set "VN=%VOZ_NARRADOR_PADRAO%"
)
if not "%O%"=="1" (
  set /p "VE=Voice ID do ENGENHEIRO (Enter = padrao %VOZ_ENGENHEIRO_PADRAO%): "
  if "!VE!"=="" set "VE=%VOZ_ENGENHEIRO_PADRAO%"
)

echo.
set "EST=S"
set /p "EST=Estimar os caracteres antes de gerar? S/n: "
if /i not "%EST%"=="n" (
  echo.
  if not "%O%"=="2" ( echo --- Narrador das pistas --- & node ferramentas\narrador-pistas.js --estimar %REF% )
  if not "%O%"=="1" ( echo --- Radio do engenheiro --- & node ferramentas\radio-engenheiro.js --estimar %REF% )
  echo.
  set "GO=S"
  set /p "GO=Continuar e gerar? S/n: "
  if /i "!GO!"=="n" ( echo Cancelado. Nada foi gerado. & pause & exit /b 0 )
)

echo.
for /f "usebackq delims=" %%k in (`powershell -NoProfile -ExecutionPolicy Bypass -File "ferramentas\ler-chave.ps1"`) do set "ELEVENLABS_API_KEY=%%k"
if "%ELEVENLABS_API_KEY%"=="" ( echo Sem chave. Nada foi gerado. & pause & exit /b 1 )

set "RC=0"
if not "%O%"=="2" (
  echo.
  echo === Narrador das pistas ===
  node ferramentas\narrador-pistas.js %REF% --voz "%VN%"
  if errorlevel 1 set "RC=1"
)
if not "%O%"=="1" (
  echo.
  echo === Radio do engenheiro ===
  node ferramentas\radio-engenheiro.js %REF% --voz "%VE%"
  if errorlevel 1 set "RC=1"
)
set "ELEVENLABS_API_KEY="

echo.
set "r=0"
for %%f in (public\corrida\radio\*.mp3) do set /a r+=1
set "n=0"
for %%f in (public\corrida\narrador\*.mp3) do set /a n+=1
echo Arquivos de voz: radio %r% · narrador %n%
if "%RC%"=="1" echo Teve erro em alguma fala: rode de novo (so as que faltam) depois de conferir a chave e o limite da conta.
pause
exit /b %RC%
