// A encenação dos golpes: cada golpe passa por 8 tempos, no jeito da família do tipo (fogo, água, raio...).
// 1. Carga: a energia juntando em quem vai atacar (as partículas vêm de fora para dentro, o brilho cresce e o anel no
//    chão fecha); nos golpes com preparo (feixe, sopro, agarrão), dura o preparo inteiro.
// 2. Núcleo: o miolo quente do projétil, que pulsa por dentro do desenho de cada família (golpes3d.js).
// 3. Rastro: a fita que fica atrás do projétil e de quem avança na investida.
// 4. Estouro: o impacto do jeito da família (chamas, coroa de gotas, estrela de raios, estilhaços de gelo, entulho,
//    folhas, anéis, fumaça, gosma, faíscas de metal, rajada de vento, "pow"), com a onda no chão e um congelamento
//    rápido dos dois bichos no acerto (hit-stop).
// 5. Reação: quem apanha pisca na cor do golpe, treme e fica um instante com o efeito do tipo em volta (queimando,
//    molhado, eletrizado, congelado, envenenado...).
// 6. Som: carga, disparo e impacto de cada família (sons.js, somDoTempo), com o toque de super efetivo e de crítico.
// 7. Rescaldo: o que fica no chão depois (fumaça, brasas, poça, cristais derretendo, folhas, faíscas, bolhas,
//    entulho), além das marcas de marcas.js.
// 8. Números de dano: saltam com exagero e sobem; maiores e laranja no super efetivo, cinza no pouco efetivo, amarelo
//    no crítico, azul no bloqueado; golpes seguidos no mesmo alvo somam no mesmo número ("×3").
// Tudo só visual e de som: nasce dos eventos que o navegador já recebe. Os jutsus do Naruto têm os seus desenhos
// (golpes-naruto.js): neles valem só a reação, o som e os números. Com menos movimento no sistema, nada se mexe à toa.
// Usa as peças de golpes.js (familiaDe, PALETA), animacao.js (particula, espalhar, visualDe), golpes3d.js (G3,
// malhaG3, brilhoG3, vivo, anelNoChao, pedirLuz, sacudir, soltarG3) e sons.js (somDoTempo).

// o jeito de cada família em cada tempo
const TEMPOS = {
  fogo: { carga: "sobe", estouro: "chamas", reacao: "queimando", rescaldo: "brasas" },
  dragao: { carga: "espiral", estouro: "chamas", reacao: "queimando", rescaldo: "fumaca" },
  agua: { carga: "espiral", estouro: "respingo", reacao: "molhado", rescaldo: "poca" },
  raio: { carga: "faisca", estouro: "estrela", reacao: "eletrizado", rescaldo: "faiscas" },
  gelo: { carga: "suga", estouro: "estilhacos", reacao: "congelado", rescaldo: "cristais" },
  planta: { carga: "espiral", estouro: "folhas", reacao: "folhas", rescaldo: "folhas" },
  inseto: { carga: "suga", estouro: "folhas", reacao: "folhas", rescaldo: "folhas" },
  pedra: { carga: "suga", estouro: "entulho", reacao: "poeira", rescaldo: "entulho" },
  terra: { carga: "suga", estouro: "entulho", reacao: "poeira", rescaldo: "entulho" },
  psiquico: { carga: "espiral", estouro: "aneis", reacao: "tonto", rescaldo: "brilho" },
  fada: { carga: "espiral", estouro: "aneis", reacao: "brilho", rescaldo: "brilho" },
  fantasma: { carga: "sobe", estouro: "fumaca", reacao: "assombrado", rescaldo: "sombra" },
  sombrio: { carga: "suga", estouro: "fumaca", reacao: "assombrado", rescaldo: "sombra" },
  veneno: { carga: "sobe", estouro: "gosma", reacao: "envenenado", rescaldo: "bolhas" },
  aco: { carga: "faisca", estouro: "metal", reacao: "faiscas", rescaldo: "faiscas" },
  voador: { carga: "espiral", estouro: "vento", reacao: "penas", rescaldo: "penas" },
  lutador: { carga: "suga", estouro: "pow", reacao: "poeira", rescaldo: "poeira" },
  normal: { carga: "suga", estouro: "pow", reacao: "poeira", rescaldo: "poeira" },
};
const tempoDe = (tipo) => TEMPOS[familiaDe(tipo)] || TEMPOS.normal;
// a cor da reação (a piscada de quem apanha) e quanto tempo o efeito do tipo fica em volta dele
const REACAO = {
  queimando: { cor: "#ff7a2a", dur: 1.1 }, molhado: { cor: "#4fa8f0", dur: 1 }, eletrizado: { cor: "#ffe94a", dur: 0.9 },
  congelado: { cor: "#bff4ff", dur: 1.2 }, folhas: { cor: "#7ad65a", dur: 0.8 }, poeira: { cor: "#ffffff", dur: 0.5 },
  tonto: { cor: "#ff8fc4", dur: 1 }, brilho: { cor: "#ffd8ec", dur: 0.9 }, assombrado: { cor: "#8a5ad0", dur: 1 },
  envenenado: { cor: "#b45ae0", dur: 1.3 }, faiscas: { cor: "#e8eef8", dur: 0.6 }, penas: { cor: "#e4ecff", dur: 0.7 },
};
// os golpes que acertam sem projétil nem área que estoura: o estouro sai em quem apanhou
const ESTOURO_NO_ALVO = new Set(["corpo", "investida", "combo", "arremesso", "feixe", "cone", "anel", "onda", "zona", "salto"]);
const ENC = { fitas: new Map(), cargas: new Map(), residuos: [], numeros: [], ultimoNumero: new Map() };
const encena = () => modoAtual() !== "naruto";
const quieto = () => movimentoReduzido.matches;

