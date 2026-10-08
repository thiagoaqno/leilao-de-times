# Ginásio: o FPS de volta

Depois do Ginásio 3D (#92 a #94), o jogo caiu para uns 23 quadros por segundo numa placa de vídeo integrada (Intel UHD),
e para 13 numa tela de alta densidade.

## O que travava
Medido no navegador, parte por parte do quadro:
- **Não era a cena 3D:** desenhar a cena levava uns 2 ms.
- **Subir texturas inteiras a cada quadro:** o chão (888x600) e o atlas dos bichos (1024x512), uns 2 MB cada, mais a
  textura da espessura.
- **Ler o atlas de volta da placa:** os quadros dos GIFs moravam na placa de vídeo e o atlas na memória. Desenhar um no
  outro obrigava a ler de volta da placa, e o processador ficava esperando a placa terminar tudo (aparecia como 38 a
  69 ms na `medirEspessura`).

## O que mudou (o visual é o mesmo)
- **Só o que mudou sobe para a placa:**
  - o chão e o atlas viraram texturas de dados;
  - a cada quadro, o canvas é comparado com o anterior em ladrilhos de 32 px, e só os ladrilhos diferentes sobem
    (`compararParcial` e `subirRetangulos`, em `cena3d.js`);
  - do atlas, só as casas em uso; da espessura, só as casas medidas no quadro.
- **Tudo na memória:** o chão, o atlas e os quadros dos bichos (os GIFs, o sprite parado, a silhueta branca e os quadros
  dos Galeramon) ficam na memória (`willReadFrequently`), sem ida e volta da placa.
- **Resolução até 1,5x:** a resolução da cena vai até 1,5 pixel por pixel da página (antes 2). Numa tela 2x fica quase
  igual de nítido, com 44% menos pixels para pintar.

## Resultado (Intel UHD, partida contra o robô, golpes saindo)
| Tela | Antes | Depois |
| --- | --- | --- |
| 1x (1366x700) | 23,5 FPS | 89,9 FPS |
| 1,25x | não medido | 61 FPS |
| 2x | 13,3 FPS | 56,6 FPS |

## Conferido
- Fotos do Ginásio antes e depois: a quadra, as marcas no chão, a mira, os bichos com volume e as sombras iguais.
- `tests/e2e/ginasio.spec.js`: 6 de 7 passando.
  - O que falha ("resultado de partida real, revanche e retorno à sala") falha igual no `main` sem esta mudança: a partida
    não termina nos 60 s do teste.
