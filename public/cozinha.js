// Desenho dos pratos nos temas de comida: o hambúrguer vai sendo empilhado, a pizza ganha cobertura,
// o drink enche o copo e a sobremesa é montada na taça, conforme cada ingrediente é comprado.
// Cores e formas saem do nome do ingrediente (ex.: "Pão preto" é escuro, "Campari" deixa o drink vermelho).
(function (root) {
const low = (s) => String(s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
// primeira regra cujo trecho aparece no nome
const pick = (name, rules, fallback) => { const n = low(name); for (const [re, v] of rules) if (re.test(n)) return v; return fallback; };
// sorteio fixo por nome: o mesmo ingrediente cai sempre no mesmo lugar
function seeded(str) { let h = 2166136261; for (const ch of String(str)) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619); } return () => { h = Math.imul(h ^ (h >>> 15), 2246822507); h = Math.imul(h ^ (h >>> 13), 3266489909); h ^= h >>> 16; return (h >>> 0) / 4294967296; }; }
const f1 = (n) => n.toFixed(1);
const DASH = 'fill="none" stroke="currentColor" stroke-width="1.6" stroke-dasharray="5 4" opacity=".55"';
const label = (x, y, t) => `<text x="${x}" y="${y}" text-anchor="middle" class="ph-t">${t}</text>`;

// ---------------- HAMBÚRGUER ----------------
const BUN = [[/preto/, ["#4a2e22", "#3a2118"]], [/australiano/, ["#5c3322", "#4a281a"]], [/queijo/, ["#e9b85a", "#d69b3c"]], [/batata/, ["#f0c878", "#dcae5c"]], [/ciabatta/, ["#e8d2a8", "#d4b98a"]], [/natural/, ["#c98d4e", "#a86f36"]], [/brioche/, ["#e39a3b", "#c47a26"]]];
const MEAT = [[/frango/, "#c98a3a"], [/grao/, "#9a7d3c"], [/pulled|pork/, "#8e4a2c"], [/wagyu/, "#7a3526"], [/cordeiro/, "#6a3424"], [/picanha/, "#74321f"]];
const CHEESE = [[/cheddar/, "#f5a623"], [/prato/, "#f6d15c"], [/provolone/, "#efdc9c"], [/gorgonzola/, "#eee8da"], [/brie/, "#f3eee0"], [/bufala/, "#fbfaf4"], [/catupiry/, "#f7efd6"], [/coalho/, "#e5c276"]];
const SAUCE = [[/barbecue/, "#6e2d14"], [/ketchup|goiabada/, "#b3222f"], [/mostarda/, "#e6b21a"], [/chipotle/, "#c4572a"], [/bacon/, "#e2bf8f"], [/especial/, "#f09a55"], [/erva/, "#d9e2a6"], [/maionese|aioli/, "#f3ead0"]];

function burgerLayer(it, y, W, ph) {
  const n = it.name, x0 = 110 - W / 2;
  // camada que ainda falta: faixa tracejada com o nome da categoria
  if (ph && it.cat !== "top") return { h: 20, svg: `<rect x="${x0 + 6}" y="${y + 3}" width="${W - 12}" height="15" rx="7.5" ${DASH}/>${label(110, y + 14, low(it.cat))}` };
  switch (it.cat) {
    case "top": {
      const [c, d] = pick(n, BUN, ["#dc9a45", "#bd7c2c"]);
      if (ph) return { h: 46, svg: `<path d="M${x0 - 4} ${y + 44}q0-44 ${W / 2 + 4}-44q${W / 2 + 4} 0 ${W / 2 + 4} 44z" ${DASH}/>` };
      const seeds = /gergelim|brioche/.test(low(n)) ? Array.from({ length: 11 }, (_, i) => { const r = seeded(n + i); return `<ellipse cx="${f1(x0 + 22 + r() * (W - 44))}" cy="${f1(y + 8 + r() * 20)}" rx="3" ry="1.6" fill="#fbf1d6" transform="rotate(${f1(r() * 60 - 30)} ${f1(x0 + 22 + r() * (W - 44))} ${f1(y + 18)})"/>`; }).join("") : "";
      const flour = /ciabatta/.test(low(n)) ? `<path d="M${x0 + 30} ${y + 14}q30-10 60 0" stroke="#fff" stroke-width="5" opacity=".5" fill="none" stroke-linecap="round"/>` : "";
      return { h: 46, svg: `<path d="M${x0 - 4} ${y + 44}q0-44 ${W / 2 + 4}-44q${W / 2 + 4} 0 ${W / 2 + 4} 44z" fill="${c}"/><path d="M${x0 - 4} ${y + 44}h${W + 8}v2h-${W + 8}z" fill="${d}"/><path d="M${x0 + 24} ${y + 14}q24-12 50-8" stroke="#fff" stroke-width="4" opacity=".28" fill="none" stroke-linecap="round"/>${seeds}${flour}` };
    }
    case "Pão": {
      const [c, d] = pick(n, BUN, ["#dc9a45", "#bd7c2c"]);
      if (ph) return { h: 22, svg: `<rect x="${x0}" y="${y}" width="${W}" height="20" rx="10" ${DASH}/>${label(110, y + 14, "pão")}` };
      return { h: 22, svg: `<rect x="${x0}" y="${y}" width="${W}" height="20" rx="10" fill="${c}"/><rect x="${x0}" y="${y}" width="${W}" height="6" rx="3" fill="${d}" opacity=".6"/>` };
    }
    case "Carne": {
      const c = pick(n, MEAT, "#6b3822");
      if (ph) return { h: 24, svg: `<rect x="${x0 - 4}" y="${y}" width="${W + 8}" height="22" rx="11" ${DASH}/>${label(110, y + 15, "carne")}` };
      const r = seeded(n), marks = /frango/.test(low(n))
        ? Array.from({ length: 14 }, () => `<circle cx="${f1(x0 + 6 + r() * (W - 12))}" cy="${f1(y + 4 + r() * 14)}" r="${f1(1.5 + r() * 2)}" fill="#e7b25c"/>`).join("")
        : Array.from({ length: 9 }, () => { const x = x0 + 10 + r() * (W - 30); return `<path d="M${f1(x)} ${f1(y + 6 + r() * 10)}l${f1(8 + r() * 10)} ${f1(r() * 4 - 2)}" stroke="#2a130a" stroke-width="2" opacity=".45" stroke-linecap="round"/>`; }).join("");
      return { h: 24, svg: `<rect x="${x0 - 4}" y="${y}" width="${W + 8}" height="22" rx="11" fill="${c}"/>${marks}` };
    }
    case "Queijo": {
      const c = pick(n, CHEESE, "#f5c542");
      if (ph) return { h: 9, svg: `<rect x="${x0 - 6}" y="${y}" width="${W + 12}" height="7" rx="2" ${DASH}/>` };
      const drips = [0.18, 0.42, 0.7, 0.88].map((t, i) => `<path d="M${f1(x0 + W * t - 7)} ${y + 6}q7 ${10 + i % 2 * 6} 14 0z" fill="${c}"/>`).join("");
      const blue = /gorgonzola/.test(low(n)) ? Array.from({ length: 8 }, (_, i) => `<circle cx="${f1(x0 + 8 + i * W / 8)}" cy="${y + 3}" r="1.3" fill="#5a7fa8"/>`).join("") : "";
      const grill = /coalho/.test(low(n)) ? `<path d="M${x0 + 20} ${y + 1}l10 5M${x0 + 60} ${y + 1}l10 5M${x0 + 100} ${y + 1}l10 5" stroke="#8a5a20" stroke-width="2"/>` : "";
      return { h: 9, svg: `<rect x="${x0 - 6}" y="${y}" width="${W + 12}" height="7" rx="2" fill="${c}"/>${drips}${blue}${grill}` };
    }
    case "Molho": {
      const c = pick(n, SAUCE, "#e98b3a");
      const wave = `M${x0 - 2} ${y + 3}` + Array.from({ length: 8 }, (_, i) => `q${f1(W / 16)} ${i % 2 ? 7 : -3} ${f1(W / 8 + 0.5)} 0`).join("") + `v4h-${W + 4}z`;
      if (ph) return { h: 8, svg: `<path d="${wave}" ${DASH}/>` };
      return { h: 8, svg: `<path d="${wave}" fill="${c}"/>` };
    }
    case "Extra": {
      const k = low(n), r = seeded(n);
      if (ph) return { h: 14, svg: `<rect x="${x0 + 4}" y="${y + 1}" width="${W - 8}" height="12" rx="6" ${DASH}/>${label(110, y + 11, "extra")}` };
      if (/bacon/.test(k)) return { h: 12, svg: [0, 1].map((j) => `<path d="M${x0 + 2 + j * 8} ${y + 4 + j * 4}` + Array.from({ length: 6 }, (_, i) => `q${f1(W / 12)} ${i % 2 ? 6 : -6} ${f1(W / 6.5)} 0`).join("") + `" stroke="${j ? "#e9a38a" : "#a8352a"}" stroke-width="5" fill="none" stroke-linecap="round"/>`).join("") };
      if (/ovo/.test(k)) return { h: 16, svg: `<path d="M${x0 + 8} ${y + 12}q10-14 40-10q30-6 50 2q30-2 ${W - 106} 8z" fill="#fbfaf2"/><ellipse cx="112" cy="${y + 7}" rx="15" ry="7" fill="#f6b21c"/>` };
      if (/onion|anel/.test(k)) return { h: 14, svg: [0.2, 0.5, 0.8].map((t) => `<ellipse cx="${f1(x0 + W * t)}" cy="${y + 7}" rx="18" ry="6" fill="none" stroke="#d99a3e" stroke-width="5"/>`).join("") };
      if (/cogumelo/.test(k)) return { h: 12, svg: Array.from({ length: 7 }, (_, i) => `<path d="M${f1(x0 + 8 + i * (W - 16) / 7)} ${y + 10}a9 7 0 0 1 18 0z" fill="#8a6446"/>`).join("") };
      if (/batata/.test(k)) return { h: 10, svg: Array.from({ length: 26 }, () => { const x = x0 + r() * W; return `<path d="M${f1(x)} ${f1(y + 2 + r() * 6)}l${f1(r() * 10 - 5)} ${f1(r() * 4)}" stroke="#f2c43d" stroke-width="2" stroke-linecap="round"/>`; }).join("") };
      if (/abacaxi/.test(k)) return { h: 10, svg: `<rect x="${x0 + 6}" y="${y + 1}" width="${W - 12}" height="8" rx="4" fill="#f4cf3f"/><path d="M${x0 + 30} ${y + 2}v6M${x0 + 70} ${y + 2}v6M${x0 + 110} ${y + 2}v6" stroke="#c89a16" stroke-width="2"/>` };
      if (/jalapeno/.test(k)) return { h: 10, svg: Array.from({ length: 7 }, (_, i) => `<circle cx="${f1(x0 + 12 + i * (W - 24) / 6)}" cy="${y + 5}" r="5" fill="#5fa03a" stroke="#3c7424" stroke-width="1.5"/>`).join("") };
      if (/geleia/.test(k)) return { h: 7, svg: `<rect x="${x0 + 2}" y="${y + 1}" width="${W - 4}" height="5" rx="2.5" fill="#c9283a" opacity=".9"/>` };
      return { h: 10, svg: `<rect x="${x0 + 4}" y="${y + 1}" width="${W - 8}" height="8" rx="4" fill="#c98b4a"/>` };
    }
    case "Vegetal": {
      const k = low(n);
      if (ph) return { h: 12, svg: `<rect x="${x0 - 2}" y="${y + 1}" width="${W + 4}" height="10" rx="5" ${DASH}/>${label(110, y + 10, "vegetal")}` };
      if (/alface|rucula|coleslaw/.test(k)) {
        const c = /rucula/.test(k) ? "#3f7d2a" : /coleslaw/.test(k) ? "#8e3f8f" : "#6cc04a";
        return { h: 12, svg: `<path d="M${x0 - 8} ${y + 6}` + Array.from({ length: 10 }, (_, i) => `q${f1(W / 20 + 1)} ${i % 2 ? 9 : -5} ${f1(W / 10 + 1.6)} 0`).join("") + `v4h-${W + 16}z" fill="${c}"/>` };
      }
      if (/tomate|pimentao/.test(k)) return { h: 10, svg: [0.15, 0.5, 0.85].map((t) => `<ellipse cx="${f1(x0 + W * t)}" cy="${y + 5}" rx="${f1(W / 7)}" ry="5" fill="#e0402f"/><ellipse cx="${f1(x0 + W * t)}" cy="${y + 5}" rx="${f1(W / 12)}" ry="2.4" fill="#f58a6c"/>`).join("") };
      if (/picles/.test(k)) return { h: 10, svg: Array.from({ length: 6 }, (_, i) => `<ellipse cx="${f1(x0 + 14 + i * (W - 28) / 5)}" cy="${y + 5}" rx="11" ry="4.5" fill="#7fae3c" stroke="#5a8a26" stroke-width="1.5"/>`).join("") };
      if (/roxa/.test(k)) return { h: 10, svg: [0.2, 0.5, 0.8].map((t) => `<ellipse cx="${f1(x0 + W * t)}" cy="${y + 5}" rx="20" ry="5" fill="none" stroke="#9a3f8a" stroke-width="3"/>`).join("") };
      if (/caramel/.test(k)) { const r = seeded(n); return { h: 9, svg: Array.from({ length: 14 }, () => `<path d="M${f1(x0 + r() * (W - 20))} ${f1(y + 3 + r() * 4)}q8 -5 16 0" stroke="#9a5a22" stroke-width="3" fill="none" stroke-linecap="round"/>`).join("") }; }
      return { h: 10, svg: `<rect x="${x0}" y="${y + 1}" width="${W}" height="8" rx="4" fill="#6cc04a"/>` };
    }
    default:
      if (ph) return { h: 10, svg: `<rect x="${x0}" y="${y + 1}" width="${W}" height="8" rx="4" ${DASH}/>` };
      return { h: 10, svg: `<rect x="${x0}" y="${y + 1}" width="${W}" height="8" rx="4" fill="#b98a5a"/>` };
  }
}
const BURGER_ORDER = ["Pão", "Vegetal", "Carne", "Queijo", "Extra", "Molho"];
function burger(parts) {
  // de baixo para cima; o pão aparece duas vezes (base e topo)
  const W = 150, layers = [];
  const byCat = (c) => parts.filter((p) => p.cat === c);
  const others = parts.filter((p) => !BURGER_ORDER.includes(p.cat));
  const bread = byCat("Pão");
  // pão a mais vira o pão do meio (estilo Big Mac)
  const order = [...bread.slice(0, 1), ...byCat("Vegetal"), ...byCat("Carne"), ...bread.slice(1), ...byCat("Queijo"), ...byCat("Extra"), ...others, ...byCat("Molho")];
  order.push(bread.length ? { ...bread[0], cat: "top" } : { cat: "top", ph: true });
  let y = 0; const out = [];
  for (const p of order.slice().reverse()) { const L = burgerLayer(p, y, W, p.ph); out.push({ p, y, L }); y += L.h - 2; }
  const H = y + 16;
  // plaquinha de madeira e sombra
  const board = `<ellipse cx="110" cy="${H - 6}" rx="96" ry="7" fill="#000" opacity=".25"/>`;
  return { vb: `0 0 220 ${H}`, body: board + out.reverse().map(({ p, L }) => wrap(p, L.svg)).join("") };
}

// ---------------- PIZZA ----------------
const CRUST = [[/integral/, "#a4713f"], [/detroit/, "#c8843e"], [/cheddar/, "#e9a13a"], [/catupiry/, "#edd29a"], [/semolina/, "#e0b567"], [/fina/, "#d9a35b"]];
const PSAUCE = [[/branco/, "#f1e8d4"], [/pesto/, "#4f8a2c"], [/barbecue/, "#6e2d14"], [/azeite/, "#e0c96a"], [/abobora/, "#f09a3a"], [/apimentado/, "#c7281e"], [/tomate/, "#d6342a"]];
const PCHEESE = [[/cheddar/, "#f5a623"], [/gorgonzola/, "#f1ecdf"], [/parmesao/, "#f4e7b8"], [/provolone/, "#f0dea0"], [/catupiry/, "#fbf4e2"], [/burrata/, "#fffdf6"]];
function inDisk(r, R) { const a = r() * Math.PI * 2, d = Math.sqrt(r()) * R; return [100 + Math.cos(a) * d, 100 + Math.sin(a) * d]; }
function pizzaLayer(p, ph, seedKey) {
  const n = low(p.name), r = seeded(seedKey + p.name);
  const dots = (k, R, fn) => Array.from({ length: k }, () => fn(...inDisk(r, R))).join("");
  switch (p.cat) {
    case "Massa":
      if (ph) return `<circle cx="100" cy="100" r="88" ${DASH}/>`;
      if (/detroit/.test(n)) return `<rect x="14" y="14" width="172" height="172" rx="14" fill="${pick(n, CRUST, "#d9a35b")}"/><rect x="14" y="14" width="172" height="172" rx="14" fill="none" stroke="#7a3f1a" stroke-width="5" opacity=".5"/>`;
      return `<circle cx="100" cy="100" r="${/fina/.test(n) ? 86 : 90}" fill="${pick(n, CRUST, "#d9a35b")}"/><circle cx="100" cy="100" r="${/fina/.test(n) ? 86 : 90}" fill="none" stroke="#8a4d20" stroke-width="2" opacity=".35"/>`;
    case "Molho":
      if (ph) return `<circle cx="100" cy="100" r="74" ${DASH}/>${label(100, 104, "molho")}`;
      return `<circle cx="100" cy="100" r="${/borda|recheada/.test(n) ? 70 : 76}" fill="${pick(n, PSAUCE, "#d6342a")}"/>`;
    case "Queijo": {
      if (ph) return label(100, 124, "queijo");
      const c = pick(n, PCHEESE, "#f7e6a6");
      return dots(12, 58, (x, y) => `<path d="M${f1(x - 12)} ${f1(y)}q4-12 14-10q12-2 10 10q2 12-12 10q-14 2-12-10z" fill="${c}" opacity=".95"/>`) + (/gorgonzola/.test(n) ? dots(10, 58, (x, y) => `<circle cx="${f1(x)}" cy="${f1(y)}" r="1.6" fill="#5a7fa8"/>`) : "");
    }
    case "Proteína": {
      if (ph) return "";
      if (/pepperoni|calabresa|linguica/.test(n)) { const c = /pepperoni/.test(n) ? "#b82a24" : /linguica/.test(n) ? "#8e4a2c" : "#c8546a"; return dots(9, 60, (x, y) => `<circle cx="${f1(x)}" cy="${f1(y)}" r="8" fill="${c}"/><circle cx="${f1(x - 2)}" cy="${f1(y - 2)}" r="1.5" fill="#fff" opacity=".35"/>`); }
      if (/bacon|parma/.test(n)) return dots(7, 58, (x, y) => `<path d="M${f1(x - 10)} ${f1(y)}q5-6 10 0t10 0" stroke="${/parma/.test(n) ? "#e98a8a" : "#a8352a"}" stroke-width="5" fill="none" stroke-linecap="round"/>`);
      const c = /frango/.test(n) ? "#f1d6a0" : /atum/.test(n) ? "#c9a2a0" : /carne seca/.test(n) ? "#8a4a2a" : "#b86a3a";
      return dots(16, 60, (x, y) => `<path d="M${f1(x)} ${f1(y)}l${f1(r() * 10 - 5)} ${f1(r() * 8 - 4)}" stroke="${c}" stroke-width="3.5" stroke-linecap="round"/>`);
    }
    case "Vegetal": {
      if (ph) return "";
      if (/rucula/.test(n)) return dots(9, 55, (x, y) => `<ellipse cx="${f1(x)}" cy="${f1(y)}" rx="8" ry="3.5" fill="#3f7d2a" transform="rotate(${f1(r() * 180)} ${f1(x)} ${f1(y)})"/>`);
      if (/azeitona/.test(n)) return dots(10, 60, (x, y) => `<circle cx="${f1(x)}" cy="${f1(y)}" r="4.5" fill="none" stroke="#1d1a1a" stroke-width="3"/>`);
      if (/milho/.test(n)) return dots(24, 60, (x, y) => `<circle cx="${f1(x)}" cy="${f1(y)}" r="2.6" fill="#f5c93a"/>`);
      if (/tomate/.test(n)) return dots(8, 58, (x, y) => `<circle cx="${f1(x)}" cy="${f1(y)}" r="6" fill="#e0402f"/><circle cx="${f1(x)}" cy="${f1(y)}" r="3" fill="#f7907a"/>`);
      if (/champignon/.test(n)) return dots(8, 58, (x, y) => `<path d="M${f1(x - 6)} ${f1(y + 2)}a6 5 0 0 1 12 0z" fill="#d8c2a0"/>`);
      if (/palmito/.test(n)) return dots(8, 58, (x, y) => `<circle cx="${f1(x)}" cy="${f1(y)}" r="5" fill="#f2ead0" stroke="#d6c8a0"/>`);
      if (/pimentao/.test(n)) return dots(9, 58, (x, y) => `<path d="M${f1(x - 6)} ${f1(y)}q6-6 12 0" stroke="#4f9a3a" stroke-width="3" fill="none"/>`);
      return dots(9, 58, (x, y) => `<path d="M${f1(x - 6)} ${f1(y)}q6-5 12 0" stroke="#e9d6f0" stroke-width="2.5" fill="none"/>`);
    }
    case "Finalização": {
      if (ph) return "";
      if (/manjericao|oregano/.test(n)) return dots(/oregano/.test(n) ? 30 : 7, 60, (x, y) => /oregano/.test(n) ? `<circle cx="${f1(x)}" cy="${f1(y)}" r="1.2" fill="#5a6a2a"/>` : `<ellipse cx="${f1(x)}" cy="${f1(y)}" rx="6" ry="3.8" fill="#3f9a3a" transform="rotate(${f1(r() * 180)} ${f1(x)} ${f1(y)})"/>`);
      if (/mel|azeite/.test(n)) return `<path d="M40 90q30-30 60 0t60 0M50 130q25-20 50 0t50 0" stroke="${/mel/.test(n) ? "#e8a31c" : "#9aa33a"}" stroke-width="2.5" fill="none" opacity=".85"/>`;
      const c = /calabresa/.test(n) ? "#d23a24" : /alho/.test(n) ? "#e3b04a" : /limao/.test(n) ? "#f2e24a" : "#fbf6e6";
      return dots(30, 62, (x, y) => `<circle cx="${f1(x)}" cy="${f1(y)}" r="1.4" fill="${c}"/>`);
    }
    default: return ph ? "" : dots(8, 58, (x, y) => `<circle cx="${f1(x)}" cy="${f1(y)}" r="4" fill="#b98a5a"/>`);
  }
}
const PIZZA_ORDER = ["Massa", "Molho", "Queijo", "Proteína", "Vegetal", "Finalização"];
function pizza(parts, seedKey) {
  const rank = (c) => { const i = PIZZA_ORDER.indexOf(c); return i < 0 ? 4 : i; };
  const sorted = parts.slice().sort((a, b) => rank(a.cat) - rank(b.cat));
  const board = `<circle cx="100" cy="104" r="96" fill="#000" opacity=".22"/>`;
  return { vb: "0 0 200 200", body: board + sorted.map((p) => wrap(p, pizzaLayer(p, p.ph, seedKey))).join("") };
}

// ---------------- DRINK ----------------
const SPIRIT = [[/cachaca/, "#f1e6b8"], [/vodka/, "#e6f0f6"], [/gin/, "#e0f2ec"], [/mezcal/, "#dcc99a"], [/rum/, "#c98a3a"], [/tequila/, "#f0d48a"], [/whisky/, "#b8742a"], [/pisco/, "#efe7c8"]];
const MODIF = [[/vermute/, "#8a2a2a"], [/campari/, "#d81e3a"], [/aperol/, "#f26b1d"], [/laranja/, "#f5a13a"], [/cafe/, "#3a2016"], [/43/, "#e8b33a"], [/espumante/, "#f7e7a0"], [/saque/, "#f2f2e8"]];
const FRUIT = [[/siciliano/, "#f3e27a"], [/limao/, "#9ccf4a"], [/maracuja/, "#f2c230"], [/abacaxi/, "#f5d65a"], [/laranja/, "#f59a2a"], [/toranja/, "#f47f6a"], [/morango/, "#e8384f"], [/melancia/, "#f06a78"]];
const SWEET = [[/mel/, "#e8a624"], [/mascavo/, "#a8692a"], [/gengibre/, "#e8c878"], [/canela/, "#b5652a"], [/baunilha/, "#f2e6c0"], [/condensado/, "#f6efdc"], [/hibisco/, "#b0184a"]];
function drink(parts) {
  const has = (c) => parts.filter((p) => p.cat === c);
  const glass = "M52 40L60 196Q60 204 68 204H132Q140 204 140 196L148 40Z";
  // o líquido: adoçante no fundo, depois destilado, modificador e fruta
  const bands = [...has("Adoçante").map((p) => [p, pick(p.name, SWEET, "#f7f2e0"), 16]), ...has("Destilado").map((p) => [p, pick(p.name, SPIRIT, "#eef2f2"), 46]),
    ...has("Modificador").map((p) => [p, pick(p.name, MODIF, "#c9a24a"), 34]), ...has("Cítrico/Fruta").map((p) => [p, pick(p.name, FRUIT, "#f2c230"), 30])];
  let y = 200, liquid = "";
  for (const [p, c, h] of bands) { y -= h; liquid += wrap(p, `<rect x="40" y="${y}" width="120" height="${h + 2}" fill="${c}" opacity="${p.ph ? 0.25 : 0.88}"${p.ph ? ` ${DASH.replace('fill="none" ', "")}` : ""}/>`); }
  const ice = has("Destilado").some((p) => !p.ph) ? [[74, y + 14], [104, y + 22], [88, y + 40]].map(([x, yy]) => `<rect x="${x}" y="${yy}" width="22" height="20" rx="4" fill="#fff" opacity=".35" transform="rotate(12 ${x + 11} ${yy + 10})"/>`).join("") : "";
  const deco = [];
  for (const p of has("Cítrico/Fruta").filter((p) => !p.ph)) { const c = pick(p.name, FRUIT, "#f2c230"); deco.push(wrap(p, `<circle cx="146" cy="40" r="17" fill="${c}"/><circle cx="146" cy="40" r="13" fill="#fff" opacity=".35"/><path d="M146 27v26M133 40h26M137 31l18 18M155 31l-18 18" stroke="#fff" stroke-width="1.2" opacity=".6"/>`)); }
  for (const p of has("Toque final").filter((p) => !p.ph)) {
    const n = low(p.name); let s;
    if (/hortela/.test(n)) s = `<ellipse cx="86" cy="34" rx="10" ry="5" fill="#3fae4a" transform="rotate(-30 86 34)"/><ellipse cx="100" cy="30" rx="10" ry="5" fill="#57c35a" transform="rotate(20 100 30)"/>`;
    else if (/alecrim/.test(n)) s = `<path d="M92 60L112 8" stroke="#4a7a3a" stroke-width="2.5"/>` + Array.from({ length: 6 }, (_, i) => `<path d="M${f1(94 + i * 3.2)} ${f1(54 - i * 8)}l-6-3M${f1(94 + i * 3.2)} ${f1(54 - i * 8)}l6-2" stroke="#5a9a4a" stroke-width="2"/>`).join("");
    else if (/sal/.test(n)) s = `<path d="M52 40H148" stroke="#fff" stroke-width="5" stroke-dasharray="2 2"/>`;
    else if (/pimenta/.test(n)) s = `<path d="M118 36q10-24 22-18q-6 10-18 22z" fill="#d8281e"/>`;
    else if (/laranja/.test(n)) s = `<path d="M70 44q10-18 24-4t20 0" stroke="#f08a1a" stroke-width="4" fill="none" stroke-linecap="round"/>`;
    else if (/bitter/.test(n)) s = `<circle cx="96" cy="${y + 6}" r="3" fill="#6a1a14"/><circle cx="108" cy="${y + 10}" r="2.4" fill="#6a1a14"/>`;
    else s = Array.from({ length: 12 }, (_, i) => `<circle cx="${70 + (i * 37) % 60}" cy="${f1(y + 10 + ((i * 53) % Math.max(20, 196 - y)))}" r="${1.5 + (i % 3)}" fill="none" stroke="#fff" opacity=".6"/>`).join("");
    deco.push(wrap(p, s));
  }
  const body = `<defs><clipPath id="copo"><path d="${glass}"/></clipPath></defs><ellipse cx="100" cy="206" rx="54" ry="5" fill="#000" opacity=".25"/>` +
    `<g clip-path="url(#copo)">${liquid}${ice}</g><path d="${glass}" fill="#ffffff10" stroke="#ffffffb0" stroke-width="2.5"/><path d="M60 50L66 190" stroke="#fff" stroke-width="3" opacity=".25" stroke-linecap="round"/>${deco.join("")}`;
  return { vb: "0 0 200 214", body };
}

// ---------------- SOBREMESA ----------------
const SCOOP = [[/chocolate|brownie|petit/, "#5a3020"], [/pistache/, "#a8c878"], [/doce de leite/, "#d9a35b"], [/cheesecake/, "#f4e4b8"], [/pudim/, "#f0c060"], [/creme/, "#f8ecc8"]];
const SYRUP = [[/ganache|chocolate branco/, null], [/caramelo|doce de leite/, "#c77d2a"], [/vermelhas|goiabada/, "#b0203a"], [/avela/, "#6a3a1e"], [/pistache/, "#8ab85a"]];
function sobremesa(parts) {
  const has = (c) => parts.filter((p) => p.cat === c);
  const cup = `<path d="M40 130Q40 176 100 178Q160 176 160 130Z" fill="#ffffff14" stroke="#ffffffb0" stroke-width="2.5"/><path d="M92 178h16v16h-16z" fill="#ffffff22"/><ellipse cx="100" cy="198" rx="32" ry="5" fill="#ffffff30" stroke="#ffffff90" stroke-width="2"/>`;
  const out = [];
  for (const p of has("Base")) {
    const n = low(p.name), c = pick(p.name, SCOOP, "#f8ecc8");
    let s;
    if (p.ph) s = `<circle cx="100" cy="112" r="40" ${DASH}/>${label(100, 116, "base")}`;
    else if (/brownie/.test(n)) s = `<rect x="62" y="84" width="76" height="50" rx="6" fill="${c}"/><rect x="62" y="84" width="76" height="10" rx="5" fill="#3a1e14"/>`;
    else if (/cheesecake/.test(n)) s = `<path d="M54 132L146 132L146 102L60 86Z" fill="${c}"/><path d="M54 132L146 132L146 124L54 124Z" fill="#b8804a"/>`;
    else if (/pudim/.test(n)) s = `<path d="M62 132L70 86H130L138 132Z" fill="${c}"/><path d="M70 86H130L128 98Q100 104 72 98Z" fill="#8a4a12"/>`;
    else if (/petit/.test(n)) s = `<path d="M60 132Q60 86 100 86Q140 86 140 132Z" fill="${c}"/><circle cx="130" cy="92" r="16" fill="#f8ecc8"/>`;
    else s = `<circle cx="84" cy="116" r="30" fill="${c}"/><circle cx="118" cy="112" r="30" fill="${c}"/><circle cx="100" cy="90" r="28" fill="${c}"/><path d="M80 96q8-8 18-6" stroke="#fff" stroke-width="4" opacity=".35" fill="none" stroke-linecap="round"/>`;
    out.push(wrap(p, s));
  }
  for (const p of has("Fruta")) {
    const n = low(p.name), r = seeded(p.name); let s;
    if (p.ph) s = "";
    else if (/cereja/.test(n)) s = `<circle cx="104" cy="58" r="10" fill="#c21a2a"/><path d="M104 48q4-16 14-20" stroke="#4a6a2a" stroke-width="2.5" fill="none"/>`;
    else if (/banana/.test(n)) s = [70, 100, 128].map((x) => `<ellipse cx="${x}" cy="${f1(80 + r() * 20)}" rx="9" ry="7" fill="#f2d27a" stroke="#c98a3a" stroke-width="2"/>`).join("");
    else if (/kiwi/.test(n)) s = [74, 124].map((x) => `<circle cx="${x}" cy="84" r="11" fill="#8ac84a"/><circle cx="${x}" cy="84" r="4" fill="#f4f0c8"/>`).join("");
    else { const c = /manga/.test(n) ? "#f5a623" : /maracuja/.test(n) ? "#f2c230" : /abacaxi/.test(n) ? "#f4cf3f" : /vermelhas/.test(n) ? "#7a1a4a" : "#e0283f"; s = Array.from({ length: 6 }, () => `<path d="M${f1(66 + r() * 68)} ${f1(70 + r() * 30)}l6 10l-12 0z" fill="${c}" transform="rotate(${f1(r() * 60 - 30)} 100 90)"/>`).join(""); }
    out.push(wrap(p, s));
  }
  for (const p of has("Calda")) {
    const c = p.ph ? null : pick(p.name, SYRUP, "#4a2616");
    const col = c || (/branco/.test(low(p.name)) ? "#f6efdc" : "#3a1e14");
    out.push(wrap(p, p.ph ? "" : `<path d="M60 96Q70 70 100 68Q130 70 140 96q-6 14-8 2q-4 16-10 2q-6 14-12 0q-6 16-12 0q-6 14-12 2q-6 12-10-2q-6 10-10-4Z" fill="${col}" opacity=".92"/>`));
  }
  for (const p of has("Crocante")) {
    const r = seeded(p.name), n = low(p.name), c = /pacoca|amendoim/.test(n) ? "#c98a4a" : /biscoito|cookies/.test(n) ? "#3a2418" : /suspiro/.test(n) ? "#fbf6ea" : "#d9a35b";
    out.push(wrap(p, p.ph ? "" : Array.from({ length: 16 }, () => `<rect x="${f1(64 + r() * 72)}" y="${f1(66 + r() * 26)}" width="${f1(3 + r() * 4)}" height="${f1(3 + r() * 3)}" fill="${c}" transform="rotate(${f1(r() * 90)} 100 80)"/>`).join("")));
  }
  for (const p of has("Toque")) {
    const n = low(p.name), r = seeded(p.name); let s;
    if (p.ph) s = "";
    else if (/chantilly|marshmallow/.test(n)) s = `<path d="M80 72q0-14 20-14q20 0 20 14z" fill="${/marshmallow/.test(n) ? "#f4dcc0" : "#fffdf6"}"/><path d="M86 60q0-12 14-12q14 0 14 12z" fill="${/marshmallow/.test(n) ? "#e8b48a" : "#fffdf6"}"/><path d="M94 50q6-12 12 0z" fill="#fffdf6"/>`;
    else if (/hortela/.test(n)) s = `<ellipse cx="116" cy="66" rx="10" ry="5" fill="#3fae4a" transform="rotate(-25 116 66)"/>`;
    else { const c = /granulado/.test(n) ? "#3a1e14" : /canela/.test(n) ? "#a8602a" : /limao/.test(n) ? "#e8e24a" : "#fbf6ea"; s = Array.from({ length: 22 }, () => `<circle cx="${f1(66 + r() * 68)}" cy="${f1(64 + r() * 34)}" r="${f1(0.8 + r() * 1.4)}" fill="${c}"/>`).join(""); }
    out.push(wrap(p, s));
  }
  for (const p of parts.filter((p) => !["Base", "Fruta", "Calda", "Crocante", "Toque"].includes(p.cat) && !p.ph))
    out.push(wrap(p, `<circle cx="${f1(70 + seeded(p.name)() * 60)}" cy="82" r="6" fill="#d9a35b"/>`));
  return { vb: "0 0 200 206", body: `<ellipse cx="100" cy="200" rx="60" ry="6" fill="#000" opacity=".25"/>` + out.join("") + cup };
}

// cada ingrediente vira um grupo: "new" cai no prato; "ghost" é o que está em leilão
function wrap(p, svg) {
  if (!svg) return "";
  const cls = p.ph ? "ph" : p.ghost ? "ghost" : p.age != null && p.age < 700 ? "new" : "";
  const style = cls === "new" ? ` style="animation-delay:-${Math.round(p.age)}ms"` : "";
  return `<g class="ly ${cls}"${style}>${svg}</g>`;
}

const DRAW = { hamburguer: burger, pizza, drink, sobremesa };
// parts: [{ name, cat, ghost?, age? }]; missing: categorias ainda sem ingrediente (viram contorno tracejado)
function draw(skin, parts, missing, seedKey) {
  const fn = DRAW[skin]; if (!fn) return "";
  const all = parts.concat((missing || []).map((cat) => ({ name: "", cat, ph: true })));
  const { vb, body } = fn(all, seedKey || "");
  return `<svg class="dish-svg" viewBox="${vb}" role="img" aria-hidden="true">${body}</svg>`;
}
root.Cozinha = { draw, SKINS: Object.keys(DRAW) };
})(typeof window !== "undefined" ? window : globalThis);
