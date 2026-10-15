// A HUD do modo Pokémon, no jeito das partidas de MOBA vistas de cima:
// - em cima, os dois times (o retrato de cada Pokémon com a vida embaixo; o que está em campo acende, o desmaiado
//   fica cinza), o placar de nocautes e o relógio no meio;
// - embaixo, o painel do meu Pokémon: o retrato grande com o nível e os tipos, os atributos (com as setas do que
//   subiu ou caiu), a barra de vida e a de guarda com os números, as quatro habilidades (a tecla no canto e a recarga
//   em leque) mais esquiva e guarda, as reservas para trocar (1, 2 e 3) e os efeitos em cima de mim (tonto, foco,
//   guarda, atributos);
// - o minimapa no canto (o chão do lugar, as pedras, os bichos, os avisos e os projéteis) e o feed de nocautes no
//   canto de cima.
// Os botões continuam sendo os de hud.js (#habilidades, #reservas, #defesa): aqui eles ganham o lugar e o jeito do
// painel pelo CSS (body.pk). As barras em cima de cada bicho, no mesmo jeito, ficam em animacao.js (bichoInfoPk).
const PK = { montado: false, chaveTopo: "", chaveRetrato: "", feed: [], ultimoDano: new Map(), kos: [0, 0], visto: new Set(), ultimo: -1e9 };
const TECLAS_GOLPE = ["M1", "M2", "Q", "E"];
const ROTULO_STAT = { atk: "ATQ", def: "DEF", spd: "VEL" };
const pkAtivo = () => modoAtual() === "pokemon";

function montarHudPokemon() {
  if (PK.montado) return;
  PK.montado = true;
  // em cima: os times, os nocautes e o relógio
  $("quadra").insertAdjacentHTML("beforeend", `
    <div id="topoPk" class="hidden" aria-label="Placar">
      <div class="timePk azul" id="timePk0"></div>
      <div class="meioPk"><b id="koPk0">0</b><time id="relogioPk">4:00</time><b id="koPk1">0</b></div>
      <div class="timePk vermelho" id="timePk1"></div>
    </div>
    <ol id="feedPk" class="hidden" aria-label="Nocautes" aria-live="polite"></ol>
    <canvas id="mapaPk" class="hidden" width="180" height="122" aria-label="Minimapa"></canvas>`);
  // embaixo: o retrato, as barras e os efeitos, em volta dos botões de hud.js
  $("hud").insertAdjacentHTML("afterbegin", `
    <div id="retratoPk" class="pk-so">
      <div class="moldura"><img id="retratoImg" alt=""><span id="nivelPk">50</span></div>
      <div class="ficha"><strong id="nomePk"></strong><span id="tiposPk"></span><span id="statsPk"></span></div>
    </div>`);
  $("habilidades").insertAdjacentHTML("beforebegin", `
    <div id="barrasPk" class="pk-so">
      <div class="barraPk vidaPk"><i id="vidaPkBarra"></i><span id="vidaPkTxt"></span></div>
      <div class="barraPk guardaPk"><i id="guardaPkBarra"></i><span id="guardaPkTxt"></span></div>
    </div>`);
  $("reservas").insertAdjacentHTML("afterend", `<div id="efeitosPk" class="pk-so" aria-label="Efeitos"></div>`);
  // os nocautes: quem bateu por último em quem desmaiou
  socket.on("ev", (lista) => {
    if (!pkAtivo()) return;
    for (const e of lista) {
      if (e.tipo === "dano") PK.ultimoDano.set(e.em, { de: e.de, t: e.t });
      else if (e.tipo === "desmaiou") {
        const chave = `${e.id}:${e.bicho}:${S?.match?.start}`;
        if (PK.visto.has(chave)) continue;
        PK.visto.add(chave);
        const ultimo = PK.ultimoDano.get(e.id), quem = N.snap?.entidades.find((x) => x.id === ultimo?.de), vitima = N.snap?.entidades.find((x) => x.id === e.id);
        PK.feed.unshift({ t: performance.now(), de: quem ? { bicho: quem.forma || quem.bicho, lado: quem.lado, nome: nomeDe(quem.id) } : null, em: { bicho: e.bicho, lado: vitima?.lado ?? 0, nome: nomeDe(e.id) } });
        PK.feed.length = Math.min(PK.feed.length, 4);
        desenharFeedPk();
      }
    }
  });
}
const nomeDe = (id) => S?.match?.jogadores.find((j) => j.id === id)?.nome || "";
const retratoDe = (id) => { try { return spriteUrl(id); } catch { return ""; } };

