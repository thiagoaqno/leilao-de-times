// Leilão da Galera — os ícones da página (SVG desenhados aqui, no lugar dos emojis).
// - Icones.ic("bola") devolve o <svg> do ícone (usa o sprite que este arquivo coloca no começo do <body>);
// - Icones.iconizar(html) troca os emojis de um texto (a narração do campeonato, o júri dos pratos) pelos ícones.
(function () {
  const P = {
    bola: '<circle cx="12" cy="12" r="9.5"/><path d="m12 7.3 4.2 3-1.6 4.9H9.4L7.8 10.3z"/><path d="M12 7.3V2.6M16.2 10.3l4.4-1.5M14.6 15.2l2.8 3.9M9.4 15.2l-2.8 3.9M7.8 10.3 3.4 8.8"/>',
    martelo: '<path d="m14.5 12.5-8 8a2.1 2.1 0 1 1-3-3l8-8"/><path d="m16 16 6-6M8 8l6-6M9 7l8 8M21 11l-8-8"/>',
    cadeado: '<rect x="4.5" y="11" width="15" height="10" rx="2.5"/><path d="M8 11V7.5a4 4 0 0 1 8 0V11M12 15v2"/>',
    moeda: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5.5"/><path d="M12 9.5v5"/>',
    taca: '<path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0z"/><path d="M17 5h3v2a3 3 0 0 1-3 3M7 5H4v2a3 3 0 0 0 3 3"/>',
    relogio: '<circle cx="12" cy="13" r="8"/><path d="M12 9v4l2.5 2M9.5 2.5h5"/>',
    galera: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0"/><path d="M16 4.6a3.5 3.5 0 0 1 0 6.8M18 14a6 6 0 0 1 3.5 6"/>',
    copiar: '<rect x="9" y="9" width="11" height="11" rx="2.5"/><path d="M5 15V6.5A2.5 2.5 0 0 1 7.5 4H15"/>',
    elo: '<path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1"/><path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/>',
    escudo: '<path d="M12 3 4.5 6v5.5c0 4.6 3.2 8.2 7.5 9.5 4.3-1.3 7.5-4.9 7.5-9.5V6z"/>',
    troca: '<path d="M7 4 3 8l4 4M3 8h14M17 20l4-4-4-4M21 16H7"/>',
    lapis: '<path d="M4 20h4L19 9l-4-4L4 16z"/><path d="m14 6 4 4"/>',
    lista: '<path d="M9 6h11M9 12h11M9 18h11"/><circle cx="4.5" cy="6" r="1"/><circle cx="4.5" cy="12" r="1"/><circle cx="4.5" cy="18" r="1"/>',
    desfazer: '<path d="M9 14 4 9l5-5"/><path d="M4 9h10a6 6 0 0 1 0 12h-3"/>',
    play: '<path d="M7 4.5v15l12.5-7.5z"/>',
    bandeira: '<path d="M5 21V4M5 4h11l-2 4 2 4H5"/>',
    olho: '<path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
    seta: '<path d="m6 9 6 6 6-6"/>',
    esq: '<path d="m15 6-6 6 6 6"/>',
    dir: '<path d="m9 6 6 6-6 6"/>',
    voltar: '<path d="M19 12H5M11 6l-6 6 6 6"/>',
    embaralhar: '<path d="M16 3h5v5M4 20 21 3M21 16v5h-5M15 15l6 6M4 4l5 5"/>',
    estrela: '<path d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1 6.2L12 17.3l-5.5 2.9 1-6.2L3 9.6l6.2-.9z"/>',
    grafico: '<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>',
    microfone: '<rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3"/>',
    luva: '<path d="M8 13V5.5a1.5 1.5 0 0 1 3 0V11M11 10V4.5a1.5 1.5 0 0 1 3 0V11M14 10.5V6a1.5 1.5 0 0 1 3 0v8a7 7 0 0 1-7 7h-.5A6.5 6.5 0 0 1 3 14.5V12a1.5 1.5 0 0 1 3 0v1"/>',
    medalha: '<circle cx="12" cy="15" r="6"/><path d="M8.5 10 6 3h4l2 4 2-4h4l-2.5 7"/>',
    explosao: '<path d="M12 2v4M12 18v4M2 12h4M18 12h4M5 5l3 3M16 16l3 3M5 19l3-3M16 8l3-3"/>',
    alerta: '<path d="M12 3.5 2.5 20h19z"/><path d="M12 10v4.5M12 17.5v.3"/>',
    lua: '<path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z"/>',
    espadas: '<path d="M14.5 17.5 3 6V3h3l11.5 11.5M13 19l6-6M16 16l4 4M19 21l2-2M9.5 6.5 14 2h3v3l-4.5 4.5M5 14l-1 1M7 17l-3 3M3 19l2 2"/>',
    estadio: '<ellipse cx="12" cy="8.5" rx="9" ry="3.5"/><path d="M3 8.5v6.5c0 1.9 4 3.5 9 3.5s9-1.6 9-3.5V8.5M7 11.8v3.5M12 12.3v3.5M17 11.8v3.5"/>',
    chuteira: '<path d="M3.5 6h6l1 5 8 2.5a2 2 0 0 1 1.5 2V17h-16.5z"/><path d="M3.5 20H21M8 17v3M13 17v3M18 17v3"/>',
    cartola: '<path d="M7 16V6.5a1 1 0 0 1 1-1h8a1 1 0 0 1 1 1V16"/><path d="M3 16h18v2.5H3zM7 12h10"/>',
    alvo: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1"/>',
    mira: '<circle cx="12" cy="12" r="7.5"/><path d="M12 2v5M12 17v5M2 12h5M17 12h5"/>',
    burger: '<path d="M4 10.5a8 5.5 0 0 1 16 0z"/><path d="M3 14h18M5 18.5h14a1 1 0 0 0 1-1V16H4v1.5a1 1 0 0 0 1 1z"/>',
    pizza: '<path d="M12 21 3 6.5a14 14 0 0 1 18 0z"/><circle cx="10" cy="10" r="1.2"/><circle cx="14" cy="12.5" r="1.2"/><circle cx="11.5" cy="15.5" r="1"/>',
    drink: '<path d="M5 4h14l-7 8.5zM12 12.5V20M8 20h8M15 7.5l3-5"/>',
    sorvete: '<path d="M7.5 11a4.5 4.5 0 1 1 9 0z"/><path d="m7.5 11 4.5 10 4.5-10"/>',
    coroa: '<path d="m3 8 4.5 4L12 5l4.5 7L21 8l-2 11H5z"/>',
    apito: '<circle cx="8" cy="14" r="5"/><path d="M11 10.5 21 7v4l-8 2.5M6.5 4.5l1 2M11 3.5l-.5 2.2"/>',
    livro: '<path d="M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2z"/><path d="M4 19V5M8 7h7"/>',
    recomecar: '<path d="M20 12a8 8 0 1 1-2.3-5.7L20 8.5M20 3v5.5h-5.5"/>',
    urna: '<rect x="4" y="10" width="16" height="11" rx="2"/><path d="M8 10V4h8v6M10 7h4M4 14h16"/>',
    brilho: '<path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8zM19 16l.8 2.2L22 19l-2.2.8L19 22l-.8-2.2L16 19l2.2-.8z"/>',
    fogo: '<path d="M12 22a7 7 0 0 0 7-7c0-4-3-6-4-9-1 2-2 3-3 3-1-2 0-5 0-6-4 2-7 7-7 12a7 7 0 0 0 7 7z"/>',
    imagem: '<rect x="3" y="4" width="18" height="16" rx="2.5"/><circle cx="9" cy="10" r="2"/><path d="m21 16-5-5-9 9"/>',
    ok: '<path d="M20 6 9 17l-5-5"/>',
    fechar: '<path d="M18 6 6 18M6 6l12 12"/>',
    mais: '<path d="M12 5v14M5 12h14"/>',
    menos: '<path d="M5 12h14"/>',
    pular: '<path d="M5 4.5 15 12 5 19.5zM19 5v14"/>',
    sair: '<path d="M14 4h5v16h-5M10 8l-4 4 4 4M6 12h10"/>',
    pensando: '<circle cx="6" cy="12" r="1.4"/><circle cx="12" cy="12" r="1.4"/><circle cx="18" cy="12" r="1.4"/>',
    campo: '<rect x="2.5" y="5" width="19" height="14" rx="1.5"/><path d="M12 5v14"/><circle cx="12" cy="12" r="2.5"/><path d="M2.5 9h3v6h-3M21.5 9h-3v6h3"/>',
    raio: '<path d="M13 2 4 14h7l-1 8 9-12h-7z"/>',
    sino: '<path d="M6 16V11a6 6 0 0 1 12 0v5l2 2H4zM10 21h4"/>',
    cartas: '<rect x="3" y="6" width="11" height="15" rx="2" transform="rotate(-8 8.5 13.5)"/><rect x="10" y="3" width="11" height="15" rx="2"/>',
    ponto: '<circle cx="12" cy="12" r="5" fill="currentColor" stroke="none"/>',
  };
  const sprite = `<svg xmlns="http://www.w3.org/2000/svg" style="position:absolute;width:0;height:0;overflow:hidden" aria-hidden="true">${Object.entries(P).map(([k, v]) =>
    `<symbol id="i-${k}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${v}</symbol>`).join("")}</svg>`;
  document.body.insertAdjacentHTML("afterbegin", sprite);
  const ic = (n, cls = "") => `<svg class="ic${cls ? " " + cls : ""}" aria-hidden="true"><use href="#i-${n}"/></svg>`;

  // cada emoji da narração vira um ícone (com uma cor, às vezes); o que não estiver aqui some
  const EMOJI = {
    "⚽": "bola", "🏆": "taca ouro", "🎙": "microfone", "🎤": "microfone", "🗣": "microfone", "🧤": "luva", "🥇": "medalha ouro",
    "🥈": "medalha prata", "🥉": "medalha bronze", "⭐": "estrela ouro", "💥": "explosao", "🔗": "elo", "⚠": "alerta quente",
    "🚨": "alerta quente", "😴": "lua", "📊": "grafico", "⚔": "espadas", "🏟": "estadio", "👟": "chuteira", "🎩": "cartola",
    "🟢": "ponto verde", "🟡": "ponto amarelo", "🔴": "ponto vermelho", "🧩": "alerta", "🕳": "alerta", "📋": "lista",
    "🔔": "sino", "✨": "brilho", "🗳": "urna", "😈": "fogo quente", "🥰": "estrela", "🙈": "olho", "📉": "grafico",
    "🍔": "burger", "🍕": "pizza", "🍹": "drink", "🍨": "sorvete", "🎯": "alvo", "👑": "coroa ouro", "🔥": "fogo quente",
  };
  const RE = /(?:\p{Extended_Pictographic}|\p{Regional_Indicator})(?:️|‍(?:\p{Extended_Pictographic})️?)*/gu;
  function iconizar(html) {
    return String(html).replace(RE, (m) => {
      const n = EMOJI[m.replace(/[️‍].*$/u, "")];
      if (!n) return "";
      const [nome, cor] = n.split(" ");
      return ic(nome, "em" + (cor ? " " + cor : ""));
    });
  }
  // o ícone de cada tema
  function deTema(th) {
    const id = th.id || th.skin || "", k = th.prompt || "";
    if (th.mine) return "estrela";
    if (k === "futsal") return "bola";
    if (k === "futebol") return "estadio";
    return { cs: "mira", valorant: "alvo", hamburguer: "burger", pizza: "pizza", drink: "drink", sobremesa: "sorvete", custom: "lapis" }[id] || "estrela";
  }
  window.Icones = { ic, iconizar, deTema };
})();
