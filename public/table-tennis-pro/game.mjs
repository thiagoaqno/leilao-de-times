import * as THREE from "three";
import { MESA, FISICA, limitar, sinal, criarBola, passoBola, sacar, rebater, preverIntercepcao, vencedorDoGame, sacadorDoPonto } from "./physics.mjs";

const $ = (id) => document.getElementById(id);
const canvas = $("jogo");
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: "high-performance" });
renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 1.4));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.6;

const cena = new THREE.Scene();
cena.background = new THREE.Color("#14264b");
cena.fog = new THREE.Fog("#14264b", 5, 11);
const camera = new THREE.PerspectiveCamera(46, 1, 0.02, 30);
camera.position.set(0, 1.55, -3.25);
camera.lookAt(0, 0.48, 0);
cena.add(new THREE.HemisphereLight(0xf3f8ff, 0x944634, 2.5));
const luz = new THREE.DirectionalLight(0xffffff, 3.5);
luz.position.set(-1.8, 5, -2.5);
luz.castShadow = true;
luz.shadow.mapSize.set(512, 512);
luz.shadow.camera.left = -3;
luz.shadow.camera.right = 3;
luz.shadow.camera.top = 4;
luz.shadow.camera.bottom = -4;
luz.shadow.bias = -0.00025;
cena.add(luz);

const material = (cor, opcoes = {}) => new THREE.MeshStandardMaterial({ color: cor, roughness: 0.68, ...opcoes });
const azul = material("#2d5fa7", { roughness: 0.56 });
const borda = material("#f2f5fc", { roughness: 0.55 });
const estrutura = material("#1c2a45", { metalness: 0.2 });
const piso = new THREE.Mesh(new THREE.PlaneGeometry(14, 14), material("#cf6a56", { roughness: 0.95 }));
piso.rotation.x = -Math.PI / 2;
piso.receiveShadow = true;
cena.add(piso);
const quadra = new THREE.Mesh(new THREE.PlaneGeometry(5.8, 8.8), material("#e77a62", { roughness: 0.95 }));
quadra.rotation.x = -Math.PI / 2;
quadra.position.y = 0.002;
quadra.receiveShadow = true;
cena.add(quadra);
const mesa = new THREE.Mesh(new THREE.BoxGeometry(MESA.largura, 0.055, MESA.comprimento), azul);
mesa.position.y = MESA.topo - 0.0275;
mesa.castShadow = mesa.receiveShadow = true;
cena.add(mesa);
function caixa(cor, x, y, z, w, h, d) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), cor);
  m.position.set(x, y, z);
  m.castShadow = true;
  cena.add(m);
  return m;
}
for (const x of [-1, 1]) for (const z of [-1, 1]) {
  caixa(estrutura, x * (MESA.largura / 2 - 0.16), 0.17, z * (MESA.comprimento / 2 - 0.24), 0.055, 0.34, 0.055);
}
const linhaY = MESA.topo + 0.002;
for (const x of [-1, 1]) caixa(borda, x * (MESA.largura / 2 - 0.012), linhaY, 0, 0.024, 0.004, MESA.comprimento);
for (const z of [-1, 1]) caixa(borda, 0, linhaY, z * (MESA.comprimento / 2 - 0.012), MESA.largura, 0.004, 0.024);
caixa(borda, 0, linhaY, 0, 0.012, 0.004, MESA.comprimento);
const rede = new THREE.Mesh(new THREE.PlaneGeometry(MESA.largura + 0.20, MESA.rede), new THREE.MeshStandardMaterial({ color: 0x0d1732, side: THREE.DoubleSide, transparent: true, opacity: 0.77, roughness: 0.9, depthWrite: false }));
rede.position.y = MESA.topo + MESA.rede / 2;
cena.add(rede);
caixa(borda, 0, MESA.topo + MESA.rede, 0, MESA.largura + 0.20, 0.012, 0.014);
for (const x of [-1, 1]) caixa(estrutura, x * (MESA.largura / 2 + 0.10), MESA.topo + MESA.rede / 2, 0, 0.022, MESA.rede + 0.02, 0.022);

