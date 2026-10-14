// Os golpes com volume, dentro da cena 3D (cena3d.js). Tudo só visual: nasce dos mesmos eventos que o navegador já
// recebe (a lista efeitos de desenho.js e os projéteis do último pacote), sem mudar dano nem acerto.
// - Projéteis: um desenho 3D por família de tipo (bola de fogo com casca e brasas, raio que pisca em zigue-zague,
//   folhas girando, cristais de gelo, pedra rolando, anéis psíquicos, fantasminha com olhos...), virado para onde vai,
//   com o rastro de partículas e, nos que brilham, uma luz que acende o chão por onde passa.
// - Estouros, cortes do corpo a corpo, golpes de área (coluna de fogo, raio do céu, gêiser, espinhos de gelo e de
//   planta, pedras voando, cúpula de energia), as pedras caindo no aviso e os anéis de esquiva, cura e troca.
// - As partículas de animacao.js (poeira, terra, gotas, brasas...) viram cubinhos 3D de verdade.
// - A câmera reage: treme nos golpes fortes e dá um "soco" de aproximação nos críticos, desmaios e explosões. Com
//   menos movimento no sistema, nada disso (e o clarão do raio também não).
// Usa as peças de golpes.js (familiaDe, PALETA), de animacao.js (PARTICULAS, particula, espalhar) e de cena3d.js.
const G3 = { ok: false, projeteis: new Map(), vivos: [], pedras: new Map(), bombas: new Map(), luzes: [], sacudida: 0, soco: 0, clarao: 0, cores: new Map() };
const BRILHAM = new Set(["fogo", "dragao", "raio", "psiquico", "fada", "fantasma", "gelo", "agua", "veneno"]);
const corG3 = (hex) => { let c = G3.cores.get(hex); if (!c) G3.cores.set(hex, (c = new THREE.Color(hex))); return c; };

function montarGolpes3d(c) {
  const geo = {
    esfera: new THREE.IcosahedronGeometry(1, 2), bola: new THREE.IcosahedronGeometry(1, 1), pedra: new THREE.DodecahedronGeometry(1, 0),
    cristal: new THREE.OctahedronGeometry(1, 0), cubo: new THREE.BoxGeometry(1, 1, 1), anel: new THREE.RingGeometry(0.8, 1, 48),
    cone: new THREE.ConeGeometry(1, 1, 12), tubo: new THREE.CylinderGeometry(1, 1, 1, 24, 1, true), toro: new THREE.TorusGeometry(1, 0.07, 6, 40),
    corte: new THREE.TorusGeometry(1, 0.08, 4, 32, Math.PI * 0.75), lua: new THREE.TorusGeometry(0.8, 0.22, 8, 28, Math.PI * 1.35),
    vento: new THREE.TorusGeometry(1, 0.05, 4, 28, Math.PI * 0.7), cupula: new THREE.SphereGeometry(1, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2),
  };
  geo.anel.rotateX(-Math.PI / 2); geo.corte.rotateX(Math.PI / 2); geo.corte.rotateY(Math.PI * 0.375);
  // o brilho: um degradê redondo, somado por cima (fica bonito em volta do que brilha)
  const cvBrilho = document.createElement("canvas"); cvBrilho.width = cvBrilho.height = 64;
  const gc = cvBrilho.getContext("2d"), grad = gc.createRadialGradient(32, 32, 0, 32, 32, 32);
  grad.addColorStop(0, "rgba(255,255,255,1)"); grad.addColorStop(0.35, "rgba(255,255,255,.45)"); grad.addColorStop(1, "rgba(255,255,255,0)");
  gc.fillStyle = grad; gc.fillRect(0, 0, 64, 64);
  const texBrilho = new THREE.CanvasTexture(cvBrilho); texBrilho.colorSpace = THREE.SRGBColorSpace;
  // as partículas: uma malha instanciada, um cubinho por partícula
  const cubinhos = new THREE.InstancedMesh(geo.cubo, new THREE.MeshBasicMaterial({ color: 0xffffff }), PARTICULAS.length);
  cubinhos.instanceMatrix.setUsage(THREE.DynamicDrawUsage); cubinhos.frustumCulled = false;
  for (let i = 0; i < PARTICULAS.length; i++) { cubinhos.setMatrixAt(i, new THREE.Matrix4().makeScale(0, 0, 0)); cubinhos.setColorAt(i, corG3("#ffffff")); }
  c.scene.add(cubinhos);
  // as luzes dos golpes: sempre as mesmas três (trocar quantas luzes há faria os materiais recompilarem)
  for (let i = 0; i < 3; i++) { const luz = new THREE.PointLight(0xffffff, 0, 7, 1.6); luz.position.set(0, -5, 0); c.scene.add(luz); G3.luzes.push({ luz, ate: 0, forca: 0, total: 1 }); }
  Object.assign(G3, { ok: true, cena: c, geo, texBrilho, cubinhos, m: new THREE.Matrix4(), q: new THREE.Quaternion(), v: new THREE.Vector3(), e: new THREE.Vector3() });
}

