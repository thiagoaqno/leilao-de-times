// Reutiliza as medições do terreno de carros distantes; a posição continua atualizada a cada quadro.
const DISTANCIA = 1000, INTERVALO_MS = 160;
export function detalheRemoto(ghost, distancia, agora, calcular) {
  if (distancia <= DISTANCIA) { ghost.detalheTerreno = null; return calcular(); }
  const salvo = ghost.detalheTerreno;
  if (!salvo || agora < salvo.tempo || agora - salvo.tempo >= INTERVALO_MS) {
    const valor = calcular();
    ghost.detalheTerreno = { tempo: agora, valor };
    return valor;
  }
  return salvo.valor;
}
