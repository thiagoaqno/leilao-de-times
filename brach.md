# A festa do pódio: os três primeiros em pé nos degraus, comemorando

No fim do GP (avulso e na carreira), os três primeiros aparecem no pódio 3D com o macacão e o capacete da equipe e comemoram. O primeiro faz a vitória e a torcida, o segundo a vitória e as palmas, e o terceiro a torcida e as palmas. O carro aparece primeiro, como antes, e dá lugar ao piloto assim que ele carrega.

- **Uniformes das 11 equipes** (`f1-uniformes.js`): cores e marcas são as que o carro do jogo já usa. Nenhum patrocinador novo. Ferrari, McLaren e Racing Bulls seguem os macacões reais de 2026 (vermelho com branco no pescoço e nos lados; papaia na frente e antracito atrás; azul e branco). As outras seguem a pintura do carro. Cada macacão leva o logo da equipe no peito e o número nas costas.
- **Capacete:** cada robô usa o desenho do piloto (`f1-capacetes.js`) e os humanos usam o genérico nas cores da equipe. Não aparece rosto: a cabeça do modelo foi tirada e a viseira é escura.
- **Peso:** nada da festa baixa antes da tela de resultado. O módulo e os arquivos (`f1/podio/`, ~800 KB no total) só são pedidos quando o pódio aparece. Os pilotos são montados um por quadro e tudo é solto ao sair da tela.
- **"Reduzir movimento":** cada piloto fica numa pose parada.

## Licenças (`public/corrida/f1/podio/LICENCA.txt`)

| Arquivo | Origem | Licença |
| --- | --- | --- |
| Corpo, luvas e HANS | "Race Car Driver - Low Poly", de tomkart (Sketchfab) | CC BY 4.0 |
| Capacete | "F1 Helmet Austrian GP 2018", de VTX_car (Sketchfab) | **CC BY-NC-SA 4.0**: não comercial, e a versão adaptada tem a mesma licença. Se o site passar a ganhar dinheiro, este capacete tem de sair. |
| Comemorações | Mixamo (Adobe): Clapping, Rallying, Victory ×2 | Termos do Mixamo: uso livre em jogo, mas não é licença aberta. Os FBX não vão para o repositório. |

Os logos que vinham nos modelos (Alpinestars no macacão, Red Bull, Mobil 1 e o nome do piloto no capacete) foram tirados. A ferramenta `ferramentas/podio-pilotos.mjs` refaz os arquivos a partir dos originais.

## Verificação

Tirei prints de antes e depois da tela de resultado com os dados de exemplo do `#debug`, no desktop e no celular, sem erro no console. Os arquivos do pódio só são pedidos depois do resultado. Os prints estão em `C:/Users/thiag/Downloads/lts/festa-podio-prints/` (`antes-desktop.png`, `depois-desktop.png`, `antes-celular.png`, `depois-celular.png`).

**Não conferido:** tentei rodar um GP real de 1 volta, avulso e da carreira, até o resultado, mas o teste automático travou antes da largada. A carreira usa a mesma tela de resultado (`htmlResultado`/`aposResultado` com `S.temporada`), então deve funcionar igual, mas isso não foi visto rodando. No arquivo só passou o `node --check`; a suíte fica para o CI.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