// ---------- peças ----------
// somar (mistura aditiva) só nos temas escuros: no chão claro o que é somado vira branco e some
function malhaG3(geometria, cor, o = {}) {
  if (G3.claro && o.somar) o = { ...o, somar: false, opacidade: Math.min(1, (o.opacidade ?? 1) * 1.4) };
  const mat = o.toon ? new THREE.MeshToonMaterial({ color: corG3(cor), gradientMap: G3.cena.degrade, transparent: o.opacidade != null, opacity: o.opacidade ?? 1 })
    : new THREE.MeshBasicMaterial({ color: corG3(cor), transparent: true, opacity: o.opacidade ?? 1, blending: o.somar ? THREE.AdditiveBlending : THREE.NormalBlending, depthWrite: !o.somar && o.opacidade == null, side: o.dupla ? THREE.DoubleSide : THREE.FrontSide });
  const m = new THREE.Mesh(geometria, mat);
  if (o.escala != null) m.scale.setScalar(o.escala);
  return m;
}
// no chão claro, o brilho somado estoura em branco: fica mais fraco (G3.claro, medido em renderizar3d pelo tema)
function brilhoG3(cor, tamanho, opacidade = 0.8) {
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: G3.texBrilho, color: corG3(cor), transparent: true, opacity: opacidade * (G3.claro ? 0.4 : 1), blending: THREE.AdditiveBlending, depthWrite: false }));
  s.scale.setScalar(tamanho); return s;
}
function soltarG3(obj) {
  obj.traverse((o) => { if (o.material) o.material.dispose(); if (o.userData && o.userData.propria) o.geometry.dispose(); });
  obj.removeFromParent();
}
// uma luz por um tempo (ou por um quadro, para o que anda): fica com a que está mais perto de acabar
function pedirLuz(cor, forca, x, y, h, dur, agora) {
  if (cena3d.leve) return;
  if (G3.claro) forca *= 0.3; // no chão claro, a luz estoura em branco
  const l = G3.luzes.reduce((a, b) => (a.ate - agora) * a.forca < (b.ate - agora) * b.forca ? a : b);
  if (l.ate > agora && l.forca > forca * 1.5) return;
  l.luz.color.copy(corG3(cor)); l.luz.position.set(x, h, y); Object.assign(l, { ate: agora + dur, forca, total: dur });
}
function sacudir(forca, soco = 0) {
  if (movimentoReduzido.matches) return;
  G3.sacudida = Math.min(1, Math.max(G3.sacudida, forca)); G3.soco = Math.min(1, Math.max(G3.soco, soco));
}

