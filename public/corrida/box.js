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
export function alternarPedido() {
  const B = race && race.box; if (!B || B.fase) return;
  // com um stop-and-go pendente o primeiro pedido é só ele (o mesmo composto: cumpre os segundos parado e sai); os seguintes trocam o pneu na mesma parada
  const atual = race.pneu ? race.pneu.composto : "medio", sg = me() && me().stopGo, fila = [...(sg ? [atual] : []), ...[1, 2, 3].map((k) => ORDEM[(ORDEM.indexOf(atual) + k) % ORDEM.length]).filter((c) => jogosDe(me())[c] > 0)];
  if (!fila.length) { toast("Sem jogos de pneu: " + textoJogos(me()), 1800); return; }
  const k = B.pedido ? fila.indexOf(B.pedido) + 1 : 0;
  if (k >= fila.length) { B.pedido = race.pedidoBox = null; toast("Box cancelado", 1200); return; }
  if (!B.pedido && !podePedir()) return;
  B.pedido = race.pedidoBox = fila[k]; avisar();
}
// 1, 2, 3 e 4 (macio, médio, duro e chuva): escolhem o composto da parada (e pedem a parada, se ainda não tinha)
export function escolherComposto(composto) {
  const B = race && race.box; if (!B || B.fase || !F1().PNEUS[composto]) return;
  const soStopGo = me()?.stopGo && composto === (race.pneu ? race.pneu.composto : "medio");
  if (!soStopGo && jogosDe(me())[composto] <= 0) { toast(`${F1().PNEUS[composto].nome} esgotado (2 jogos usados)`, 1600); return; }
  if (!B.pedido && !podePedir()) return;
  B.pedido = race.pedidoBox = composto; avisar();
}
// (a previsão do GP entra no aviso quando há chance de chuva: é quando a escolha do pneu mais pesa)
function avisar() { const B = race.box, cor = F1().PNEUS[B.pedido], sg = me() && me().stopGo; if (sg) { const atual = race.pneu ? race.pneu.composto : "medio"; toast(`🛑 Stop-and-go ${sg.s} s na próxima passagem pelo box ${B.pedido === atual ? "(sem trocar o pneu)" : `e, em seguida, troca para o ${cor.nome}`}`, 2400); Sound.pop(); return; }
  const pv = E.S.previsao, chuva = pv && pv.p >= 0.1 ? ` · previsão: chuva ${Math.round(pv.p * 100)}%` : ""; toast(`🔧 Box na próxima passagem: ${cor.nome} (${textoJogos(me())})${chuva}`, 2000); Sound.pop(); }
// cancela o pedido de parada sem passar pela fila do B (o MFD usa); dentro do corredor já não dá
export function cancelarPedido() {
  const B = race && race.box; if (!B || B.fase || !B.pedido) return;
  B.pedido = race.pedidoBox = null; toast("Box cancelado", 1200);
}
