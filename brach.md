# Os .bat funcionam no Windows baixando pelo ZIP, e o rádio tem muito mais falas

## Os .bat

Os `.bat` estavam com fim de linha LF, e o `cmd` do Windows comia letras dos comandos: `where node` falhava e aparecia "Node nao encontrado", mesmo com o Node instalado. Agora todos ficam em CRLF no repositório (`*.bat -text` no `.gitattributes`, para o git não converter de volta), inclusive no ZIP do GitHub.

`GERAR-VOZES-CORRIDA.bat` também pergunta a voz do observador (`ELEVENLABS_VOICE_SPOTTER`); com Enter, ele usa a voz do engenheiro.

## As falas

O rádio passa de 112 para 367 falas: cada situação da corrida fica com pelo menos 8 variações (a maioria com 12 a 15), e os pedidos ao engenheiro com 8. As novas entram no fim de cada lista, então os áudios que já existem continuam batendo com o texto.

O aviso da bandeira preta dizia "sexta batida causada", mas a regra atual é a décima segunda batida proposital. O texto foi corrigido e o `punicao-4.mp3` antigo sai, para ser gerado de novo.

As vozes novas só tocam depois de gerar os áudios. Enquanto isso, o rádio pode sortear uma fala nova que ainda não tem mp3, e nada toca naquela vez.

## Verificação

- Erro reproduzido na cópia baixada pelo ZIP. Depois da conversão, `gerar-radio.bat` respondeu certo às perguntas da opção 2, mostrou a estimativa (9.115 caracteres para as que faltam) e cancelou sem pedir a chave.
- A geração real não foi testada, porque gasta créditos.
- `falas.js` e o teste passaram por `node --check`. A suíte fica com o CI, e as falas não foram ouvidas em corrida.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
