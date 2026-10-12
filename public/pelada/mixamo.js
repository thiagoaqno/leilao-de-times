// Pelada — os bonecos com as animações do Mixamo (as mesmas do Futevôlei: public/futevolei/atleta-mixamo.js). Cada boneco de
// caixinhas ganha um esqueleto escondido; o animador mistura parado/correr/de lado pela velocidade e toca os golpes, e a
// pose vai para as juntas da caixinha. O que o Mixamo não tem (carrinho e caído) continua com as poses do bonecos.js.
// Ligado pelo jogo.js: configurarBonecos({ animar: animarComMixamo }).
import { Modelo, criarMixamo, soltarMixamo } from "/futevolei/atleta-mixamo.js";
import { FL } from "./estado.js";

Modelo.carregar();
// o golpe de cada chute: st.golpe = { how, kind } (how: pe, cabeca, voleio, bicicleta, mao; kind: chute, passe...)
function golpeDe(g, noAr) {
  const how = g ? g.how : "pe", kind = g ? g.kind : "passe";
  if (how === "bicicleta") return "bicicleta";
  if (how === "voleio") return "voleio";
  if (how === "cabeca") return noAr ? "cabeca" : "cabecaChao";
  if (how === "mao") return kind === "chute" ? "saque" : kind === "passe" || kind === "curto" ? "rolar" : "arremesso"; // o goleiro: chuta da mão, rola ou lança
  return kind === "chute" ? "chutePe" : "frente";
}
export function animarComMixamo(model, speed, dt, st, f) {
  const u = model.userData;
  if (!Modelo.ativo || !u.legs) return false;
  if (u.mixamo && u.mixamo.corpo !== u.body) { soltarMixamo(u.mixamo); u.mixamo = null; } // trocou de skin
  if (f & (FL.slide | FL.down)) { st.caiu = st.caiu || !!(f & FL.down); if (u.mixamo) u.mixamo.animador.clip = null; return false; } // carrinho e caído: as poses de lá
  if (!u.mixamo) { u.mixamo = criarMixamo(null, u); u.mixamo.corpo = u.body; }
  const an = u.mixamo.animador;
  if (st.caiu) { st.caiu = false; an.disparar("levanta"); }
  // o chute: começa quase no impacto (na Pelada a bola sai na hora do botão)
  if (st.kickT && st.kickT !== st.kickVisto) {
    st.kickVisto = st.kickT;
    const nome = golpeDe(st.golpe, model.position.y > 0.25); st.golpe = null;
    an.disparar(nome, { lado: 1, pulo: model.position.y > 0.25 }, 0);
    if (an.clip) an.clip.t = Math.max(0, an.clip.impT - 0.12);
  }
  // o goleiro: se joga (para o lado do pulo), pega a bola e segura
  if (f & FL.dive) { if (!st.mergulhou) { st.mergulhou = true; an.disparar("mergulho", { lado: st.diveSide || 1 }, 0.15); } } else st.mergulhou = false;
  if (st.holding && !st.segurava && !(f & FL.dive)) an.disparar("defende", { lado: 1 }, 0.25);
  st.segurava = !!st.holding; an.segura = !!st.holding;
  // a velocidade no referencial do boneco (para a frente e de lado), pela posição de um quadro para o outro
  const p = model.position, yaw = model.rotation.y;
  let vx = 0, vz = 0;
  if (st.posAnt && dt > 0) { vx = (p.x - st.posAnt.x) / dt; vz = (p.z - st.posAnt.z) / dt; }
  st.posAnt = { x: p.x, z: p.z };
  const v = Math.hypot(vx, vz) > 0.2 ? { vx, vz } : { vx: 0, vz: 0 }, sy = Math.sin(yaw), cy = Math.cos(yaw);
  const mov = { vel: speed, fwd: -v.vx * sy - v.vz * cy, lat: v.vx * cy - v.vz * sy };
  if (Math.hypot(mov.fwd, mov.lat) < 0.2) { mov.fwd = speed; mov.lat = 0; }
  else { const k = speed / (Math.hypot(mov.fwd, mov.lat) || 1); mov.fwd *= k; mov.lat *= k; }
  an.atualizar(u, u.body, mov, dt, !!u.gk && speed < 1.5); // o goleiro parado fica na base de goleiro
  return true;
}