// ---------- 6. som (o pedido; quem toca é sons.js) ----------
function som(etapa, elemento, forca = 1) { if (typeof somDoTempo === "function") somDoTempo(etapa, familiaDe(elemento), forca); }

// ---------- 1. carga ----------
// as partículas vêm de um anel em volta e chegam no bicho na hora (vida = distância / velocidade)
function sugar(x, y, cores, jeito, n, raio = 1.1, dur = 0.18) {
  if (quieto()) return;
  for (let i = 0; i < n; i++) {
    const a = Math.random() * Math.PI * 2, d = raio * (0.6 + Math.random() * 0.4), v = d / dur;
    const gira = jeito === "espiral" ? 1.6 : 0, ax = Math.cos(a + gira), ay = Math.sin(a + gira);
    const z = jeito === "sobe" ? 0.05 : 0.3 + Math.random() * 0.6;
    particula(x + Math.cos(a) * d, y + Math.sin(a) * d * 0.7, {
      z, vx: -ax * v * 0.9, vy: -ay * v * 0.63, vz: jeito === "sobe" ? 2.6 : (0.55 - z) / dur, g: 0, vida: dur, cor: cores[i % cores.length], tam: jeito === "faisca" ? 0.06 : 0.08,
    });
  }
  if (jeito === "faisca") for (let i = 0; i < 3; i++) particula(x + (Math.random() - 0.5) * 0.5, y, { z: 0.6, vx: (Math.random() - 0.5) * 4, vy: (Math.random() - 0.5) * 3, vz: 2, g: 0, vida: 0.08, cor: "#ffffff", tam: 0.05 });
}
function cargaInstantanea(ev, agora) {
  const e = N.snap?.entidades.find((p) => p.id === ev.id);
  if (!e || !encena()) return;
  const P = paletaDe(ev.elemento), T = tempoDe(ev.elemento);
  sugar(e.x, e.y, [P[0], P[1], P[2]], T.carga, 10);
  if (!G3.ok || ev.preparo) return;
  const g = new THREE.Group(); g.position.set(e.x + (e.mira?.x || 0) * 0.35, 0.6, e.y + (e.mira?.y || 0) * 0.35);
  const brilho = brilhoG3(P[1], 0.4, 1), miolo = brilhoG3("#ffffff", 0.2, 1); g.add(brilho, miolo);
  vivo(g, 0.2, (k) => { const s = k < 0.5 ? k * 2 : 1 - (k - 0.5) * 2; brilho.scale.setScalar(0.4 + s * 1.4); miolo.scale.setScalar(0.2 + s * 0.6); brilho.material.opacity = 0.9 * (1 - k); }, agora);
  anelNoChao(e.x, e.y, P[1], 1.1, 0.25, 0.2, agora, 0.05, 0.7);
}
// a carga longa (feixe, sopro, agarrão): o brilho cresce o preparo inteiro, as partículas não param de chegar
function cargasLongas(poses, agora) {
  const vistas = new Set();
  for (const { e } of poses) {
    const pr = e.preparo;
    if (!pr || !e.campo || !encena()) continue;
    const k = Math.min(1, Math.max(0, 1 - pr.t / pr.total)), P = paletaDe(pr.elemento), T = tempoDe(pr.elemento);
    if (Math.random() < 0.7) sugar(e.x, e.y, [P[0], P[1]], T.carga, 1 + Math.round(k * 2), 1.3 - k * 0.4, 0.22);
    if (!G3.ok) continue;
    vistas.add(e.id);
    let c = ENC.cargas.get(e.id);
    if (!c) {
      c = { g: new THREE.Group(), brilho: brilhoG3(P[1], 0.3, 0.9), miolo: malhaG3(G3.geo.esfera, P[0], { somar: true, opacidade: 0.9 }), aro: malhaG3(G3.geo.anel, P[1], { opacidade: 0.7, dupla: true }) };
      c.g.add(c.brilho, c.miolo); G3.cena.scene.add(c.g, c.aro); ENC.cargas.set(e.id, c);
    }
    const m = pr.mira || e.mira || { x: 1, y: 0 }, pulso = quieto() ? 1 : 1 + Math.sin(agora / 40) * 0.12 * k;
    c.g.position.set(e.x + m.x * 0.4, 0.6, e.y + m.y * 0.4);
    c.brilho.scale.setScalar((0.3 + k * 1.6) * pulso); c.miolo.scale.setScalar(0.05 + k * 0.18 * pulso);
    c.aro.position.set(e.x, 0.05, e.y); c.aro.scale.setScalar(1.4 - k * 0.9); c.aro.material.opacity = 0.3 + k * 0.5;
    pedirLuz(P[1], 2 + k * 6, e.x, e.y, 0.8, 60, agora);
  }
  for (const [id, c] of ENC.cargas) if (!vistas.has(id)) { soltarG3(c.g); soltarG3(c.aro); ENC.cargas.delete(id); }
}