// A malha fina é uma geometria própria para não parecer uma placa sólida.
const fios = [];
for (let i = 0; i <= 36; i++) {
  const x = (i / 36 - 0.5) * (MESA.largura + 0.18);
  fios.push(x, MESA.topo, 0.001, x, MESA.topo + MESA.rede, 0.001);
}
for (let i = 1; i < 8; i++) {
  const y = MESA.topo + i / 8 * MESA.rede;
  fios.push(-(MESA.largura + 0.18) / 2, y, 0.001, (MESA.largura + 0.18) / 2, y, 0.001);
}
const fiosGeo = new THREE.BufferGeometry();
fiosGeo.setAttribute("position", new THREE.Float32BufferAttribute(fios, 3));
cena.add(new THREE.LineSegments(fiosGeo, new THREE.LineBasicMaterial({ color: 0xb9c4d5, transparent: true, opacity: 0.42 })));

// Barreiras e arquibancada mantêm a mesa como foco da tela.
const parede = material("#1d3769", { roughness: 0.95 });
caixa(parede, 0, 0.65, 5.15, 12, 1.3, 0.15);
for (const x of [-3.4, 3.4]) caixa(parede, x, 0.48, 0, 0.10, 0.95, 9);
const faixa = material("#214e91", { roughness: 0.8 });
for (const z of [-2.7, -1.7, -0.7, 0.3, 1.3, 2.3, 3.3]) {
  caixa(faixa, -2.8, 0.47, z, 0.16, 0.55, 0.8);
  caixa(faixa, 2.8, 0.47, z, 0.16, 0.55, 0.8);
}
const publico = new THREE.Group();
for (let i = 0; i < 48; i++) {
  const x = (i % 16 - 7.5) * 0.29;
  const y = 0.95 + Math.floor(i / 16) * 0.21;
  const pessoa = new THREE.Mesh(new THREE.SphereGeometry(0.065, 7, 5), material(["#eea472", "#d5b39a", "#91a8c8", "#efc694"][i % 4], { roughness: 1 }));
  pessoa.position.set(x, y, 5.01 + Math.floor(i / 16) * 0.16);
  publico.add(pessoa);
}
cena.add(publico);

function criarRaquete(cor) {
  const grupo = new THREE.Group();
  const aro = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.028, 36), material("#d8a067", { roughness: 0.7 }));
  aro.rotation.x = Math.PI / 2;
  grupo.add(aro);
  for (const z of [-0.017, 0.017]) {
    const face = new THREE.Mesh(new THREE.CylinderGeometry(0.145, 0.145, 0.006, 36), material(cor, { roughness: 0.94 }));
    face.rotation.x = Math.PI / 2;
    face.position.z = z;
    grupo.add(face);
  }
  const cabo = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.047, 0.24, 12), material("#b57945"));
  cabo.position.y = -0.23;
  grupo.add(cabo);
  cena.add(grupo);
  return grupo;
}
const raquetes = [criarRaquete("#c52231"), criarRaquete("#26252d")];
const esfera = new THREE.Mesh(new THREE.SphereGeometry(0.037, 18, 14), material("#ffdc70", { roughness: 0.38, emissive: 0x6a3108, emissiveIntensity: 0.28 }));
esfera.castShadow = true;
cena.add(esfera);
const sombra = new THREE.Mesh(new THREE.CircleGeometry(0.065, 24), new THREE.MeshBasicMaterial({ color: 0x071026, transparent: true, opacity: 0.28, depthWrite: false }));
sombra.rotation.x = -Math.PI / 2;
cena.add(sombra);
const marcador = new THREE.Mesh(new THREE.RingGeometry(0.065, 0.081, 32), new THREE.MeshBasicMaterial({ color: 0xffd54f, transparent: true, opacity: 0.65, side: THREE.DoubleSide, depthWrite: false }));
marcador.rotation.x = -Math.PI / 2;
marcador.position.y = MESA.topo + 0.009;
cena.add(marcador);
const rastroGeo = new THREE.BufferGeometry();
rastroGeo.setAttribute("position", new THREE.BufferAttribute(new Float32Array(30 * 3), 3));
const rastro = new THREE.Line(rastroGeo, new THREE.LineBasicMaterial({ color: 0xffcc68, transparent: true, opacity: 0.32, depthWrite: false }));
rastro.frustumCulled = false;
cena.add(rastro);
const pontosRastro = [];

