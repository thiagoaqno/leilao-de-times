@echo off
setlocal EnableExtensions EnableDelayedExpansion
chcp 65001 >nul
cd /d "%~dp0"
rem Gera os sons da pista com os efeitos sonoros da ElevenLabs: o pneu na zebra, a torcida da arquibancada, o "uuuh" e a buzina.
rem Os arquivos vao para public\corrida\sons\. A chave e pedida aqui, sem aparecer na tela, e vive so nesta janela.
set "ELEVENLABS_API_KEY="
where node >nul 2>nul || (echo Node nao encontrado. Instale o Node 22 ou mais novo: https://nodejs.org & echo. & pause & exit /b 1)

echo ============================================================
echo   Sons da pista (ElevenLabs)
echo ============================================================
echo.
echo   zebra        pneu na zebra (3 s, em laco)
echo   torcida      rumor da arquibancada (10 s, em laco)
echo   torcida-uau  a galera quando o carro passa (3 s)
echo   buzina       buzina da torcida (2 s)
echo.
echo O que gerar?
echo   1) So os que faltam
echo   2) Refazer todos
echo   3) Refazer so alguns (voce digita os nomes)
set "M=1"
set /p "M=Escolha 1, 2 ou 3 (Enter = 1): "
set "ARGS="
if "%M%"=="2" set "ARGS=--refazer"
if "%M%"=="3" (
  set "QUAIS="
  set /p "QUAIS=Quais? separados por virgula, ex.: zebra,buzina : "
  if "!QUAIS!"=="" ( echo Nada escolhido. & pause & exit /b 0 )
  set "ARGS=--so !QUAIS!"
)

echo.
echo Cada som gasta creditos de efeitos sonoros da sua conta (sao 4 sons curtos).
set "GO=N"
set /p "GO=Continuar e gerar? s/N: "
if /i not "!GO!"=="s" ( echo Cancelado. Nada foi gerado. & pause & exit /b 0 )

echo.
for /f "usebackq delims=" %%k in (`powershell -NoProfile -ExecutionPolicy Bypass -File "ferramentas\ler-chave.ps1"`) do set "ELEVENLABS_API_KEY=%%k"
if "%ELEVENLABS_API_KEY%"=="" ( echo Sem chave. Nada foi gerado. & pause & exit /b 1 )

echo.
node ferramentas\sons-pista.js %ARGS%
set "RC=%ERRORLEVEL%"
set "ELEVENLABS_API_KEY="

echo.
if "%RC%"=="0" (
  echo Pronto. Abra a Corrida, recarregue com Ctrl+Shift+R e passe numa zebra e por uma arquibancada.
  echo Se algum som nao ficou bom, rode de novo com a opcao 3 so com ele.
) else (
  echo Teve erro em algum som: confira a chave e o limite da conta e rode de novo.
)
pause
exit /b %RC%
