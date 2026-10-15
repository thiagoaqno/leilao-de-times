// Futevôlei da Galera — a encenação do toque em 8 tempos (só visual e som; as regras não mudam):
// 1. Carga: com o toque armado e a bola chegando, junta energia no ponto do contato (mais forte no ataque e no Shark),
//    e o saque carrega no preparo.
// 2. Núcleo: a bola chutada forte fica com uma aura na cor do golpe, que some quando ela perde velocidade.
// 3. Rastro: a fita de jogo.js ganha brasas no Shark, na bicicleta e no voleio, e um fiapo de areia no ataque.
// 4. Estouro: no toque, a onda de choque no ar, os traços de velocidade no ataque e um congelamento curtíssimo
//    (hit-stop: até 60 ms, só no desenho) com o tranco da câmera.
// 5. Reação: a defesa de um ataque forte ("Defendeu!") e a bola do ataque cravando na areia (cratera e tremor).
// 6. Som: os pedidos ao Som de jogo.js (golpe por golpe, a carga e o vento do ataque).
// 7. Rescaldo: a marca da bola na areia (some devagar), a nuvem de areia que assenta e a rede balançando.
// 8. Números: a velocidade do ataque em km/h saltando perto da bola, o contador de rally e a velocidade no ponto.
// O jogo.js chama: toque, preSaque, areia, rede, ponto, carga (no laço, com a previsão do toque) e quadro.
import * as THREE from "three";

// ---------- as contas (puras: o teste usa sem navegador) ----------
export const FORTES = new Set(["shark", "bicicleta", "voleio"]);
// o peso do toque: passe (0), ataque (1) ou forte (2)
export function pesoDoToque(golpe, intencao, estilo) {
  if (FORTES.has(golpe) || estilo === "bicicleta") return 2;
  if (intencao === "ataque" || golpe === "saque") return 1;
  return 0;
}
// m/s para km/h
export const kmh = (v) => Math.round(v * 3.6);
// o jeito do número da velocidade: cor e o grito embaixo
export function jeitoDaVelocidade(k) {
  if (k >= 95) return { cor: "#ff4b2b", grito: "Bomba!" };
  if (k >= 75) return { cor: "#ff9a2b", grito: "Pancada!" };
  if (k >= 55) return { cor: "#ffd34a", grito: "" };
  return { cor: "#ffffff", grito: "" };
}
// o hit-stop de cada peso, em ms (o passe não para)
export const PAUSA = [0, 35, 60];
// o rally: a partir de quantos toques ele acende
export const RALLY_QUENTE = 10;

const COR_TOQUE = [0x9fd8ff, 0xffb84d, 0xff5a1f];

