# Refaz a entrada da carreira F1 no visual da Central e ajusta a música

A tela de entrada de `/corrida/temporada/` e o convite da sala com os amigos ainda estavam no visual antigo. Agora usam o estúdio, a cor da equipe e o tema claro ou escuro da Central.

- **Entrada** (`temporada/entrada.js`, `entrada.css`): carro grande, faixa com as 11 equipes (hover e marcação na cor de cada uma) e um painel à direita com três abas: Nova temporada, Recuperar e Com os amigos. Antes, os três formulários ficavam empilhados na mesma coluna.
- **Convite** (`?sala=CÓDIGO`): o mesmo visual, só com o nome para entrar.
- **Modo escuro:** um botão no painel, usando a mesma preferência da Central (`corrida:tema`).
- Os campos, os ids e as ações não mudaram. Só quem usa a sala com os amigos ou o código de recuperação precisa abrir a aba antes; dois testes e2e ganharam esse clique.
- A sala de espera ainda tem o visual antigo e fica para o próximo PR, junto com o carregamento.

## Música (`public/carreira/musica.js`, na Carreira de Treinador, na Corrida e na Carreira F1)

- A lista é embaralhada ao abrir: começa numa música diferente e não repete até dar a volta.
- O volume padrão é 5%. O volume guardado só vale se a pessoa mexeu nele depois desta mudança, porque os saves antigos guardavam o padrão de 40%. Por isso, quem tinha ajustado à mão volta para 5% uma vez.

## Verificação

Conferido no navegador embutido, em servidor local: entrada nos temas claro e escuro, troca de equipe, abas, convite, volume em 5% e música diferente ao abrir, sem erros no console. A criação de uma carreira pelo formulário novo chegou à Central com a equipe escolhida. Em largura estreita conferi só o desenho (800 px); não testei num celular de verdade. O carro aparece com renderização por software, e não numa placa de vídeo. Não rodei a suíte local (regra do projeto); o CI confere.