// ---------- 2. núcleo ----------
// o miolo branco-quente que pulsa dentro de cada projétil (chamado por atualizarProjeteis3d ao criar)
function nucleoDoProjetil(o, fam, r) {
  if (o.naruto) return;
  const P = PALETA[fam] || PALETA.normal;
  const quente = brilhoG3("#ffffff", r * 2.2, 0.85), cor = brilhoG3(P[1], r * 4, 0.55);
  o.grupo.add(quente, cor);
  const animar = o.animar;
  o.animar = (t, dt) => {
    animar(t, dt);
    const p = quieto() ? 1 : 1 + Math.sin(t * 38) * 0.18;
    quente.scale.setScalar(r * 2.2 * p); cor.scale.setScalar(r * 4 * (2 - p));
  };
}

// ---------- 3. rastro ----------
// uma fita deitada que segue o projétil (ou quem avança), afinando e sumindo na ponta de trás
const PONTOS_FITA = 16;
function novaFita(cor, largura) {
  const geo = new THREE.BufferGeometry(), n = PONTOS_FITA;
  geo.setAttribute("position", new THREE.BufferAttribute(new Float32Array(n * 2 * 3), 3));
  const cores = new Float32Array(n * 2 * 4), c = corG3(cor);
  for (let i = 0; i < n * 2; i++) cores.set([c.r, c.g, c.b, 0], i * 4);
  geo.setAttribute("color", new THREE.BufferAttribute(cores, 4));
  const idx = []; for (let i = 0; i < n - 1; i++) { const a = i * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
  geo.setIndex(idx);
  const mat = new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, depthWrite: false, side: THREE.DoubleSide, blending: G3.claro ? THREE.NormalBlending : THREE.AdditiveBlending });
  const malha = new THREE.Mesh(geo, mat); malha.frustumCulled = false; malha.userData.propria = true;
  G3.cena.scene.add(malha);
  return { malha, pontos: [], largura, vistaEm: 0, some: 0 };
}
function andarFita(f, x, h, y, agora) {
  const ult = f.pontos[0];
  if (!ult || Math.hypot(ult.x - x, ult.y - y) > 0.08) { f.pontos.unshift({ x, h, y }); f.pontos.length = Math.min(f.pontos.length, PONTOS_FITA); }
  else { ult.x = x; ult.y = y; ult.h = h; }
  f.vistaEm = agora;
}
function desenharFita(f, alfa) {
  const pos = f.malha.geometry.attributes.position, col = f.malha.geometry.attributes.color, n = PONTOS_FITA, ps = f.pontos;
  for (let i = 0; i < n; i++) {
    const p = ps[Math.min(i, ps.length - 1)] || { x: 0, h: -5, y: 0 }, q = ps[Math.min(i + 1, ps.length - 1)] || p;
    let dx = p.x - q.x, dy = p.y - q.y; const l = Math.hypot(dx, dy) || 1; dx /= l; dy /= l;
    const k = i / (n - 1), w = f.largura * (1 - k) * (i < ps.length ? 1 : 0);
    pos.setXYZ(i * 2, p.x - dy * w, p.h, p.y + dx * w); pos.setXYZ(i * 2 + 1, p.x + dy * w, p.h, p.y - dx * w);
    const a = alfa * Math.pow(1 - k, 1.4) * (i < ps.length ? 1 : 0);
    col.setW(i * 2, a); col.setW(i * 2 + 1, a);
  }
  pos.needsUpdate = true; col.needsUpdate = true;
}
function rastros(projeteis, poses, agora) {
  if (!G3.ok || !encena() || quieto()) { for (const [id, f] of ENC.fitas) { soltarG3(f.malha); ENC.fitas.delete(id); } return; }
  for (const j of projeteis) {
    const pr = j.pr, chave = "p" + pr.id;
    let f = ENC.fitas.get(chave);
    if (!f) ENC.fitas.set(chave, (f = novaFita(paletaDe(pr.elemento)[1], Math.max(0.08, pr.raio * (pr.classe === "rajada" ? 0.8 : 1.1)))));
    andarFita(f, j.x, 0.45, j.y, agora);
  }
  for (const { e } of poses) if (e.campo && e.dash) { // a investida deixa a fita de quem avança
    const chave = "d" + e.id, el = e.dash.elemento || e.dash.hab?.tipo;
    let f = ENC.fitas.get(chave);
    if (!f) ENC.fitas.set(chave, (f = novaFita(paletaDe(el)[1], 0.32)));
    andarFita(f, e.x, 0.5, e.y, agora);
  }
  // o que parou de andar some em 0,25 s
  for (const [id, f] of ENC.fitas) {
    const parada = (agora - f.vistaEm) / 250;
    if (parada >= 1) { soltarG3(f.malha); ENC.fitas.delete(id); continue; }
    desenharFita(f, 0.85 * (1 - Math.max(0, parada)));
  }
}

