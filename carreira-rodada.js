// Carreira em grupo: a rodada ao vivo para todos (planos/carreira-online.md, PR 5). Funções sem relógio próprio: quem
// chama passa o "agora" (o servidor usa Date.now(); os testes andam o tempo à mão).
// - Um relógio único por rodada: cada jogo de humano anda à mesma velocidade (VEL minutos de jogo por segundo) a partir
//   do começo da rodada, menos o tempo que ele ficou parado. O navegador só desenha o relógio que o servidor manda.
// - Paradas: quando o jogo de um humano chega numa parada (tática ou lance decisivo), só aquele jogo pausa. A decisão
//   tem um tempo (DECISAO_MS); sem resposta, vale a padrão (Motor.decisaoAutomatica). Ninguém trava os outros jogos.
// - Humano contra humano: os dois decidem na mesma parada (parado.ambos); o jogo espera os dois (ou o tempo).
// - Quem escolheu jogar "só o resultado" (modo 1) ou não quer os lances (modo 2) recebe a decisão automática na hora.
const G = require("./carreira.js").grupo;
const { Motor } = G;

const tempoDe = (e) => e.min + (e.acr ? e.acr / 100 : 0);
// até onde o relógio do jogo pode andar: a parada (os lances antes dela também) ou o último lance
const limiteDe = (r) => Math.max(r.parado ? tempoDe(r.parado) : 0, ...r.eventos.map(tempoDe), r.parado ? 0 : 90);
const ladoDe = (jg, clube) => (jg.casa === clube ? 0 : jg.fora === clube ? 1 : null);

function criarRodada(save, proxima, agora, { vel = 1.5, decisaoMs = 20000, espera = 3000, n = 1 } = {}) {
  const modoDe = (c) => (save.humanos[c] ? save.humanos[c].estado.modo || 1 : 0);
  const inicio = agora + espera;
  return {
    n, semana: proxima.semana, inicio, vel, velBase: vel, multiplicador: 1, ritmos: [{ desde: inicio, vel }], decisaoMs,
    jogos: proxima.jogos.map((j) => ({ id: j.id, j, casa: j.casa, fora: j.fora, modo: Math.max(modoDe(j.casa), modoDe(j.fora)), modos: [modoDe(j.casa), modoDe(j.fora)],
      decisoes: {}, parciais: {}, pausas: [], parado: null, fim: false })),
  };
}
// a simulação do jogo com as decisões de agora (guardada até a próxima decisão)
const cache = new WeakMap();
function simular(save, jg) {
  const chave = JSON.stringify(jg.decisoes), c = cache.get(jg);
  if (c && c.chave === chave) return c.r;
  const r = G.simularJogoGrupo(save, jg.j, { modo: jg.modo, decisoes: jg.decisoes });
  cache.set(jg, { chave, r });
  return r;
}
// Soma o tempo de jogo entre dois instantes, respeitando as trocas 1×/3× feitas pelo anfitrião.
function minutosEntre(rod, de, ate) {
  if (ate <= de) return 0;
  const ritmos = rod.ritmos && rod.ritmos.length ? rod.ritmos : [{ desde: rod.inicio, vel: rod.vel }];
  let total = 0;
  for (let i = 0; i < ritmos.length; i++) {
    const inicio = Math.max(de, ritmos[i].desde), fim = Math.min(ate, ritmos[i + 1] ? ritmos[i + 1].desde : ate);
    if (fim > inicio) total += (fim - inicio) / 1000 * ritmos[i].vel;
  }
  return total;
}
const minutoDe = (rod, jg, agora) => {
  const ate = Math.max(rod.inicio, agora);
  let minuto = minutosEntre(rod, rod.inicio, ate);
  for (const [a, b] of jg.pausas) minuto -= minutosEntre(rod, Math.max(rod.inicio, a), Math.min(ate, b));
  if (jg.parado) minuto -= minutosEntre(rod, Math.max(rod.inicio, jg.parado.desde), ate);
  return Math.max(0, minuto);
};
// A velocidade muda para a rodada inteira. Os segmentos mantêm o minuto contínuo mesmo se algum jogo estiver pausado.
function alterarVelocidade(rod, multiplicador, agora) {
  if (![1, 3].includes(multiplicador)) return false;
  const atual = rod.multiplicador || 1;
  if (atual === multiplicador) return false;
  rod.velBase ||= rod.vel / atual;
  rod.ritmos ||= [{ desde: rod.inicio, vel: rod.vel }];
  const vel = rod.velBase * multiplicador;
  if (agora <= rod.inicio) rod.ritmos = [{ desde: rod.inicio, vel }];
  else rod.ritmos.push({ desde: agora, vel });
  rod.vel = vel; rod.multiplicador = multiplicador;
  return true;
}
// quem precisa decidir esta parada: os lados humanos do pedido que quiseram decidir (tática no modo 2+, lance no 3)
function pendentesDe(jg, parado) {
  const lados = parado.ambos ? Object.keys(parado.pedidos).map(Number) : [parado.lado ?? ladoDe(jg, jg.casa)];
  return lados.filter((l) => { const m = jg.modos[l], p = parado.ambos ? parado.pedidos[l] : parado; return m >= (p.tipo === "lance" ? 3 : 2); });
}
const automatica = (parado, lado) => Motor.decisaoAutomatica(parado.ambos ? parado.pedidos[lado] : parado);
// a parada foi respondida (ou o tempo acabou): a decisão entra e o jogo segue
function resolver(jg, r, agora) {
  const p = r.parado, lados = p.ambos ? Object.keys(p.pedidos).map(Number) : [p.lado];
  for (const l of lados) if (jg.parciais[l] === undefined) jg.parciais[l] = automatica(p, l);
  jg.decisoes[p.id] = p.ambos ? Object.fromEntries(lados.map((l) => [l, jg.parciais[l]])) : jg.parciais[lados[0]];
  if (jg.parado) jg.pausas.push([jg.parado.desde, agora]);
  jg.parado = null; jg.parciais = {};
}