const PAISES = ["China", "Japão", "Alemanha", "Coreia do Sul", "França", "Suécia", "Brasil", "Singapura", "Índia", "Argentina"];
const TOTAL = { amistoso: 1, torneio: 4, mundial: 8 };
const IA = {
  facil: { velocidade: 1.75, reacao: 0.19, erro: 0.24, acerto: 0.8 },
  medio: { velocidade: 2.55, reacao: 0.11, erro: 0.10, acerto: 0.93 },
  dificil: { velocidade: 3.35, reacao: 0.06, erro: 0.035, acerto: 0.985 },
};
const estado = {
  tela: "menu", modo: "amistoso", pais: "Brasil", dificuldade: "medio", rodada: 0,
  pontos: [0, 0], sacadorInicial: 0, adversario: "Japão", bola: null, troca: null,
  proximoEm: 0, relogio: 0, avisoAte: 0, alvo: null, ultimoPonto: null,
  raquetes: [{ x: 0, y: 0.68, alvoX: 0, alvoY: 0.68, vx: 0, vy: 0, z: -1.52 },
    { x: 0, y: 0.68, alvoX: 0, alvoY: 0.68, vx: 0, vy: 0, z: 1.52, pensaEm: 0, erro: 0 }],
};
let contextoAudio = null;
function som(freq, duracao = 0.045, volume = 0.045) {
  try {
    contextoAudio ||= new AudioContext();
    const o = contextoAudio.createOscillator();
    const g = contextoAudio.createGain();
    o.type = "triangle";
    o.frequency.setValueAtTime(freq, contextoAudio.currentTime);
    g.gain.setValueAtTime(volume, contextoAudio.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, contextoAudio.currentTime + duracao);
    o.connect(g).connect(contextoAudio.destination);
    o.start();
    o.stop(contextoAudio.currentTime + duracao);
  } catch {}
}
function aviso(texto, duracao = 1.2) {
  $("aviso").textContent = texto;
  $("aviso").classList.add("visivel");
  estado.avisoAte = estado.relogio + duracao;
}
function ajuda(texto) { $("ajuda").textContent = texto; }
function nomeAdversario() {
  const outros = PAISES.filter((p) => p !== estado.pais);
  return outros[(estado.rodada * 3 + (estado.modo === "mundial" ? 2 : 0)) % outros.length];
}
function atualizarPlacar() {
  $("nome0").textContent = estado.pais;
  $("nome1").textContent = estado.adversario;
  $("pts0").textContent = estado.pontos[0];
  $("pts1").textContent = estado.pontos[1];
  $("nome0").classList.toggle("saque", sacadorDoPonto(estado.pontos, estado.sacadorInicial) === 0);
  $("nome1").classList.toggle("saque", sacadorDoPonto(estado.pontos, estado.sacadorInicial) === 1);
}
function prepararPonto() {
  estado.bola = null;
  estado.troca = null;
  estado.alvo = null;
  estado.proximoEm = estado.relogio + 1.15;
  $("sacar").classList.remove("visivel");
}
function novaPartida() {
  estado.tela = "jogo";
  estado.pontos = [0, 0];
  estado.sacadorInicial = Math.random() < 0.5 ? 0 : 1;
  estado.adversario = nomeAdversario();
  estado.relogio = 0;
  estado.raquetes[0].x = estado.raquetes[1].x = 0;
  estado.raquetes[0].y = estado.raquetes[1].y = 0.68;
  $("menu").classList.add("oculta");
  $("pausa").classList.add("oculta");
  $("resultado").classList.add("oculta");
  prepararPonto();
  atualizarPlacar();
  aviso(`Jogo ${estado.rodada + 1}`, 1.1);
  ajuda("Acompanhe a bola. Mova o mouse ou dedo até ela.");
}
function marcarPonto(lado, motivo) {
  if (estado.tela !== "jogo") return;
  estado.pontos[lado]++;
  estado.ultimoPonto = { lado, motivo };
  som(lado === 0 ? 620 : 230, 0.14, 0.06);
  atualizarPlacar();
  aviso(lado === 0 ? "Ponto seu!" : "Ponto do adversário", 1.05);
  ajuda(motivo);
  const vencedor = vencedorDoGame(estado.pontos);
  if (vencedor !== null) {
    estado.tela = "resultado";
    const avancou = vencedor === 0 && estado.rodada + 1 < TOTAL[estado.modo];
    const campeao = vencedor === 0 && !avancou && estado.modo !== "amistoso";
    $("resultado-fase").textContent = estado.modo === "amistoso" ? "Amistoso" : `${estado.modo === "mundial" ? "Mundial" : "Torneio"} · jogo ${estado.rodada + 1} de ${TOTAL[estado.modo]}`;
    $("resultado-titulo").textContent = campeao ? "Você é campeão!" : vencedor === 0 ? "Você venceu!" : "Fim de jogo";
    $("resultado-texto").textContent = `${estado.pais} ${estado.pontos[0]} × ${estado.pontos[1]} ${estado.adversario}. ${avancou ? "O próximo adversário já espera." : motivo}`;
    $("proxima").textContent = avancou ? "Próxima partida" : "Jogar de novo";
    $("resultado").classList.remove("oculta");
    if (avancou) estado.rodada++;
  } else prepararPonto();
}
function registrarBatida(lado, saque = false) {
  const raquete = estado.raquetes[lado];
  let bola;
  if (saque) {
    bola = sacar(lado, raquete.x, limitar(-estado.raquetes[1 - lado].x * 0.5 + (Math.random() - 0.5) * 0.35, -0.6, 0.6));
  } else {
    bola = estado.bola;
    const adversaria = estado.raquetes[1 - lado];
    const erroIA = lado === 1 && Math.random() > IA[estado.dificuldade].acerto;
    const alvoX = lado === 0
      ? limitar(bola.p.x * 0.15 + raquete.vx * 0.16 + (bola.p.x - raquete.x) * 0.65, -0.7, 0.7)
      : erroIA ? (Math.random() < 0.5 ? -1 : 1) * 0.95 : limitar(-adversaria.x * 0.55 + (Math.random() - 0.5) * 0.48, -0.68, 0.68);
    const tempo = lado === 0 ? limitar(1.14 - Math.max(0, raquete.vy) * 0.13, 0.85, 1.2) : 1.0 + Math.random() * 0.24;
    const giro = lado === 0 ? { lateral: limitar(raquete.vx / 3.2, -1, 1), frontal: limitar(raquete.vy / 3, -1, 1) } : { lateral: (Math.random() - 0.5) * 0.7, frontal: (Math.random() - 0.5) * 0.55 };
    rebater(bola, lado, alvoX, 0.85, tempo, giro);
    estado.alvo = { x: alvoX, z: -sinal(lado) * 0.85 };
  }
  estado.bola = bola;
  estado.troca = { ultimo: lado, saque, quiques: [], cruzouRaquete: false };
  pontosRastro.length = 0;
  som(saque ? 560 : 390, 0.055, 0.065);
  if (lado === 0) ajuda(saque ? "Saque: a bola precisa quicar dos dois lados." : "Boa! Veja onde ela vai quicar.");
}
function podeRebater(lado) {
  const troca = estado.troca;
  if (!troca || troca.ultimo === lado) return false;
  return troca.quiques.length === (troca.saque ? 2 : 1);
}
function tratarEvento(evento) {
  const troca = estado.troca;
  if (!troca) return;
  const quemBateu = troca.ultimo;
  if (evento.tipo === "rede") return marcarPonto(1 - quemBateu, "Bola na rede.");
  if (evento.tipo === "fora") return marcarPonto(troca.quiques.length >= (troca.saque ? 2 : 1) ? quemBateu : 1 - quemBateu, "Bola fora.");
  if (evento.tipo !== "mesa") return;
  som(720, 0.033, 0.035);
  const esperado = troca.saque && troca.quiques.length === 0 ? quemBateu : 1 - quemBateu;
  if (evento.lado !== esperado) return marcarPonto(1 - quemBateu, troca.saque ? "Saque irregular." : "Quique do lado errado.");
  troca.quiques.push(evento.lado);
  if (troca.quiques.length > (troca.saque ? 2 : 1)) marcarPonto(quemBateu, "Dois quiques sem devolução.");
}
function movimentarIA(dt) {
  const ia = estado.raquetes[1], config = IA[estado.dificuldade];
  ia.pensaEm -= dt;
  if (ia.pensaEm <= 0) {
    ia.pensaEm = config.reacao;
    if (estado.bola && estado.troca && estado.troca.ultimo === 0) {
      const previsto = preverIntercepcao(estado.bola, 1, ia.z);
      if (previsto) {
        if (!estado.troca.erroDefinido) {
          estado.troca.erroDefinido = true;
          ia.erro = (Math.random() - 0.5) * 2 * config.erro;
        }
        ia.alvoX = limitar(previsto.x + ia.erro, -0.94, 0.94);
        ia.alvoY = limitar(previsto.y, 0.47, 1.14);
      }
    } else {
      ia.alvoX = 0;
      ia.alvoY = 0.67;
    }
  }
  const xAnterior = ia.x, yAnterior = ia.y;
  ia.x += limitar(ia.alvoX - ia.x, -config.velocidade * dt, config.velocidade * dt);
  ia.y += limitar(ia.alvoY - ia.y, -config.velocidade * dt, config.velocidade * dt);
  ia.vx = (ia.x - xAnterior) / dt;
  ia.vy = (ia.y - yAnterior) / dt;
}
function atualizar(dt) {
  if (estado.tela !== "jogo") return;
  estado.relogio += dt;
  if (estado.avisoAte && estado.relogio > estado.avisoAte) {
    estado.avisoAte = 0;
    $("aviso").classList.remove("visivel");
  }
  const humana = estado.raquetes[0];
  humana.x += (humana.alvoX - humana.x) * Math.min(1, dt * 32);
  humana.y += (humana.alvoY - humana.y) * Math.min(1, dt * 32);
  if (performance.now() - ultimaEntrada > 100) { humana.vx *= 0.85; humana.vy *= 0.85; }
  movimentarIA(dt);
  if (!estado.bola && estado.proximoEm !== -Infinity && estado.relogio >= estado.proximoEm) {
    const sacador = sacadorDoPonto(estado.pontos, estado.sacadorInicial);
    if (sacador === 0) {
      $("sacar").classList.add("visivel");
      ajuda("Posicione a raquete e clique ou toque para sacar.");
      estado.proximoEm = -Infinity;
    } else {
      $("sacar").classList.remove("visivel");
      registrarBatida(1, true);
      aviso("Saque do adversário", 0.7);
      estado.proximoEm = Infinity;
    }
  }
  if (!estado.bola || !estado.bola.ativa) return;
  const zAntes = estado.bola.p.z;
  const xAntes = estado.bola.p.x, yAntes = estado.bola.p.y;
  const eventos = passoBola(estado.bola, dt);
  for (const evento of eventos) {
    tratarEvento(evento);
    if (estado.tela !== "jogo" || !estado.bola) return;
  }
  if (!estado.bola || !estado.bola.ativa || !estado.troca) return;
  const lado = estado.bola.v.z < 0 ? 0 : 1;
  const raquete = estado.raquetes[lado];
  if ((zAntes - raquete.z) * (estado.bola.p.z - raquete.z) <= 0 && podeRebater(lado) && !estado.troca.cruzouRaquete) {
    estado.troca.cruzouRaquete = true;
    const f = (raquete.z - zAntes) / (estado.bola.p.z - zAntes);
    const x = xAntes + (estado.bola.p.x - xAntes) * f;
    const y = yAntes + (estado.bola.p.y - yAntes) * f;
    if (Math.abs(x - raquete.x) <= 0.23 && Math.abs(y - raquete.y) <= 0.26) {
      estado.bola.p = { x, y, z: raquete.z };
      registrarBatida(lado);
    } else if (lado === 0) ajuda("Você passou longe da bola. Acompanhe o próximo saque.");
  }
}