// ---------- 4. estouro ----------
// o impacto do jeito da família: chamado por estouro3d (golpes3d.js); dir é para onde o golpe ia
function estouroDaFamilia(f, agora) {
  if (!encena()) return;
  const fam = familiaDe(f.elemento), P = PALETA[fam] || PALETA.normal, forca = f.forca || 1, jeito = (TEMPOS[fam] || TEMPOS.normal).estouro;
  const d = f.dir || { x: 0, y: 0 }, g = new THREE.Group(), pecas = [], fixa = (i) => fixo(f.t * 0.001 + i * 3.17);
  g.position.set(f.x, 0.45, f.y);
  const add = (m, o) => { g.add(m); pecas.push({ m, ...o }); return m; };
  const espalha = (n, fn) => { for (let i = 0; i < n; i++) { const a = (i / n) * Math.PI * 2 + fixa(i) * 0.6; fn(i, Math.cos(a) + d.x * 0.8, Math.sin(a) + d.y * 0.8); } };
  let dur = 0.45, gravidade = 0;
  if (jeito === "chamas") { // línguas de fogo saindo e subindo
    espalha(7, (i, vx, vz) => add(malhaG3(G3.geo.cone, P[1 + (i % 2)], { opacidade: 0.9 }), { vx: vx * 2.2, vz: vz * 2.2, vy: 1.5, s: 0.22, giro: true }));
    dur = 0.4;
  } else if (jeito === "respingo") { // a coroa de gotas
    espalha(10, (i, vx, vz) => add(malhaG3(G3.geo.esfera, P[i % 2 ? 0 : 1], { opacidade: 0.9 }), { vx: vx * 2.4, vz: vz * 2.4, vy: 3.8, s: 0.09 }));
    gravidade = 12; dur = 0.55;
  } else if (jeito === "estrela") { // raios saindo do centro
    espalha(6, (i, vx, vz) => { const m = add(malhaG3(G3.geo.cubo, P[1], { somar: true }), { vx: 0, vz: 0, vy: 0, s: 0, raio: true }); m.rotation.set(0, -Math.atan2(vz, vx), (fixa(i) - 0.5) * 0.8); m.scale.set(1.1 * forca, 0.05, 0.05); });
    dur = 0.22;
  } else if (jeito === "estilhacos") { // cristais de gelo voando
    espalha(8, (i, vx, vz) => add(malhaG3(G3.geo.cristal, P[i % 2], { toon: true }), { vx: vx * 2.8, vz: vz * 2.8, vy: 2.5, s: 0.14, gira: 9 }));
    gravidade = 10; dur = 0.55;
  } else if (jeito === "entulho") { // pedaços de pedra
    espalha(6, (i, vx, vz) => add(malhaG3(G3.geo.pedra, P[1 + (i % 3)], { toon: true }), { vx: vx * 2, vz: vz * 2, vy: 3.4, s: 0.12 + fixa(i) * 0.08, gira: 7 }));
    gravidade = 12; dur = 0.6;
  } else if (jeito === "folhas") { // folhas em redemoinho
    espalha(8, (i, vx, vz) => { const m = add(malhaG3(G3.geo.cristal, P[2 - (i % 2)], { toon: true }), { vx: vx * 2, vz: vz * 2, vy: 1.6, s: 1, gira: 6 }); m.scale.set(0.2, 0.04, 0.1); });
    gravidade = 2; dur = 0.7;
  } else if (jeito === "aneis") { // anéis de energia em pé, abrindo
    for (let i = 0; i < 3; i++) { const m = add(malhaG3(G3.geo.toro, P[i % 2 ? 0 : 1], { somar: true, opacidade: 0.9 }), { vx: 0, vz: 0, vy: 0, s: 0, anel: i }); m.rotation.y = -Math.atan2(d.y, d.x) + Math.PI / 2; }
    dur = 0.45;
  } else if (jeito === "fumaca") { // fumaça escura que incha e some
    espalha(6, (i, vx, vz) => add(malhaG3(G3.geo.esfera, P[2 + (i % 2)], { opacidade: 0.6 }), { vx: vx * 0.9, vz: vz * 0.9, vy: 0.8, s: 0.2, incha: true }));
    if (fam === "sombrio") { const lua = add(malhaG3(G3.geo.lua, P[3], { toon: true }), { vx: 0, vz: 0, vy: 0, s: 0.6, gira: 14 }); lua.rotation.x = Math.PI / 2; }
    dur = 0.55;
  } else if (jeito === "gosma") { // respingos achatados
    espalha(7, (i, vx, vz) => add(malhaG3(G3.geo.esfera, P[1 + (i % 2)], { opacidade: 0.95 }), { vx: vx * 2.2, vz: vz * 2.2, vy: 2.6, s: 0.12, achata: true }));
    gravidade = 11; dur = 0.55;
  } else if (jeito === "metal") { // faíscas de metal riscando
    espalha(10, (i, vx, vz) => { const m = add(malhaG3(G3.geo.cubo, i % 2 ? "#ffffff" : "#ffd36a", { somar: true }), { vx: vx * 4.5, vz: vz * 4.5, vy: 2.5, s: 1 }); m.scale.set(0.22, 0.025, 0.025); m.rotation.y = -Math.atan2(vz, vx); });
    gravidade = 9; dur = 0.35;
  } else if (jeito === "vento") { // rajadas abrindo deitadas
    for (let i = 0; i < 3; i++) { const m = add(malhaG3(G3.geo.vento, P[i ? 1 : 0], { opacidade: 0.85, dupla: true }), { vx: 0, vz: 0, vy: 0, s: 0, vento: i }); m.rotation.set(Math.PI / 2, 0, i * 2.1); }
    dur = 0.45;
  } else { // pow: a estrela do soco e os traços de velocidade
    const estrela = add(malhaG3(G3.geo.cristal, P[0], { somar: true }), { vx: 0, vz: 0, vy: 0, s: 0, pow: true }); estrela.rotation.y = -Math.atan2(d.y, d.x);
    espalha(6, (i, vx, vz) => { const m = add(malhaG3(G3.geo.cubo, "#ffffff", { somar: true }), { vx: vx * 5, vz: vz * 5, vy: 0, s: 1 }); m.scale.set(0.3, 0.03, 0.03); m.rotation.y = -Math.atan2(vz, vx); });
    dur = 0.25;
  }
  vivo(g, dur, (k, idade) => {
    for (const p of pecas) {
      const m = p.m;
      if (p.raio) { m.material.opacity = (Math.floor(k * 8) % 2 ? 0.4 : 1) * (1 - k); continue; }
      if (p.anel != null) { const s = (0.3 + k * 1.6 + p.anel * 0.25) * forca; m.scale.set(s, s, s); m.material.opacity = 0.9 * (1 - k); continue; }
      if (p.vento != null) { const s = (0.4 + k * 1.8) * forca; m.scale.setScalar(s); m.rotation.z = p.vento * 2.1 + k * 4; m.material.opacity = 0.85 * (1 - k); continue; }
      if (p.pow) { const s = k < 0.3 ? k / 0.3 : 1 - (k - 0.3) / 0.7; m.scale.set(0.9 * s * forca, 0.9 * s * forca, 0.12); m.material.opacity = 1 - k; continue; }
      m.position.set(p.vx * idade * forca, Math.max(-0.4, p.vy * idade - gravidade * idade * idade / 2), p.vz * idade * forca);
      if (p.gira) m.rotation.set(idade * p.gira, idade * p.gira * 0.7, 0);
      if (p.giro) { m.rotation.z = -Math.atan2(p.vy, Math.hypot(p.vx, p.vz)) + Math.PI / 2; m.rotation.y = -Math.atan2(p.vz, p.vx); }
      if (p.s && p.s < 1) {
        const s = p.s * forca * (p.incha ? 1 + k * 2.5 : p.giro ? 1 - k * 0.8 : 1);
        if (p.achata) m.scale.set(s * (1 + k), s * (1 - k * 0.6), s * (1 + k)); else if (!p.giro) m.scale.setScalar(s); else m.scale.set(s, s * 2.4, s);
      }
      if (m.material.transparent) m.material.opacity = Math.min(m.material.opacity, (p.incha ? 0.6 : 1) * (1 - k * k));
    }
  }, agora);
  anelNoChao(f.x, f.y, P[1], 0.25, 1.4 * Math.min(1.6, 0.7 + forca * 0.4), 0.3, agora, 0.05, 0.8);
}

