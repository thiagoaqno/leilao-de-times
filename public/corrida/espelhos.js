// Corrida da Galera — os retrovisores do carro do jogador (o modelo de 2026 tem os dois espelhos, f1-2026.js: `D.espelhos`, a face de trás de cada carcaça).
// A imagem de cada espelho é a TEXTURA de um plano fino, filho do carro (`kt.carro`), colado na face da carcaça com a mesma posição e orientação dela: acompanha o carro
// e aparece em qualquer câmera em que o espelho esteja à vista. A textura vem de uma câmera virada para trás, saindo do espelho, na direção em que o piloto o vê
// (o raio do olho dele até o espelho, refletido pela normal da face), com a imagem espelhada (esquerda e direita trocadas).
// Fica barato: só o carro do jogador, baixa resolução (256 de largura), meia taxa (um espelho por quadro; nas câmeras de fora, um a cada quatro e só de perto),
// sem sombras novas (o mapa de sombra do quadro principal é reaproveitado) e sem o pós-processamento (o desenho vai direto na imagem). Desligado na qualidade Baixa.
import * as THREE from "three";
import { renderer, scene, cam } from "./cena.js";
import { qualidade } from "./qualidade.js";

const LARG = 256, FOV_H = 34 * Math.PI / 180, ABRE = 15 * Math.PI / 180, BAIXA = 3 * Math.PI / 180, DE_DENTRO = new Set(["cockpit", "onboard", "bico"]), PERTO = 120; // PERTO: até onde (unidades) uma câmera de fora ainda refaz o espelho
const GEO = new THREE.PlaneGeometry(1, 1);
const v = new THREE.Vector3(), d = new THREE.Vector3(), cima = new THREE.Vector3(), olho = new THREE.Vector3(), M = new THREE.Matrix4();
let contador = 0;

function criar(kart) {
  const kt = kart.kt, lista = kt.espelhos; if (!lista || !lista.length || !kt.carro) return null;
  const eye = new THREE.Vector3(0, kt.olho ? kt.olho.y : 0.84, kt.olho ? kt.olho.z : 0.3); // a cabeça do piloto, no quadro do carro
  const itens = lista.map((e) => {
    const centro = new THREE.Vector3(...e.centro), n = new THREE.Vector3(...e.n), r = new THREE.Vector3(...e.r), u = new THREE.Vector3(...e.u);
    const razao = Math.max(1.5, Math.min(6, e.w / e.h)), alt = Math.max(48, Math.min(128, Math.round(LARG / razao)));
    const rt = new THREE.WebGLRenderTarget(LARG, alt, { type: THREE.HalfFloatType, generateMipmaps: false });
    rt.texture.wrapS = THREE.RepeatWrapping; rt.texture.repeat.x = -1; rt.texture.offset.x = 1; // espelhada
    const mat = new THREE.MeshBasicMaterial({ map: rt.texture }), painel = new THREE.Mesh(GEO, mat);
    painel.scale.set(e.w * 0.98, e.h * 0.98, 1); painel.position.copy(centro).addScaledVector(n, 0.004); painel.quaternion.setFromRotationMatrix(M.makeBasis(r, u, n)); // (o plano olha para onde a face olha)
    painel.castShadow = false; painel.receiveShadow = false; painel.name = "espelho-vidro"; kt.carro.add(painel);
    // para onde o espelho olha: o raio do olho do piloto até ele, refletido pela normal (no quadro do carro; a cada quadro vai para o mundo pela matriz do carro)
    // (como o piloto regula o retrovisor de verdade: para trás (+z no carro), aberto ABRE para fora e um pouco para baixo, com o campo estreito de um espelho;
    // assim se vê a pista e os carros atrás e, na borda de dentro, só um pedacinho da lateral do próprio carro. O raio do olho refletido pela face
    // apontava para a carroceria)
    const lado = Math.sign(centro.x || 1), refl = new THREE.Vector3(lado * Math.sin(ABRE), -Math.sin(BAIXA), Math.cos(ABRE)).normalize(); void eye; void n;
    const camera = new THREE.PerspectiveCamera(2 * Math.atan(Math.tan(FOV_H / 2) / razao) * 180 / Math.PI, razao, 0.5, 1800);
    return { e, centro: centro.clone().addScaledVector(n, 0.03), refl, rt, mat, painel, cam: camera, feito: false };
  });
  return (kart.espelho = { itens });
}

function desenhar(it, kart, todos) {
  const carro = kart.kt.carro; carro.updateWorldMatrix(true, false);
  v.copy(it.centro).applyMatrix4(carro.matrixWorld); // um pouco à frente da face (a câmera não fica dentro da peça)
  d.copy(it.refl).transformDirection(carro.matrixWorld);
  cima.set(0, 1, 0).transformDirection(carro.matrixWorld);
  it.cam.position.copy(v); it.cam.up.copy(cima); it.cam.lookAt(v.x + d.x, v.y + d.y, v.z + d.z);
  const antes = renderer.getRenderTarget(), sombra = renderer.shadowMap.autoUpdate;
  for (const o of todos) o.painel.visible = false; // (o painel não aparece no próprio desenho)
  renderer.shadowMap.autoUpdate = false;
  try { renderer.setRenderTarget(it.rt); renderer.render(scene, it.cam); }
  finally { renderer.setRenderTarget(antes); renderer.shadowMap.autoUpdate = sombra; for (const o of todos) o.painel.visible = true; }
  it.feito = true;
}

// chamado uma vez por quadro (jogo.js), antes de desenhar a cena principal. `modo` é a câmera que se vê.
export function quadroEspelhos(kart, modo) {
  if (!kart || !kart.kt) return;
  let E = kart.espelho;
  if (qualidade() === "baixa" || !kart.g.visible) { if (E) for (const it of E.itens) it.painel.visible = false; return; }
  E = E || criar(kart); if (!E) return;
  const dentro = DE_DENTRO.has(modo);
  if (!dentro && modo !== "perto" && modo !== "longe") { for (const it of E.itens) it.painel.visible = it.feito; return; } // aérea e TV: ficam com a última imagem
  const primeiro = E.itens.some((it) => !it.feito);
  if (primeiro) { for (const it of E.itens) if (!it.feito) desenhar(it, kart, E.itens); return; } // o primeiro desenho de cada um sai na hora
  contador++;
  if (!dentro) { // de fora o espelho é pequeno: só perto do carro e um desenho a cada quatro quadros
    olho.setFromMatrixPosition(kart.kt.carro.matrixWorld); if (olho.distanceTo(cam.position) > PERTO || contador % 2) { for (const it of E.itens) it.painel.visible = true; return; }
  }
  desenhar(E.itens[(contador >> (dentro ? 0 : 1)) % E.itens.length], kart, E.itens);
}

export function soltarEspelhos(kart) {
  const E = kart && kart.espelho; if (!E) return;
  for (const it of E.itens) { it.painel.parent?.remove(it.painel); it.mat.dispose(); it.rt.dispose(); }
  kart.espelho = null;
}
