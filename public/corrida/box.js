// Corrida da Galera — o pit stop no navegador (regras de F1, f1-regras.js): só o PEDIDO da parada (B, 1, 2 e 3). Entrar no
// corredor dos boxes, parar na garagem, trocar o pneu e voltar para a pista é da física (sim.js, `passoBox`), a mesma no
// navegador e no servidor: o pedido vai na entrada de cada passo (`race.pedidoBox`) e o carro anda sozinho no corredor.
import { E, me, toast } from "./estado.js";
import { Sound } from "./sons.js";
import { race } from "./jogo.js";

const F1 = () => window.F1Regras;
const ORDEM = ["macio", "medio", "duro"];

// quantos jogos de cada composto ainda restam (2 por composto na corrida, contando a largada; o servidor manda em `jogos`)
export function jogosDe(m) { return (m && m.jogos) || { macio: 2, medio: 2, duro: 2 }; }
export function textoJogos(m) { const j = jogosDe(m), n = { macio: "M", medio: "Md", duro: "D" }; return ORDEM.map((c) => `${n[c]} ${j[c]}/${F1().JOGOS_POR_COMPOSTO}`).join(" · "); }

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
  const atual = race.pneu ? race.pneu.composto : "medio", fila = [1, 2, 3].map((k) => ORDEM[(ORDEM.indexOf(atual) + k) % 3]).filter((c) => jogosDe(me())[c] > 0);
  if (!fila.length) { toast("Sem jogos de pneu: " + textoJogos(me()), 1800); return; }
  const k = B.pedido ? fila.indexOf(B.pedido) + 1 : 0;
  if (k >= fila.length) { B.pedido = race.pedidoBox = null; toast("Box cancelado", 1200); return; }
  if (!B.pedido && !podePedir()) return;
  B.pedido = race.pedidoBox = fila[k]; avisar();
}
// 1, 2 e 3: escolhem o composto da parada (e pedem a parada, se ainda não tinha)
export function escolherComposto(composto) {
  const B = race && race.box; if (!B || B.fase || !F1().PNEUS[composto]) return;
  if (jogosDe(me())[composto] <= 0) { toast(`${F1().PNEUS[composto].nome} esgotado (2 jogos usados)`, 1600); return; }
  if (!B.pedido && !podePedir()) return;
  B.pedido = race.pedidoBox = composto; avisar();
}
function avisar() { const B = race.box, cor = F1().PNEUS[B.pedido]; toast(`🔧 Box na próxima passagem: ${cor.nome} (${textoJogos(me())})`, 1600); Sound.pop(); }
