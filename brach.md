# Corrige o brilho dos carros na corrida

Nas qualidades Média e Alta, limita a luz refletida pelos materiais dos carros antes do bloom. O limite considera a soma dos reflexos e da iluminação, inclusive durante o dia, para evitar os pontos brancos que cintilavam. As emissões continuam livres para as lanternas e outras luzes; na qualidade Baixa, o limite fica desligado.

## Verificação

- Sintaxe dos arquivos alterados e `git diff --check`.
- Conferência do shader e da preservação do hook anterior de materiais.
- Verificação visual em corrida ainda necessária.