let ultimaEntrada = 0;
const posicaoPonteiro = new THREE.Vector3();
function moverPonteiro(evento) {
  if (estado.tela !== "jogo") return;
  const area = canvas.getBoundingClientRect();
  const nx = (evento.clientX - area.left) / area.width;
  const ny = (evento.clientY - area.top) / area.height;
  const raquete = estado.raquetes[0];
  posicaoPonteiro.set(nx * 2 - 1, 1 - ny * 2, 0.5).unproject(camera);
  const fracao = (raquete.z - camera.position.z) / (posicaoPonteiro.z - camera.position.z);
  const x = limitar(camera.position.x + (posicaoPonteiro.x - camera.position.x) * fracao, -0.95, 0.95);
  const y = limitar(camera.position.y + (posicaoPonteiro.y - camera.position.y) * fracao, 0.46, 1.13);
  const agora = performance.now();
  const dt = limitar((agora - ultimaEntrada) / 1000 * FISICA.escalaTempo, 0.015, 0.14);
  raquete.vx = limitar((x - raquete.alvoX) / dt, -4, 4);
  raquete.vy = limitar((y - raquete.alvoY) / dt, -4, 4);
  raquete.alvoX = x;
  raquete.alvoY = y;
  ultimaEntrada = agora;
}
canvas.addEventListener("pointermove", moverPonteiro);
canvas.addEventListener("pointerdown", (evento) => { moverPonteiro(evento); tentarSaque(); });
function tentarSaque() {
  if (estado.tela !== "jogo" || estado.bola || sacadorDoPonto(estado.pontos, estado.sacadorInicial) !== 0 || estado.relogio < estado.proximoEm) return;
  $("sacar").classList.remove("visivel");
  registrarBatida(0, true);
}
$("sacar").onclick = tentarSaque;