// os times em cima (só remonta quando muda quem está em campo, quem desmaiou ou o time)
function desenharTopoPk(sn) {
  const ents = sn.entidades, chave = ents.map((e) => `${e.id}:${e.ativo}:${e.campo}:${e.time.map((b) => `${b.id}${b.hp > 0 ? 1 : 0}`).join(",")}`).join("|");
  for (const lado of [0, 1]) {
    // a vida de cada retrato anda sem remontar
    ents.filter((e) => e.lado === lado).forEach((e) => e.time.forEach((b, i) => {
      const el = document.querySelector(`#timePk${lado} [data-pk="${e.id}:${i}"] i`); if (el) el.style.transform = `scaleX(${Math.max(0, b.hp / b.max)})`;
    }));
  }
  if (chave === PK.chaveTopo) return;
  PK.chaveTopo = chave;
  for (const lado of [0, 1]) {
    $(`timePk${lado}`).innerHTML = ents.filter((e) => e.lado === lado).map((e) => e.time.map((b, i) => {
      const caiu = b.hp <= 0, ativo = i === e.ativo && e.campo;
      return `<span class="retPk${caiu ? " caiu" : ""}${ativo ? " ativo" : ""}${e.id === ME?.id ? " meu" : ""}" data-pk="${e.id}:${i}" title="${h(dexAtual().MONS[b.id]?.n || b.id)} · ${h(nomeDe(e.id))}"><img src="${h(retratoDe(b.id))}" alt=""><i style="transform:scaleX(${Math.max(0, b.hp / b.max)})"></i></span>`;
    }).join("")).join('<span class="sepPk"></span>');
  }
}

// o feed de nocautes no canto (some sozinho depois de 6 s)
function desenharFeedPk() {
  const agora = performance.now();
  PK.feed = PK.feed.filter((f) => agora - f.t < 6000);
  const bicho = (x) => x ? `<span class="lado${x.lado}"><img src="${h(retratoDe(x.bicho))}" alt="">${h(dexAtual().MONS[x.bicho]?.n || "")}</span>` : "";
  $("feedPk").innerHTML = PK.feed.map((f) => `<li>${bicho(f.de)}${f.de ? '<b aria-label="nocauteou">⚔</b>' : '<b aria-label="caiu">✖</b>'}${bicho(f.em)}</li>`).join("");
}

// o painel do meu Pokémon
function desenharRetratoPk(e) {
  const D = dexAtual(), id = e.forma || e.bicho, mon = D.MONS[id];
  if (!mon) return;
  const chave = `${id}:${N.inicio}`;
  if (chave !== PK.chaveRetrato) {
    PK.chaveRetrato = chave;
    $("retratoImg").src = retratoDe(id);
    $("nomePk").textContent = mon.n;
    $("tiposPk").innerHTML = (mon.types || []).map((t) => `<em style="--tipo:${D.TYPES[t]}">${h(t)}</em>`).join("");
  }
  // os atributos: o valor do jogo e a seta do que mudou (a cor diz se subiu ou caiu)
  const stats = ["atk", "def", "spd"].map((k) => {
    const n = e.st?.[k] || 0, base = mon[k] || 0;
    return `<span class="${n > 0 ? "sobe" : n < 0 ? "cai" : ""}">${ROTULO_STAT[k]} <b>${base}</b>${n ? `<small>${n > 0 ? "▲" : "▼"}${Math.abs(n)}</small>` : ""}</span>`;
  }).join("");
  if ($("statsPk")._h !== stats) { $("statsPk")._h = stats; $("statsPk").innerHTML = stats; }
  const eu = N.previsto || e, guarda = Math.max(0, Math.round(eu.guarda ?? 100));
  $("vidaPkBarra").style.transform = `scaleX(${Math.max(0, e.hp / e.max)})`;
  $("vidaPkTxt").textContent = `${Math.max(0, Math.round(e.hp))} / ${e.max}`;
  $("guardaPkBarra").style.transform = `scaleX(${guarda / 100})`;
  $("guardaPkTxt").textContent = `Guarda ${guarda} / 100`;
  // a vida riscada de 100 em 100 (como as barras dos heróis)
  $("vidaPkBarra").parentElement.style.setProperty("--riscos", `${Math.max(4, Math.min(40, 100 / e.max * 100))}%`);
  // os efeitos em cima de mim
  const ef = [];
  if (e.atordoado > 0) ef.push(["tonto", "Tonto", e.atordoado]);
  if (e.foco) ef.push(["foco", "Golpe forte guardado (esquiva perfeita)", null]);
  if (eu.guardando) ef.push(["guarda", "Na guarda", null]);
  for (const k of ["atk", "def", "spd"]) { const n = e.st?.[k] || 0; if (n) ef.push([n > 0 ? "sobe" : "cai", `${ROTULO_STAT[k]} ${n > 0 ? "+" : ""}${n}`, null, ROTULO_STAT[k]]); }
  const html = ef.map(([c, t, s, r]) => `<span class="ef ${c}" title="${h(t)}">${r || { tonto: "★", foco: "!", guarda: "⛨" }[c] || ""}${s ? `<small>${s.toFixed(1)}</small>` : ""}</span>`).join("");
  if ($("efeitosPk")._h !== html) { $("efeitosPk")._h = html; $("efeitosPk").innerHTML = html; }
}

