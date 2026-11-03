// Corrida da Galera — os retrovisores do carro do jogador (o modelo de 2026 tem os dois espelhos, f1-2026.js: `D.espelhos`). Cada espelho mostra o que
// está atrás: uma câmera virada para trás, saindo do espelho, desenha numa imagem pequena (256×100) que vai num painel colado na face de trás do espelho,
// com a imagem espelhada (esquerda e direita trocadas, como num espelho de verdade).
// Fica barato: só o carro do jogador, só nas câmeras de cockpit e T-cam (as únicas em que os espelhos aparecem), baixa resolução, meia taxa (um espelho por
// quadro, então cada um se refaz a cada dois quadros), sem sombras novas (o mapa de sombra do quadro principal é reaproveitado) e sem o pós-processamento
// (o desenho vai direto na imagem). Desligado na qualidade Baixa.
import * as THREE from "three";
import { renderer, scene } from "./cena.js";
import { qualidade } from "./qualidade.js";

const LARG = 256, ALT = 100, FOV = 21, FORA = (8 * Math.PI) / 180; // o espelho olha 8° para fora do carro, como o ajuste de um piloto
const GEO = new THREE.PlaneGeometry(1, 1);
const v = new THREE.Vector3(), d = new THREE.Vector3(), cima = new THREE.Vector3();
let contador = 0;

function criar(kart) {
  const kt = kart.kt, lista = kt.espelhos; if (!lista || !lista.length || !kt.carro) return null;
  const itens = lista.map((e) => {
    const rt = new THREE.WebGLRenderTarget(LARG, ALT, { type: THREE.HalfFloatType, generateMipmaps: false });
    rt.texture.wrapS = THREE.RepeatWrapping; rt.texture.repeat.x = -1; rt.texture.offset.x = 1; // espelhada
    const mat = new THREE.MeshBasicMaterial({ map: rt.texture }), painel = new THREE.Mesh(GEO, mat);
    const larg = e.w * 0.94; painel.scale.set(larg, larg * ALT / LARG, 1); painel.position.set(e.x, e.y, e.z + 0.004); painel.castShadow = false; painel.receiveShadow = false; painel.name = "espelho-vidro";
    kt.carro.add(painel);
    return { e, rt, mat, painel, cam: new THREE.PerspectiveCamera(FOV, LARG / ALT, 0.5, 1800), feito: false };
  });
  return (kart.espelho = { itens });
}

function desenhar(it, kart, todos) {
  const carro = kart.kt.carro; carro.updateWorldMatrix(true, false);
  v.set(it.e.x, it.e.y, it.e.z + 0.03).applyMatrix4(carro.matrixWorld); // um pouco atrás da face do espelho (a câmera não fica dentro da peça)
  d.set(Math.sin(FORA) * Math.sign(it.e.x || 1), 0, Math.cos(FORA)).transformDirection(carro.matrixWorld);
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
  const ligado = (modo === "cockpit" || modo === "onboard") && qualidade() !== "baixa" && kart.g.visible;
  let E = kart.espelho;
  if (!ligado) { if (E) for (const it of E.itens) it.painel.visible = false; return; }
  E = E || criar(kart); if (!E) return;
  for (const it of E.itens) if (!it.feito) desenhar(it, kart, E.itens); // o primeiro desenho de cada um sai na hora
  contador++; const vez = E.itens[contador % E.itens.length];
  desenhar(vez, kart, E.itens);
}

export function soltarEspelhos(kart) {
  const E = kart && kart.espelho; if (!E) return;
  for (const it of E.itens) { it.painel.parent?.remove(it.painel); it.mat.dispose(); it.rt.dispose(); }
  kart.espelho = null;
}
