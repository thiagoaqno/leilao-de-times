// Banco da Galera — o peão 3D (a peça clássica de tabuleiro: base, corpo, gola e cabeça redonda), desenhado em SVG com
// luz e sombra na cor do jogador, e o símbolo dele (carro, cachorro, cartola...) gravado em branco no corpo.
// Peoes.svg(cor, emoji, { tam }) devolve o desenho; o servidor continua guardando o peão pelo emoji.
(function () {
  const mistura = (hex, alvo, f) => {
    const n = parseInt(hex.slice(1), 16), a = parseInt(alvo.slice(1), 16), c = (s) => Math.round(((n >> s) & 255) * (1 - f) + ((a >> s) & 255) * f);
    return `rgb(${c(16)},${c(8)},${c(0)})`;
  };
  let seq = 0;
  function svg(cor, emoji, { tam = 40, cls = "" } = {}) {
    // o nome do gradiente é único por desenho: se dois peões da mesma cor usassem o mesmo nome, o navegador pegaria o
    // primeiro, que pode estar numa tela escondida (e o peão ficaria sem cor)
    const id = "pg" + ++seq, claro = mistura(cor, "#ffffff", 0.45), escuro = mistura(cor, "#000000", 0.45), meio = mistura(cor, "#000000", 0.15);
    const simbolo = Icones.PEOES[emoji] ? `<use href="#i-${Icones.PEOES[emoji]}" x="13" y="28" width="14" height="14" color="#fff" opacity=".92"/>` : "";
    return `<svg class="peao3d${cls ? " " + cls : ""}" viewBox="0 0 40 58" width="${tam}" height="${(tam * 58) / 40}" aria-hidden="true">
      <defs>
        <linearGradient id="${id}c" x1="0" x2="1"><stop offset="0" stop-color="${escuro}"/><stop offset=".3" stop-color="${cor}"/><stop offset=".55" stop-color="${claro}"/><stop offset=".75" stop-color="${cor}"/><stop offset="1" stop-color="${escuro}"/></linearGradient>
        <radialGradient id="${id}h" cx=".35" cy=".3" r=".75"><stop offset="0" stop-color="#fff"/><stop offset=".25" stop-color="${claro}"/><stop offset=".7" stop-color="${cor}"/><stop offset="1" stop-color="${escuro}"/></radialGradient>
      </defs>
      <ellipse cx="20" cy="54.5" rx="16" ry="3.4" fill="#0007"/>
      <path d="M4 49.5v-3a16 5 0 0 1 32 0v3a16 5 0 0 1-32 0z" fill="url(#${id}c)"/>
      <ellipse cx="20" cy="46.5" rx="16" ry="5" fill="${meio}"/>
      <path d="M8.5 46.5C10 38 14 31 15.5 24h9c1.5 7 5.5 14 7 22.5a11.5 4 0 0 1-23 0z" fill="url(#${id}c)"/>
      <ellipse cx="20" cy="24.5" rx="8.5" ry="2.8" fill="${claro}"/>
      <ellipse cx="20" cy="23.6" rx="8.5" ry="2.8" fill="url(#${id}c)"/>
      <circle cx="20" cy="13" r="10.5" fill="url(#${id}h)"/>
      <ellipse cx="16" cy="8.5" rx="3.6" ry="2.4" fill="#fff" opacity=".75" transform="rotate(-25 16 8.5)"/>
      ${simbolo}
    </svg>`;
  }
  window.Peoes = { svg };
})();
