// Os cenários do modo Pokémon: em vez do ginásio com arquibancada, a luta é num lugar aberto, visto de cima como numa
// partida de MOBA: a clareira da floresta com a trilha de terra no meio (o padrão), o vulcão com lava nas rachaduras, a
// lagoa com areia e água, a neve com pinheiros e as ruínas com musgo. As pilastras da regra (as mesmas posições e o
// mesmo tamanho) viram pedras, tocos, cristais ou colunas quebradas. Cada lado tem a sua bandeira (azul e vermelha).
// - O cenário sai do líder (o tipo dele escolhe o lugar) ou, sem líder, da partida (todo mundo da sala vê o mesmo).
// - O chão da arena é pintado uma vez num canvas (pixels de 4 em 4) e desenhado por desenho.js no lugar da quadra.
// - Em 3D, montarBioma põe o chão de fora, as árvores, as pedras, as bandeiras, a água ou a lava e a luz do lugar
//   (chamado por montarTema, cena3d.js); o clima (folhas, brasas, neve...) é o de cenarios.js.
// Cada bioma é um tema completo (os mesmos campos de TEMAS, em temas.js), mais `bioma`.
const BIOMAS = {
  floresta: { bioma: "floresta", nome: "CLAREIRA", fundo: ["#3d5a2c", "#456532"], piso: ["#6a9a40", "#73a446"], borda: "#3a2c1c", arquibancada: "#2c4220", torcida: ["#70a9c4", "#ce8586"],
    laterais: ["#4a7a30", "#4a7a30"], linha: "#e9dcbb", centro: "#5f8f3a", meio: ["#5f8f3a", "#5f8f3a"], miolo: "#3a5a26", letreiro: "#a9e58a",
    pilar: ["#3a4038", "#7d847a", "#9aa196", "#5f8f3a"], clima: "folhas",
    grama: ["#5f8f3a", "#6a9a40", "#577f34", "#73a446", "#64933c"], trilha: ["#b08b5a", "#a07c4e", "#c29b68", "#98764a"], fora: ["#4d7a30", "#567f35", "#466e2c"],
    sol: ["#fff1d6", "#cfe6c0", 0.6], ceu: "#2c4a2e" },
  vulcao: { bioma: "vulcao", nome: "CRATERA", fundo: ["#2a1d1a", "#32221e"], piso: ["#43352f", "#3a2f2c"], borda: "#140c0a", arquibancada: "#1c0f0c", torcida: ["#70a9c4", "#ce8586"],
    laterais: ["#2a1d1a", "#2a1d1a"], linha: "#ff9a4d", centro: "#3a2f2c", meio: ["#3a2f2c", "#3a2f2c"], miolo: "#2a1d1a", letreiro: "#ff9a4d",
    pilar: ["#140c0a", "#3b2a24", "#5a443a", "#ff7a2e"], clima: "brasas",
    grama: ["#3a2f2c", "#43352f", "#2f2624", "#4a3a33", "#362a26"], trilha: ["#6a5a50", "#5e4f46", "#776659", "#544640"], fora: ["#2f2420", "#352823", "#281e1b"],
    sol: ["#ffc890", "#ff9f80", 0.5], ceu: "#1e1210" },
  lagoa: { bioma: "lagoa", nome: "LAGOA", fundo: ["#2a5a6a", "#306474"], piso: ["#d9c08a", "#e2ca94"], borda: "#8a6f45", arquibancada: "#2a4a52", torcida: ["#70a9c4", "#ce8586"],
    laterais: ["#c9ad74", "#c9ad74"], linha: "#ffffff", centro: "#d0b680", meio: ["#d0b680", "#d0b680"], miolo: "#a88d5c", letreiro: "#8fd0ff",
    pilar: ["#5a4a36", "#c97a6a", "#e8a090", "#f0d0c0"], clima: "bolhas",
    grama: ["#d9c08a", "#e2ca94", "#cfb47e", "#e8d29e", "#d4ba84"], trilha: ["#bfa26c", "#b39663", "#c9ad76", "#a98c5a"], fora: ["#d6bd88", "#cdb27c", "#dcc492"],
    sol: ["#fff6e0", "#bfe4f0", 0.64], ceu: "#5fa8c8" },
  neve: { bioma: "neve", nome: "PICO NEVADO", fundo: ["#c9dce6", "#d6e6ee"], piso: ["#eef4f8", "#e4edf3"], borda: "#8aa8b8", arquibancada: "#a8c4d2", torcida: ["#70a9c4", "#ce8586"],
    laterais: ["#dfeaf1", "#dfeaf1"], linha: "#7fb9c9", centro: "#e4edf3", meio: ["#e4edf3", "#e4edf3"], miolo: "#bcd2de", letreiro: "#3f8aa0",
    pilar: ["#5a7a88", "#9be3f0", "#d6f3fa", "#ffffff"], clima: "neve",
    grama: ["#eef4f8", "#e4edf3", "#f7fbfd", "#dde8ef", "#e9f1f6"], trilha: ["#c9d8e2", "#bfd0dc", "#d3e0e8", "#b6c9d6"], fora: ["#e6eef3", "#dce7ee", "#eef4f8"],
    sol: ["#f0fbff", "#c8ecff", 0.68], ceu: "#9fc0d2" },
  ruinas: { bioma: "ruinas", nome: "RUÍNAS", fundo: ["#3a3a46", "#42424e"], piso: ["#8a8578", "#948f82"], borda: "#2a2a30", arquibancada: "#2a2a34", torcida: ["#70a9c4", "#ce8586"],
    laterais: ["#7a7568", "#7a7568"], linha: "#d8d2c2", centro: "#8a8578", meio: ["#8a8578", "#8a8578"], miolo: "#5a5650", letreiro: "#c79bff",
    pilar: ["#2a2a30", "#9a9488", "#b8b2a4", "#6a8a4a"], clima: "poeira",
    grama: ["#8a8578", "#948f82", "#7f7a6e", "#9b968a", "#868174"], trilha: ["#6a8a4a", "#5f7f42", "#749552", "#55743c"], fora: ["#5a6a46", "#62724c", "#526240"],
    sol: ["#e8e0ff", "#b8b0d8", 0.55], ceu: "#2c2a3a" },
};
// o tipo do líder escolhe o lugar
const BIOMA_DO_TIPO = { "Fogo": "vulcao", "Dragão": "vulcao", "Água": "lagoa", "Gelo": "neve", "Pedra": "ruinas", "Lutador": "ruinas", "Psíquico": "ruinas", "Fantasma": "ruinas", "Grama": "floresta", "Elétrico": "floresta" };
const ORDEM_BIOMAS = ["floresta", "floresta", "lagoa", "vulcao", "neve", "ruinas"]; // a floresta sai mais
// o lugar desta partida: o do líder, ou um sorteado pelo começo da partida (o mesmo número para toda a sala)
function biomaDaPartida(lider) {
  if (lider && BIOMA_DO_TIPO[lider.tipo]) return BIOMAS[BIOMA_DO_TIPO[lider.tipo]];
  const semente = S?.match?.start;
  if (!semente) return BIOMAS.floresta;
  return BIOMAS[ORDEM_BIOMAS[Math.floor(fixo(semente % 100003) * ORDEM_BIOMAS.length)]];
}

