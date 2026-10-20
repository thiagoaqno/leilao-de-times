// Ajuda discreta para pilotos humanos que perderam contato com o pelotão.
// O ganho só aparece depois de uma distância real; não mexe na direção nem freia o líder.
export function ajudaDePelotao(meuProgresso, liderProgresso, volta, ligado = true) {
  if (!ligado || !Number.isFinite(meuProgresso) || !Number.isFinite(liderProgresso)) return 0;
  const atraso = Math.max(0, liderProgresso - meuProgresso);
  const longe = Math.max(0, Math.min(1, (atraso - 0.08) / 0.32));
  const final = Math.max(0, Math.min(1, (1 - volta) / 0.18));
  return 0.055 * longe * final;
}