// ---------- 5. reação ----------
// quem apanha: a piscada na cor do golpe, o tremor e o efeito do tipo; os dois bichos congelam um instante (hit-stop)
function reagir(ev, agora) {
  const alvo = N.snap?.entidades.find((p) => p.id === ev.em);
  const T = tempoDe(ev.elemento), R = REACAO[T.reacao] || REACAO.poeira;
  const fracao = alvo ? Math.min(1, ev.dano / Math.max(1, alvo.max)) : 0.1;
  const forte = ev.crit || ev.eff > 1 || fracao > 0.18;
  const v = visualDe(ev.em);
  v.reacao = { t: agora, jeito: T.reacao, cor: R.cor, dur: ev.bloqueado ? 0.25 : R.dur, forca: Math.min(1, 0.35 + fracao * 3 + (ev.crit ? 0.3 : 0)), fam: familiaDe(ev.elemento) };
  // o hit-stop: mais longo no golpe forte (só no desenho; o servidor não para)
  if (!quieto() && !ev.bloqueado) {
    const pausa = forte ? 95 : 45;
    v.parado = agora + pausa;
    if (ev.de && ev.classe && !["projetil", "teleguiado", "bumerangue", "rajada", "bomba", "area", "feixe", "zona"].includes(ev.classe)) visualDe(ev.de).parado = agora + pausa;
  }
  if (alvo && ESTOURO_NO_ALVO.has(ev.classe)) {
    const de = N.snap?.entidades.find((p) => p.id === ev.de), l = de ? Math.hypot(alvo.x - de.x, alvo.y - de.y) || 1 : 1;
    estouro(ev.elemento, alvo.x, alvo.y, (ev.crit ? 1.2 : 0.55) + fracao * 1.5, null, de ? { x: (alvo.x - de.x) / l, y: (alvo.y - de.y) / l } : null);
  }
  if (forte && G3.ok) sacudir(Math.min(0.7, 0.25 + fracao * 2), ev.crit ? 0.5 : 0.2);
}
// o efeito do tipo em volta de quem acabou de apanhar
function efeitosDeReacao(poses, agora) {
  if (quieto()) return;
  for (const { e, v } of poses) {
    const r = v.reacao;
    if (!r || !e.campo) continue;
    const idade = (agora - r.t) / 1000;
    if (idade < 0 || idade > r.dur) continue;
    const P = PALETA[r.fam] || PALETA.normal, k = 1 - idade / r.dur, x = e.x + (Math.random() - 0.5) * 0.6, y = e.y + (Math.random() - 0.5) * 0.3, rnd = Math.random;
    if (rnd() > 0.55 * k * (0.5 + r.forca)) continue;
    const j = r.jeito;
    if (j === "queimando") particula(x, y, { z: 0.3 + rnd() * 0.6, vx: (rnd() - 0.5) * 0.4, vz: 1.6, g: -1, vida: 0.5, cor: P[rnd() < 0.5 ? 1 : 2], tam: 0.08 });
    else if (j === "molhado") particula(x, y, { z: 0.9 + rnd() * 0.3, vz: 0, g: 9, vida: 0.45, cor: P[rnd() < 0.5 ? 0 : 1], tam: 0.06, quica: 0 });
    else if (j === "eletrizado") { for (let i = 0; i < 2; i++) particula(e.x + (rnd() - 0.5) * 0.9, e.y, { z: 0.2 + rnd() * 0.9, vx: (rnd() - 0.5) * 5, vy: (rnd() - 0.5) * 3, vz: (rnd() - 0.5) * 3, g: 0, vida: 0.07, cor: rnd() < 0.5 ? "#ffffff" : P[1], tam: 0.05 }); }
    else if (j === "congelado") particula(x, y, { z: 0.05 + rnd() * 0.9, vz: 0.3, g: 0.5, vida: 0.6, cor: rnd() < 0.5 ? "#ffffff" : P[1], tam: 0.06 });
    else if (j === "envenenado") particula(x, y, { z: 0.3 + rnd() * 0.5, vz: 1, g: -0.6, vida: 0.6, cor: P[rnd() < 0.5 ? 1 : 2], tam: 0.07 + rnd() * 0.04 });
    else if (j === "tonto" || j === "brilho") { const a = agora / 120 + rnd() * 6; particula(e.x + Math.cos(a) * 0.5, e.y + Math.sin(a) * 0.3, { z: 1.2, vz: 0.2, g: 0, vida: 0.3, cor: P[rnd() < 0.5 ? 0 : 1], tam: 0.06 }); }
    else if (j === "assombrado") particula(x, y, { z: 0.4 + rnd() * 0.6, vz: 0.7, g: -0.8, vida: 0.7, cor: P[2], tam: 0.1, atrito: 2 });
    else if (j === "folhas" || j === "penas") particula(x, y, { z: 1 + rnd() * 0.3, vx: (rnd() - 0.5) * 1.2, vz: 0.4, g: 1.2, vida: 0.8, cor: P[j === "penas" ? 0 : 2], tam: 0.08, atrito: 2.5 });
    else if (j === "faiscas") particula(x, y, { z: 0.5, vx: (rnd() - 0.5) * 3, vz: 1.5, g: 8, vida: 0.25, cor: "#ffe9a0", tam: 0.05 });
    else if (idade < 0.2) particula(x, y, { z: 0.05, vx: (rnd() - 0.5) * 1.5, vz: 0.8, g: 4, vida: 0.35, cor: "#d8dcd2", tam: 0.1 });
  }
}
// para animacao.js: a piscada (branco no começo, depois a cor do golpe) e o tremor de quem apanhou
function reacaoNaPose(v, agora) {
  const r = v.reacao;
  if (!r) return null;
  const idade = agora - r.t;
  if (idade < 0 || idade > 260) return null;
  const k = 1 - idade / 260;
  return { cor: idade < 60 ? "#ffffff" : r.cor, alfa: idade < 60 ? 1 : 0.55 * k * (0.6 + r.forca * 0.4), treme: quieto() ? 0 : Math.sin(idade / 14) * 0.06 * k * (0.5 + r.forca) };
}