function desenhar() {
  for (let i = 0; i < 2; i++) {
    const r = estado.raquetes[i];
    raquetes[i].position.set(r.x, r.y, r.z);
    raquetes[i].rotation.z = limitar(-r.vx * 0.08, -0.24, 0.24);
    raquetes[i].rotation.x = i === 0 ? -0.10 : 0.10;
  }
  const b = estado.bola;
  esfera.visible = sombra.visible = !!b && b.ativa;
  marcador.visible = !!b && b.ativa && !!estado.alvo;
  rastro.visible = !!b && b.ativa && pontosRastro.length > 1;
  if (b && b.ativa) {
    esfera.position.set(b.p.x, b.p.y, b.p.z);
    esfera.rotation.z += b.giro.lateral * 0.04;
    esfera.rotation.x += b.giro.frontal * 0.04;
    sombra.position.set(b.p.x, Math.abs(b.p.x) <= MESA.largura / 2 && Math.abs(b.p.z) <= MESA.comprimento / 2 ? MESA.topo + 0.008 : 0.008, b.p.z);
    sombra.material.opacity = limitar(0.3 - (b.p.y - MESA.topo) * 0.15, 0.07, 0.3);
    if (estado.alvo) marcador.position.set(estado.alvo.x, MESA.topo + 0.009, estado.alvo.z);
    pontosRastro.push([b.p.x, b.p.y, b.p.z]);
    if (pontosRastro.length > 30) pontosRastro.shift();
    const pos = rastroGeo.attributes.position;
    for (let i = 0; i < 30; i++) {
      const p = pontosRastro[Math.min(i, pontosRastro.length - 1)] || [b.p.x, b.p.y, b.p.z];
      pos.setXYZ(i, p[0], p[1], p[2]);
    }
    pos.needsUpdate = true;
    rastroGeo.setDrawRange(0, pontosRastro.length);
  }
  renderer.render(cena, camera);
}
function redimensionar() {
  const largura = innerWidth, altura = innerHeight;
  renderer.setSize(largura, altura, false);
  camera.aspect = largura / altura;
  camera.fov = largura < 650 ? 65 : 46;
  camera.position.y = largura < 650 ? 1.3 : 1.55;
  camera.position.z = largura < 650 ? -4.5 : -3.25;
  camera.lookAt(0, largura < 650 ? 0.43 : 0.48, 0);
  camera.updateProjectionMatrix();
}
addEventListener("resize", redimensionar);
redimensionar();
let anterior = performance.now(), acumulado = 0;
function quadro(agora) {
  const dtReal = Math.min(0.15, (agora - anterior) / 1000);
  anterior = agora;
  if (estado.tela === "jogo") {
    acumulado += dtReal * FISICA.escalaTempo;
    let passos = 0;
    while (acumulado >= FISICA.passo && passos++ < 24) {
      atualizar(FISICA.passo);
      acumulado -= FISICA.passo;
    }
  } else acumulado = 0;
  desenhar();
  requestAnimationFrame(quadro);
}
requestAnimationFrame(quadro);