// o relógio anda: abre as paradas que chegaram, decide as que venceram o tempo e fecha os jogos que acabaram.
// Devolve { mudou, acabou } (acabou: todos os jogos da rodada fecharam e o mundo foi recalculado).
function tick(save, rod, agora) {
  let mudou = false;
  for (const jg of rod.jogos) {
    if (jg.fim) continue;
    for (let volta = 0; volta < 20; volta++) {
      const r = simular(save, jg);
      if (r.parado) {
        if (!jg.parado) {
          if (minutoDe(rod, jg, agora) < limiteDe(r)) break;
          const pend = pendentesDe(jg, r.parado);
          jg.parado = { id: r.parado.id, desde: agora, ate: agora + rod.decisaoMs, pendentes: pend };
          mudou = true;
          if (!pend.length) { resolver(jg, r, agora); continue; } // ninguém quis decidir esta: segue na hora
          break;
        }
        if (agora >= jg.parado.ate || !jg.parado.pendentes.length) { resolver(jg, r, agora); mudou = true; continue; }
        break;
      }
      if (minutoDe(rod, jg, agora) >= limiteDe(r) + 0.5) {
        G.fecharJogoGrupo(save, jg.j, r, jg.modo, jg.decisoes);
        jg.fim = true; jg.placar = [...r.placar]; mudou = true;
      }
      break;
    }
  }
  const acabou = rod.jogos.every((jg) => jg.fim);
  if (acabou && !rod.fechada) { G.fecharRodadaGrupo(save); rod.fechada = true; mudou = true; }
  return { mudou, acabou };
}
// a resposta de um humano à parada do jogo dele
function decidir(save, rod, clube, id, resposta, agora) {
  const jg = rod.jogos.find((x) => !x.fim && ladoDe(x, clube) != null);
  if (!jg) return "Você não tem jogo nesta rodada.";
  const lado = ladoDe(jg, clube), r = simular(save, jg);
  if (!jg.parado || !r.parado || r.parado.id !== id) return "Essa decisão não é a de agora.";
  if (!jg.parado.pendentes.includes(lado)) return "Você já decidiu. Esperando o outro técnico.";
  const pedido = r.parado.ambos ? r.parado.pedidos[lado] : r.parado;
  const limpa = G.limparDecisao(pedido, resposta);
  if (limpa == null) return "Escolha uma das opções.";
  jg.parciais[lado] = limpa;
  jg.parado.pendentes = jg.parado.pendentes.filter((l) => l !== lado);
  if (!jg.parado.pendentes.length) resolver(jg, r, agora);
  return null;
}

// o que cada humano vê da rodada: o jogo dele (a narração até a parada ou o fim, o relógio e a parada que é dele) e o
// placar dos outros jogos de humanos, numa faixa
function relogioDe(rod, jg, agora, r) {
  return { minuto: Math.min(minutoDe(rod, jg, agora), limiteDe(r)), t: agora, rodando: !jg.parado && !jg.fim && agora >= rod.inicio, limite: limiteDe(r), vel: rod.vel, multiplicador: rod.multiplicador || 1 };
}
function visao(save, rod, clube, agora) {
  if (!rod) return null;
  const meu = rod.jogos.find((x) => ladoDe(x, clube) != null);
  const ver = (jg) => {
    const r = simular(save, jg), lado = ladoDe(jg, clube);
    const base = { id: jg.id, casa: jg.casa, fora: jg.fora, competicao: jg.j.competicao, fase: jg.j.fase, fim: jg.fim, relogio: relogioDe(rod, jg, agora, r), humanos: [jg.casa, jg.fora].filter((c) => save.humanos[c]) };
    if (lado == null) return { ...base, gols: r.eventos.filter((e) => e.tipo === "gol").map((e) => ({ min: e.min, acr: e.acr, lado: e.lado })) };
    let parado = null;
    if (jg.parado && r.parado) {
      const meuPedido = r.parado.ambos ? r.parado.pedidos[lado] : r.parado.lado === lado || r.parado.lado == null ? r.parado : null;
      if (meuPedido && jg.parado.pendentes.includes(lado)) parado = { ...meuPedido, id: r.parado.id, min: r.parado.min, acr: r.parado.acr, placar: r.parado.placar, ate: jg.parado.ate };
      else parado = { esperando: true, id: r.parado.id, min: r.parado.min, acr: r.parado.acr, placar: r.parado.placar, ate: jg.parado.ate };
    }
    return { ...base, lado, eventos: r.eventos, parado, completo: r.completo, modo: jg.modo, placar: r.placar };
  };
  return { n: rod.n, semana: rod.semana, inicio: rod.inicio, agora, velocidade: rod.multiplicador || 1, meu: meu ? ver(meu) : null, outros: rod.jogos.filter((x) => x !== meu).map(ver) };
}

module.exports = { criarRodada, tick, decidir, visao, minutoDe, limiteDe, alterarVelocidade };
