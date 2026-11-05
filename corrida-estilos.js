// Perfis de corrida: interpretações de jogo, não medições oficiais. Escala 0–1; atributos independentes do ritmo.
// Referências: https://www.formula1.com/en/latest/article/its-eye-watering-albon-shares-the-secrets-of-verstappens-unique-driving.3Dlce2QkRGzUDLMtDf3dOs
// https://www.formula1.com/en/latest/article/watch-why-jolyon-palmer-thinks-sainz-may-lead-the-f1-field-when-it-comes-to.5pHX7U5GXKdPdQXIy7tUwN
// https://www.formula1.com/en/latest/article/f3s-newest-champion-gabriel-bortoleto-on-his-breakout-season-and-what-comes.1IlGS17hmyxT8jsBORYp1P
// Alguns pilotos têm menos evidência pública: seus valores são aproximações conservadoras para diferenciar o grid.
// [ataque, defesa, frenagem tardia, paciência, cuidado com pneus, estratégia de box]
const PERFIS = {
  norris:      [0.64, 0.57, 0.62, 0.60, 0.66, "plano"],
  piastri:     [0.70, 0.67, 0.68, 0.73, 0.59, "overcut"],
  leclerc:     [0.82, 0.71, 0.82, 0.48, 0.48, "undercut"],
  hamilton:    [0.72, 0.65, 0.66, 0.77, 0.83, "overcut"],
  russell:     [0.71, 0.76, 0.70, 0.63, 0.62, "plano"],
  antonelli:   [0.78, 0.65, 0.76, 0.45, 0.50, "undercut"],
  verstappen:  [0.92, 0.90, 0.88, 0.53, 0.65, "undercut"],
  hadjar:      [0.72, 0.67, 0.71, 0.57, 0.52, "plano"],
  lawson:      [0.78, 0.79, 0.73, 0.43, 0.48, "undercut"],
  lindblad:    [0.68, 0.61, 0.66, 0.60, 0.54, "plano"],
  alonso:      [0.80, 0.86, 0.78, 0.77, 0.73, "oportunista"],
  stroll:      [0.58, 0.60, 0.55, 0.53, 0.52, "plano"],
  albon:       [0.60, 0.64, 0.53, 0.76, 0.76, "overcut"],
  sainz:       [0.67, 0.75, 0.64, 0.83, 0.80, "oportunista"],
  hulkenberg:  [0.62, 0.69, 0.62, 0.71, 0.69, "plano"],
  bortoleto:   [0.75, 0.67, 0.72, 0.62, 0.64, "oportunista"],
  gasly:       [0.68, 0.67, 0.66, 0.62, 0.60, "undercut"],
  colapinto:   [0.77, 0.68, 0.75, 0.44, 0.46, "undercut"],
  ocon:        [0.69, 0.85, 0.70, 0.61, 0.60, "plano"],
  bearman:     [0.78, 0.70, 0.76, 0.48, 0.50, "undercut"],
  perez:       [0.62, 0.73, 0.57, 0.81, 0.90, "overcut"],
  bottas:      [0.59, 0.60, 0.58, 0.70, 0.67, "plano"],
};
const PADRAO = [0.5, 0.5, 0.5, 0.5, 0.5, "plano"];
function dePiloto(id) {
  const [ataque, defesa, frenagem, paciencia, pneus, box] = PERFIS[id] || PADRAO;
  return { ataque, defesa, frenagem, paciencia, pneus, box };
}
// Em GPs decisivos, com pontos reais no campeonato e nas duas últimas voltas, o líder protege a posição;
// quem está até 25 pontos atrás tenta um pouco mais. Na corrida avulsa e na primeira etapa não há ajuste.
function pressao(room, p) {
  const cam = room.campeonatoPilotos, id = p.piloto && p.piloto.id;
  if (!cam || !id || cam.restam > 1 || (p.laps || 0) < Math.max(0, room.config.voltas - 2)) return 0;
  const lista = cam.pilotos || [], lider = lista[0], piloto = lista.find((x) => x.id === id);
  if (!lider || !piloto || lider.pontos <= 0) return 0;
  const atraso = lider.pontos - piloto.pontos;
  return atraso === 0 && lider.id === id ? -0.08 : atraso > 0 && atraso <= 25 ? 0.08 : 0;
}
function parametros(room, p, nivel) {
  const perfil = dePiloto(p.piloto && p.piloto.id), press = pressao(room, p);
  const ataque = Math.max(0, Math.min(1, perfil.ataque + press));
  return { perfil, ataque, antec: nivel.antec * (0.84 + 0.16 * ataque),
    defende: Math.max(0, Math.min(0.9, nivel.defende * (0.6 + perfil.defesa * 0.4))),
    diferencaMinima: 8.5 - ataque * 2.5, espera: Math.round(800 + perfil.paciencia * 800),
    desgaste: 1.05 - perfil.pneus * 0.1 };
}
module.exports = { PERFIS, dePiloto, pressao, parametros };
