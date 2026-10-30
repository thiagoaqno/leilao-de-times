// Corrida da Galera — o pit stop no navegador (regras de F1, f1-regras.js): só o PEDIDO da parada (B, 1, 2, 3 e 4). Entrar no
// corredor dos boxes, parar na garagem, trocar o pneu e voltar para a pista é da física (sim.js, `passoBox`), a mesma no
// navegador e no servidor: o pedido vai na entrada de cada passo (`race.pedidoBox`) e o carro anda sozinho no corredor.
import { E, me, toast } from "./estado.js";
import { Sound } from "./sons.js";
import { race } from "./jogo.js";

const F1 = () => window.F1Regras;
const ORDEM = ["macio", "medio", "duro", "chuva"];

// quantos jogos de cada composto ainda restam (2 por composto na corrida, contando a largada; o servidor manda em `jogos`)
export function jogosDe(m) { return (m && m.jogos) || { macio: 2, medio: 2, duro: 2, chuva: 2 }; }
export function textoJogos(m) { const j = jogosDe(m), n = { macio: "M", medio: "Md", duro: "D", chuva: "C" }; return ORDEM.map((c) => `${n[c]} ${j[c]}/${F1().JOGOS_POR_COMPOSTO}`).join(" · "); }

// dá para pedir agora? (não na última volta, que passa pela chegada dentro do corredor, nem depois da bandeirada)
function podePedir() {
  const m = me(), B = race && race.box;
  if (!B || !m || m.finish != null || E.S.phase !== "race") return false;
  if (m.laps + 1 >= E.S.config.voltas) { toast("Última volta: sem box", 1600); return false; }
  return true;
}
// B (ou o toque em "Box"): pede a parada com o próximo composto da fila, depois do atual; de novo, passa para o seguinte;
// depois do último, cancela
// com um stop-and-go pendente (`stopGo` no meu jogador, do servidor) o pedido é só ele: entra no box, fica parado `s` segundos sem trocar o pneu e volta
function pedirStopGo() {
  const B = race.box, sg = me().stopGo, atual = race.pneu ? race.pneu.composto : "medio";
  if (B.pedido) { B.pedido = race.pedidoBox = null; toast("Stop-and-go cancelado (cumpra em " + sg.v + " volta" + (sg.v > 1 ? "s" : "") + ")", 1600); return; }
  if (!podePedir()) return;
  B.pedido = race.pedidoBox = atual; toast(`🛑 Stop-and-go ${sg.s} s na próxima passagem pelo box (sem trocar o pneu)`, 2400); Sound.pop();
}
export function alternarPedido() {
  const B = race && race.box; if (!B || B.fase) return;
  if (me() && me().stopGo) return pedirStopGo();
  const atual = race.pneu ? race.pneu.composto : "medio", fila = [1, 2, 3].map((k) => ORDEM[(ORDEM.indexOf(atual) + k) % ORDEM.length]).filter((c) => jogosDe(me())[c] > 0);
  if (!fila.length) { toast("Sem jogos de pneu: " + textoJogos(me()), 1800); return; }
  const k = B.pedido ? fila.indexOf(B.pedido) + 1 : 0;
  if (k >= fila.length) { B.pedido = race.pedidoBox = null; toast("Box cancelado", 1200); return; }
  if (!B.pedido && !podePedir()) return;
  B.pedido = race.pedidoBox = fila[k]; avisar();
}
// 1, 2, 3 e 4 (macio, médio, duro e chuva): escolhem o composto da parada (e pedem a parada, se ainda não tinha)
export function escolherComposto(composto) {
  const B = race && race.box; if (!B || B.fase || !F1().PNEUS[composto]) return;
  if (me() && me().stopGo) { if (!B.pedido) pedirStopGo(); else toast("Com o stop-and-go pendente a visita ao box não troca o pneu", 1800); return; }
  if (jogosDe(me())[composto] <= 0) { toast(`${F1().PNEUS[composto].nome} esgotado (2 jogos usados)`, 1600); return; }
  if (!B.pedido && !podePedir()) return;
  B.pedido = race.pedidoBox = composto; avisar();
}
// (a previsão do GP entra no aviso quando há chance de chuva: é quando a escolha do pneu mais pesa)
function avisar() { const B = race.box, cor = F1().PNEUS[B.pedido], pv = E.S.previsao, chuva = pv && pv.p >= 0.1 ? ` · previsão: chuva ${Math.round(pv.p * 100)}%` : ""; toast(`🔧 Box na próxima passagem: ${cor.nome} (${textoJogos(me())})${chuva}`, 2000); Sound.pop(); }