// ---------- 7. rescaldo ----------
// o que fica depois do impacto, por um ou dois segundos
function deixarRescaldo(elemento, x, y, forca) {
  if (!encena()) return;
  const fam = familiaDe(elemento), jeito = (TEMPOS[fam] || TEMPOS.normal).rescaldo, r = { fam, jeito, x, y, forca: Math.min(1.6, forca), t0: relogio.agora(), dur: 1.2 + forca * 0.9, pecas: null };
  ENC.residuos.push(r);
  while (ENC.residuos.length > 14) { const velho = ENC.residuos.shift(); if (velho.pecas) soltarG3(velho.pecas); }
}
function rescaldos(agora) {
  for (let i = ENC.residuos.length - 1; i >= 0; i--) {
    const r = ENC.residuos[i], idade = (agora - r.t0) / 1000, k = idade / r.dur;
    if (k >= 1 || idade < 0) { if (k >= 1) { if (r.pecas) soltarG3(r.pecas); ENC.residuos.splice(i, 1); } continue; }
    const P = PALETA[r.fam] || PALETA.normal, rnd = Math.random, x = r.x + (rnd() - 0.5) * 0.7 * r.forca, y = r.y + (rnd() - 0.5) * 0.5 * r.forca;
    // as peças 3D: chaminhas, cristais e pedrinhas no chão que encolhem até sumir
    if (G3.ok && !r.pecas && ["brasas", "cristais", "entulho"].includes(r.jeito)) {
      r.pecas = new THREE.Group(); r.pecas.position.set(r.x, 0, r.y);
      for (let n = 0; n < 4; n++) {
        const a = n * 1.7 + r.t0, d = 0.2 + fixo(r.t0 + n) * 0.4 * r.forca;
        const m = r.jeito === "brasas" ? malhaG3(G3.geo.cone, P[1 + (n % 2)], { opacidade: 0.9 }) : r.jeito === "cristais" ? malhaG3(G3.geo.cristal, P[n % 2], { toon: true }) : malhaG3(G3.geo.pedra, P[1 + (n % 3)], { toon: true });
        m.position.set(Math.cos(a) * d, 0, Math.sin(a) * d); m.userData.base = r.jeito === "entulho" ? 0.08 + fixo(n) * 0.06 : 0.1;
        if (r.jeito === "cristais") m.rotation.set((fixo(n) - 0.5) * 0.8, n, (fixo(n * 3) - 0.5) * 0.8);
        r.pecas.add(m);
      }
      G3.cena.scene.add(r.pecas);
    }
    if (r.pecas) r.pecas.children.forEach((m, n) => {
      const b = m.userData.base, s = b * (1 - k);
      if (r.jeito === "brasas") { const pisca = quieto() ? 1 : 0.7 + Math.sin(agora / 50 + n * 2) * 0.3; m.scale.set(s, s * 2.6 * pisca, s); m.position.y = s * 1.3 * pisca; }
      else if (r.jeito === "cristais") { m.scale.set(s * 0.8, s * 2.5, s * 0.8); m.position.y = s; }
      else { m.scale.setScalar(b); m.position.y = b * 0.5 - k * b * 1.2; }
    });
    if (quieto() || rnd() > 0.35 * (1 - k) * r.forca) continue;
    const j = r.jeito;
    if (j === "brasas") particula(x, y, { z: 0.05, vz: 0.9, g: -0.5, vida: 0.7, cor: rnd() < 0.5 ? "#6e6a66" : P[2], tam: 0.1, atrito: 1 });
    else if (j === "fumaca" || j === "poeira") particula(x, y, { z: 0.1, vz: 0.6, g: -0.4, vida: 0.8, cor: j === "fumaca" ? "#5c5560" : "#d8d2c4", tam: 0.13, atrito: 1.5 });
    else if (j === "poca") particula(x, y, { z: 0.02, vz: 1.2, g: 9, vida: 0.3, cor: P[0], tam: 0.05, quica: 0 });
    else if (j === "faiscas") { if (rnd() < 0.4) for (let n = 0; n < 3; n++) particula(x, y, { z: 0.05, vx: (rnd() - 0.5) * 4, vy: (rnd() - 0.5) * 3, vz: 1.5, g: 9, vida: 0.12, cor: n ? P[1] : "#ffffff", tam: 0.04 }); }
    else if (j === "folhas" || j === "penas") particula(x, y, { z: 0.6, vx: (rnd() - 0.5) * 0.8, vz: 0.1, g: 0.9, vida: 1, cor: P[j === "penas" ? 0 : 2], tam: 0.08, atrito: 3 });
    else if (j === "bolhas") particula(x, y, { z: 0.02, vz: 0.8, g: -0.2, vida: 0.5, cor: P[1], tam: 0.06 + rnd() * 0.05 });
    else if (j === "brilho") particula(x, y, { z: 0.2 + rnd() * 0.6, vz: 0.3, g: 0, vida: 0.4, cor: rnd() < 0.5 ? "#ffffff" : P[0], tam: 0.05 });
    else if (j === "sombra") particula(x, y, { z: 0.1, vz: 0.5, g: -0.3, vida: 0.9, cor: P[3], tam: 0.12, atrito: 2 });
    else if (j === "cristais" && rnd() < 0.3) particula(x, y, { z: 0.15, vz: 0.4, g: 1, vida: 0.5, cor: "#ffffff", tam: 0.04 });
  }
}

