// Carreira de Treinador: a bandeira de cada seleção da Copa do Mundo, em SVG (no lugar do escudo do clube). As peças vêm de
// base/selecoes-2026.js (ferramentas/base-selecoes.js): faixas (h ou v, com pesos), fundo, cantão, cruz (centrada, nórdica ou a
// suíça), sautor, diagonal, triângulo, losango, círculo (com a metade de baixo de outra cor), lua, estrela e o xadrez. É só um
// desenho reconhecível, não a bandeira oficial.
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.Bandeiras = factory();
})(typeof self !== "undefined" ? self : this, function () {
  const W = 30, H = 20;
  let seq = 0;
  const estrela = (cx, cy, r, cor) => {
    const p = [];
    for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? r * 0.42 : r; p.push(`${(cx + Math.cos(a) * rr).toFixed(2)},${(cy + Math.sin(a) * rr).toFixed(2)}`); }
    return `<polygon points="${p.join(" ")}" fill="${cor}"/>`;
  };
  function svg(sel) {
    const b = (sel && sel.bandeira) || { fundo: "#5a6a7a" }, id = `bd${++seq}`, out = [];
    out.push(`<rect width="${W}" height="${H}" fill="${b.fundo || "#ffffff"}"/>`);
    if (b.f && b.c) {
      const pesos = b.p || b.c.map(() => 1), total = pesos.reduce((s, x) => s + x, 0);
      let pos = 0;
      b.c.forEach((cor, i) => {
        const t = pesos[i] / total;
        out.push(b.f === "h" ? `<rect x="0" y="${(pos * H).toFixed(2)}" width="${W}" height="${(t * H + 0.05).toFixed(2)}" fill="${cor}"/>` : `<rect x="${(pos * W).toFixed(2)}" y="0" width="${(t * W + 0.05).toFixed(2)}" height="${H}" fill="${cor}"/>`);
        pos += t;
      });
    }
    if (b.quartos) { const [a, c, d, e] = b.quartos; out.push(`<rect width="15" height="10" fill="${a}"/><rect x="15" width="15" height="10" fill="${c}"/><rect y="10" width="15" height="10" fill="${d}"/><rect x="15" y="10" width="15" height="10" fill="${e}"/>`); }
    if (b.diagonal) out.push(`<path d="M0 ${H} L0 ${H - 5} L${W - 7} 0 L${W} 0 L${W} 5 L7 ${H} Z" fill="${b.diagonal.borda}"/><path d="M0 ${H} L0 ${H - 3} L${W - 4} 0 L${W} 0 L${W} 3 L4 ${H} Z" fill="${b.diagonal.c}"/>`);
    if (b.sautor) out.push(`<path d="M0 0 L${W} ${H} M${W} 0 L0 ${H}" stroke="${b.sautor.c}" stroke-width="3.2"/>`);
    if (b.cruz) {
      const c = b.cruz;
      if (c.suica) out.push(`<rect x="13" y="4" width="4" height="12" fill="${c.c}"/><rect x="9" y="8" width="12" height="4" fill="${c.c}"/>`);
      else {
        const x = c.nordica ? 11 : W / 2;
        if (c.borda) out.push(`<rect x="${x - 3.5}" y="0" width="7" height="${H}" fill="${c.borda}"/><rect x="0" y="${H / 2 - 3.5}" width="${W}" height="7" fill="${c.borda}"/>`);
        out.push(`<rect x="${x - 2}" y="0" width="4" height="${H}" fill="${c.c}"/><rect x="0" y="${H / 2 - 2}" width="${W}" height="4" fill="${c.c}"/>`);
      }
    }
    if (b.canto) out.push(`<rect width="${(b.canto.w * W).toFixed(2)}" height="${(b.canto.h * H).toFixed(2)}" fill="${b.canto.c}"/>`);
    if (b.triangulo) {
      if (b.triangulo.borda) out.push(`<path d="M0 0 L13 10 L0 20 Z" fill="${b.triangulo.borda}"/>`);
      out.push(`<path d="M0 ${b.triangulo.borda ? 2.5 : 0} L${b.triangulo.borda ? 10.5 : 12} 10 L0 ${b.triangulo.borda ? 17.5 : 20} Z" fill="${b.triangulo.c}"/>`);
    }
    if (b.losango) out.push(`<path d="M${W / 2} 2.5 L${W - 3} ${H / 2} L${W / 2} ${H - 2.5} L3 ${H / 2} Z" fill="${b.losango.c}"/>`);
    if (b.xadrez) { for (let i = 0; i < 3; i++) for (let k = 0; k < 3; k++) out.push(`<rect x="${12 + i * 2}" y="${7 + k * 2}" width="2" height="2" fill="${(i + k) % 2 ? "#ffffff" : b.xadrez.c}"/>`); }
    if (b.circulo) {
      const c = b.circulo, cx = (c.x ?? 0.5) * W, cy = (c.y ?? 0.5) * H, r = c.r * H;
      out.push(`<circle cx="${cx}" cy="${cy}" r="${r.toFixed(2)}" fill="${c.c}"/>`);
      if (c.metade) out.push(`<clipPath id="${id}m"><rect x="0" y="${cy}" width="${W}" height="${H}"/></clipPath><circle cx="${cx}" cy="${cy}" r="${r.toFixed(2)}" fill="${c.metade}" clip-path="url(#${id}m)"/>`);
    }
    if (b.lua) { const l = b.lua; out.push(`<circle cx="${((l.x ?? 0.5) * W + 1.4).toFixed(2)}" cy="${H / 2}" r="${(l.r * H).toFixed(2)}" fill="${l.c}"/>`); }
    for (const k of ["estrela", "estrela2"]) if (b[k]) out.push(estrela((b[k].x ?? 0.5) * W, (b[k].y ?? 0.5) * H, b[k].r * H, b[k].c));
    return `<svg class="bandeira" viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="${(sel && sel.nome) || "Seleção"}"><clipPath id="${id}"><rect width="${W}" height="${H}" rx="2"/></clipPath><g clip-path="url(#${id})">${out.join("")}</g><rect width="${W}" height="${H}" rx="2" fill="none" stroke="rgba(0,0,0,.35)" stroke-width=".6"/></svg>`;
  }
  return { svg };
});