// ---------- projéteis ----------
// cada um devolve { grupo, animar(t, dt) }; o grupo olha para +x (girado na direção do tiro)
function montarProjetil(fam, r) {
  const P = PALETA[fam], g = new THREE.Group(), pecas = [];
  const add = (m) => { g.add(m); pecas.push(m); return m; };
  let animar = () => {};
  if (fam === "fogo" || fam === "dragao") {
    const casca = add(malhaG3(G3.geo.bola, P[1], { opacidade: 0.85, escala: r * 1.25 }));
    add(malhaG3(G3.geo.esfera, P[0], { escala: r * 0.75 }));
    const cauda = [1, 2, 3, 4].map((i) => add(malhaG3(G3.geo.bola, P[Math.min(3, i)], { opacidade: 0.85 - i * 0.15, escala: r * (1.1 - i * 0.2) })));
    add(brilhoG3(P[1], r * 7, 0.7));
    animar = (t) => {
      casca.scale.setScalar(r * (1.2 + Math.sin(t * 40) * 0.12)); casca.rotation.set(t * 9, t * 7, 0);
      cauda.forEach((m, i) => { m.position.set(-(i + 1) * r * 0.9, Math.sin(t * 30 + i * 1.7) * r * 0.25, Math.cos(t * 26 + i) * r * 0.2); });
    };
  } else if (fam === "agua") {
    add(malhaG3(G3.geo.esfera, P[2], { opacidade: 0.85, escala: r * 1.1 }));
    const miolo = add(malhaG3(G3.geo.esfera, P[1], { escala: r * 0.7 }));
    add(malhaG3(G3.geo.esfera, "#ffffff", { escala: r * 0.22 })).position.set(r * 0.35, r * 0.45, r * 0.3);
    const gotas = [1, 2].map((i) => add(malhaG3(G3.geo.esfera, P[1 + (i % 2)], { opacidade: 0.8, escala: r * (0.45 - i * 0.12) })));
    add(brilhoG3(P[1], r * 5, 0.35));
    animar = (t) => { miolo.scale.set(r * (0.7 + Math.sin(t * 25) * 0.06), r * 0.7, r * 0.7); gotas.forEach((m, i) => m.position.set(-(i + 1) * r * 1.3, Math.sin(t * 20 + i) * r * 0.3, 0)); };
  } else if (fam === "raio") {
    add(malhaG3(G3.geo.esfera, P[0], { escala: r * 0.6 }));
    const riscos = Array.from({ length: 6 }, () => add(malhaG3(G3.geo.cubo, G3.claro ? P[2] : P[1], { somar: true })));
    const halo = add(brilhoG3(P[1], r * 8, 0.9));
    animar = (t) => {
      const quadro = Math.floor(t * 18);
      let x = r * 0.4, y = 0, z = 0;
      riscos.forEach((m, i) => { // o zigue-zague muda a cada quadro
        const nx = x - r * 0.75, ny = (fixo(quadro * 7 + i) - 0.5) * r * 1.8, nz = (fixo(quadro * 3 + i * 5) - 0.5) * r * 1.4;
        m.position.set((x + nx) / 2, (y + ny) / 2, (z + nz) / 2);
        m.scale.set(Math.hypot(nx - x, ny - y, nz - z), r * 0.16, r * 0.16);
        m.rotation.set(0, -Math.atan2(nz - z, nx - x), Math.atan2(ny - y, Math.hypot(nx - x, nz - z)));
        x = nx; y = ny; z = nz;
      });
      halo.material.opacity = quadro % 2 ? 0.95 : 0.55;
    };
  } else if (fam === "planta" || fam === "inseto") {
    if (fam === "inseto") {
      add(malhaG3(G3.geo.cone, P[2], { toon: true })).scale.set(r * 0.7, r * 1.6, r * 0.7);
      pecas[0].rotation.z = -Math.PI / 2;
      const asas = [-1, 1].map((s) => { const a = add(malhaG3(G3.geo.esfera, P[0], { opacidade: 0.55, somar: true })); a.scale.set(r * 0.5, r * 0.08, r * 0.9); a.position.set(-r * 0.2, r * 0.3, s * r * 0.6); return a; });
      animar = (t) => asas.forEach((a, i) => { a.rotation.x = (i ? 1 : -1) * Math.sin(t * 70) * 0.7; });
    } else {
      const folhas = [0, 1, 2].map(() => { const f = add(malhaG3(G3.geo.cristal, P[2], { toon: true })); f.scale.set(r * 1.1, r * 0.18, r * 0.5); return f; });
      add(malhaG3(G3.geo.esfera, P[0], { somar: true, opacidade: 0.6, escala: r * 0.4 }));
      animar = (t) => folhas.forEach((f, k) => { const a = t * 14 + k * 2.09; f.position.set(0, Math.cos(a) * r * 0.85, Math.sin(a) * r * 0.85); f.rotation.set(a, a * 2, 0); });
    }
  } else if (fam === "gelo") {
    const nucleo = new THREE.Group(); add(nucleo);
    for (let k = 0; k < 3; k++) { const c = malhaG3(G3.geo.cristal, k ? P[1] : P[0]); c.scale.set(r * 0.32, r * 1.3, r * 0.32); c.rotation.z = (k * Math.PI) / 3; nucleo.add(c); }
    add(brilhoG3(P[2], r * 6, 0.6));
    animar = (t) => nucleo.rotation.set(t * 6, t * 3, 0);
  } else if (fam === "aco") {
    const estrela = new THREE.Group(); add(estrela);
    for (let k = 0; k < 2; k++) { const c = malhaG3(G3.geo.cristal, P[1 + k], { toon: true }); c.scale.set(r * 1.4, r * 0.14, r * 0.4); c.rotation.y = (k * Math.PI) / 2; estrela.add(c); }
    animar = (t) => { estrela.rotation.y = t * 30; };
  } else if (fam === "pedra" || fam === "terra") {
    const rocha = add(malhaG3(G3.geo.pedra, P[2], { toon: true, escala: r * 1.15 }));
    animar = (t) => rocha.rotation.set(t * 8, t * 5, t * 3);
  } else if (fam === "psiquico") {
    add(malhaG3(G3.geo.esfera, P[2], { escala: r * 0.55 })); add(malhaG3(G3.geo.esfera, P[0], { escala: r * 0.3 }));
    const aneis = [0, 1].map((k) => add(malhaG3(G3.geo.toro, P[1], { somar: true, opacidade: 0.8, escala: r * 1.2 })));
    add(brilhoG3(P[1], r * 7, 0.6));
    animar = (t) => aneis.forEach((a, k) => { a.rotation.set(t * (5 + k * 3), t * (3 - k * 5), 0); a.scale.setScalar(r * (1 + ((t * 2 + k / 2) % 1) * 0.6)); });
  } else if (fam === "fantasma") {
    const corpo = add(malhaG3(G3.geo.esfera, P[2], { opacidade: 0.75, escala: r * 1.1 }));
    for (const s of [-1, 1]) { const olho = add(malhaG3(G3.geo.cubo, "#ffffff")); olho.position.set(r * 0.85, r * 0.25, s * r * 0.35); olho.scale.set(r * 0.2, r * 0.35, r * 0.2); }
    const fiapos = [1, 2, 3].map((i) => add(malhaG3(G3.geo.esfera, P[2], { opacidade: 0.5 - i * 0.12, escala: r * (0.8 - i * 0.18) })));
    add(brilhoG3(P[1], r * 6, 0.45));
    animar = (t) => { corpo.position.y = Math.sin(t * 10) * r * 0.15; fiapos.forEach((f, i) => f.position.set(-(i + 1) * r * 0.7, Math.sin(t * 9 + i) * r * 0.35, 0)); };
  } else if (fam === "veneno") {
    const bolha = add(malhaG3(G3.geo.esfera, P[2], { escala: r }));
    const bolinhas = [0, 1, 2].map((k) => add(malhaG3(G3.geo.esfera, P[1], { opacidade: 0.85, escala: r * 0.3 })));
    animar = (t) => { bolha.scale.set(r * (1 + Math.sin(t * 18) * 0.1), r * (1 - Math.sin(t * 18) * 0.1), r); bolinhas.forEach((b, k) => { const a = t * 6 + k * 2.1; b.position.set(-r * (0.7 + k * 0.4), Math.sin(a) * r * 0.6, Math.cos(a) * r * 0.5); }); };
  } else if (fam === "sombrio") {
    const lua = add(malhaG3(G3.geo.lua, P[3], { toon: true, escala: r * 1.3 }));
    add(malhaG3(G3.geo.lua, P[1], { somar: true, opacidade: 0.35, escala: r * 1.45 }));
    animar = (t) => { lua.rotation.y = t * 22; pecas[1].rotation.y = t * 22; };
  } else if (fam === "voador") {
    const laminas = [-1, 0, 1].map((k) => { const v = add(malhaG3(G3.geo.vento, P[k ? 1 : 0], { opacidade: 0.75, dupla: true, escala: r * 1.6 })); v.rotation.set(Math.PI / 2, 0, -Math.PI * 0.35); v.position.y = k * r * 0.5; return v; });
    animar = (t) => laminas.forEach((v, k) => { v.position.x = -((t * 6 + k / 3) % 1) * r * 1.2; });
  } else if (fam === "lutador") {
    const punho = add(malhaG3(G3.geo.cubo, P[1], { toon: true })); punho.scale.set(r * 1.4, r * 1.3, r * 1.3);
    for (let k = 0; k < 4; k++) { const n = add(malhaG3(G3.geo.cubo, P[2], { toon: true })); n.scale.set(r * 0.3, r * 0.3, r * 0.28); n.position.set(r * 0.75, r * 0.35, (k - 1.5) * r * 0.32); }
    animar = (t) => { punho.position.x = Math.sin(t * 30) * r * 0.08; };
  } else if (fam === "fada") {
    const estrelas = [0, 1, 2].map((k) => { const e = add(malhaG3(G3.geo.cristal, P[k % 2 ? 0 : 2], { somar: true })); e.scale.set(r * 0.5, r * 0.5, r * 0.15); return e; });
    add(malhaG3(G3.geo.esfera, P[1], { escala: r * 0.35 })); add(brilhoG3(P[2], r * 7, 0.7));
    animar = (t) => estrelas.forEach((e, k) => { const a = t * 9 + k * 2.09; e.position.set(0, Math.cos(a) * r * 0.75, Math.sin(a) * r * 0.75); e.rotation.z = t * 12; });
  } else {
    const estrela = add(malhaG3(G3.geo.cristal, P[1], { toon: true })); estrela.scale.set(r * 1.1, r * 1.1, r * 0.35);
    add(brilhoG3(P[0], r * 5, 0.45));
    animar = (t) => { estrela.rotation.z = t * 14; };
  }
  return { grupo: g, animar };
}
// o rastro de cada família, solto pelo projétil enquanto voa (as partículas de animacao.js)
function rastroDe(fam, x, y, P) {
  const r = Math.random;
  if (fam === "fogo" || fam === "dragao") particula(x, y, { z: 0.45 + (r() - 0.5) * 0.2, vx: (r() - 0.5) * 0.6, vy: (r() - 0.5) * 0.6, vz: 0.8, g: -1.5, vida: 0.4, cor: P[1 + Math.floor(r() * 2)], tam: 0.09 });
  else if (fam === "agua" || fam === "veneno") particula(x, y, { z: 0.4, vz: 0.5, g: 9, vida: 0.4, cor: P[1], tam: 0.07, quica: 0 });
  else if (fam === "gelo") particula(x, y, { z: 0.45, vx: (r() - 0.5), vz: 0.4, g: 2, vida: 0.5, cor: "#ffffff", tam: 0.06 });
  else if (fam === "fantasma" || fam === "psiquico" || fam === "fada") particula(x, y, { z: 0.45, vz: 0.6, g: -0.8, vida: 0.5, cor: P[1], tam: 0.06 });
  else if (fam === "pedra" || fam === "terra") particula(x, y, { z: 0.15, vx: (r() - 0.5), vz: 0.8, g: 6, vida: 0.4, cor: P[1], tam: 0.07 });
  else if (fam === "planta") particula(x, y, { z: 0.45, vx: (r() - 0.5), vz: 0.4, g: 1, vida: 0.7, cor: P[2], tam: 0.08, atrito: 2 });
}
function atualizarProjeteis3d(projeteis, agora, dt) {
  const vistos = new Set();
  for (const j of projeteis) {
    const pr = j.pr, fam = familiaDe(pr.elemento);
    vistos.add(pr.id);
    let o = G3.projeteis.get(pr.id);
    // o desenho é maior que o acerto, para ver bem
    if (!o) {
      const r = Math.max(0.2, pr.raio * 1.7), fx = modoAtual() === "naruto" ? dexAtual().MOVES[pr.golpe]?.fx : null, doNaruto = fx && projetilNaruto(fx, r);
      o = { ...(doNaruto || montarProjetil(fam, r)), fam, fx, nasceu: agora, naruto: !!doNaruto };
      G3.projeteis.set(pr.id, o); G3.cena.scene.add(o.grupo);
    }
    o.grupo.position.set(j.x, 0.45, j.y); o.grupo.rotation.y = -Math.atan2(pr.dy, pr.dx);
    o.animar(movimentoReduzido.matches ? 0 : (agora - o.nasceu) / 1000, dt);
    if (Math.random() < 0.7) { if (o.rastro) o.rastro(j.x, j.y); else if (!o.naruto) rastroDe(fam, j.x, j.y, PALETA[fam]); }
    if (o.naruto) { if (LUZ_PROJETIL_N[o.fx]) pedirLuz(LUZ_PROJETIL_N[o.fx], 2.5, j.x, j.y, 0.7, 60, agora); }
    else if (BRILHAM.has(fam)) pedirLuz(PALETA[fam][1], 2.5, j.x, j.y, 0.7, 60, agora);
  }
  for (const [id, o] of G3.projeteis) if (!vistos.has(id)) { soltarG3(o.grupo); G3.projeteis.delete(id); }
}

