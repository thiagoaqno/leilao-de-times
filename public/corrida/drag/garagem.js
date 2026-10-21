// A garagem do drag: a casa do seu carro, numa rua à meia-noite (asfalto molhado, porta de enrolar com o letreiro de
// neon, poste de luz de sódio e a galera parada em volta). É o lobby: escolhe o carro, vê a ficha e personaliza
// (pintura, neon, faróis e a chama do nitro, guardados por carro em modelos.js). main.js monta o carro e manda mostrar.
import * as THREE from "three";
import * as L from "./logic.mjs";
import { PINTURAS, NEONS, FAROIS, CHAMAS, visualDe, salvarVisual } from "./modelos.js";

const $ = (id) => document.getElementById(id);

export function criarGaragem({ scene, pmrem, fotoNoitePronta, aplicarAmbiente, canvasTex, TEX, placa, brilhoMat, aditivo, carroProcedural, soltarCarro, remontar }) {
  const grupo = new THREE.Group(); grupo.visible = false; scene.add(grupo);
  const CUBO = new THREE.BoxGeometry(1, 1, 1), CHAO = new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2);
  const mat = (color, opt = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.8, metalness: 0.1, ...opt });
  const caixa = (material, [sx, sy, sz], [x, y, z], pai = grupo) => { const m = new THREE.Mesh(CUBO, material); m.scale.set(sx, sy, sz); m.position.set(x, y, z); pai.add(m); return m; };

  // O ar da rua: céu roxo-escuro com o brilho da cidade embaixo, névoa e pouca luz ambiente.
  const ceuTex = canvasTex(1024, 512, (g, w, h) => {
    const gr = g.createLinearGradient(0, 0, 0, h);
    gr.addColorStop(0, "#040208"); gr.addColorStop(0.42, "#120a22"); gr.addColorStop(0.5, "#3a1640"); gr.addColorStop(0.54, "#12081c"); gr.addColorStop(1, "#000");
    g.fillStyle = gr; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 700; i++) { g.fillStyle = ["rgba(255,60,200,.7)", "rgba(60,220,255,.7)", "rgba(255,190,110,.7)"][i % 3]; g.fillRect(Math.random() * w, h * 0.46 + Math.random() * h * 0.06, 2, 2); }
  });
  ceuTex.mapping = THREE.EquirectangularReflectionMapping;
  const ambiente = { env: pmrem.fromEquirectangular(ceuTex).texture, envIntensidade: 0.7, fundo: "#06030b", fog: new THREE.Fog(0x0b0614, 18, 95), hemi: [0x8a6cff, 0x0a0610, 0.32], lua: 0.15 };
  const ceu = new THREE.Mesh(new THREE.SphereGeometry(300, 32, 16), new THREE.MeshBasicMaterial({ map: ceuTex, side: THREE.BackSide, fog: false, depthWrite: false }));
  ceu.renderOrder = -1; grupo.add(ceu);
  // chegando a foto do céu da meia-noite (main.js), ela vira o céu e o reflexo da garagem, puxada para o roxo
  fotoNoitePronta.then((foto) => {
    if (!foto) return;
    ceu.material.map = foto; ceu.material.color.setRGB(0.62, 0.5, 0.78); ceu.material.needsUpdate = true;
    const velho = ambiente.env; ambiente.env = pmrem.fromEquirectangular(foto).texture; velho.dispose();
    if (grupo.visible) aplicarAmbiente(ambiente);
  });

  // O asfalto molhado, com as poças refletindo o neon
  const asfalto = canvasTex(512, 512, (g, w, h) => {
    g.fillStyle = "#1a1b20"; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 12000; i++) { const c = 18 + Math.random() * 30; g.fillStyle = `rgba(${c},${c},${c + 6},${Math.random() * 0.6})`; g.fillRect(Math.random() * w, Math.random() * h, 2, 2); }
    g.fillStyle = "#d9d9d0"; for (let x = 0; x < w; x += 128) g.fillRect(x, h * 0.62, 64, 6); // a faixa da rua
  }, { repetir: true });
  asfalto.repeat.set(10, 10);
  const chao = new THREE.Mesh(new THREE.PlaneGeometry(120, 120).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ map: asfalto, roughness: 0.22, metalness: 0.35, envMapIntensity: 1.6 }));
  grupo.add(chao);
  const calcada = mat(0x3a3a40, { roughness: 0.6 });
  caixa(calcada, [40, 0.18, 4], [0, 0.09, -8.6]);

  // O galpão: parede de tijolo, a porta de enrolar aberta com a luz de dentro, o letreiro e os tubos de neon
  const tijolo = canvasTex(256, 256, (g, w, h) => {
    g.fillStyle = "#1c1216"; g.fillRect(0, 0, w, h);
    for (let y = 0; y < h; y += 16) for (let x = (y / 16) % 2 ? -16 : 0; x < w; x += 32) { const c = 40 + Math.random() * 22; g.fillStyle = `rgb(${c + 10},${c * 0.55},${c * 0.5})`; g.fillRect(x + 1, y + 1, 30, 14); }
  }, { repetir: true });
  tijolo.repeat.set(8, 3);
  caixa(new THREE.MeshStandardMaterial({ map: tijolo, roughness: 0.9 }), [30, 9, 0.6], [0, 4.5, -10.8]);
  const dentro = new THREE.MeshBasicMaterial({ map: canvasTex(256, 128, (g, w, h) => {
    const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, "#5a4a3a"); gr.addColorStop(1, "#c8a070"); g.fillStyle = gr; g.fillRect(0, 0, w, h);
    g.fillStyle = "#2a2220"; for (let x = 12; x < w; x += 40) g.fillRect(x, h * 0.35, 22, h * 0.5); // prateleiras e pneus lá dentro
  }) });
  const porta = new THREE.Mesh(new THREE.PlaneGeometry(7, 3.8), dentro); porta.position.set(0, 1.9, -10.48); grupo.add(porta);
  const enrolada = canvasTex(64, 64, (g, w, h) => { g.fillStyle = "#6a6d72"; g.fillRect(0, 0, w, h); g.fillStyle = "#3a3c40"; for (let y = 0; y < h; y += 8) g.fillRect(0, y, w, 2); }, { repetir: true });
  caixa(new THREE.MeshStandardMaterial({ map: enrolada, metalness: 0.6, roughness: 0.4 }), [7.2, 0.9, 0.3], [0, 4.25, -10.4]);
  const letreiro = new THREE.Mesh(new THREE.PlaneGeometry(8.4, 1.3), new THREE.MeshBasicMaterial({ map: placa("GARAGEM DA GALERA", { fundo: "#0a0610", cor: "#ff3fb4", w: 1024, h: 160, borda: "#2be8ff" }), color: new THREE.Color(1.6, 1.6, 1.6) }));
  letreiro.position.set(0, 5.6, -10.46); grupo.add(letreiro);
  const neonRosa = brilhoMat(0xff2bd6, 3), neonCiano = brilhoMat(0x2be8ff, 3), sodio = brilhoMat(0xffa040, 3.5);
  caixa(neonRosa, [28, 0.08, 0.08], [0, 8.7, -10.45]);
  for (const x of [-4.4, 4.4]) caixa(neonCiano, [0.08, 3.6, 0.08], [x, 1.9, -10.45]);
  // a luz de dentro da garagem esparramando no chão, e as poças de neon
  const pocas = [[0, -7.2, 0xffc890, 9, 6, 0.55], [-6, -4, 0xff2bd6, 7, 5, 0.35], [6.5, -3, 0x2be8ff, 6, 6, 0.35], [8.5, 3, 0xffa040, 9, 9, 0.5]];
  for (const [x, z, cor, sx, sz, op] of pocas) { const p = new THREE.Mesh(CHAO, aditivo(TEX.poça, cor, op)); p.scale.set(sx, 1, sz); p.position.set(x, 0.02, z); grupo.add(p); }
  // o poste de luz de sódio
  const ferro = mat(0x2c3036, { metalness: 0.6, roughness: 0.4 });
  caixa(ferro, [0.22, 8, 0.22], [9.5, 4, 1.5]); caixa(ferro, [2.4, 0.14, 0.2], [8.4, 7.9, 1.5]); caixa(sodio, [0.9, 0.16, 0.4], [7.4, 7.7, 1.5]);
  // pneus empilhados e cones perto da parede
  const pneuGeo = new THREE.TorusGeometry(0.34, 0.16, 8, 18).rotateX(Math.PI / 2), pneu = mat(0x0c0c0d, { roughness: 0.95 });
  for (const [x, z, n] of [[-7.5, -9.6, 4], [-6.6, -9.4, 3], [7.4, -9.5, 2]]) for (let i = 0; i < n; i++) { const p = new THREE.Mesh(pneuGeo, pneu); p.position.set(x, 0.17 + i * 0.32, z); grupo.add(p); }
  const coneGeo = new THREE.ConeGeometry(0.22, 0.7, 10).translate(0, 0.35, 0), cone = mat(0xff5a00, { emissive: 0x401000 });
  for (const [x, z] of [[5.2, -8.2], [5.8, -7.6]]) { const c = new THREE.Mesh(coneGeo, cone); c.position.set(x, 0, z); grupo.add(c); }
  // a cidade lá atrás
  const janelas = TEX.janelas.clone(); janelas.repeat.set(3, 5); janelas.needsUpdate = true;
  const predioMat = new THREE.MeshBasicMaterial({ map: janelas, color: 0x9a90b0 });
  for (let i = 0; i < 26; i++) { const h = 14 + Math.random() * 40, x = -90 + i * 7 + Math.random() * 3; caixa(predioMat, [6 + Math.random() * 5, h, 8], [x, h / 2, -38 - Math.random() * 30]); }
  // a galera parada em volta: dois carros com o neon aceso
  for (const [x, z, giro, cor, neon] of [[-5.6, 0.6, 0.5, 0x1a1a22, 0xff2bd6], [5.4, -1.4, -0.65, 0xd8d8d0, 0x2bff88]]) {
    const c = carroProcedural("esporte", cor, neon); c.position.set(x, 0, z); c.rotation.y = giro; grupo.add(c);
  }
  // As luzes: o refletor em cima do seu carro e o neon pintando as laterais
  const refletor = new THREE.SpotLight(0xfff2e0, 60, 22, 0.55, 0.6, 1.2); refletor.position.set(0.5, 7.5, 2); refletor.target.position.set(0, 0, 0); grupo.add(refletor, refletor.target);
  const luzRosa = new THREE.PointLight(0xff2bd6, 7, 14, 1.4); luzRosa.position.set(-4.5, 2.2, -3); grupo.add(luzRosa);
  const luzCiano = new THREE.PointLight(0x2be8ff, 8, 14, 1.4); luzCiano.position.set(4.5, 2.2, -2); grupo.add(luzCiano);
  const luzSodio = new THREE.PointLight(0xffa040, 18, 16, 1.4); luzSodio.position.set(7.4, 7, 1.5); grupo.add(luzSodio);

  // ---------- o carro em exposição ----------
  let carro = null, modo = "lobby", angulo = 0.6;
  function mostrarCarro(obj) {
    if (carro) { grupo.remove(carro); soltarCarro(carro); }
    carro = obj; carro.rotation.y = -0.35; grupo.add(carro);
    for (const c of carro.userData.chamas || []) c.visible = false;
  }
  function mostrar() { grupo.visible = true; aplicarAmbiente(ambiente); }
  function esconder() { grupo.visible = false; }
  const alvo = new THREE.Vector3(), lado = new THREE.Vector3(), olhar = new THREE.Vector3(0, 0.6, 0);
  function cameraNoLobby(cam, dt, t, reduzido) {
    if (!reduzido) angulo += dt * (modo === "oficina" ? 0.12 : 0.07);
    const r = modo === "oficina" ? 5.4 : 7.2, y = modo === "oficina" ? 1.35 : 1.8;
    alvo.set(Math.sin(angulo) * r, y, Math.cos(angulo) * r);
    cam.position.lerp(alvo, Math.min(1, dt * 2.5));
    // na oficina o painel cobre um lado (ou a parte de baixo, no celular): a câmera olha para o lado dele e o carro
    // aparece na parte livre da tela
    alvo.set(0, 0.75, 0);
    if (modo === "oficina") {
      if (innerWidth > 900) alvo.add(lado.set(Math.cos(angulo), 0, -Math.sin(angulo)).multiplyScalar(-1.2));
      else alvo.y = -0.7;
    }
    olhar.lerp(alvo, Math.min(1, dt * 2.5));
    cam.lookAt(olhar);
    cam.fov += (50 - cam.fov) * Math.min(1, dt * 3); cam.updateProjectionMatrix();
    if (carro?.userData.neon) carro.userData.neon.material.opacity = 0.85 + Math.sin(t * 0.003) * 0.1;
    letreiro.material.color.setScalar(Math.random() < 0.004 ? 0.4 : 1.6); // o neon que falha de vez em quando
  }

  // ---------- a ficha do carro ----------
  const faixa = (v, a, b) => Math.round(Math.max(0.08, Math.min(1, (v - a) / (b - a))) * 100);
  function mostrarFicha(id) {
    const c = L.CARROS[id];
    $("ficha").innerHTML = [["Força", faixa(c.forca, 0.85, 1.12)], ["Final", faixa(c.marchas.at(-1), 215, 300)], ["Nitro", faixa(c.nitro, 3.2, 5.3)]]
      .map(([n, v]) => `<div><span>${n}</span><i><b style="width:${v}%"></b></i></div>`).join("") +
      `<small>${c.marchas.at(-1)} km/h · ${c.nitro.toFixed(1)} s de N2O</small>`;
    montarOficina(id);
  }

  // ---------- a oficina: pintura, neon, faróis e chama ----------
  let carroDaOficina = null;
  const LINHAS = [["pintura", "Pintura", PINTURAS], ["neon", "Neon", NEONS], ["farol", "Faróis", FAROIS], ["chama", "Chama do nitro", CHAMAS]];
  function montarOficina(id) {
    carroDaOficina = id;
    const v = visualDe(id, L.CARROS[id].neon);
    $("oficinaLinhas").innerHTML = LINHAS.map(([chave, titulo, lista]) => `<div class="linha-of"><b>${titulo}</b><div class="amostras">${lista.map((o, i) =>
      `<button class="amostra${(v[chave] || null) === o.cor ? " on" : ""}${o.cor ? "" : " vazia"}" data-chave="${chave}" data-i="${i}" style="--c:${o.cor || "transparent"}" title="${o.nome}" aria-label="${titulo}: ${o.nome}"></button>`).join("")}</div></div>`).join("");
  }
  $("oficinaLinhas").addEventListener("click", (e) => {
    const b = e.target.closest(".amostra"); if (!b || !carroDaOficina) return;
    const lista = LINHAS.find(([k]) => k === b.dataset.chave)[2], v = visualDe(carroDaOficina, L.CARROS[carroDaOficina].neon);
    v[b.dataset.chave] = lista[+b.dataset.i].cor; salvarVisual(carroDaOficina, v);
    b.parentElement.querySelectorAll(".amostra").forEach((x) => x.classList.toggle("on", x === b));
    remontar();
  });
  const abrirOficina = (abrir) => { modo = abrir ? "oficina" : "lobby"; document.body.classList.toggle("na-oficina", abrir); };
  $("garagemBtn").onclick = () => abrirOficina(true);
  $("oficinaPronto").onclick = () => abrirOficina(false);
  $("oficinaReset").onclick = () => { if (!carroDaOficina) return; salvarVisual(carroDaOficina, {}); montarOficina(carroDaOficina); remontar(); };

  // o relógio da rua: aqui é sempre quase meia-noite (abre às 23:58 e anda no ritmo de verdade)
  const abriu = Date.now();
  const relogio = () => { const m = (23 * 60 + 58 + Math.floor((Date.now() - abriu) / 60000)) % 1440; $("relogio").innerHTML = `${String(Math.floor(m / 60)).padStart(2, "0")}<i>:</i>${String(m % 60).padStart(2, "0")}`; };
  relogio(); setInterval(relogio, 5000);

  return { grupo, mostrarCarro, mostrarFicha, mostrar, esconder, camera: cameraNoLobby, fecharOficina: () => abrirOficina(false) };
}
