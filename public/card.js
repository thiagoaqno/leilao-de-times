// Card do campeão: desenha uma imagem PNG (1080x1350) com o resumo do campeonato.
(function (root) {
const W = 1080, H = 1350;
const C = { bg1: "#030822", bg2: "#0a1847", grass1: "#155c38", grass2: "#196a41", line: "rgba(255,255,255,.28)", gold: "#dfe7fb", gold2: "#2fd3ff", text: "#eef3ff", muted: "#9fb0d9", chip: "rgba(255,255,255,.08)" };
const SLOT_ROW = { GK: 0, DEF: 1, MID: 2, ATT: 3 };
const SLOT_LABEL = { GK: "GOL", DEF: "DEF", MID: "MEI", ATT: "ATA" };

function fit(ctx, text, maxW, size, weight, family) {
  let s = size;
  do { ctx.font = `${weight} ${s}px ${family}`; if (ctx.measureText(text).width <= maxW) break; s -= 2; } while (s > 12);
  return s;
}
function wrap(ctx, text, maxW) {
  const words = String(text).split(/\s+/), lines = []; let cur = "";
  for (const w of words) { const t = cur ? cur + " " + w : w; if (ctx.measureText(t).width > maxW && cur) { lines.push(cur); cur = w; } else cur = t; }
  if (cur) lines.push(cur); return lines;
}
function rrect(ctx, x, y, w, h, r) { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }
const shortName = (n) => { const p = String(n).split(" "); return p.length > 2 ? p[0][0] + ". " + p.slice(-1)[0] : n; };
const COMMON = /^(carlos|silva|santos|junior|júnior|jr\.?|alves|costa|souza|pereira|lima|gomes|martins|fernandes|fernández|martínez|díaz|diaz|garcía|rodríguez)$/i;
const tinyName = (n) => { const p = String(n).split(" "); if (p.length === 1) return n; const last = p.slice(-1)[0]; return last.length <= 4 || COMMON.test(last) ? p[0][0] + ". " + last : last; };

async function draw(sum) {
  const cv = document.createElement("canvas"); cv.width = W; cv.height = H;
  const ctx = cv.getContext("2d");
  const D = '"Saira Condensed", "Arial Narrow", sans-serif', B = 'Figtree, system-ui, sans-serif';
  try { await Promise.all([document.fonts.load(`800 40px "Saira Condensed"`), document.fonts.load(`600 20px Figtree`)]); } catch {}

  // fundo
  const g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, C.bg2); g.addColorStop(1, C.bg1);
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  const glow = ctx.createRadialGradient(W / 2, 170, 20, W / 2, 170, 520); glow.addColorStop(0, "rgba(255,197,61,.22)"); glow.addColorStop(1, "rgba(255,197,61,0)");
  ctx.fillStyle = glow; ctx.fillRect(0, 0, W, 700);

  // topo
  ctx.textAlign = "center"; ctx.fillStyle = C.muted; ctx.font = `600 26px ${B}`;
  ctx.fillText(String(sum.torneio || "Leilão da Galera").toUpperCase(), W / 2, 78);
  ctx.font = `90px ${B}`; ctx.fillText("🏆", W / 2, 185);
  ctx.fillStyle = C.gold; ctx.font = `800 64px ${D}`; ctx.fillText("CAMPEÃO", W / 2, 262);
  const nm = String(sum.campeao).toUpperCase();
  fit(ctx, nm, W - 120, 132, 800, D);
  const tg = ctx.createLinearGradient(0, 280, 0, 400); tg.addColorStop(0, "#ffffff"); tg.addColorStop(1, "#bfe9ff");
  ctx.fillStyle = tg; ctx.fillText(nm, W / 2, 385);
  ctx.fillStyle = C.text; fit(ctx, sum.decisao, W - 140, 34, 600, B); ctx.fillText(sum.decisao, W / 2, 440);

  // campo com a escalação
  const px = 90, py = 475, pw = W - 180, ph = 560;
  rrect(ctx, px, py, pw, ph, 26); ctx.save(); ctx.clip();
  for (let i = 0; i < 8; i++) { ctx.fillStyle = i % 2 ? C.grass1 : C.grass2; ctx.fillRect(px, py + i * ph / 8, pw, ph / 8 + 1); }
  ctx.strokeStyle = C.line; ctx.lineWidth = 3;
  ctx.strokeRect(px + 20, py + 20, pw - 40, ph - 40);
  ctx.beginPath(); ctx.moveTo(px + 20, py + ph / 2); ctx.lineTo(px + pw - 20, py + ph / 2); ctx.stroke();
  ctx.beginPath(); ctx.arc(W / 2, py + ph / 2, 60, 0, Math.PI * 2); ctx.stroke();
  ctx.strokeRect(W / 2 - 120, py + ph - 20 - 70, 240, 70); ctx.strokeRect(W / 2 - 120, py + 20, 240, 70);
  ctx.restore();
  ctx.fillStyle = C.muted; ctx.textAlign = "right"; ctx.font = `700 24px ${D}`; ctx.fillText(sum.formacao ? `FORMAÇÃO ${sum.formacao}` : "", px + pw - 36, py + ph - 38);

  const rows = [[], [], [], []]; (sum.time || []).forEach((p) => rows[SLOT_ROW[p.vaga] ?? 2].push(p));
  const used = rows.map((r, i) => (r.length ? i : -1)).filter((i) => i >= 0);
  const yFor = (i) => { const k = used.indexOf(i), n = used.length; return py + ph - 80 - (n > 1 ? k * (ph - 170) / (n - 1) : (ph - 170) / 2); };
  ctx.textAlign = "center";
  rows.forEach((r, i) => {
    if (!r.length) return; const y = yFor(i);
    r.forEach((p, k) => {
      const x = px + pw * (k + 1) / (r.length + 1);
      const off = p.rende < p.nota;
      ctx.beginPath(); ctx.arc(x, y - 16, 30, 0, Math.PI * 2);
      ctx.fillStyle = off ? "#ff5aa0" : C.gold; ctx.fill();
      ctx.fillStyle = "#061036"; ctx.font = `800 28px ${D}`; ctx.fillText(String(p.rende), x, y - 6);
      const label = r.length >= 3 ? tinyName(p.nome) : shortName(p.nome);
      ctx.fillStyle = C.text; const fs = fit(ctx, label, Math.min(240, pw / (r.length + 1) - 14), 26, 700, B);
      ctx.font = `700 ${fs}px ${B}`; ctx.fillText(label, x, y + 44);
      if (p.gols) { ctx.fillStyle = C.gold; ctx.font = `600 20px ${B}`; ctx.fillText("⚽".repeat(Math.min(p.gols, 5)) + (p.gols > 5 ? `+${p.gols - 5}` : ""), x, y + 70); }
    });
  });

  // números
  const c = sum.campanha || { v: 0, e: 0, d: 0, gp: 0, gc: 0 };
  const stats = [["CAMPANHA", `${c.v}V ${c.e}E ${c.d}D`], ["GOLS", `${c.gp} pró · ${c.gc} contra`], ["ARTILHEIRO", `${shortName(sum.artilheiro.nome)} · ${sum.artilheiro.gols}`]];
  const sw = (W - 180 - 40) / 3;
  stats.forEach(([k, v], i) => {
    const x = 90 + i * (sw + 20), y = 1052;
    rrect(ctx, x, y, sw, 104, 18); ctx.fillStyle = C.chip; ctx.fill();
    ctx.fillStyle = C.muted; ctx.font = `700 20px ${B}`; ctx.fillText(k, x + sw / 2, y + 38);
    ctx.fillStyle = C.text; fit(ctx, v, sw - 24, 34, 800, D); ctx.fillText(v, x + sw / 2, y + 80);
  });

  // pérola / grito
  let y = 1202;
  if (sum.perola) {
    ctx.fillStyle = C.text; ctx.font = `italic 600 28px ${B}`;
    const lines = wrap(ctx, `“${sum.perola.frase}”`, W - 200).slice(0, 2);
    if (lines.length === 1) y += 16;
    lines.forEach((l) => { ctx.fillText(l, W / 2, y); y += 36; });
    ctx.fillStyle = C.muted; ctx.font = `500 22px ${B}`;
    ctx.fillText(`— ${sum.perola.quem}, na festa do título${sum.perola.origem && sum.perola.origem !== "meme" ? ` (à la ${sum.perola.origem})` : ""}`, W / 2, y + 2);
  } else if (sum.grito) {
    ctx.fillStyle = C.gold; ctx.font = `800 54px ${D}`; ctx.fillText(sum.grito, W / 2, y + 20);
  }

  // rodapé
  const dt = sum.data ? new Date(sum.data) : new Date();
  ctx.fillStyle = C.muted; ctx.font = `600 20px ${B}`;
  ctx.fillText(`LEILÃO DA GALERA · ${dt.toLocaleDateString("pt-BR")} · ${sum.participantes} times · vice: ${sum.vice}`, W / 2, H - 30);
  return cv;
}

async function download(sum) {
  const cv = await draw(sum);
  const blob = await new Promise((r) => cv.toBlob(r, "image/png"));
  const name = `campeao-${String(sum.campeao).toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-")}.png`;
  const file = new File([blob], name, { type: "image/png" });
  // no celular, abre o menu de compartilhar (WhatsApp etc.); no computador, baixa o arquivo
  if (navigator.canShare && navigator.canShare({ files: [file] }) && /Android|iPhone|iPad/i.test(navigator.userAgent)) {
    try { await navigator.share({ files: [file], title: `Campeão: ${sum.campeao}` }); return "shared"; } catch (e) { if (e && e.name === "AbortError") return "cancel"; }
  }
  const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = name;
  document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 5000);
  return "downloaded";
}
root.ChampionCard = { draw, download };
})(window);
