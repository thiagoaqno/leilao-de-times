// Cidade do México (Autódromo Hermanos Rodríguez, dentro do parque Magdalena Mixhuca): o que só o circuito tem, em cima do kit. O resto (zebras, escape,
// arquibancadas, painéis, passarelas e som) é do kit, na configuração de gps/mexico.js; as peças exclusivas estão em kit/mexico/. Aqui, na ordem em que
// aparecem (frações da volta, a partir da linha de chegada, que fica no meio da reta dos boxes; o traçado vai para leste, a curva 1 é à direita):
// 1. o Foro Sol, o estádio de beisebol no miolo da alça do fim da volta (0,85-0,98): a arquibancada em ferradura lotada de verde, branco e vermelho,
//    o pódio no meio do campo de frente para a torcida, as bandeiras do México, as torres de luz e a fumaça tricolor;
// 2. a reta dos boxes (muito longa): o prédio das garagens do lado sul e a tribuna principal do lado norte; o Palácio dos Esportes, de cúpula de cobre, ao fundo;
// 3. o parque Magdalena Mixhuca: lagos, quadras, jacarandás, ahuehuetes, eucaliptos e pinheiros;
// 4. um pedaço da Peraltada antiga, o anel inclinado que ficou de fora do circuito, visível do lado;
// 5. o horizonte: a cidade baixa de cores quentes, a Torre Latinoamericana e os vulcões Popocatépetl e Iztaccíhuatl na névoa da altitude.
// Tudo é cenário: nada fica dentro da pista (livre/ocupado) e a física é a de sempre. Sem marcas registradas novas: os painéis são nomes de lugar e de
// comida do México (kit/mexico/marcas.js) e as marcas que o kit já tem.
import { livre, ocupado } from "./kit/comum.js";
import { prediosDosBoxes } from "./kit/boxes.js";
import { tendaPaddock } from "./kit/coberturas.js";
import { registrarMarcasMexico } from "./kit/mexico/marcas.js";
import { reservarRet, acharRet, indice } from "./kit/mexico/lugar.js";
import { foroSol } from "./kit/mexico/foro.js";
import { arvoresDoParque, lagos, quadras, palacioDosEsportes, peraltada } from "./kit/mexico/parque.js";
import { cidade, vulcoes } from "./kit/mexico/horizonte.js";

registrarMarcasMexico();

// ---------------------------------------------------------------------------------------------------------------------
// 1. O Foro Sol
// ---------------------------------------------------------------------------------------------------------------------
function oForoSol(tr, { add }) {
  const A = 200, B = 104, fundo = 56, folga = 30, ok = (x, z) => livre(tr, x, z, folga) && !ocupado(tr, x, z);
  let melhor = null;
  for (let cx = 640; cx <= 1020; cx += 20) for (let cz = 1240; cz <= 1420; cz += 10) {
    let bons = 0;
    for (let k = 0; k < 72; k++) {
      const t = (k / 72) * Math.PI * 2;
      if ([-8, 0, fundo].every((d) => ok(cx + (A - d) * Math.cos(t), cz + (B - d) * Math.sin(t)))) bons++;
    }
    if (!melhor || bons > melhor.bons) melhor = { cx, cz, bons };
  }
  if (!melhor || melhor.bons < 20) { tr.faltouMexico = (tr.faltouMexico || []).concat([{ nome: "foro" }]); return null; }
  const info = foroSol(tr, add, { cx: melhor.cx, cz: melhor.cz, A, B, fundo, degraus: 7, ok });
  // reserva o estádio inteiro (as árvores e a torcida solta não entram)
  for (let u = -A; u <= A; u += 50) for (let v = -B; v <= B; v += 50) if ((u / A) ** 2 + (v / B) ** 2 <= 1.2) tr.reservado.push([melhor.cx + u, melhor.cz + v, 46]);
  tr.foroSol = info;
  const anterior = tr.animarPista;
  tr.animarPista = (dt, foco, t) => { anterior?.(dt, foco, t); info.fumaca.animar(t, foco); };
  return info;
}

// ---------------------------------------------------------------------------------------------------------------------
// 2. A reta dos boxes: o prédio das garagens e o paddock atrás
// ---------------------------------------------------------------------------------------------------------------------
function retaDosBoxes(tr, { add }, marcas) {
  const bx = tr.t.boxes || { lado: 1 };
  prediosDosBoxes(tr, add, { de: 0.984, ate: 1.062, lado: bx.lado, recuo: 62, torre: true, paineis: marcas.slice(0, 4), cores: { friso: "#006847" } });
  // as tendas do paddock atrás do prédio
  const p = tr.pts[indice(tr, 0.012)], atras = bx.lado * (tr.W / 2 + 62 + 46 + 90);
  const q = acharRet(tr, p.x + p.nx * atras, p.y + p.ny * atras, 0, 150, 60, { folga: 36, raio: 260, passo: 30 });
  if (q) {
    ["PADDOCK", "MÉXICO"].forEach((texto, k) => { const t = tendaPaddock({ modulos: 3, filas: 2, texto, corFaixa: k ? "#ce1126" : "#006847", corMesas: "#006847" }); t.position.set(q.x - 70 + k * 140, tr.chao(q.x, q.z) - 1, q.z); add(t); });
    reservarRet(tr, q.x, q.z, 0, 150, 60, 20); tr.paddockMexico = { x: Math.round(q.x), z: Math.round(q.z) };
  }
}

// ---------------------------------------------------------------------------------------------------------------------
// O antes (cenario) e o depois (depois) do GP
// ---------------------------------------------------------------------------------------------------------------------
export function cenarioMexico(tr, ctx, marcas) {
  tr.reservado ||= [];
  oForoSol(tr, ctx);
  retaDosBoxes(tr, ctx, marcas);
  peraltada(tr, ctx.add);
  palacioDosEsportes(tr, ctx.add, [2300, 780]);
  lagos(tr, ctx.add, [
    { caixa: [1500, 3300, 1500, 2000], a: 150, b: 80 }, { caixa: [2200, 3600, 1650, 2050], a: 110, b: 62 },
    { caixa: [700, 2600, 2600, 3900], a: 190, b: 110 }, { caixa: [3300, 4400, 3600, 4200], a: 130, b: 70 },
  ]);
  quadras(tr, ctx.add, [1500, 1850]);
}

export function depoisMexico(tr, ctx) {
  arvoresDoParque(tr, ctx.add);
  cidade(tr, ctx.add);
  vulcoes(tr, ctx.add);
}
