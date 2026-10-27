@echo off
chcp 65001 >nul
cd /d "%~dp0"
echo === Voz do engenheiro de equipe (ElevenLabs) ===
echo A chave nao e salva em nenhum arquivo: vale so para esta janela.
set /p ELEVENLABS_API_KEY=Cole a sua chave da ElevenLabs e aperte Enter: 
set /p ELEVENLABS_VOICE_ID=ID da voz (Enter = voz padrao): 
if "%ELEVENLABS_VOICE_ID%"=="" set ELEVENLABS_VOICE_ID=pNInz6obpgDQGcFmaJgB
echo.
node ferramentas\radio-engenheiro.js
set ELEVENLABS_API_KEY=
echo.
set n=0
for %%f in (public\corrida\radio\*.mp3) do set /a n+=1
echo Arquivos de voz na pasta: %n%
pause