// ---------- efeitos que duram um instante ----------
// vivo: { grupo, t0, dur, animar(k, idade) } — k vai de 0 a 1
function vivo(grupo, dur, animar, agora) { G3.cena.scene.add(grupo); G3.vivos.push({ grupo, t0: agora, dur, animar }); }
function anelNoChao(x, y, cor, de, ate, dur, agora, h = 0.04, opacidade = 0.9) {
  const a = malhaG3(G3.geo.anel, cor, { opacidade, dupla: true }); a.position.set(x, h, y);
  vivo(a, dur, (k) => { a.scale.setScalar(de + (ate - de) * Math.sin(k * Math.PI / 2)); a.material.opacity = opacidade * (1 - k); }, agora);
}
function estouro3d(f, agora) {
  const fam = familiaDe(f.elemento), P = PALETA[fam], forca = f.forca || 1, g = new THREE.Group();
  g.position.set(f.x, 0.45, f.y);
  const flash = malhaG3(G3.geo.esfera, P[0], { somar: true, opacidade: 1, escala: 0.3 * forca }), halo = brilhoG3(P[1], 2.2 * forca, 0.9);
  g.add(flash, halo);
  if (fam === "raio") for (let i = 0; i < 4; i++) { const m = malhaG3(G3.geo.cubo, P[1], { somar: true }); m.scale.set(0.9 * forca, 0.05, 0.05); m.rotation.set(0, i * 0.8, (fixo(f.t + i) - 0.5) * 1.5); g.add(m); }
  vivo(g, 0.32, (k) => { flash.scale.setScalar(0.3 * forca * (1 + k * 1.5)); flash.material.opacity = Math.max(0, 1 - k * 2.5); halo.material.opacity = 0.9 * (1 - k); g.children.slice(2).forEach((m) => { m.material.opacity = 1 - k; }); }, agora);
  anelNoChao(f.x, f.y, P[2], 0.35 * forca, 1.2 * (0.7 + forca * 0.3), 0.35, agora);
  pedirLuz(P[1], 7 * forca, f.x, f.y, 0.8, 260, agora);
  if (forca >= 1) sacudir(0.25 * forca);
}
function corte3d(f, agora) {
  const P = paletaDe(f.elemento || dexAtual().MOVES[f.golpe]?.t), g = new THREE.Group();
  g.position.set(f.x, 0.55, f.y); g.rotation.y = -Math.atan2(f.mira.y, f.mira.x);
  const largo = malhaG3(G3.geo.corte, P[2], { somar: true, opacidade: 0.95, dupla: true }), fino = malhaG3(G3.geo.corte, P[0], { somar: true, opacidade: 1, dupla: true });
  fino.scale.set(0.92, 0.5, 0.92); g.add(largo, fino); g.rotation.z = 0.25;
  vivo(g, 0.22, (k) => { const s = 1 + k * 0.4; largo.scale.set(s, 1 - k * 0.6, s); fino.scale.set(s * 0.92, 0.5 * (1 - k), s * 0.92); largo.material.opacity = 0.95 * (1 - k); fino.material.opacity = 1 - k; }, agora);
}
function area3d(f, agora) {
  const fam = familiaDe(f.elemento), P = PALETA[fam], r = f.r || 1.5, g = new THREE.Group(), calmo = movimentoReduzido.matches;
  g.position.set(f.x, 0, f.y);
  anelNoChao(f.x, f.y, P[2], 0.3, r * 1.25, 0.5, agora);
  pedirLuz(P[1], 14, f.x, f.y, 1.2, 420, agora);
  sacudir(0.55, 0.35);
  if (fam === "fogo" || fam === "dragao") { // a coluna de fogo: bolas subindo e encolhendo
    const bolas = Array.from({ length: 16 }, (_, i) => { const b = malhaG3(G3.geo.bola, P[1 + (i % 3)], { opacidade: 0.9 }); g.add(b); return { b, a: fixo(i + f.t) * 6.28, d: fixo(i * 3 + f.t) * r * 0.5, v: 2.5 + fixo(i * 7) * 3 }; });
    g.add(brilhoG3(P[1], r * 3.5, 0.8));
    vivo(g, 0.6, (k) => { for (const o of bolas) { o.b.position.set(Math.cos(o.a) * o.d * (1 - k * 0.5), k * o.v, Math.sin(o.a) * o.d); o.b.scale.setScalar(r * 0.6 * (1 - k * 0.75)); o.b.material.opacity = 0.9 * (1 - k); } g.children[g.children.length - 1].material.opacity = 0.8 * (1 - k); }, agora);
  } else if (fam === "raio") { // o raio do céu, em zigue-zague, e o clarão
    const pts = [[0, 12, 0]]; for (let i = 1; i <= 9; i++) pts.push([(fixo(f.t + i) - 0.5) * 1.4 * (1 - i / 9), 12 - i * 12 / 9, (fixo(f.t * 3 + i) - 0.5) * 1.2 * (1 - i / 9)]);
    for (let i = 0; i < pts.length - 1; i++) for (const [cor, grosso] of [[P[2], 0.36], [P[0], 0.14]]) {
      const [a, b] = [pts[i], pts[i + 1]], m = malhaG3(G3.geo.cubo, cor, { somar: true });
      const d = new THREE.Vector3(b[0] - a[0], b[1] - a[1], b[2] - a[2]), len = d.length();
      m.scale.set(grosso, len, grosso); m.position.set((a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2);
      m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize()); g.add(m);
    }
    g.add(brilhoG3(P[1], r * 4, 1)); g.children[g.children.length - 1].position.y = 0.3;
    if (!calmo) G3.clarao = 1;
    sacudir(0.75, 0.5);
    vivo(g, 0.3, (k) => { const pisca = Math.floor(k * 7) % 2 ? 0.35 : 1; g.children.forEach((m) => { m.material.opacity = pisca * (1 - k); }); }, agora);
  } else if (fam === "agua") { // o gêiser
    const jato = malhaG3(G3.geo.tubo, P[1], { opacidade: 0.75, dupla: true }), topo = malhaG3(G3.geo.esfera, P[0], { opacidade: 0.85 });
    g.add(jato, topo);
    vivo(g, 0.6, (k) => { const h = 3.6 * Math.sin(k * Math.PI); jato.scale.set(r * 0.42, Math.max(0.01, h), r * 0.42); jato.position.y = h / 2; topo.position.y = h; topo.scale.setScalar(r * 0.5 * (1 - k * 0.5)); jato.material.opacity = 0.75 * (1 - k * k); topo.material.opacity = 0.85 * (1 - k * k); }, agora);
    espalhar(f.x, f.y, 26, [P[0], P[1], P[2]], { vel: 2.6, sobe: 7, vida: 0.8, tam: 0.11, quica: 0, raio: r * 0.3 });
  } else if (fam === "gelo" || fam === "planta" || fam === "inseto") { // espinhos brotando do chão
    const espinhos = Array.from({ length: 9 }, (_, i) => {
      const e = fam === "gelo" ? malhaG3(G3.geo.cristal, P[i % 2 ? 1 : 0], { toon: true }) : malhaG3(G3.geo.cone, P[2 + (i % 2)], { toon: true });
      const a = i * 0.7 + fixo(f.t) * 6, d = i ? r * (0.35 + fixo(i + f.t) * 0.5) : 0;
      e.position.set(Math.cos(a) * d, 0, Math.sin(a) * d); e.rotation.set((fixo(i * 2) - 0.5) * 0.5, 0, (fixo(i * 5) - 0.5) * 0.5); g.add(e); return e;
    });
    vivo(g, 0.75, (k) => { const sobe = Math.min(1, k * 5), some = k > 0.6 ? (k - 0.6) / 0.4 : 0; espinhos.forEach((e, i) => { const h = (i ? 0.9 : 1.4) * sobe * (1 - some); e.scale.set(0.22 * (1 - some * 0.5), Math.max(0.01, h), 0.22 * (1 - some * 0.5)); e.position.y = h / 2; }); }, agora);
  } else if (fam === "pedra" || fam === "terra") { // pedras voando e poeira
    const rochas = Array.from({ length: 7 }, (_, i) => { const m = malhaG3(G3.geo.pedra, P[1 + (i % 3)], { toon: true, escala: 0.16 + fixo(i + f.t) * 0.16 }); g.add(m); const a = fixo(i * 3 + f.t) * 6.28; return { m, vx: Math.cos(a) * (1 + fixo(i) * 2), vz: Math.sin(a) * (1 + fixo(i) * 2), vy: 4 + fixo(i * 5) * 3 }; });
    vivo(g, 0.8, (k, idade) => { for (const o of rochas) { o.m.position.set(o.vx * idade, Math.max(0, o.vy * idade - 9 * idade * idade), o.vz * idade); o.m.rotation.set(idade * 9, idade * 6, 0); } }, agora);
    espalhar(f.x, f.y, 22, ["#e9dcbb", P[1], P[0]], { vel: 2.4, sobe: 1.6, vida: 0.7, tam: 0.16, atrito: 2, raio: r * 0.4 });
    sacudir(0.7, 0.3);
  } else { // a cúpula de energia
    const cupula = malhaG3(G3.geo.cupula, P[2], { opacidade: 0.45, dupla: true }), aro = malhaG3(G3.geo.toro, P[1], { opacidade: 0.95 });
    aro.rotation.x = Math.PI / 2; g.add(cupula, aro);
    vivo(g, 0.45, (k) => { const s = r * (0.3 + 0.9 * Math.sin(k * Math.PI / 2)); cupula.scale.set(s, s * 0.8, s); aro.scale.setScalar(s); cupula.material.opacity = 0.45 * (1 - k); aro.material.opacity = 0.95 * (1 - k); }, agora);
  }
}
// os anéis de quem esquiva (amarelo, no chão) e de quem se cura, muda atributo ou troca (verde, subindo)
function anelSubindo(x, y, cor, agora) {
  const a = malhaG3(G3.geo.toro, cor, { opacidade: 0.9 }); a.rotation.x = Math.PI / 2; a.position.set(x, 0.1, y);
  vivo(a, 0.5, (k) => { a.position.y = 0.1 + k * (movimentoReduzido.matches ? 0 : 1.4); a.scale.setScalar(0.65 - k * 0.2); a.material.opacity = 0.9 * (1 - k); }, agora);
  if (!movimentoReduzido.matches) for (let i = 0; i < 6; i++) particula(x + (Math.random() - 0.5) * 0.8, y + (Math.random() - 0.5) * 0.5, { z: 0.2, vz: 1.5 + Math.random(), g: -0.5, vida: 0.6, cor, tam: 0.07 });
}
// as pedras caindo no fim do aviso de um golpe de área de pedra ou terra
function pedrasCaindo(agora) {
  const vistas = new Set();
  for (const a of areasVisuais.values()) {
    const fam = familiaDe(a.elemento), falta = faltaDaArea(a, agora);
    if ((fam !== "pedra" && fam !== "terra") || falta > 0.35 || movimentoReduzido.matches) continue;
    vistas.add(a.id);
    let lista = G3.pedras.get(a.id);
    if (!lista) { lista = [0, 1, 2].map((i) => { const m = malhaG3(G3.geo.pedra, PALETA[fam][2], { toon: true, escala: 0.3 }); m.castShadow = true; G3.cena.scene.add(m); return m; }); G3.pedras.set(a.id, lista); }
    const k = falta / 0.35;
    lista.forEach((m, i) => { const ang = i * 2.1 + a.id; m.position.set(a.x + Math.cos(ang) * a.r * 0.45, 0.3 + k * 6 + i * 0.6, a.y + Math.sin(ang) * a.r * 0.35); m.rotation.set(k * 6 + i, k * 4, 0); });
  }
  for (const [id, lista] of G3.pedras) if (!vistas.has(id)) { lista.forEach(soltarG3); G3.pedras.delete(id); }
}


