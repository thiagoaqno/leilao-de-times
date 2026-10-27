// Corrida da Galera — as contas da torre de posições do HUD de F1 (hud.js desenha). Só lógica pura, testável em node.
(function (root) {

const LETRA = { macio: "S", medio: "M", duro: "H" }; // a letra do composto na torre (como na TV)
const KMH_POR_U = 0.75; // o velocímetro mostra v * 0.75 km/h: com essa mesma escala sai a distância em metros
const V_MIN = 22; // abaixo disso (unidades/s) o tempo explode: mostra a distância em metros
const mDe = (u) => (u * KMH_POR_U) / 3.6;

function tempoCurto(s) { return s < 60 ? s.toFixed(1) : `${Math.floor(s / 60)}:${(s % 60).toFixed(1).padStart(4, "0")}`; }

// A diferença para o líder de um carro: `dist` em unidades da pista (>= 0), `v` a velocidade dele (suavizada), `voltas` as voltas
// inteiras de atraso. Devolve { tipo, texto }: lider, voltas, seg (tempo = distância / velocidade), m (quase parado), out.
function diferenca({ lider, dist, v, voltas, dnf, vMin }) {
  if (dnf) return { tipo: "out", texto: "Out" };
  if (lider) return { tipo: "lider", texto: "Leader" };
  if (voltas >= 1) return { tipo: "voltas", texto: `+${voltas} V` };
  const d = Math.max(0, dist || 0), vm = vMin == null ? V_MIN : vMin;
  if (!(v >= vm)) return { tipo: "m", texto: `-${mDe(d).toFixed(1)} m` };
  return { tipo: "seg", texto: `+${tempoCurto(d / v)}` };
}

// A torre: recebe os corredores na ordem da corrida (`standings`) e devolve as linhas prontas. Quem saiu (DNF) vai para o fim.
// corredor: { id, prog, v, dnf, noBox, penal, done (tempo final com acréscimos ou null), best, pneu, paradas, sigla, nome, cor, bot }
function torre(corredores, { n, meuId, esc = 1 }) { // esc: unidades de pista por índice (a distância do atraso)
  const ordem = corredores.filter((c) => !c.dnf).concat(corredores.filter((c) => c.dnf));
  const lider = ordem.find((c) => !c.dnf) || ordem[0];
  const melhor = corredores.reduce((a, c) => (c.best != null && (a == null || c.best < a.best) ? c : a), null);
  return ordem.map((c, i) => {
    const eLider = c === lider, atraso = lider ? Math.max(0, lider.prog - c.prog) : 0;
    let dif = diferenca({ lider: eLider, dist: atraso * esc, v: c.v, voltas: Math.floor(atraso / n + 0.02), dnf: c.dnf });
    if (!eLider && !c.dnf && c.done != null && lider.done != null) dif = { tipo: "seg", texto: `+${tempoCurto(Math.max(0, c.done - lider.done))}` }; // os dois já chegaram: o tempo de verdade
    else if (c.done != null && !c.dnf && !eLider && dif.tipo === "m") dif = { tipo: "fim", texto: "Fim" }; // parou depois da bandeirada
    return { pos: i + 1, id: c.id, sigla: c.sigla, nome: c.nome, cor: c.cor, bot: !!c.bot, eu: c.id === meuId, dif, letra: LETRA[c.pneu] || "M", pneu: c.pneu,
      volta: !!melhor && melhor.id === c.id, noBox: !!c.noBox, penal: c.penal || 0, acabou: c.done != null };
  });
}

// Quais linhas aparecem: todas se couber; senão a líder, mais uma janela em volta do jogador (`eu`, índice, ou -1 se assiste).
function recortar(total, eu, max) {
  const out = [];
  if (total <= max) { for (let i = 0; i < total; i++) out.push(i); return out; }
  const janela = max - 1, centro = eu < 0 ? 1 + Math.floor(janela / 2) : eu;
  let ini = Math.max(1, Math.min(centro - Math.floor(janela / 2), total - janela));
  out.push(0); for (let i = ini; i < ini + janela; i++) out.push(i);
  return out;
}

const api = { LETRA, KMH_POR_U, V_MIN, mDe, tempoCurto, diferenca, torre, recortar };
if (typeof module !== "undefined" && module.exports) module.exports = api;
else root.HudTorre = api;
})(typeof self !== "undefined" ? self : this);