// o minimapa: o chão do lugar, as pedras, os avisos, os projéteis e os bichos
function desenharMapaPk(agora) {
  const cv = $("mapaPk"), c = cv.getContext("2d"), W = cv.width, H = cv.height, sx = W / 18.5, sy = H / 12.5;
  const px = (x) => (x + 9.25) * sx, py = (y) => (y + 6.25) * sy, T = temaAtual();
  c.imageSmoothingEnabled = true;
  if (T.bioma) c.drawImage(pintarChaoBioma(T), 0, 0, W, H); else { c.fillStyle = "#3d5a2c"; c.fillRect(0, 0, W, H); }
  c.fillStyle = "rgba(0,0,0,.18)"; c.fillRect(0, 0, W, H);
  c.fillStyle = "#6f746c"; for (const p of Ginasio.ARENA.pilares) { c.beginPath(); c.arc(px(p.x), py(p.y), p.r * sx, 0, Math.PI * 2); c.fill(); }
  for (const a of areasVisuais.values()) { // os avisos no chão
    c.strokeStyle = a.lado === meuJogador()?.lado ? "rgba(120,220,140,.9)" : "rgba(255,90,90,.95)"; c.lineWidth = 1.5;
    c.beginPath(); c.arc(px(a.x), py(a.y), Math.max(2, (a.r || 1) * sx), 0, Math.PI * 2); c.stroke();
  }
  for (const j of projeteisAgora(agora)) { c.fillStyle = corTipo(j.pr.elemento); c.fillRect(px(j.x) - 1.5, py(j.y) - 1.5, 3, 3); }
  for (const e of entidadesVisuais(agora)) {
    if (!e.campo) continue;
    const meu = e.id === ME?.id;
    c.fillStyle = e.lado ? "#e0443a" : "#2f8fe0"; c.strokeStyle = meu ? "#ffe56a" : "#10161a"; c.lineWidth = meu ? 2 : 1;
    c.beginPath(); c.arc(px(e.x), py(e.y), meu ? 5 : 4, 0, Math.PI * 2); c.fill(); c.stroke();
  }
  c.strokeStyle = "#0b100e"; c.lineWidth = 2; c.strokeRect(1, 1, W - 2, H - 2);
}

// a cada quadro (chamado por quadro, em hud.js)
function atualizarHudPokemon(agora) {
  montarHudPokemon();
  const pk = pkAtivo(), jogando = !!(S?.match && document.body.classList.contains("jogando"));
  document.body.classList.toggle("pk", pk);
  $("topoPk").classList.toggle("hidden", !pk || !jogando);
  $("mapaPk").classList.toggle("hidden", !pk || !jogando);
  $("feedPk").classList.toggle("hidden", !pk || !jogando || !PK.feed.length);
  if (!pk || !jogando || !N.snap) return;
  // o painel e o minimapa mudam 15 vezes por segundo (mexer na página a cada quadro pesava; as barras deslizam pelo CSS)
  if (agora >= PK.ultimo && agora - PK.ultimo < 66) return;
  PK.ultimo = agora;
  if (S.match.start !== PK.partida) { PK.partida = S.match.start; PK.feed.length = 0; PK.chaveTopo = ""; }
  const sn = N.snap;
  desenharTopoPk(sn);
  // nocautes: os desmaiados do outro lado
  for (const lado of [0, 1]) $(`koPk${lado}`).textContent = sn.entidades.filter((e) => e.lado !== lado).reduce((n, e) => n + e.time.filter((b) => b.hp <= 0).length, 0);
  $("relogioPk").textContent = $("relogio").textContent;
  const e = sn.entidades.find((p) => p.id === ME?.id);
  if (e) desenharRetratoPk(e);
  desenharMapaPk(agora);
  if (PK.feed.length && performance.now() - PK.feed[PK.feed.length - 1].t > 6000) desenharFeedPk();
}