// ---------- os jeitos novos de golpe ----------
// geometria só deste efeito: some junto com ele (soltarG3)
function propria(m) { m.userData.propria = true; return m; }
// o feixe: um tubo de luz da boca até onde bateu, que engrossa e some
function feixe3d(f, agora) {
  const P = paletaDe(f.elemento), g = new THREE.Group(), len = f.len || 6, r = f.r || 0.35;
  g.position.set(f.x, 0.5, f.y); g.rotation.y = -Math.atan2(f.dy, f.dx);
  const fora = malhaG3(G3.geo.tubo, P[1], { somar: true, opacidade: 0.85, dupla: true }), miolo = malhaG3(G3.geo.tubo, P[0], { somar: true, opacidade: 1, dupla: true });
  for (const m of [fora, miolo]) { m.rotation.z = -Math.PI / 2; m.position.x = len / 2; g.add(m); }
  const boca = brilhoG3(P[1], r * 6, 1), fim = brilhoG3(P[0], r * 5, 0.9); fim.position.x = len; g.add(boca, fim);
  vivo(g, 0.32, (k) => {
    const larg = r * (k < 0.15 ? 0.4 + k * 4 : 1 - (k - 0.15) * 0.9);
    fora.scale.set(larg * 1.1, len, larg * 1.1); miolo.scale.set(larg * 0.45, len, larg * 0.45);
    fora.material.opacity = 0.85 * (1 - k); miolo.material.opacity = 1 - k; boca.material.opacity = fim.material.opacity = 1 - k;
  }, agora);
  for (let i = 0; i < 14; i++) { const d = Math.random() * len; particula(f.x + f.dx * d, f.y + f.dy * d, { z: 0.5, vx: (Math.random() - 0.5) * 1.5, vy: (Math.random() - 0.5) * 1.5, vz: 1, g: 1, vida: 0.4, cor: P[i % 2], tam: 0.08 }); }
  pedirLuz(P[1], 10, f.x + f.dx * len / 2, f.y + f.dy * len / 2, 0.8, 300, agora);
  sacudir(0.3, 0.15);
}
// o sopro: um leque transparente e as partículas indo para a frente
function cone3d(f, agora) {
  const P = paletaDe(f.elemento), len = f.len || 3, arco = f.arco || 1.2, ang = Math.atan2(f.dy, f.dx);
  const geo = new THREE.CircleGeometry(len, 18, -arco / 2, arco); geo.rotateX(-Math.PI / 2);
  const leque = propria(malhaG3(geo, P[1], { somar: true, opacidade: 0.5, dupla: true }));
  leque.position.set(f.x, 0.35, f.y); leque.rotation.y = -ang;
  vivo(leque, 0.35, (k) => { leque.scale.setScalar(0.4 + k * 0.6); leque.material.opacity = 0.5 * (1 - k); }, agora);
  for (let i = 0; i < 26; i++) {
    const a = ang + (Math.random() - 0.5) * arco, v = len * (1.6 + Math.random() * 1.4);
    particula(f.x + Math.cos(a) * 0.3, f.y + Math.sin(a) * 0.3, { z: 0.4, vx: Math.cos(a) * v, vy: Math.sin(a) * v, vz: 0.3 + Math.random(), g: familiaDe(f.elemento) === "fogo" ? -1 : 2, vida: 0.4, cor: P[i % 3], tam: 0.1, atrito: 3 });
  }
  pedirLuz(P[1], 6, f.x + Math.cos(ang) * len / 2, f.y + Math.sin(ang) * len / 2, 0.7, 260, agora);
}
// o tremor: o anel que abre no chão levantando poeira (ou faísca, ou som)
function anel3d(f, agora) {
  const P = paletaDe(f.elemento), fam = familiaDe(f.elemento), r = f.r || 3, dur = f.aviso || 0.55;
  const onda = malhaG3(G3.geo.toro, P[1], { opacidade: 0.9 }), luz = malhaG3(G3.geo.anel, P[0], { somar: true, opacidade: 0.6, dupla: true });
  onda.rotation.x = Math.PI / 2; const g = new THREE.Group(); g.position.set(f.x, 0.15, f.y); g.add(onda, luz);
  const poeira = fam === "terra" || fam === "pedra" || fam === "normal" ? ["#d8c8a0", P[1], P[2]] : [P[0], P[1]];
  vivo(g, dur, (k) => {
    const rr = Math.max(0.2, r * k); onda.scale.set(rr, rr, 3 + (1 - k) * 4); luz.scale.setScalar(rr);
    onda.material.opacity = 0.9 * (1 - k * 0.6); luz.material.opacity = 0.6 * (1 - k);
    if (Math.random() < 0.8) { const a = Math.random() * 6.28; particula(f.x + Math.cos(a) * rr, f.y + Math.sin(a) * rr, { z: 0.05, vz: 2.5 + Math.random() * 2, vx: Math.cos(a), vy: Math.sin(a), g: 9, vida: 0.4, cor: poeira[Math.floor(Math.random() * poeira.length)], tam: 0.12 }); }
  }, agora);
  sacudir(fam === "terra" ? 0.55 : 0.3, 0.1);
  pedirLuz(P[1], 6, f.x, f.y, 0.5, dur * 1000, agora);
}
// a onda: uma parede que anda, com espuma em cima
function onda3d(f, agora) {
  const P = paletaDe(f.elemento), largura = (f.r || 1.5) * 2, dur = f.aviso || 1, v = f.v || 6.5, g = new THREE.Group();
  g.rotation.y = -Math.atan2(f.dy, f.dx);
  // a frente curvada da onda: meio cano deitado, aberto para a frente, e a crista de espuma em cima
  const geo = new THREE.CylinderGeometry(0.62, 0.62, largura, 18, 1, true, 0, Math.PI); geo.rotateX(Math.PI / 2);
  const parede = propria(malhaG3(geo, P[2], { opacidade: 0.75, dupla: true })), fundo = propria(malhaG3(geo, P[1], { somar: true, opacidade: 0.35, dupla: true }));
  const crista = malhaG3(G3.geo.cubo, P[0], { opacidade: 0.95 });
  fundo.scale.setScalar(0.8); crista.scale.set(0.22, 0.14, largura * 0.96);
  g.add(parede, fundo, crista);
  vivo(g, dur, (k, idade) => {
    const d = idade * v; g.position.set(f.x + f.dx * d, 0, f.y + f.dy * d);
    const sobe = Math.max(0.05, Math.min(1, k * 6) * (1 - Math.max(0, k - 0.8) * 5));
    for (const m of [parede, fundo]) { m.scale.set(sobe, sobe, 1); m.position.y = 0.62 * sobe; }
    crista.position.set(0.15 * sobe, 1.24 * sobe, 0); crista.scale.y = 0.14 * sobe;
    parede.material.opacity = 0.75 * Math.min(1, (1 - k) * 4);
    if (Math.random() < 0.9) { const lat = (Math.random() - 0.5) * largura; particula(f.x + f.dx * d - f.dy * lat, f.y + f.dy * d + f.dx * lat, { z: 1.2 * sobe, vz: 1.5, vx: f.dx * v * 0.6, vy: f.dy * v * 0.6, g: 9, vida: 0.4, cor: P[Math.floor(Math.random() * 2)], tam: 0.1, quica: 0 }); }
  }, agora);
}
// o redemoinho (ou o chão em chamas, ou a fumaça): fitas girando por cima da zona enquanto ela dura
function zona3d(f, agora) {
  const P = paletaDe(f.elemento), r = f.r || 1.6, dur = Math.max(0.3, f.falta || 3), g = new THREE.Group(), fitas = [];
  g.position.set(f.x, 0, f.y);
  for (let i = 0; i < 4; i++) { const m = malhaG3(G3.geo.vento, P[i % 3], { somar: true, opacidade: 0.7, dupla: true }); m.rotation.x = Math.PI / 2; g.add(m); fitas.push(m); }
  vivo(g, dur, (k, idade) => {
    const some = Math.min(1, (1 - k) * 6, k * 8);
    fitas.forEach((m, i) => { const alt = 0.2 + i * 0.35, raio = r * (f.puxa ? 1 - i * 0.18 : 0.6 + i * 0.12); m.position.y = alt; m.scale.setScalar(raio); m.rotation.z = idade * (f.puxa ? 7 : 2.5) * (i % 2 ? -1 : 1) + i; m.material.opacity = 0.7 * some; });
    if (Math.random() < 0.6) { const a = Math.random() * 6.28, d = Math.random() * r; particula(f.x + Math.cos(a) * d, f.y + Math.sin(a) * d, { z: 0.1, vz: 1.2 + Math.random(), vx: f.puxa ? -Math.cos(a) * 1.5 : 0, vy: f.puxa ? -Math.sin(a) * 1.5 : 0, g: -0.5, vida: 0.6, cor: P[Math.floor(Math.random() * 3)], tam: 0.09 }); }
  }, agora);
}
// a bomba: a bola em arco de quem atirou até o ponto (some quando a área estoura)
function bombasVoando(agora) {
  const vistas = new Set();
  for (const a of areasVisuais.values()) {
    if (a.forma !== "bomba" || !a.de) continue;
    vistas.add(a.id);
    let o = G3.bombas.get(a.id);
    if (!o) {
      const P = paletaDe(a.elemento), g = new THREE.Group(), bola = malhaG3(G3.geo.bola, P[1], { toon: true, escala: 0.26 });
      bola.castShadow = true; g.add(bola, brilhoG3(P[0], 0.9, 0.7)); G3.cena.scene.add(g);
      o = { g, bola, total: a.aviso || a.falta || 0.5 }; G3.bombas.set(a.id, o);
    }
    const k = clamp(1 - faltaDaArea(a, agora) / o.total, 0, 1);
    o.g.position.set(a.de.x + (a.x - a.de.x) * k, 0.4 + 4 * k * (1 - k) * 2.6, a.de.y + (a.y - a.de.y) * k);
    o.bola.rotation.set(k * 9, k * 7, 0);
    if (Math.random() < 0.5) rastroDe(familiaDe(a.elemento), o.g.position.x, o.g.position.z, PALETA[familiaDe(a.elemento)]);
  }
  for (const [id, o] of G3.bombas) if (!vistas.has(id)) { soltarG3(o.g); G3.bombas.delete(id); }
}
// aparou: o clarão branco e azul na frente de quem segurou
function aparou3d(f, agora) {
  const g = new THREE.Group(); g.position.set(f.x, 0.55, f.y);
  const flash = brilhoG3("#dff6ff", 2.6, 1), aro = malhaG3(G3.geo.toro, "#bfeaff", { somar: true, opacidade: 1 }); aro.rotation.x = Math.PI / 2; g.add(flash, aro);
  vivo(g, 0.25, (k) => { aro.scale.setScalar(0.6 + k * 1.4); aro.material.opacity = 1 - k; flash.material.opacity = 1 - k; }, agora);
  pedirLuz("#bfeaff", 8, f.x, f.y, 0.8, 200, agora);
  sacudir(0.25, 0.3);
}
// ---------- o quadro ----------
function atualizarGolpes3d(projeteis, agora, dt, poses = []) {
  if (!G3.ok) return;
  G3.poses = poses; // onde cada ninja está agora (os jutsus que acompanham quem avança)
  const naruto = modoAtual() === "naruto";
  // os efeitos novos da lista de desenho.js viram efeitos 3D (uma vez cada)
  for (const f of efeitos) {
    if (f.g3 || agora < f.t) continue;
    f.g3 = true;
    const quando = f.t; // o efeito começa na hora do evento (mesmo que o quadro chegue atrasado)
    if (f.tipo === "estouro") { if (!(naruto && impactoNaruto(f, quando))) estouro3d(f, quando); }
    else if (f.tipo === "golpe" && f.classe === "corpo") { if (!(naruto && corpoNaruto(f, quando))) corte3d(f, quando); }
    else if (f.tipo === "golpe" && naruto) {
      if (!efeitoNaruto(f, quando) && (f.classe === "projetil" || f.classe === "area")) anelNoChao(f.x, f.y, paletaDe(f.elemento)[1], 0.2, 0.7, 0.3, quando); // o chakra juntando nos pés
    }
    else if (f.tipo === "explosao") { if (!(naruto && areaNaruto(f, quando))) area3d(f, quando); }
    else if (f.tipo === "area" && f.forma === "feixe") feixe3d(f, quando);
    else if (f.tipo === "area" && f.forma === "cone") cone3d(f, quando);
    else if (f.tipo === "area" && f.forma === "anel") anel3d(f, quando);
    else if (f.tipo === "area" && f.forma === "onda") onda3d(f, quando);
    else if (f.tipo === "area" && f.forma === "zona") zona3d(f, quando);
    else if (f.tipo === "aterrissou") { anelNoChao(f.x, f.y, paletaDe(f.elemento)[1], 0.3, (f.r || 1.3) * 1.3, 0.4, quando); sacudir(0.5, 0.3); }
    else if (f.tipo === "aparou") aparou3d(f, quando);
    else if (f.tipo === "guardaQuebrou") { anelSubindo(f.x, f.y, "#ef8a5a", quando); sacudir(0.4, 0.5); }
    else if (f.tipo === "perfeita") { anelNoChao(f.x, f.y, "#ffd84a", 0.3, 1.4, 0.4, quando); anelSubindo(f.x, f.y, "#ffd84a", quando); }
    else if (f.tipo === "batida") sacudir(0.55, 0.35);
    else if (f.tipo === "combo" && f.ultimo) corte3d({ ...f, mira: f.mira || { x: 1, y: 0 } }, quando);
    else if (f.tipo === "esquiva") anelNoChao(f.x, f.y, "#fef5aa", 0.4, 0.9, 0.25, quando);
    else if (["cura", "atributo", "troca", "transformar"].includes(f.tipo)) anelSubindo(f.x, f.y, f.tipo === "cura" ? "#7be0a0" : "#68b987", quando);
    else if (f.tipo === "dano" && f.crit) sacudir(0.45, 0.6);
    else if (f.tipo === "dano" && f.em === ME?.id) sacudir(0.3);
    else if (f.tipo === "desmaiou") sacudir(0.4, 0.8);
    else if (f.tipo === "voltou") sacudir(0.35, 0.2);
  }
  atualizarProjeteis3d(projeteis, agora, dt);
  pedrasCaindo(agora);
  bombasVoando(agora);
  for (let i = G3.vivos.length - 1; i >= 0; i--) {
    const o = G3.vivos[i], idade = (agora - o.t0) / 1000, k = idade / o.dur;
    if (k >= 1) { soltarG3(o.grupo); G3.vivos.splice(i, 1); continue; }
    o.animar(Math.max(0, k), Math.max(0, idade));
  }
  // as partículas viram cubinhos
  const { cubinhos, m, q, v, e } = G3;
  PARTICULAS.forEach((p, i) => {
    if (p.vida > 0) { const t = p.tam * (0.45 + 0.55 * p.vida / p.total); m.compose(v.set(p.x, p.z + t / 2, p.y), q, e.set(t, t, t)); cubinhos.setColorAt(i, corG3(p.cor)); }
    else m.makeScale(0, 0, 0);
    cubinhos.setMatrixAt(i, m);
  });
  cubinhos.instanceMatrix.needsUpdate = true; if (cubinhos.instanceColor) cubinhos.instanceColor.needsUpdate = true;
  // as luzes apagam aos poucos
  for (const l of G3.luzes) l.luz.intensity = l.ate > agora ? l.forca * Math.min(1, (l.ate - agora) / Math.max(1, l.total) * 1.5) : 0;
  // a câmera volta ao normal
  G3.sacudida *= Math.exp(-dt * 7); G3.soco *= Math.exp(-dt * 5); G3.clarao = Math.max(0, G3.clarao - dt * 6);
}
