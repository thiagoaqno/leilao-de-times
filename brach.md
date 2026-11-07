# Os .bat funcionam no Windows baixando pelo ZIP

Os `.bat` estavam com fim de linha LF, e o `cmd` do Windows comia letras dos comandos: `where node` falhava e aparecia "Node nao encontrado", mesmo com o Node instalado. Agora todos ficam em CRLF no repositório (`*.bat -text` no `.gitattributes`, para o git não converter de volta), inclusive no ZIP do GitHub.

`GERAR-VOZES-CORRIDA.bat` também pergunta a voz do observador (`ELEVENLABS_VOICE_SPOTTER`); com Enter, ele usa a voz do engenheiro.

## Verificação

Erro reproduzido na cópia baixada pelo ZIP e, depois da conversão, o `.bat` rodou até a estimativa, sem chegar a pedir a chave. A geração real não foi testada, porque gasta créditos.
