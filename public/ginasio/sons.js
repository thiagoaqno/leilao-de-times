// Sons curtos sintetizados; so comecam depois de um gesto da pessoa.
let audio = null, somLigado = store.get("ginasio:som") !== false, ultimoSom = 0;
function atualizarSom() {
  const titulo = somLigado ? "Desligar o som" : "Ligar o som";
  $("btnSound").innerHTML = ic(somLigado ? "som" : "mudo"); $("btnSound").title = titulo; $("btnSound").setAttribute("aria-label", titulo);
}
function ativarSom() {
  if (!somLigado) return;
  try { if (!audio) audio = new (window.AudioContext || window.webkitAudioContext)(); if (audio.state === "suspended") audio.resume().catch(() => {}); } catch {}
}
function nota(frequencia, fim, duracao, forma = "sine", atraso = 0) {
  if (!audio || !somLigado || audio.state !== "running") return;
  const inicio = audio.currentTime + atraso, osc = audio.createOscillator(), ganho = audio.createGain();
  osc.type = forma; osc.frequency.setValueAtTime(frequencia, inicio); osc.frequency.exponentialRampToValueAtTime(Math.max(20, fim), inicio + duracao);
  ganho.gain.setValueAtTime(0.025, inicio); ganho.gain.exponentialRampToValueAtTime(0.001, inicio + duracao);
  osc.connect(ganho); ganho.connect(audio.destination); osc.start(inicio); osc.stop(inicio + duracao);
}
function tocarEvento(e) {
  if (!audio || !somLigado || document.hidden) return;
  const agora = performance.now();
  if (agora - ultimoSom < 40 && e.tipo !== "fim") return;
  if (e.tipo === "golpe") { const mv = dexAtual().MOVES[e.golpe]; nota(mv?.t === "Fogo" ? 170 : 420, 90, 0.12, "triangle"); }
  else if (e.tipo === "dano") nota(120, 45, 0.09, "triangle");
  else if (e.tipo === "esquiva") nota(280, 760, 0.1);
  else if (e.tipo === "cura") nota(500, 900, 0.16);
  else if (e.tipo === "troca") nota(320, 640, 0.12);
  else if (e.tipo === "fim") { for (let i = 0; i < 3; i++) nota([440, 550, 660][i], [440, 550, 660][i], 0.18, "triangle", i * 0.13); }
  else return;
  ultimoSom = agora;
}
$("btnSound").onclick = () => { somLigado = !somLigado; store.set("ginasio:som", somLigado); ativarSom(); atualizarSom(); };
document.addEventListener("pointerdown", ativarSom, { once: true });
document.addEventListener("keydown", ativarSom, { once: true });
atualizarSom();