// ---------- o chão da arena (pintado uma vez) ----------
const chaoBioma = new Map();
const PX_BIOMA = 48; // o mesmo PX_CHAO de desenho.js
function pintarChaoBioma(B) {
  let cv = chaoBioma.get(B.bioma);
  if (cv) return cv;
  const W = Math.round(18.5 * PX_BIOMA), H = Math.round(12.5 * PX_BIOMA), q = 4; // q: o tamanho do "pixel"
  cv = document.createElement("canvas"); cv.width = W; cv.height = H;
  const c = cv.getContext("2d"), r = (i) => fixo(i * 1.618 + B.bioma.length * 7.7);
  const casa = (x, y) => [x / PX_BIOMA - 9.25, y / PX_BIOMA - 6.25]; // pixel → arena
  // a trilha: uma faixa que serpenteia de cima a baixo pelo meio (a divisa dos dois lados)
  const trilhaX = (z) => Math.sin(z * 0.55 + 0.7) * 0.9 + Math.sin(z * 1.3) * 0.25;
  const larguraTrilha = (z) => 1.1 + Math.sin(z * 0.9 + 2) * 0.25;
  for (let y = 0; y < H; y += q) for (let x = 0; x < W; x += q) {
    const [ax, az] = casa(x, y), i = (x / q) * 977 + (y / q) * 131;
    let cores = B.grama, k = r(i);
    // manchas grandes (tom mais escuro ou mais claro em regiões)
    const mancha = Math.sin(ax * 0.7 + az * 0.4) + Math.sin(az * 0.9 - ax * 0.3) * 0.7;
    let idx = Math.floor(k * cores.length);
    if (mancha > 1.1) idx = Math.min(cores.length - 1, idx + 1); else if (mancha < -1.1) idx = Math.max(0, idx - 1);
    let cor = cores[idx];
    const dTrilha = Math.abs(ax - trilhaX(az)) - larguraTrilha(az);
    if (B.bioma === "ruinas") { // lajotas com junta de musgo; a trilha é o musgo tomando o meio
      const jx = ((ax + 9.25) % 1 + 1) % 1, jz = ((az + 6.25) % 1 + 1) % 1;
      if (jx < 0.06 || jz < 0.06) cor = k < 0.5 ? "#55743c" : "#4a4640";
      if (dTrilha < -0.2 && k < 0.7) cor = B.trilha[idx % B.trilha.length];
    } else if (dTrilha < 0) cor = B.trilha[Math.floor(r(i + 5) * B.trilha.length)];
    else if (dTrilha < 0.15 && k < 0.55) cor = B.trilha[3]; // a borda da trilha, falhada
    c.fillStyle = cor; c.fillRect(x, y, q, q);
  }
  const ponto = (ax, az, w, h, cor) => { c.fillStyle = cor; c.fillRect(Math.round((ax + 9.25) * PX_BIOMA / q) * q, Math.round((az + 6.25) * PX_BIOMA / q) * q, w, h); };
  // os detalhes de cada lugar
  for (let n = 0; n < 420; n++) {
    const ax = (r(n + 900) - 0.5) * 18.4, az = (r(n + 1900) - 0.5) * 12.4, k = r(n + 2900), naTrilha = Math.abs(ax - trilhaX(az)) < larguraTrilha(az);
    if (B.bioma === "floresta") {
      if (naTrilha) { if (k < 0.35) ponto(ax, az, 8, 4, k < 0.15 ? "#8a8a80" : "#c9c2b0"); } // pedrinhas na terra
      else if (k < 0.45) { ponto(ax, az, 4, 8, "#3f6a26"); ponto(ax + 0.08, az, 4, 4, "#86b84e"); } // tufos de capim
      else if (k < 0.55) ponto(ax, az, 4, 4, ["#ffffff", "#ffe066", "#d08cff", "#ff9a9a"][n % 4]); // florzinhas
      else if (k < 0.62) ponto(ax, az, 8, 4, ["#d9822b", "#c0562a", "#e8b04a"][n % 3]); // folhas secas
    } else if (B.bioma === "vulcao") {
      if (k < 0.18) { // as rachaduras com lava (o brilho é parado: o chão não pisca)
        let x = ax, z = az;
        for (let s = 0; s < 6; s++) { ponto(x, z, 4, 4, s % 2 ? "#ff7a2e" : "#ffb04a"); x += (r(n * 7 + s) - 0.5) * 0.35; z += (r(n * 11 + s) - 0.5) * 0.25; }
      } else if (k < 0.4) ponto(ax, az, 8, 4, "#1f1715");
      else if (k < 0.5) ponto(ax, az, 4, 4, "#8a7a70");
    } else if (B.bioma === "lagoa") {
      if (k < 0.12) ponto(ax, az, 8, 4, ["#f0e2c8", "#e8a090", "#ffffff"][n % 3]); // conchas
      else if (k < 0.4) ponto(ax, az, 4, 4, "#c4a874");
      else if (k < 0.5 && !naTrilha) { ponto(ax, az, 4, 8, "#6a9a40"); } // capim da beira
    } else if (B.bioma === "neve") {
      if (naTrilha && k < 0.4) { ponto(ax - 0.05, az, 4, 6, "#c3d3de"); ponto(ax + 0.08, az + 0.18, 4, 6, "#c3d3de"); } // pegadas
      else if (k < 0.2) ponto(ax, az, 12, 4, "#cfeaf5"); // gelo
      else if (k < 0.3) ponto(ax, az, 4, 4, "#ffffff");
    } else if (B.bioma === "ruinas") {
      if (k < 0.12) { let x = ax, z = az; for (let s = 0; s < 5; s++) { ponto(x, z, 4, 4, "#4a4640"); x += (r(n * 5 + s) - 0.5) * 0.3; z += r(n * 3 + s) * 0.2; } } // rachaduras
      else if (k < 0.32) ponto(ax, az, 8, 8, ["#6a8a4a", "#7aa052"][n % 2]); // musgo
      else if (k < 0.4) ponto(ax, az, 4, 4, "#b8b2a4");
    }
  }
  // poças na lagoa (nos cantos de fora da trilha) e a água rasa entrando por cima
  if (B.bioma === "lagoa") {
    for (const [cx, cz, rr] of [[-7.3, -4.6, 1.3], [7.4, 4.5, 1.2], [6.8, -4.9, 0.8], [-7.0, 4.8, 0.7]]) {
      for (let y = 0; y < H; y += q) for (let x = 0; x < W; x += q) {
        const [ax, az] = casa(x, y), d = Math.hypot((ax - cx) / rr, (az - cz) / (rr * 0.75));
        if (d < 1) { c.fillStyle = d > 0.82 ? "#e8f6ff" : d > 0.6 ? "#7cc6e0" : "#4fa8d0"; c.fillRect(x, y, q, q); }
      }
    }
  }
  // a beira da arena escurece (o limite de onde dá para ir)
  const g = c.createLinearGradient(0, 0, 0, H), sombra = "rgba(0,0,0,.22)";
  for (const [x0, y0, x1, y1] of [[0, 0, 0, 0.25], [0, 1, 0, 0.75]]) { const gr = c.createLinearGradient(x0 * W, y0 * H, x1 * W, y1 * H); gr.addColorStop(0, sombra); gr.addColorStop(1, "rgba(0,0,0,0)"); c.fillStyle = gr; c.fillRect(0, 0, W, H); }
  for (const [x0, x1] of [[0, 0.12], [1, 0.88]]) { const gr = c.createLinearGradient(x0 * W, 0, x1 * W, 0); gr.addColorStop(0, sombra); gr.addColorStop(1, "rgba(0,0,0,0)"); c.fillStyle = gr; c.fillRect(0, 0, W, H); }
  void g;
  // a linha de cada lado, quase apagada (onde cada time começa)
  c.fillStyle = "rgba(35,125,205,.16)"; c.fillRect(0, 0, Math.round(0.35 * PX_BIOMA), H);
  c.fillStyle = "rgba(223,81,90,.16)"; c.fillRect(W - Math.round(0.35 * PX_BIOMA), 0, Math.round(0.35 * PX_BIOMA), H);
  chaoBioma.set(B.bioma, cv);
  return cv;
}
// no lugar da quadra (desenharPiso, desenho.js)
function desenharChaoBioma(B) {
  const s = camera.escala, cv = pintarChaoBioma(B);
  ctx.drawImage(cv, Math.round(camera.x - 9.25 * s), Math.round(camera.y - 6.25 * s), Math.round(18.5 * s), Math.round(12.5 * s));
}

