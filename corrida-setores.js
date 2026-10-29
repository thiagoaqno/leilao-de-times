// Corrida da Galera — a conta dos setores (checkpoints) de quem corre, sem travar a volta por um setor perdido.
// O servidor só aceitava o setor SEGUINTE na ordem. Se um aviso se perdia (ou chegava recusado) o contador do servidor
// ficava para trás para sempre: todos os setores seguintes eram "fora de ordem", e a passagem seguinte pela linha de chegada
// virava a "largada" (`started`) em vez de fechar a volta. Numa corrida de 1 volta isso é a volta que não conta.
// Aqui, um setor à frente do esperado vale quando o carro está mesmo ali (pela posição na pista) e o salto é curto.
const MAX_PULO = 3; // quantos setores seguidos podem faltar (3 de 12 = um quarto da volta)

// Os setores que o aviso `s` fecha, em ordem: [] se não vale; [s] se é o próximo; [a, b, ..., s] se faltaram setores no caminho
// e o carro está na região do setor `s` (`idx`: o ponto da pista onde o carro está agora; `n`: quantos pontos a pista tem).
// Sem posição conhecida, só vale o próximo (o que sempre valeu).
function setoresDoAviso(atual, s, idx, n, SECTORS = 12, checkpoint = null) {
  if (!Number.isInteger(s) || s < 0 || s >= SECTORS) return [];
  const prox = (atual + 1) % SECTORS;
  if (s === prox) return [s];
  const pulo = (s - prox + SECTORS) % SECTORS; // quantos setores faltam entre o esperado e este
  if (pulo > MAX_PULO || !Number.isFinite(idx) || !(n > 0) || !checkpoint) return [];
  // o carro tem de estar depois do portão de `s` e antes do seguinte (a faixa do próprio setor), com folga de meio setor
  const portao = checkpoint(s, n), folga = n / SECTORS / 2;
  const depois = ((idx - portao) % n + n) % n; // quanto passou do portão
  const antes = n - depois;                       // quanto falta para chegar nele
  if (!(depois <= n / SECTORS + folga || antes <= folga)) return [];
  const lista = [];
  for (let k = 0; k <= pulo; k++) lista.push((prox + k) % SECTORS);
  return lista;
}

module.exports = { setoresDoAviso, MAX_PULO };
