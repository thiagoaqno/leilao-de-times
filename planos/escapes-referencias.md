# Escapes e barreiras: referências e pontos pendentes

O recuo de 70–110 unidades implementado em `Pistas.murosDoEscape` é uma aproximação visual e física, não uma medição dos locais reais. O PR deve permanecer em rascunho até conferir os trechos de cada GP e alinhar o desenho, a colisão e os tipos de superfície.

## Fontes consultadas

- [FIA — notas do GP do Japão de 2025](https://www.fia.com/system/files/decision-document/2025_japanese_grand_prix_-_race_directors_event_notes_v3.pdf): brita junto às zebras nas curvas 2, 8 e 9. Os trechos existentes de Suzuka foram preservados; a brita adicional gerada automaticamente foi retirada.
- [FIA — notas do GP da Hungria de 2025](https://www.fia.com/system/files/decision-document/2025_hungarian_grand_prix_-_race_directors_event_notes_v2.pdf): brita na saída da curva 5 e barreiras com cerca à esquerda na curva 14. A saída da 5 e o lado esquerdo da 14 foram conferidos qualitativamente usando as frações de `gp-info.js` e têm teste; os recuos e os demais trechos ainda precisam de verificação.
- [F1 — alterações no Red Bull Ring em 2024](https://www.formula1.com/en/latest/article/explained-how-key-changes-to-the-red-bull-ring-look-to-avoid-last-years.2ubjMYkbT3HHpwuEJ7PoHw.2ubjMYkbT3HHpwuEJ7PoHw): faixas de brita nas saídas das curvas 9 e 10. **Ainda é necessário localizá-las no traçado do jogo.**
- [FIA — notas do evento em Silverstone de 2025](https://www.fia.com/system/files/decision-document/2025_silverstone_event_-_f2_silverstone_event_notes_2025_v2.pdf): brita na saída da curva 18.
- [FIA — notas de Spa-Francorchamps de 2025](https://www.fia.com/system/files/decision-document/2025_spa_francorchamps_event_-_f3_spa-francorchamps_event_notes_2025_v1.pdf): caminho de escape junto à barreira de pneus entre as curvas 5 e 7.
- [FIA — mapa de áreas de escape de Interlagos, 2025](https://www.fia.com/sites/default/files/f1sp_2025_media_kit_eng_051125.pdf): distingue asfalto, brita, pilhas de pneus e muros.
- [FIA — notas de Barcelona de 2026](https://www.fia.com/system/files/decision-document/2026_barcelona-catalunya_grand_prix_-_race_directors_competition_notes_v2.pdf): alteração do recuo de barreira na entrada da curva 5 e áreas convertidas em brita.

## Ainda não verificado curva a curva

Xangai, Miami, Red Bull Ring, Hungaroring, Madri, Austin, México, Catar e Abu Dhabi ainda herdam `britaCurvas` automático do GP simples. A presença de brita numa curva fechada não foi comprovada apenas por essa regra. Mesmo nos circuitos com trechos explícitos, é preciso comparar as distâncias e os lados das barreiras com referências de cada curva. Os valores de recuo do PR são estimativas, não dados extraídos das fontes acima.
