// Corrida da Galera — o robô que leva o carro de quem caiu no meio do GP da temporada em grupo (planos/temporada-f1.md).
// O carro continua o MESMO: o robô pega o carro que o servidor já andava para o humano (`p.sim.c`, da física de verdade) e
// passa a pilotá-lo com o piloto automático dos outros robôs (corrida-robos.js, `passoF1`); quando a pessoa volta, o carro
// é devolvido de onde estiver (o navegador segue o `ack` do servidor). O resultado continua sendo da pessoa.
const F1 = require("./public/corrida/f1-regras.js");
const Humanos = require("./corrida-humanos.js");

const NIVEL_DO_ROBO = 0.93; // um pouco abaixo do ritmo dos robôs da sala: quem cai não deve ganhar nada com isso

// a estratégia de pneus do que resta da corrida: as paradas já feitas ficam de lado e, se só um composto foi usado, a
// próxima parada troca de composto (senão o resultado levaria o acréscimo de quem corre com um composto só)
function planoRestante(room, p) {
  const feitas = (p.paradas || []).length, laps = p.laps || 0, plano = F1.estrategia(room.config.voltas, room.config.nivel, `${room.semente}:${p.id}:assumido`);
  const usados = new Set(p.compostos || [p.pneuAtual || p.pneu]);
  const resto = plano.paradas.filter((x) => x.volta > laps && x.volta < room.config.voltas);
  if (usados.size < 2 && room.config.voltas >= 2 && !resto.some((x) => !usados.has(x.composto))) {
    const outro = Object.keys(F1.PNEUS).find((c) => !usados.has(c));
    resto.push({ volta: Math.min(room.config.voltas - 1, laps + 1), composto: outro });
  }
  return { largada: p.pneu, paradas: [...Array.from({ length: feitas }, () => ({ volta: 0, composto: p.pneuAtual })), ...resto] };
}

// o robô assume o carro de `p` (um humano que saiu). Devolve true se assumiu.
function assumir(room, p, log = () => {}, agora = Date.now()) {
  if (p.bot || p.dnf || p.finish != null || room.config.regras !== "f1" || room.phase !== "race") return false;
  let S = p.sim;
  if (!S || S.serie !== room.startAt) S = p.sim = Humanos.criarSim(room, p, room.startAt, 0, agora);
  const car = S.c;
  S.fila.clear(); S.pos = null; // o desenho dos outros carros passa a seguir o carro vivo
  p.pos = { x: car.x, y: car.y, z: car.z, a: car.a, v: car.v, prog: car.prog, at: agora };
  p.ia = { s: car.idx, s0: car.idx, lat: 0, lat0: 0, desvio: 0, v: car.v, nivel: NIVEL_DO_ROBO, jeito: 0, tracadoId: Math.max(0, room.order.indexOf(p.id)), reacao: 0, usaEm: 0,
    pneu: car.pneu, ers: car.ers, plano: planoRestante(room, p), box: car.box && car.box.fase ? car.box : null,
    estilo: { dentro: 0, lado: 0, look: 3, erroK: 0.5, erros: F1.sorteio(`erros:${room.semente}:${p.id}`) }, erro: null, erroLivre: 0, ult: null, sim: car };
  p.bot = true; p.assumido = true;
  log(`🤖 O carro de ${p.name} está com um robô até a pessoa voltar.`);
  return true;
}
// a pessoa voltou: o carro volta para ela, no ponto em que o robô deixou
function devolver(room, p, log = () => {}) {
  if (!p.assumido) return false;
  p.bot = false; p.assumido = false; delete p.ia;
  const S = p.sim;
  if (S) { S.fila.clear(); S.ultimoAck = 0; S.ultimoAgora = Date.now(); S.ancora = Date.now() - (S.c.tick - 1) * Humanos.PASSO_MS; }
  p.box = null;
  log(`🏎️ ${p.name} voltou e retomou o carro.`);
  return true;
}
module.exports = { assumir, devolver, planoRestante, NIVEL_DO_ROBO };
