// Leilão da Galera — temas de comida: o pedido do cliente, as características dos ingredientes, os combos e a receita secreta
// (o servidor sorteia tudo ao começar e manda em `S.comida`; aqui só se desenha, junto da ação do leilão).
const TAG_NOME = { forte: "forte", doce: "doce", fresco: "fresco", azedo: "azedo", amargo: "amargo", picante: "picante", crocante: "crocante", gordo: "gordo", chique: "chique", raiz: "raiz", ousado: "ousado" };
const semAcento = (s) => String(s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
const temPalavra = (texto, k) => new RegExp(`(^|[^a-z])${k.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}([^a-z]|$)`).test(texto);
const nomesDe = (c, extra) => semAcento([...c.team.map((x) => Ratings.parseItem(x.player).name), ...(extra ? [Ratings.parseItem(extra).name] : [])].join(" | "));

function chipsDeTags(tags, pedido) {
  return (tags || []).map((t) => {
    const p = (pedido && pedido.peso[t]) || 0;
    return `<span class="ctag ${p > 0.2 ? "bom" : p < -0.2 ? "mau" : ""}">${TAG_NOME[t] || t}</span>`;
  }).join("");
}

function renderComida() {
  const box = $("comidaBox"); if (!box) return;
  const C = S.comida, mine = me.capId && capById(me.capId);
  if (!C || !["idle", "bidding", "reveal", "done"].includes(S.phase)) { box.classList.add("hidden"); box.innerHTML = ""; return; }
  const ped = C.pedido, gosta = Object.keys(ped.peso).filter((t) => ped.peso[t] > 0.2), odeia = Object.keys(ped.peso).filter((t) => ped.peso[t] < -0.2);
  let html = `<div class="cpedido"><div class="ctit">${ic("alerta")}Pedido do cliente: <b>${esc(ped.nome)}</b></div><p>${esc(ped.texto)}</p>
    <div class="cpesos">${gosta.length ? `<span class="clbl">Gosta</span>${gosta.map((t) => `<span class="ctag bom">${TAG_NOME[t] || t}</span>`).join("")}` : ""}
    ${odeia.length ? `<span class="clbl">Desgosta</span>${odeia.map((t) => `<span class="ctag mau">${TAG_NOME[t] || t}</span>`).join("")}` : ""}</div></div>`;
  // o ingrediente da vez: o que ele é, e se casa com o pedido e com o que já tem no prato
  const cur = S.current, vez = S.phase === "bidding" && cur && !spinning ? cur.player : null;
  if (vez) {
    const tags = C.tags[vez] || [];
    html += `<div class="cvez"><div class="ctit">Em leilão: <b>${esc(Ratings.parseItem(vez).name)}</b></div><div class="cpesos">${chipsDeTags(tags, ped) || '<span class="clbl">sem característica marcante</span>'}</div>`;
    if (mine) {
      const ja = nomesDe(mine), com = nomesDe(mine, vez), dicas = [];
      for (const cb of C.combos) {
        if (!cb.keys.every((k) => temPalavra(com, k))) continue;
        if (cb.keys.every((k) => temPalavra(ja, k))) continue; // já fechado antes dele
        dicas.push(`<li class="dica-bom">✨ Fecha <b>${esc(cb.frase)}</b> no seu prato</li>`);
      }
      for (const cb of C.combos) {
        const faltam = cb.keys.filter((k) => !temPalavra(com, k));
        if (faltam.length !== 1) continue;
        if (!cb.keys.some((k) => temPalavra(com, k) && !temPalavra(ja, k))) continue;
        dicas.push(`<li>👀 Começa <b>${esc(cb.frase)}</b>: falta ${esc(faltam[0])}</li>`);
      }
      if (dicas.length) html += `<ul class="cdicas">${dicas.slice(0, 3).join("")}</ul>`;
    }
    html += `</div>`;
  }
  // a minha receita secreta e o quanto já tenho dela
  if (C.receita && mine) {
    const ja = nomesDe(mine);
    const itens = C.receita.precisa.map((alts) => ({ alts, ok: alts.some((k) => temPalavra(ja, k)) }));
    const ok = itens.every((i) => i.ok);
    html += `<div class="crec ${ok ? "ok" : ""}"><div class="ctit">${ic("estrela")}Sua receita secreta: <b>${esc(C.receita.nome)}</b>${ok ? " · completa!" : ""}</div>
      <p class="clbl2">Só você vê. Prato com todos os itens ganha bônus na nota do júri.</p>
      <ul class="citens">${itens.map((i) => `<li class="${i.ok ? "ok" : ""}">${i.ok ? "✓" : "○"} ${esc(i.alts[0])}${i.alts.length > 1 ? ` <small>(ou ${esc(i.alts.slice(1).join(", "))})</small>` : ""}</li>`).join("")}</ul></div>`;
  }
  box.innerHTML = html; box.classList.remove("hidden");
}
