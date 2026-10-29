// Corrida da Galera — a qualidade dos gráficos: Baixa, Média ou Alta (o pós-processamento está em pos.js).
//   Baixa: desenha direto na tela, sem nenhum passe depois (o jeito de antes), em resolução 1×.
//   Média: cor por clima e hora, vinheta e um brilho (bloom) barato em meia resolução, com um pouco de suavização de serrilhado.
//   Alta : a Média com o brilho completo, suavização maior, desfoque de velocidade nas bordas e resolução até 1,5×.
// Quem escolhe é o jogador (botão "Gráficos" na barra de cima e a tecla G na corrida); a escolha fica em localStorage
// ("corrida:qualidade"). Sem escolha, vale o padrão do aparelho (padraoDoAparelho): celular, Baixa; computador, Média, e Alta
// se a placa de vídeo parece forte. Se o jogo ficar lento na Alta, o pos.js desce sozinho para a Média (`rebaixar`) sem mexer
// na escolha guardada.
import { $, toast } from "./estado.js";

export const NIVEIS = ["baixa", "media", "alta"];
export const NOMES = { baixa: "Baixa", media: "Média", alta: "Alta" };
const CHAVE = "corrida:qualidade";
// o maior pixelRatio de cada qualidade (nunca passa do da tela); mais pontos = mais nítido e mais pesado
const RAZAO = { baixa: 1, media: 1.25, alta: 1.5 };

// placas de vídeo que dão conta da Alta (o nome vem do WEBGL_debug_renderer_info) e as que não dão nem da Média
const GPU_FORTE = /RTX|GTX ?(10[6-9]0|1[1-9]\d\d|16\d\d)|RX ?(5[89]\d|[6-9]\d{2,3})|Radeon (Pro W|VII)|Arc.*A[57]\d\d|Apple M\d/i;
const GPU_FRACA = /SwiftShader|llvmpipe|Software|Basic Render|Mali|Adreno|PowerVR|VideoCore/i;

// A regra do padrão, pura (sem tocar em nada do navegador): `toque` é aparelho de toque como entrada principal (celular, tablet),
// `nucleos` o navigator.hardwareConcurrency e `gpu` o nome da placa de vídeo ("" quando o navegador esconde).
export function padraoDoAparelho({ toque = false, nucleos = 0, gpu = "" } = {}) {
  if (toque || GPU_FRACA.test(gpu)) return "baixa";
  if (GPU_FORTE.test(gpu) && (!nucleos || nucleos >= 6)) return "alta";
  return "media";
}

const lerSalva = () => { try { const v = localStorage.getItem(CHAVE); return NIVEIS.includes(v) ? v : null; } catch { return null; } };
const gravar = (v) => { try { localStorage.setItem(CHAVE, v); } catch {} };
const ehToque = () => {
  try { return matchMedia("(pointer: coarse)").matches || /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent); } catch { return false; }
};

let salva = lerSalva(), auto = padraoDoAparelho({ toque: ehToque(), nucleos: navigator.hardwareConcurrency || 0 }), efetiva = salva || auto, rebaixada = false;
const ouvintes = [];
const avisar = () => { pintarBotao(); for (const f of ouvintes) f(efetiva); };

// A cena.js entrega o contexto WebGL assim que cria o renderer: o nome da placa decide o padrão (quando o jogador não escolheu)
export function detectarPlaca(gl) {
  let gpu = "";
  try { const e = gl.getExtension("WEBGL_debug_renderer_info"); if (e) gpu = String(gl.getParameter(e.UNMASKED_RENDERER_WEBGL) || ""); } catch {}
  auto = padraoDoAparelho({ toque: ehToque(), nucleos: navigator.hardwareConcurrency || 0, gpu });
  if (!salva) efetiva = auto;
  return gpu;
}
// a qualidade em uso agora (a escolhida, ou a Média quando a Alta ficou lenta)
export const qualidade = () => efetiva;
export const escolhida = () => salva || auto;
export const foiRebaixada = () => rebaixada;
export const pixelRatioDe = (n) => Math.min(window.devicePixelRatio || 1, RAZAO[n] || 1);
export function aoMudar(f) { ouvintes.push(f); }
// o jogador escolheu: vale já e fica guardada
export function definir(n) {
  if (!NIVEIS.includes(n)) return;
  salva = n; rebaixada = false; gravar(n);
  if (n !== efetiva) { efetiva = n; avisar(); } else pintarBotao();
}
// o jogo ficou lento: desce sem mexer na escolha guardada (o jogador pode voltar a subir no botão)
export function rebaixar(n) { if (n === efetiva) return; efetiva = n; rebaixada = true; avisar(); }
// descer não ajudou (era o limite da tela, não da placa de vídeo): volta ao que era, sem avisar
export function restaurar(n) { if (n === efetiva) return; efetiva = n; rebaixada = false; avisar(); }
export function proxima() { return NIVEIS[(NIVEIS.indexOf(efetiva) + 1) % NIVEIS.length]; }

// ---------- o botão e a tecla G ----------
const botao = $("btnGraficos"), rotulo = $("grNivel");
function pintarBotao() {
  if (rotulo) rotulo.textContent = NOMES[efetiva];
  if (botao) botao.title = "Qualidade dos gráficos: " + NOMES[efetiva] + (rebaixada ? " (baixou sozinha por causa do desempenho)" : "") + ". Clique para trocar (G na corrida).";
}
function ciclar() {
  definir(proxima());
  toast("🎞️ Gráficos: " + NOMES[efetiva] + (efetiva === "baixa" ? " (sem efeitos)" : efetiva === "media" ? " (cor, brilho e vinheta)" : " (tudo ligado)"), 1800);
}
if (botao) botao.addEventListener("click", ciclar);
document.addEventListener("keydown", (e) => {
  if (e.code !== "KeyG" || e.repeat || e.ctrlKey || e.metaKey || e.altKey || /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName)) return;
  const tela = $("screen"); if (!tela || !tela.getClientRects().length) return; // só com a corrida na tela
  ciclar();
});
pintarBotao();