// ---------- 8. números de dano ----------
// golpes seguidos no mesmo alvo (rajada, combo, redemoinho) somam no mesmo número
const JUNTA_MS = 380;
function novoNumero(ev, agora) {
  const tipo = ev.tipo === "cura" ? "cura" : ev.tipo === "imune" ? "imune" : "dano", id = ev.em || ev.id;
  const ultimo = ENC.ultimoNumero.get(id);
  if (tipo === "dano" && ultimo && ultimo.tipo === "dano" && agora - ultimo.ult < JUNTA_MS && !!ultimo.bloqueado === !!ev.bloqueado) {
    ultimo.valor += ev.dano; ultimo.n++; ultimo.ult = agora; ultimo.pop = agora;
    ultimo.eff = Math.max(ultimo.eff, ev.eff); ultimo.crit = ultimo.crit || ev.crit;
    return ultimo;
  }
  // os que já estão no ar sobre o mesmo bicho: o novo vai para o outro lado e um degrau acima
  const juntos = ENC.numeros.filter((x) => x.id === id).length, lado = juntos % 2 ? 1 : -1, degrau = juntos % 3;
  const e = N.snap?.entidades.find((p) => p.id === id);
  const n = { id, tipo, valor: tipo === "cura" ? 0 : ev.dano || 0, eff: ev.eff ?? 1, crit: !!ev.crit, bloqueado: !!ev.bloqueado, n: 1, t: agora, ult: agora, pop: agora, lado, degrau, x: e?.x ?? 0, y: e?.y ?? 0 };
  ENC.numeros.push(n); ENC.ultimoNumero.set(id, n);
  if (ENC.numeros.length > 24) ENC.numeros.shift();
  return n;
}
// o jeito do número: texto, cor, tamanho (em casas) e a legenda embaixo
function jeitoDoNumero(n) {
  if (n.tipo === "cura") return { texto: "+", cor: "#2fa865", tam: 0.7, legenda: null };
  if (n.tipo === "imune") return { texto: "Imune", cor: "#7d8a86", tam: 0.5, legenda: null };
  const vezes = n.n > 1 ? ` ×${n.n}` : "";
  if (n.bloqueado) return { texto: String(n.valor) + vezes, cor: "#5c97b8", tam: 0.5, legenda: "bloqueado" };
  if (n.crit) return { texto: String(n.valor) + vezes, cor: "#f2b51e", tam: 0.95 + (n.eff > 1 ? 0.2 : 0), legenda: n.eff > 1 ? "Crítico! Super efetivo!" : "Crítico!" };
  if (n.eff > 1) return { texto: String(n.valor) + vezes, cor: "#f2662a", tam: 0.9, legenda: "Super efetivo!" };
  if (n.eff > 0 && n.eff < 1) return { texto: String(n.valor) + vezes, cor: "#8b9692", tam: 0.58, legenda: "Pouco efetivo" };
  return { texto: String(n.valor) + vezes, cor: "#c23a52", tam: 0.66, legenda: null };
}
// o salto do número: cresce passando do ponto e assenta (0 → 1,35 → 1)
function saltoDoNumero(idade) {
  if (idade < 0.07) return 0.3 + (idade / 0.07) * 1.05;
  if (idade < 0.16) return 1.35 - ((idade - 0.07) / 0.09) * 0.35;
  return 1;
}
function desenharNumeros(poses, agora) {
  const calmo = quieto();
  for (let i = ENC.numeros.length - 1; i >= 0; i--) {
    const n = ENC.numeros[i], idade = (agora - n.t) / 1000, vida = n.crit || n.eff > 1 ? 1.25 : 1;
    if (idade > vida) { ENC.numeros.splice(i, 1); if (ENC.ultimoNumero.get(n.id) === n) ENC.ultimoNumero.delete(n.id); continue; }
    if (idade < 0) continue;
    const pose = poses.find((p) => p.e.id === n.id);
    if (pose && pose.visivel) { n.x = pose.wx; n.y = pose.wy; }
    const J = jeitoDoNumero(n), s = escalaEm(n.x, n.y), sobe = calmo ? 0 : idade * 0.9;
    const p = pontoTela(n.x, n.y, 1.8 + sobe + n.degrau * 0.55), lado = (calmo ? 0.15 : 0.15 + idade * 0.45) * n.lado * s * (n.degrau ? 1 : 0.3);
    const salto = calmo ? 1 : saltoDoNumero((agora - n.pop) / 1000);
    const tam = Math.max(8, s * J.tam * salto), treme = !calmo && n.crit && idade < 0.2 ? Math.sin(idade * 140) * s * 0.05 : 0;
    ctx.save();
    ctx.globalAlpha = Math.min(1, (vida - idade) / 0.3);
    ctx.font = `800 ${Math.round(tam)}px ui-monospace,monospace`; ctx.textAlign = "center"; ctx.lineJoin = "round";
    ctx.lineWidth = Math.max(2, tam * 0.18); ctx.strokeStyle = "#1c2420";
    const x = Math.round(p.x + lado + treme), y = Math.round(p.y);
    ctx.strokeText(J.texto, x, y); ctx.fillStyle = J.cor; ctx.fillText(J.texto, x, y);
    if (J.legenda) {
      const t2 = Math.max(7, s * 0.3);
      ctx.font = `700 ${Math.round(t2)}px system-ui,sans-serif`; ctx.lineWidth = Math.max(2, t2 * 0.25);
      ctx.strokeText(J.legenda, x, y + t2 * 1.15); ctx.fillStyle = J.cor; ctx.fillText(J.legenda, x, y + t2 * 1.15);
    }
    ctx.restore();
  }
}