export function criarEncenacao({ scene, cam, F, Som, reduzido, naAreia, msgVelocidade }) {
  // ---------- texturas (desenhadas na hora) ----------
  const tex = (w, h, fn) => { const c = document.createElement("canvas"); c.width = w; c.height = h; fn(c.getContext("2d"), w, h); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; };
  const texBrilho = tex(64, 64, (x, w) => { const g = x.createRadialGradient(w / 2, w / 2, 0, w / 2, w / 2, w / 2); g.addColorStop(0, "rgba(255,255,255,1)"); g.addColorStop(0.35, "rgba(255,255,255,.5)"); g.addColorStop(1, "rgba(255,255,255,0)"); x.fillStyle = g; x.fillRect(0, 0, w, w); });
  const texAro = tex(128, 128, (x, w) => { x.strokeStyle = "rgba(255,255,255,1)"; x.lineWidth = 7; x.beginPath(); x.arc(w / 2, w / 2, w / 2 - 6, 0, Math.PI * 2); x.stroke(); x.strokeStyle = "rgba(255,255,255,.35)"; x.lineWidth = 16; x.stroke(); });
  const texNuvem = tex(64, 64, (x, w) => { const g = x.createRadialGradient(w / 2, w / 2, 0, w / 2, w / 2, w / 2); g.addColorStop(0, "rgba(232,212,170,.85)"); g.addColorStop(0.6, "rgba(222,200,156,.35)"); g.addColorStop(1, "rgba(222,200,156,0)"); x.fillStyle = g; x.fillRect(0, 0, w, w); });
  const texCratera = tex(64, 64, (x, w) => { const g = x.createRadialGradient(w / 2, w / 2, w * 0.1, w / 2, w / 2, w / 2); g.addColorStop(0, "rgba(90,62,28,.6)"); g.addColorStop(0.55, "rgba(120,86,40,.35)"); g.addColorStop(0.72, "rgba(255,240,205,.35)"); g.addColorStop(1, "rgba(255,240,205,0)"); x.fillStyle = g; x.fillRect(0, 0, w, w); });
  const sprite = (map, cor, aditivo = true) => { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map, color: cor, transparent: true, depthWrite: false, blending: aditivo ? THREE.AdditiveBlending : THREE.NormalBlending })); s.visible = false; s.renderOrder = 5; scene.add(s); return s; };

  // ---------- partículas: brasas, energia e areia fina (uma lista fixa de pontos) ----------
  const N = 240, pPos = new Float32Array(N * 3), pCor = new Float32Array(N * 3), pV = new Float32Array(N * 3), pVida = new Float32Array(N), pTotal = new Float32Array(N), pG = new Float32Array(N);
  const pGeo = new THREE.BufferGeometry();
  pGeo.setAttribute("position", new THREE.BufferAttribute(pPos, 3)); pGeo.setAttribute("color", new THREE.BufferAttribute(pCor, 3));
  const pontos = new THREE.Points(pGeo, new THREE.PointsMaterial({ size: 0.09, map: texBrilho, vertexColors: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
  pontos.frustumCulled = false; pontos.renderOrder = 4; scene.add(pontos);
  let pI = 0; const _c = new THREE.Color();
  function soltar(x, y, z, vx, vy, vz, cor, vida, g = 0) {
    if (reduzido) return;
    const i = pI++ % N; pPos.set([x, y, z], i * 3); pV.set([vx, vy, vz], i * 3); pVida[i] = pTotal[i] = vida; pG[i] = g;
    _c.set(cor); pCor.set([_c.r, _c.g, _c.b], i * 3);
  }

  // ---------- 1. carga ----------
  const cargas = new Map(); // id do atleta → { brilho, desde, som }
  function carga(a, p, intencao) {
    if (!a || !p) return;
    const peso = pesoDoToque(p.golpe, intencao), k = Math.max(0, Math.min(1, 1 - p.t / 0.8));
    let c = cargas.get(a.id);
    if (!c) cargas.set(a.id, (c = { brilho: sprite(texBrilho, COR_TOQUE[peso]), visto: 0, som: false }));
    c.visto = performance.now(); c.brilho.material.color.setHex(COR_TOQUE[peso]);
    const pos = a.raiz.position, h = Math.max(0.3, Math.min(3, p.h || 1));
    c.brilho.position.set(pos.x, h, pos.z); c.brilho.visible = true;
    const pulso = reduzido ? 1 : 1 + Math.sin(performance.now() / 45) * 0.15 * k;
    c.brilho.scale.setScalar((0.25 + k * (peso === 2 ? 1.3 : peso ? 0.9 : 0.5)) * pulso);
    c.brilho.material.opacity = (peso ? 0.35 : 0.18) + k * 0.5;
    // a energia chega de fora para dentro
    if (peso && Math.random() < 0.5 + peso * 0.2) {
      const ang = Math.random() * Math.PI * 2, d = 0.9, dur = 0.22;
      soltar(pos.x + Math.cos(ang) * d, h + (Math.random() - 0.5) * 0.8, pos.z + Math.sin(ang) * d, -Math.cos(ang) * d / dur, 0, -Math.sin(ang) * d / dur, peso === 2 ? "#ff7a2a" : "#ffd27a", dur);
    }
    if (peso === 2 && !c.som && k > 0.45) { c.som = true; Som.carga && Som.carga(); }
  }
  function apagarCargas(tp) {
    for (const [id, c] of cargas) if (tp - c.visto > 80) { c.brilho.visible = false; c.som = false; if (tp - c.visto > 4000) { scene.remove(c.brilho); c.brilho.material.dispose(); cargas.delete(id); } }
  }

  // ---------- 2. núcleo (a aura da bola) ----------
  const aura = sprite(texBrilho, 0xff5a1f), aro = sprite(texAro, 0xffffff);
  const nucleo = { peso: 0, cor: COR_TOQUE[0] };

  // ---------- 4. estouro ----------
  const ondas = Array.from({ length: 4 }, () => ({ s: sprite(texAro, 0xffffff), t: 1, tam: 1 }));
  const tracos = Array.from({ length: 10 }, () => { const m = new THREE.Mesh(new THREE.PlaneGeometry(1, 0.035), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide })); m.visible = false; m.renderOrder = 5; scene.add(m); return { m, t: 1, dir: new THREE.Vector3(), base: new THREE.Vector3() }; });
  let ondaI = 0, tracoI = 0;
  const parada = { ate: 0, ponto: new THREE.Vector3(), id: null };
  const tranco = { forca: 0, v: new THREE.Vector3() };
  function sacudir(f) { if (!reduzido) tranco.forca = Math.max(tranco.forca, f); }

  // ---------- 7. rescaldo: as marcas da bola na areia e a nuvem que assenta ----------
  const MARCAS = 24, marcas = new THREE.InstancedMesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: texCratera, transparent: true, depthWrite: false }), MARCAS);
  marcas.instanceMatrix.setUsage(THREE.DynamicDrawUsage); marcas.frustumCulled = false; marcas.renderOrder = 1; scene.add(marcas);
  const marcaVida = new Float32Array(MARCAS), marcaInfo = Array.from({ length: MARCAS }, () => ({ x: 0, z: 0, r: 0.4, rot: 0 }));
  let marcaI = 0;
  const nuvens = Array.from({ length: 10 }, () => ({ s: sprite(texNuvem, 0xffffff, false), t: 1, dur: 1, v: new THREE.Vector3(), tam: 1 }));
  let nuvemI = 0;
  const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _e = new THREE.Euler(), _p = new THREE.Vector3(), _s = new THREE.Vector3();
  function nuvem(x, z, forca) {
    if (reduzido || (naAreia && !naAreia(x, z))) return;
    for (let i = 0; i < Math.round(2 + forca * 3); i++) {
      const n = nuvens[nuvemI++ % nuvens.length], a = Math.random() * Math.PI * 2;
      n.t = 0; n.dur = 1.2 + forca * 0.6; n.tam = 0.6 + forca * 0.5 + Math.random() * 0.3;
      n.s.position.set(x + Math.cos(a) * 0.2, 0.2, z + Math.sin(a) * 0.2); n.v.set(Math.cos(a) * (0.4 + forca * 0.6), 0.35 + forca * 0.3, Math.sin(a) * (0.4 + forca * 0.6)); n.s.visible = true;
    }
  }
  function marcaNaAreia(x, z, forca) {
    if (naAreia && !naAreia(x, z)) return;
    const i = marcaI++ % MARCAS; marcaVida[i] = 1; marcaInfo[i] = { x, z, r: 0.35 + forca * 0.35, rot: Math.random() * Math.PI };
  }

  // ---------- 8. números: a velocidade e o rally ----------
  const medir = { ate: 0, max: 0, peso: 0, time: null, mostrado: true };
  const ultimoAtaque = { t: 0, time: null, kmh: 0, peso: 0 };
  let rally = 0;
  const elVel = document.getElementById("hVel"), elRally = document.getElementById("hRally");
  const _tela = new THREE.Vector3();
  function mostrarVelocidade(k, bolaPos) {
    if (!elVel) return;
    const J = jeitoDaVelocidade(k);
    _tela.copy(bolaPos).project(cam);
    elVel.style.left = `${((_tela.x + 1) / 2) * 100}%`; elVel.style.top = `${((1 - _tela.y) / 2) * 100}%`;
    elVel.innerHTML = `<b style="color:${J.cor}">${k} km/h</b>${J.grito ? `<small style="color:${J.cor}">${J.grito}</small>` : ""}`;
    elVel.classList.remove("on"); void elVel.offsetWidth; elVel.classList.add("on");
  }
  function mostrarRally() {
    if (!elRally) return;
    elRally.textContent = rally > 1 ? `Rally ${rally}` : "";
    elRally.classList.toggle("quente", rally >= RALLY_QUENTE);
    elRally.classList.remove("bate"); if (!reduzido && rally > 1) { void elRally.offsetWidth; elRally.classList.add("bate"); }
  }

  return {
    carga,
    // o toque: estouro, aura da bola, hit-stop, som, a reação da defesa e o começo da medida de velocidade
    toque(e, bolaPos, time) {
      const peso = pesoDoToque(e.golpe, e.intencao, e.estilo), tp = performance.now();
      rally = e.golpe === "saque" ? 0 : rally + 1; mostrarRally();
      const c = cargas.get(e.id); if (c) { c.brilho.visible = false; c.som = false; }
      // 4. a onda de choque, os traços e o hit-stop
      if (peso || e.pulo) {
        const o = ondas[ondaI++ % ondas.length]; o.t = 0; o.tam = peso === 2 ? 2.4 : peso ? 1.5 : 0.9; o.s.position.copy(bolaPos); o.s.material.color.setHex(COR_TOQUE[peso]); o.s.visible = true;
      }
      if (peso && !reduzido) for (let i = 0; i < (peso === 2 ? 8 : 4); i++) {
        const t = tracos[tracoI++ % tracos.length], a = Math.random() * Math.PI * 2, b = (Math.random() - 0.3) * 1.2;
        t.t = 0; t.base.copy(bolaPos); t.dir.set(Math.cos(a) * Math.cos(b), Math.sin(b), Math.sin(a) * Math.cos(b)); t.m.material.color.setHex(i % 2 ? 0xffffff : COR_TOQUE[peso]); t.m.visible = true;
      }
      if (peso === 2) for (let i = 0; i < 16; i++) soltar(bolaPos.x, bolaPos.y, bolaPos.z, (Math.random() - 0.5) * 6, Math.random() * 4, (Math.random() - 0.5) * 6, i % 2 ? "#ffd27a" : "#ff5a1f", 0.45, 6);
      if (!reduzido && PAUSA[peso]) { parada.ate = tp + PAUSA[peso]; parada.ponto.copy(bolaPos); parada.id = e.id; }
      sacudir(peso === 2 ? 0.16 : peso ? 0.06 : 0);
      // 2. a aura
      nucleo.peso = peso; aura.material.color.setHex(COR_TOQUE[peso]);
      // 5. a reação: a defesa de um ataque forte do outro time
      const defesa = ultimoAtaque.time && time && time !== ultimoAtaque.time && tp - ultimoAtaque.t < 2500 && ultimoAtaque.peso;
      if (defesa) {
        const o = ondas[ondaI++ % ondas.length]; o.t = 0; o.tam = 1.8; o.s.position.copy(bolaPos); o.s.material.color.setHex(0x7fd4ff); o.s.visible = true;
        sacudir(0.08 + ultimoAtaque.peso * 0.04);
        if (msgVelocidade) msgVelocidade(ultimoAtaque.kmh >= 55 ? `Defendeu a de ${ultimoAtaque.kmh} km/h!` : "Defendeu!");
        Som.defesa && Som.defesa();
        ultimoAtaque.time = null;
      }
      // 6. o som do golpe
      Som.golpe ? Som.golpe(e.golpe, peso) : Som.toque(e.golpe);
      // 8. mede a velocidade de quem atacou nos próximos 160 ms (online, a bola nova chega no pacote seguinte)
      if (peso) Object.assign(medir, { ate: tp + 160, max: 0, peso, time, mostrado: false });
      else medir.mostrado = true;
    },
    // o preparo do saque: carga no sacador
    preSaque(a, falta) {
      if (!a) return;
      carga(a, { t: falta, h: 1.1, golpe: "saque" }, "ataque");
    },
    // a bola caiu na areia: marca, nuvem e, se foi o ataque que cravou, o tremor
    areia(e, vel) {
      const forca = Math.min(1.5, (vel || 8) / 14);
      marcaNaAreia(e.x, e.z, forca); nuvem(e.x, e.z, forca);
      const cravou = ultimoAtaque.time && F.ladoDe(e.z) !== ultimoAtaque.time && performance.now() - ultimoAtaque.t < 2500;
      if (cravou) { sacudir(0.12 + ultimoAtaque.peso * 0.06); const o = ondas[ondaI++ % ondas.length]; o.t = 0; o.tam = 2.2; o.s.position.set(e.x, 0.15, e.z); o.s.material.color.setHex(0xffe0a0); o.s.visible = true; }
      Som.areiaForca ? Som.areiaForca(forca) : Som.areia();
      nucleo.peso = 0;
    },
    // ponto: o rally zera e devolve o que dizer da velocidade do ataque que fez o ponto
    ponto(e) {
      const frase = ultimoAtaque.time === e.time && ultimoAtaque.kmh >= 40 && performance.now() - ultimoAtaque.t < 4000 ? `ataque a ${ultimoAtaque.kmh} km/h` : "";
      rally = 0; mostrarRally(); ultimoAtaque.time = null; nucleo.peso = 0;
      return frase;
    },
    // a cada quadro: congela? devolve onde a bola fica parada no hit-stop
    segurando(tp) { return tp < parada.ate ? parada : null; },
    quadro(dt, { bola, bolaV, tp, fase }) {
      apagarCargas(tp);
      const vel = Math.hypot(bolaV.vx || 0, bolaV.vy || 0, bolaV.vz || 0);
      // 8. a velocidade: o pico logo depois do toque
      if (!medir.mostrado) {
        medir.max = Math.max(medir.max, vel);
        if (tp > medir.ate) {
          medir.mostrado = true; const k = kmh(medir.max);
          Object.assign(ultimoAtaque, { t: tp, time: medir.time, kmh: k, peso: medir.peso });
          if (k >= 30) mostrarVelocidade(k, bola.position);
          if (medir.peso === 2 && Som.vento) Som.vento();
        }
      }
      // 2. a aura da bola e o aro que pulsa (some quando ela perde velocidade)
      const viva = fase === "jogo" && nucleo.peso > 0 && vel > 5;
      aura.visible = aro.visible = viva && !reduzido;
      if (aura.visible) {
        const k = Math.min(1, (vel - 5) / 15) * (nucleo.peso === 2 ? 1 : 0.6);
        aura.position.copy(bola.position); aura.scale.setScalar(0.5 + k * 0.9 + Math.sin(tp / 40) * 0.05); aura.material.opacity = 0.25 + k * 0.6;
        aro.position.copy(bola.position); aro.scale.setScalar(0.35 + ((tp / 220) % 1) * 0.5); aro.material.opacity = k * 0.6 * (1 - ((tp / 220) % 1)); aro.material.color.setHex(COR_TOQUE[nucleo.peso]);
        // 3. o rastro: brasas no forte, areia fina no ataque
        if (Math.random() < 0.8) soltar(bola.position.x, bola.position.y, bola.position.z, (Math.random() - 0.5) * 0.6, nucleo.peso === 2 ? 0.8 : -0.2, (Math.random() - 0.5) * 0.6, nucleo.peso === 2 ? (Math.random() < 0.5 ? "#ff5a1f" : "#ffd27a") : "#fff1cf", nucleo.peso === 2 ? 0.4 : 0.25, nucleo.peso === 2 ? -1 : 2);
      }
      // 4. ondas e traços
      for (const o of ondas) if (o.s.visible) { o.t += dt / 0.3; if (o.t >= 1) { o.s.visible = false; continue; } o.s.scale.setScalar(o.tam * (0.2 + 0.9 * Math.sqrt(o.t))); o.s.material.opacity = (1 - o.t) * 0.9; }
      for (const t of tracos) if (t.m.visible) {
        t.t += dt / 0.22; if (t.t >= 1) { t.m.visible = false; continue; }
        const d = 0.3 + t.t * 1.2; _p.copy(t.base).addScaledVector(t.dir, d); t.m.position.copy(_p);
        t.m.lookAt(_p.clone().add(t.dir)); t.m.rotateY(Math.PI / 2); t.m.scale.set(0.5 * (1 - t.t), 1, 1); t.m.material.opacity = 1 - t.t;
      }
      // partículas
      for (let i = 0; i < N; i++) {
        if (pVida[i] <= 0) { pPos[i * 3 + 1] = -50; continue; }
        pVida[i] -= dt; pV[i * 3 + 1] -= pG[i] * dt;
        for (let k = 0; k < 3; k++) pPos[i * 3 + k] += pV[i * 3 + k] * dt;
        if (pPos[i * 3 + 1] < 0.02) { pPos[i * 3 + 1] = 0.02; pV[i * 3 + 1] = 0; }
      }
      pGeo.attributes.position.needsUpdate = true; pGeo.attributes.color.needsUpdate = true;
      // 7. as nuvens e as marcas
      for (const n of nuvens) if (n.s.visible) { n.t += dt / n.dur; if (n.t >= 1) { n.s.visible = false; continue; } n.s.position.addScaledVector(n.v, dt); n.v.multiplyScalar(Math.exp(-dt * 2.5)); n.s.scale.setScalar(n.tam * (0.5 + n.t)); n.s.material.opacity = 0.55 * (1 - n.t); }
      for (let i = 0; i < MARCAS; i++) {
        marcaVida[i] = Math.max(0, marcaVida[i] - dt / 25);
        const m = marcaInfo[i], k = marcaVida[i] > 0 ? Math.min(1, marcaVida[i] * 4) : 0;
        _e.set(-Math.PI / 2, 0, m.rot); _q.setFromEuler(_e); _s.set(m.r * 2 * k, m.r * 2 * k, 1); _p.set(m.x, 0.014, m.z);
        marcas.setMatrixAt(i, _m.compose(_p, _q, _s));
      }
      marcas.instanceMatrix.needsUpdate = true;
      marcas.material.opacity = 1;
      // 5. o tranco da câmera (quem chama soma em cam.position)
      tranco.forca *= Math.exp(-dt * 9);
      tranco.v.set((Math.random() - 0.5) * tranco.forca, (Math.random() - 0.5) * tranco.forca, (Math.random() - 0.5) * tranco.forca * 0.5);
      return tranco.v;
    },
    rede(e, bolaPos, vel) { return Math.min(1.5, 0.3 + (vel || 6) / 14); },
    get rally() { return rally; },
    limpar() { rally = 0; mostrarRally(); medir.mostrado = true; ultimoAtaque.time = null; nucleo.peso = 0; marcaVida.fill(0); parada.ate = 0; if (elVel) elVel.classList.remove("on"); },
  };
}
