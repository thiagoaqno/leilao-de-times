// Perfis de corrida: interpretações de jogo, não medições oficiais. Escala 0–1; atributos independentes do ritmo.
// Referências: https://www.formula1.com/en/latest/article/its-eye-watering-albon-shares-the-secrets-of-verstappens-unique-driving.3Dlce2QkRGzUDLMtDf3dOs
// https://www.formula1.com/en/latest/article/watch-why-jolyon-palmer-thinks-sainz-may-lead-the-f1-field-when-it-comes-to.5pHX7U5GXKdPdQXIy7tUwN
// https://www.formula1.com/en/latest/article/f3s-newest-champion-gabriel-bortoleto-on-his-breakout-season-and-what-comes.1IlGS17hmyxT8jsBORYp1P
// Alguns pilotos têm menos evidência pública: seus valores são aproximações conservadoras para diferenciar o grid.
// [ataque, defesa, frenagem tardia, paciência, cuidado com pneus, estratégia de box]
const Pilotos = require("./public/corrida/f1-pilotos-2026.js");
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
// O jeito de pilotar (também interpretação de jogo, editável em /admin/pilotos): [agressividade na entrada, retomada do acelerador, uso de zebra, taxa de erro]
const PILOTAGEM = {
  norris:      [0.66, 0.72, 0.62, 0.18],
  piastri:     [0.62, 0.70, 0.56, 0.10],
  leclerc:     [0.84, 0.66, 0.72, 0.24],
  hamilton:    [0.72, 0.78, 0.60, 0.12],
  russell:     [0.68, 0.70, 0.58, 0.14],
  antonelli:   [0.74, 0.62, 0.66, 0.34],
  verstappen:  [0.92, 0.86, 0.78, 0.08],
  hadjar:      [0.70, 0.62, 0.62, 0.28],
  lawson:      [0.74, 0.58, 0.64, 0.32],
  lindblad:    [0.66, 0.58, 0.60, 0.36],
  alonso:      [0.80, 0.82, 0.70, 0.08],
  stroll:      [0.54, 0.52, 0.46, 0.34],
  albon:       [0.60, 0.70, 0.52, 0.16],
  sainz:       [0.70, 0.74, 0.60, 0.12],
  hulkenberg:  [0.62, 0.66, 0.54, 0.16],
  bortoleto:   [0.70, 0.64, 0.60, 0.24],
  gasly:       [0.68, 0.66, 0.58, 0.18],
  colapinto:   [0.74, 0.58, 0.66, 0.38],
  ocon:        [0.68, 0.62, 0.58, 0.20],
  bearman:     [0.74, 0.60, 0.64, 0.32],
  perez:       [0.58, 0.72, 0.50, 0.20],
  bottas:      [0.56, 0.66, 0.50, 0.14],
};
const PADRAO = [0.5, 0.5, 0.5, 0.5, 0.5, "plano"], PADRAO_PILOTAGEM = [0.5, 0.5, 0.5, 0.25];
// Os campos que o admin edita (cada um de 0 a 1) e os jeitos de box
const CAMPOS = [["frenagem", "Ponto de frenagem", "Mais alto freia mais tarde"], ["entrada", "Agressividade na entrada", "Mais velocidade para dentro da curva"], ["retomada", "Retomada do acelerador", "Volta a acelerar mais rápido na saída"], ["zebra", "Uso de zebra", "Passa mais perto do ápice"], ["consistencia", "Consistência", "Repete mais o tempo de volta"], ["erro", "Taxa de erro", "Erra mais nas freadas"], ["ataque", "Ataque", "Tenta ultrapassar mais cedo"], ["defesa", "Defesa", "Fecha a porta com mais frequência"], ["paciencia", "Paciência", "Espera mais entre uma tentativa e outra"], ["pneus", "Cuidado com pneus", "Gasta menos o pneu"]];
const BOXES = ["plano", "undercut", "overcut", "oportunista"];
const consistenciaOriginal = (id) => { const p = Pilotos.PILOTOS.find((q) => q.id === id); return p ? Math.round(Math.max(0, Math.min(1, (p.constancia - 60) / 39)) * 100) / 100 : 0.5; };
function original(id) {
  const [ataque, defesa, frenagem, paciencia, pneus, box] = PERFIS[id] || PADRAO, [entrada, retomada, zebra, erro] = PILOTAGEM[id] || PADRAO_PILOTAGEM;
  return { ataque, defesa, frenagem, paciencia, pneus, box, entrada, retomada, zebra, erro, consistencia: consistenciaOriginal(id) };
}
const AJUSTES = new Map(); // o que o admin mudou (id → campos); vale para as próximas corridas
function dePiloto(id) { return { ...original(id), ...AJUSTES.get(id) }; }
// O ajuste que vale: só os campos conhecidos, com número de 0 a 1. Devolve null se algo está fora disso.
function limpar(perfil) {
  if (!perfil || typeof perfil !== "object") return null;
  const saida = {};
  for (const [c] of CAMPOS) { if (perfil[c] === undefined) continue; const v = perfil[c]; if (typeof v !== "number" || !Number.isFinite(v) || v < 0 || v > 1) return null; saida[c] = Math.round(v * 100) / 100; }
  if (perfil.box !== undefined) { if (!BOXES.includes(perfil.box)) return null; saida.box = perfil.box; }
  return saida;
}
const ajustar = (id, perfil) => { const a = limpar(perfil); if (a) AJUSTES.set(id, a); else AJUSTES.delete(id); };
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
module.exports = { PERFIS, PILOTAGEM, CAMPOS, BOXES, original, dePiloto, limpar, ajustar, pressao, parametros };