// ---------- os ganchos ----------
// cada evento do servidor (chamado por efeitoVisual, desenho.js)
function encenarEvento(ev, agora) {
  if (ev.tipo === "golpe" && ev.classe !== "reforco" && ev.classe !== "cura" && ev.classe !== "nada") {
    cargaInstantanea(ev, agora);
    som(ev.preparo ? "carga" : "disparo", ev.elemento, ev.preparo ? 1.4 : 1);
  } else if (ev.tipo === "tiro") som("disparo", ev.elemento, 0.5);
  else if (ev.tipo === "area" && ["feixe", "cone", "anel", "onda"].includes(ev.forma)) som("disparo", ev.elemento, 1.3);
  else if (ev.tipo === "impacto") { deixarRescaldo(ev.elemento, ev.x, ev.y, ev.classe === "rajada" ? 0.3 : 0.6); som("impacto", ev.elemento, ev.classe === "rajada" ? 0.4 : 0.8); }
  else if (ev.tipo === "explosao") { deixarRescaldo(ev.elemento, ev.x, ev.y, 1.3); som("impacto", ev.elemento, 1.4); }
  else if (ev.tipo === "aterrissou") deixarRescaldo(ev.elemento, ev.x, ev.y, 1);
  else if (ev.tipo === "dano") {
    if (ev.dano > 0) reagir(ev, agora);
    novoNumero(ev, agora);
    if (ESTOURO_NO_ALVO.has(ev.classe)) som("impacto", ev.elemento, ev.crit ? 1.4 : 1);
    if (ev.eff > 1 && !ev.bloqueado) som("super", ev.elemento, 1); else if (ev.eff > 0 && ev.eff < 1) som("fraco", ev.elemento, 1);
    if (ev.crit) som("critico", ev.elemento, 1);
  } else if (ev.tipo === "cura" || ev.tipo === "imune") novoNumero(ev, agora);
}
// a cada quadro (chamado por desenhar, desenho.js)
function encenarQuadro(agora, poses, projeteis) {
  cargasLongas(poses, agora);
  rastros(projeteis, poses, agora);
  efeitosDeReacao(poses, agora);
  rescaldos(agora);
}
function limparEncenacao() {
  for (const f of ENC.fitas.values()) if (f.malha.parent) soltarG3(f.malha);
  for (const c of ENC.cargas.values()) { soltarG3(c.g); soltarG3(c.aro); }
  for (const r of ENC.residuos) if (r.pecas) soltarG3(r.pecas);
  ENC.fitas.clear(); ENC.cargas.clear(); ENC.residuos.length = 0; ENC.numeros.length = 0; ENC.ultimoNumero.clear();
}