function menu() {
  estado.tela = "menu";
  estado.bola = null;
  estado.troca = null;
  $("menu").classList.remove("oculta");
  $("pausa").classList.add("oculta");
  $("resultado").classList.add("oculta");
  $("sacar").classList.remove("visivel");
  ajuda("Mova a raquete com o mouse ou dedo. Clique para sacar.");
}
$("modos").addEventListener("click", (evento) => {
  const botao = evento.target.closest("[data-modo]");
  if (!botao) return;
  estado.modo = botao.dataset.modo;
  estado.rodada = 0;
  for (const item of $("modos").querySelectorAll(".opcao")) item.classList.toggle("ativa", item === botao);
  $("fase").textContent = estado.modo === "amistoso" ? "" : `${TOTAL[estado.modo]} partidas para chegar ao título.`;
});
$("comecar").onclick = () => {
  estado.pais = $("pais").value;
  estado.dificuldade = $("dificuldade").value;
  novaPartida();
};
$("pausar").onclick = () => {
  if (estado.tela !== "jogo") return;
  estado.tela = "pausa";
  $("pausa").classList.remove("oculta");
};
$("continuar").onclick = () => {
  estado.tela = "jogo";
  $("pausa").classList.add("oculta");
  anterior = performance.now();
};
$("sair").onclick = menu;
$("resultado-sair").onclick = menu;
$("proxima").onclick = () => {
  if ($("proxima").textContent === "Jogar de novo") estado.rodada = 0;
  novaPartida();
};
addEventListener("keydown", (evento) => {
  if (evento.key === "Escape") {
    if (estado.tela === "jogo") $("pausar").click();
    else if (estado.tela === "pausa") $("continuar").click();
  }
  if (evento.code === "Space" && estado.tela === "jogo") { evento.preventDefault(); tentarSaque(); }
});

// Interface pequena para inspeção manual, sem influenciar a simulação.
if (location.hash === "#debug") window.__tableTennisPro = { estado, atualizar, passoBola, tentarSaque, marcarPonto };