// ---------- o lugar em 3D ----------
function montarBioma(B, grupo, toon) {
  const leve = cena3d.leve, calmo = () => movimentoReduzido.matches, animados = [];
  const cache = new Map(), mat = (hex) => { let m = cache.get(hex); if (!m) cache.set(hex, (m = toon(hex))); return m; };
  const basico = (hex, op) => new THREE.MeshBasicMaterial({ color: new THREE.Color(hex), transparent: op != null, opacity: op ?? 1, depthWrite: op == null });
  const geo = {
    tronco: new THREE.CylinderGeometry(0.12, 0.18, 1, 7), copa: new THREE.IcosahedronGeometry(1, 0), cone: new THREE.ConeGeometry(1, 1, 8),
    pedra: new THREE.DodecahedronGeometry(1, 0), caixa: new THREE.BoxGeometry(1, 1, 1), coluna: new THREE.CylinderGeometry(1, 1, 1, 10), esfera: new THREE.SphereGeometry(1, 10, 7),
  };
  const peca = (g, m, x, y, z, sx = 1, sy = 1, sz = 1, sombra = true) => { const o = new THREE.Mesh(g, m); o.position.set(x, y, z); o.scale.set(sx, sy, sz); o.castShadow = sombra && !leve; o.receiveShadow = true; grupo.add(o); return o; };
  // a luz e o fundo do lugar
  const [sol, amb, forca] = B.sol;
  cena3d.sol.color.set(sol); cena3d.ambiente.color.set(amb); cena3d.ambiente.intensity = forca * Math.PI;
  cena3d.scene.background = new THREE.Color(B.ceu);
  cena3d.scene.fog = new THREE.Fog(cena3d.scene.background, (cena3d.distancia || 26) + 4, (cena3d.distancia || 26) + 30);
  // o chão de fora (pixels de 4 em 4, das cores do lugar)
  const fora = document.createElement("canvas"); fora.width = fora.height = 64;
  const fc = fora.getContext("2d");
  for (let y = 0; y < 64; y += 4) for (let x = 0; x < 64; x += 4) { fc.fillStyle = B.fora[Math.floor(fixo(x * 13 + y * 7) * B.fora.length)]; fc.fillRect(x, y, 4, 4); }
  const texFora = texturaDe(fora, true); texFora.repeat.set(30, 30);
  const chaoFora = new THREE.Mesh(new THREE.PlaneGeometry(120, 120), new THREE.MeshLambertMaterial({ map: texFora }));
  chaoFora.rotation.x = -Math.PI / 2; chaoFora.position.y = -0.03; chaoFora.receiveShadow = true; grupo.add(chaoFora);
  // a arena: o chão pintado, rente (a beira é da cor do lugar, sem tablado)
  const beira = new THREE.MeshLambertMaterial({ color: new THREE.Color(B.fora[0]) }), piso = new THREE.MeshLambertMaterial({ map: cena3d.texChao });
  const arena = new THREE.Mesh(new THREE.BoxGeometry(18.5, 0.04, 12.5), [beira, beira, piso, beira, beira, beira]);
  arena.position.y = -0.02; arena.receiveShadow = true; grupo.add(arena);

  // ---- as árvores (e o que faz as vezes delas em cada lugar) ----
  const arvore = (x, z, k, jeito) => {
    const e = 0.8 + k * 0.7;
    if (jeito === "folhosa") {
      peca(geo.tronco, mat("#5a3d24"), x, 0.6 * e, z, e, 1.2 * e, e);
      const cores = [["#3f7a2e", "#4f8f36", "#2f6424"], ["#d98a2b", "#e8a83a", "#c0661f"], ["#e8e4dc", "#f4f1ea", "#d2ccc0"], ["#6a9a40", "#7fb04a", "#55803a"]][Math.floor(fixo(x * 3 + z) * 4)];
      const copa = new THREE.Group(); copa.position.set(x, 1.5 * e, z); grupo.add(copa);
      for (let i = 0; i < 4; i++) { const m = new THREE.Mesh(geo.copa, mat(cores[i % 3])); m.position.set((fixo(i + x) - 0.5) * 0.9 * e, i * 0.35 * e, (fixo(i + z) - 0.5) * 0.9 * e); m.scale.setScalar((0.85 - i * 0.12) * e); m.rotation.set(i, i * 2, 0); m.castShadow = !leve; copa.add(m); }
      animados.push((t) => { if (!calmo()) copa.rotation.z = Math.sin(t * 0.8 + x) * 0.03; });
    } else if (jeito === "pinheiro") {
      peca(geo.tronco, mat("#4a3423"), x, 0.4 * e, z, e, 0.8 * e, e);
      for (let i = 0; i < 3; i++) {
        peca(geo.cone, mat(i % 2 ? "#2f5a3a" : "#3a6a44"), x, (0.9 + i * 0.55) * e, z, (1 - i * 0.25) * e, 0.9 * e, (1 - i * 0.25) * e);
        peca(geo.cone, mat("#f4fbff"), x, (1.12 + i * 0.55) * e, z, (0.62 - i * 0.16) * e, 0.45 * e, (0.62 - i * 0.16) * e, false); // a neve em cima
      }
    } else if (jeito === "seca") { // a árvore queimada: tronco grosso e torto, galhos secos e brasa na ponta
      const tronco = peca(geo.tronco, mat("#241a17"), x, 0.9 * e, z, 1.6 * e, 1.8 * e, 1.6 * e); tronco.rotation.z = (fixo(x + z) - 0.5) * 0.25;
      for (let i = 0; i < 3; i++) {
        const g = peca(geo.tronco, mat("#2f2420"), x + (i - 1) * 0.35 * e, (1.5 + i * 0.22) * e, z + (fixo(i + x) - 0.5) * 0.3, 0.7 * e, 0.9 * e, 0.7 * e); g.rotation.z = (i - 1) * 0.9;
        if (fixo(i * 3 + x) < 0.5) peca(geo.esfera, basico("#ff7a2e"), x + (i - 1) * 0.65 * e, (1.85 + i * 0.22) * e, g.position.z, 0.06, 0.06, 0.06, false);
      }
      peca(geo.pedra, mat("#2f2624"), x + 0.3, 0.1, z + 0.2, 0.35 * e, 0.2, 0.3 * e);
    } else if (jeito === "palmeira") {
      const tronco = peca(geo.tronco, mat("#8a6a42"), x, 1.1 * e, z, 0.8 * e, 2.2 * e, 0.8 * e); tronco.rotation.z = (fixo(x) - 0.5) * 0.3;
      for (let i = 0; i < 6; i++) { const f = peca(geo.caixa, mat(i % 2 ? "#4f8f36" : "#3f7a2e"), x + Math.cos(i) * 0.6 * e, 2.2 * e, z + Math.sin(i) * 0.6 * e, 1.3 * e, 0.06, 0.35 * e); f.rotation.set(0, -i, -0.4); }
    } else if (jeito === "coluna") { // as ruínas: colunas de pedra, algumas quebradas
      const alt = (1.2 + k * 2.2);
      peca(geo.coluna, mat("#9a9488"), x, alt / 2, z, 0.35, alt, 0.35);
      peca(geo.caixa, mat("#b8b2a4"), x, alt + 0.1, z, 0.9, 0.2, 0.9);
      if (k > 0.6) peca(geo.copa, mat("#6a8a4a"), x + 0.2, alt + 0.3, z, 0.4, 0.25, 0.4); // musgo
    }
  };
  const jeitoDaArvore = { floresta: "folhosa", vulcao: "seca", lagoa: "palmeira", neve: "pinheiro", ruinas: "coluna" }[B.bioma];
  const arbusto = (x, z, k) => {
    if (B.bioma === "vulcao") peca(geo.pedra, mat(k < 0.5 ? "#2f2624" : "#43352f"), x, 0.2, z, 0.4 + k * 0.3, 0.3 + k * 0.2, 0.4 + k * 0.3);
    else if (B.bioma === "neve") peca(geo.esfera, mat("#ffffff"), x, -0.05, z, 0.6 + k * 0.4, 0.35, 0.6 + k * 0.4);
    else if (B.bioma === "lagoa") { for (let i = 0; i < 4; i++) peca(geo.caixa, mat(i % 2 ? "#6a9a40" : "#8aa04a"), x + (i - 1.5) * 0.08, 0.35, z, 0.04, 0.7 + fixo(i + x) * 0.4, 0.04, false); } // junco
    else peca(geo.copa, mat(k < 0.5 ? "#3f6a26" : "#4f8f36"), x, 0.25, z, 0.5 + k * 0.3, 0.35 + k * 0.15, 0.5 + k * 0.3);
  };
  // atrás (alto pode), dos lados e na frente (só baixo, para não tapar a luta)
  let n = 0;
  for (let i = 0; i < (leve ? 22 : 38); i++) {
    const k = fixo(i * 3.3 + 1), x = -15 + fixo(i * 7.1) * 30, z = -8.2 - fixo(i * 5.7) * 6;
    if (B.bioma === "ruinas" && fixo(i * 1.9) > 0.4) arbusto(x, z, k); // nas ruínas, nem tudo é coluna: o mato tomou conta
    else arvore(x, z, k, jeitoDaArvore);
    n++;
  }
  for (const s of [-1, 1]) for (let i = 0; i < (leve ? 6 : 10); i++) {
    const k = fixo(i * 2.9 + s), z = -6.5 + i * 1.35 + (fixo(i + s * 9) - 0.5) * 0.6, x = s * (10.6 + fixo(i * 4.3 + s) * 4);
    if (B.bioma === "ruinas" && fixo(i * 2.3 + s) > 0.45) arbusto(x, z, k); else arvore(x, z, k * 0.8, jeitoDaArvore);
  }
  for (let i = 0; i < 16; i++) arbusto(-12 + i * 1.6 + (fixo(i) - 0.5) * 0.8, 7.1 + fixo(i * 2) * 1.6, fixo(i * 5));
  for (let i = 0; i < 14; i++) arbusto((fixo(i * 9) < 0.5 ? -1 : 1) * (9.6 + fixo(i * 3) * 0.6), -6 + fixo(i * 7) * 12, fixo(i * 11));
  // pedras soltas em volta
  for (let i = 0; i < 10; i++) {
    const x = (fixo(i * 13) - 0.5) * 26, z = -7.4 - fixo(i * 17) * 3, k = fixo(i * 19);
    peca(geo.pedra, mat(B.pilar[1]), x, 0.15, z, 0.3 + k * 0.5, 0.25 + k * 0.3, 0.3 + k * 0.4);
  }

  // ---- as pilastras da regra viram o que é do lugar ----
  for (const p of Ginasio.ARENA.pilares) {
    if (B.bioma === "ruinas") { // coluna quebrada
      peca(geo.coluna, mat("#9a9488"), p.x, 0.6, p.y, p.r * 0.95, 1.2, p.r * 0.95);
      peca(geo.caixa, mat("#b8b2a4"), p.x, 1.25, p.y, p.r * 2, 0.18, p.r * 2);
      peca(geo.copa, mat("#6a8a4a"), p.x - 0.15, 1.36, p.y, p.r * 0.7, 0.15, p.r * 0.6);
    } else if (B.bioma === "neve") { // cristais de gelo
      for (let i = 0; i < 3; i++) { const c = peca(new THREE.OctahedronGeometry(1, 0), mat(i % 2 ? "#d6f3fa" : "#9be3f0"), p.x + (i - 1) * p.r * 0.45, 0.6 + (i % 2) * 0.2, p.y + (i % 2 ? 0.1 : -0.1), p.r * 0.45, 0.9 + (i % 2) * 0.3, p.r * 0.45); c.rotation.z = (i - 1) * 0.25; }
      peca(geo.esfera, mat("#ffffff"), p.x, 0, p.y, p.r * 1.05, 0.25, p.r * 1.05);
    } else if (B.bioma === "lagoa") { // rocha de coral
      peca(geo.pedra, mat("#c97a6a"), p.x, 0.45, p.y, p.r, 0.65, p.r);
      for (let i = 0; i < 3; i++) peca(geo.coluna, mat("#e8a090"), p.x + (i - 1) * 0.25, 1, p.y, 0.07, 0.6 + i * 0.1, 0.07);
    } else if (B.bioma === "vulcao") { // basalto com o veio de lava
      peca(geo.pedra, mat("#3b2a24"), p.x, 0.5, p.y, p.r, 0.75, p.r);
      const veio = peca(geo.caixa, basico("#ff7a2e"), p.x, 0.55, p.y, p.r * 1.6, 0.06, 0.08, false); veio.rotation.y = 0.6;
      animados.push((t) => { if (!calmo()) veio.material.color.setHSL(0.06, 1, 0.5 + Math.sin(t * 2 + p.x) * 0.1); });
    } else { // a pedra com musgo da floresta
      peca(geo.pedra, mat("#7d847a"), p.x, 0.48, p.y, p.r, 0.72, p.r);
      peca(geo.copa, mat("#5f8f3a"), p.x - 0.05, 0.95, p.y - 0.05, p.r * 0.75, 0.22, p.r * 0.7);
    }
  }

  // ---- as bandeiras dos dois lados (no fundo, perto dos cantos) ----
  for (const [lado, cor] of [[-1, "#237dcd"], [1, "#df515a"]]) for (const dz of [-1, 1]) {
    const x = lado * 9.6, z = dz < 0 ? -6.9 : 6.7;
    peca(geo.coluna, mat("#3a2c1c"), x, 1.3, z, 0.05, 2.6, 0.05);
    const pano = peca(geo.caixa, mat(cor), x - lado * 0.38, 2.15, z, 0.72, 1, 0.03);
    peca(geo.caixa, mat("#f2e7c8"), x - lado * 0.38, 2.62, z, 0.76, 0.06, 0.04, false);
    animados.push((t) => { if (!calmo()) pano.rotation.y = Math.sin(t * 1.8 + x + z) * 0.18; });
  }

  // ---- o que só tem em cada lugar ----
  if (B.bioma === "vulcao") { // poças de lava pulsando e a fumaça ao fundo
    for (const [x, z, r] of [[-12.5, 2, 1.1], [12.6, -2.2, 1.2], [-6, -9.5, 1.3], [7, -10, 1]]) {
      // a crosta escura em volta, a lava e o miolo mais claro que pulsa
      const crosta = new THREE.Mesh(new THREE.CircleGeometry(r * 1.25, 9), basico("#1f1715")); crosta.rotation.x = -Math.PI / 2; crosta.position.set(x, -0.012, z); grupo.add(crosta);
      const lava = new THREE.Mesh(new THREE.CircleGeometry(r, 9), basico("#c8380f")); lava.rotation.x = -Math.PI / 2; lava.rotation.z = x; lava.position.set(x, -0.008, z); grupo.add(lava);
      const miolo = new THREE.Mesh(new THREE.CircleGeometry(r * 0.55, 7), basico("#ffb04a")); miolo.rotation.x = -Math.PI / 2; miolo.position.set(x + 0.1, -0.004, z); grupo.add(miolo);
      animados.push((t) => { if (!calmo()) { const k = Math.sin(t * 1.5 + x); miolo.scale.setScalar(1 + k * 0.12); miolo.material.color.setHSL(0.09, 1, 0.6 + k * 0.06); } });
    }
  } else if (B.bioma === "lagoa") { // a lagoa no fundo, que brilha
    const agua = new THREE.Mesh(new THREE.PlaneGeometry(60, 10), basico("#3f8fb8", 0.92)); agua.rotation.x = -Math.PI / 2; agua.position.set(0, -0.015, -13.5); grupo.add(agua);
    animados.push((t) => { if (!calmo()) agua.material.color.setHSL(0.55, 0.5, 0.45 + Math.sin(t * 0.8) * 0.03); });
  } else if (B.bioma === "floresta") { // o tronco caído e os cogumelos
    const tora = peca(geo.coluna, mat("#5a3d24"), -12.2, 0.25, 4.5, 0.28, 2.4, 0.28); tora.rotation.z = Math.PI / 2; tora.rotation.y = 0.4;
    for (let i = 0; i < 5; i++) { peca(geo.coluna, mat("#f2e7c8"), 11.5 + i * 0.25, 0.1, 4 + fixo(i) * 1.2, 0.04, 0.2, 0.04, false); peca(geo.esfera, mat(i % 2 ? "#d9452b" : "#e8a83a"), 11.5 + i * 0.25, 0.22, 4 + fixo(i) * 1.2, 0.12, 0.07, 0.12, false); }
  } else if (B.bioma === "ruinas") { // o arco quebrado ao fundo
    peca(geo.caixa, mat("#8a8578"), -3, 1.6, -10.5, 0.8, 3.2, 0.8); peca(geo.caixa, mat("#8a8578"), 3, 1.3, -10.5, 0.8, 2.6, 0.8);
    peca(geo.caixa, mat("#9a9488"), -1.2, 3.4, -10.5, 4.2, 0.6, 0.9);
  }

  const clima = montarClima3d(B, grupo);
  return (agora) => { const t = agora / 1000; for (const a of animados) a(t); clima?.(t); };
}
