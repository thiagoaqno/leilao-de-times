# Restaura a inteligência anterior dos robôs

Recupera dos arquivos de backup a otimização do traçado e a direção, o ritmo e as decisões de trânsito dos robôs. O grid de 22 carros da versão atual foi mantido. A física compartilhada do backup já está presente no `sim.js` atual; o controlador de linha mais recente permanece disponível, mas os robôs voltam a usar o piloto automático anterior.

## Verificação

- `tests/corrida-monaco-referencia.test.js` falha: a referência fixa removida não é mais aplicada e uma volta fácil teve dois contatos, acima do limite do teste.
- Os testes da referência e do volante recente descrevem o comportamento substituído; permanecem no repositório para deixar explícitas as diferenças.
