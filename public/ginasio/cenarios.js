// O cenário de cada ginásio em 3D, por cima do que cena3d.js monta para todos (tablado, arquibancada, pilares):
// - a luz do tema (a cor do sol, do ambiente e da névoa de fundo);
// - os enfeites em volta da quadra: lava e braseiros no Brasa, água e boias no Maré, árvores e arbustos no Mata,
//   torres de faísca no Faísca, rochas e estalagmites no Rochedo, cristais flutuando no Místico, lápides e velas no
//   Casarão, braseiros roxos e chifres na Toca do Dragão, o pórtico e as lanternas do Dojô, espinhos e montes de neve
//   na Pista Geada; no Ginásio da Galera, as torres de refletor e as bandeiras;
// - o clima em 3D (brasas subindo, bolhas, folhas caindo, neve, poeira, estrelas, névoa), no lugar do clima de tela
//   de temas.js (as faíscas continuam na tela). Com menos movimento, sem clima e sem enfeite mexendo.
// montarCenario é chamado por montarTema (cena3d.js) e devolve a função que anima o cenário a cada quadro.
const LUZ_DO_CHAO = { // sol, ambiente, força do ambiente
  lava: ["#ffc890", "#ff9f80", 0.5], ondas: ["#e6f6ff", "#a8d8ff", 0.62], flores: ["#fff6d8", "#d8f0c0", 0.62],
  placas: ["#fff8d0", "#d8d8e8", 0.55], pedras: ["#ffe8c0", "#e8d8c0", 0.62], runas: ["#ffd8f4", "#d8b8ff", 0.55],
  rachaduras: ["#c8c0ff", "#8070b8", 0.45], escamas: ["#ffe0b0", "#b8a0ff", 0.5], tatame: ["#fff0d8", "#f0d8c0", 0.62],
  gelo: ["#f0fbff", "#c8ecff", 0.66],
};

function montarCenario(T, grupo, toon) {
  const chao = T.chao || "padrao", calmo = () => movimentoReduzido.matches, leve = cena3d.leve, animados = [];
  const basico = (hex, opacidade) => new THREE.MeshBasicMaterial({ color: new THREE.Color(hex), transparent: opacidade != null, opacity: opacidade ?? 1, depthWrite: opacidade == null });
  const peca = (geo, mat, x, y, z, sombra = true) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.castShadow = sombra && !leve; m.receiveShadow = true; grupo.add(m); return m; };
  const caixa = (w, h, d) => new THREE.BoxGeometry(w, h, d);
  // a luz do tema
  const [sol, amb, forca] = LUZ_DO_CHAO[chao] || ["#ffffff", "#ffffff", 0.62];
  cena3d.sol.color.set(sol); cena3d.ambiente.color.set(amb); cena3d.ambiente.intensity = forca * Math.PI;
  // os cantos (onde os enfeites altos cabem sem tapar a quadra) e a frente (só coisa baixa)
  const cantos = [[-11.3, -8.4], [11.3, -8.4], [-10.6, 7.4], [10.6, 7.4]], frente = [-7, -3.5, 0, 3.5, 7].map((x) => [x, 7.6]);
  const chama = (x, y, z, cores, tam = 0.35) => { // uma chama de três camadas que tremula
    const g = new THREE.Group(); g.position.set(x, y, z); grupo.add(g);
    cores.forEach((c, i) => { const m = new THREE.Mesh(new THREE.ConeGeometry(tam * (1 - i * 0.25), tam * 2.2 * (1 - i * 0.2), 7), basico(c)); m.position.y = tam * (1 + i * 0.1); g.add(m); });
    animados.push((t) => { if (calmo()) return; g.children.forEach((m, i) => { m.scale.set(1 + Math.sin(t * 13 + i + x) * 0.12, 1 + Math.sin(t * 17 + i * 2 + z) * 0.2, 1); m.rotation.y = t * (2 + i); }); });
    return g;
  };
  const braseiro = (x, z, cores, base) => { peca(new THREE.CylinderGeometry(0.35, 0.25, 1.2, 10), toon(base), x, 0.4, z); peca(new THREE.CylinderGeometry(0.5, 0.38, 0.3, 10), toon(base), x, 1.1, z); chama(x, 1.25, z, cores); };

  if (chao === "lava") {
    // poças de lava no chão de fora, que pulsam
    const lava = basico("#e8501a");
    for (const [x, z, r] of [[-13.2, 2, 1.4], [13.3, -2.5, 1.5], [-12.8, -5.5, 0.9], [12.9, 4, 0.8]]) {
      const m = new THREE.Mesh(new THREE.CircleGeometry(r, 20), lava); m.rotation.x = -Math.PI / 2; m.position.set(x, -0.18, z); grupo.add(m);
    }
    animados.push((t) => { if (!calmo()) lava.color.setHSL(0.045 + Math.sin(t * 1.5) * 0.012, 0.95, 0.42 + Math.sin(t * 2.3) * 0.05); });
    for (const [x, z] of cantos) braseiro(x, z, ["#ff5b2e", "#ffb04a", "#fff3a0"], "#3b1a14");
  } else if (chao === "ondas") {
    // a água em volta do tablado, com marolas que andam
    const cvAgua = document.createElement("canvas"); cvAgua.width = cvAgua.height = 64;
    const ac = cvAgua.getContext("2d"); ac.fillStyle = "#1f6aa8"; ac.fillRect(0, 0, 64, 64); ac.fillStyle = "#3f8ad0";
    for (let i = 0; i < 6; i++) ac.fillRect((i * 23) % 64, i * 11, 18, 3);
    const texAgua = new THREE.CanvasTexture(cvAgua); texAgua.colorSpace = THREE.SRGBColorSpace; texAgua.wrapS = texAgua.wrapT = THREE.RepeatWrapping; texAgua.repeat.set(14, 14);
    const agua = new THREE.Mesh(new THREE.PlaneGeometry(60, 60), new THREE.MeshLambertMaterial({ map: texAgua })); agua.rotation.x = -Math.PI / 2; agua.position.y = -0.17; agua.receiveShadow = true; grupo.add(agua);
    animados.push((t) => { if (!calmo()) { texAgua.offset.set(t * 0.03, t * 0.05); } });
    for (const [x, z] of [...cantos, [-5, 8.5], [5, 8.5]]) { // boias que balançam
      const b = new THREE.Group(); b.position.set(x, 0, z); grupo.add(b);
      for (let i = 0; i < 3; i++) { const anel = new THREE.Mesh(new THREE.TorusGeometry(0.45, 0.16, 8, 16), toon(i % 2 ? "#ffffff" : "#e0402f")); anel.rotation.x = Math.PI / 2; anel.position.y = i * 0.001; b.add(anel); }
      animados.push((t) => { if (!calmo()) { b.position.y = -0.05 + Math.sin(t * 1.6 + x) * 0.07; b.rotation.z = Math.sin(t * 1.3 + z) * 0.12; } });
    }
  } else if (chao === "flores") {
    const arvore = (x, z, h) => { // tronco e copa de cubos
      peca(caixa(0.45, h, 0.45), toon("#6b4a2b"), x, h / 2 - 0.2, z);
      for (const [dx, dy, dz, s, c] of [[0, h + 0.2, 0, 1.6, "#3f8a32"], [0.5, h - 0.2, 0.3, 1.1, "#4fa03f"], [-0.5, h - 0.1, -0.2, 1.2, "#357a2a"], [0.1, h + 0.9, 0.1, 0.9, "#5fb84a"]]) peca(caixa(s, s, s), toon(c), x + dx, dy, z + dz);
    };
    cantos.forEach(([x, z], i) => arvore(x, z, i < 2 ? 2.4 : 1.4));
    frente.forEach(([x, z], i) => { peca(new THREE.IcosahedronGeometry(0.45, 0), toon("#4cb04a"), x, 0.05, z); peca(new THREE.SphereGeometry(0.12, 6, 4), toon(["#ffe14d", "#ff8acb", "#ffffff"][i % 3]), x + 0.3, 0.35, z - 0.2); });
  } else if (chao === "placas") {
    for (const [x, z] of cantos) { // a torre de faísca: base, bobinas e a esfera que pisca
      peca(new THREE.CylinderGeometry(0.4, 0.55, 0.4, 8), toon("#3a3a40"), x, 0, z);
      peca(new THREE.CylinderGeometry(0.12, 0.18, 2.6, 8), toon("#8a8a93"), x, 1.4, z);
      for (let i = 0; i < 3; i++) peca(new THREE.TorusGeometry(0.32 - i * 0.05, 0.06, 6, 16), toon("#c08a2a"), x, 0.9 + i * 0.6, z).rotation.x = Math.PI / 2;
      const esfera = peca(new THREE.SphereGeometry(0.3, 12, 8), basico("#ffe14d"), x, 2.9, z, false);
      animados.push((t) => { if (!calmo()) esfera.material.color.set(Math.sin(t * 9 + x) > 0.6 ? "#ffffff" : "#ffe14d"); });
    }
    frente.forEach(([x, z], i) => peca(caixa(1.1, 0.25, 0.4), toon(i % 2 ? "#ffe14d" : "#1c1c20"), x, -0.08, z));
  } else if (chao === "pedras") {
    cantos.forEach(([x, z], i) => { // rochas grandes e estalagmites
      peca(new THREE.DodecahedronGeometry(1.1, 0), toon("#8f7b58"), x, 0.4, z).rotation.set(i, i * 2, 0);
      peca(new THREE.ConeGeometry(0.45, 2.4, 6), toon("#a08a62"), x + (i % 2 ? -1 : 1) * 0.9, 1, z + 0.4);
    });
    for (const [x, z] of frente) peca(new THREE.DodecahedronGeometry(0.35, 0), toon("#7d6a48"), x, -0.05, z);
  } else if (chao === "runas") {
    const cristais = cantos.map(([x, z], i) => { // cristais flutuando, girando devagar
      peca(new THREE.CylinderGeometry(0.5, 0.6, 0.4, 6), toon("#5a2a6a"), x, 0, z);
      return peca(new THREE.OctahedronGeometry(0.55, 0), basico(i % 2 ? "#ff8acb" : "#c79bff"), x, 1.8, z, false);
    });
    animados.push((t) => { if (!calmo()) cristais.forEach((c, i) => { c.position.y = 1.8 + Math.sin(t * 1.4 + i) * 0.25; c.rotation.y = t * 0.8 + i; }); });
  } else if (chao === "rachaduras") {
    for (const [x, z] of [...cantos, ...frente.filter((_, i) => i % 2)]) { // lápides tortas e velas
      const l = peca(caixa(0.8, 1.1, 0.25), toon("#4a4458"), x, 0.35, z); l.rotation.z = (fixo(x + z) - 0.5) * 0.3;
      peca(caixa(0.4, 0.12, 0.27), toon("#8b84a0"), x, 0.75, z).rotation.z = l.rotation.z;
      peca(new THREE.CylinderGeometry(0.08, 0.08, 0.4, 6), toon("#e8e0d0"), x + 0.6, 0, z + 0.2);
      chama(x + 0.6, 0.2, z + 0.2, ["#8f7bd0", "#d9d0ff"], 0.09);
    }
  } else if (chao === "escamas") {
    for (const [x, z] of cantos) braseiro(x, z, ["#7038f8", "#a77bff", "#ffcf6b"], "#2a1f48");
    for (const s of [-1, 1]) for (let i = 0; i < 3; i++) { // chifres saindo do muro do fundo
      const c = peca(new THREE.ConeGeometry(0.3, 1.8, 6), toon("#ffe7a8"), s * (3 + i * 3), 3.8, -9.85); c.rotation.z = s * -0.5;
    }
  } else if (chao === "tatame") {
    // o pórtico do dojô no fundo e as lanternas de papel nos cantos
    for (const s of [-1, 1]) peca(caixa(0.45, 4.2, 0.45), toon("#7a2a20"), s * 9.6, 1.9, -9.4);
    peca(caixa(21, 0.4, 0.6), toon("#c03028"), 0, 4.1, -9.4); peca(caixa(19.6, 0.25, 0.45), toon("#7a2a20"), 0, 3.5, -9.4);
    for (const [x, z] of cantos) {
      peca(caixa(0.12, 1.4, 0.12), toon("#5a3a1e"), x, 0.5, z);
      const lanterna = peca(new THREE.CylinderGeometry(0.32, 0.32, 0.6, 10), basico("#ff7a4a"), x, 1.5, z, false);
      animados.push((t) => { if (!calmo()) lanterna.rotation.z = Math.sin(t * 1.2 + x) * 0.08; });
    }
  } else if (chao === "gelo") {
    cantos.forEach(([x, z], i) => { // espinhos de gelo e montes de neve
      for (let k = 0; k < 3; k++) { const e = peca(new THREE.OctahedronGeometry(0.45, 0), toon(k % 2 ? "#d6f3fa" : "#9be3f0"), x + (k - 1) * 0.6, 0.6 + k * 0.2, z); e.scale.set(0.6, 2.2 - k * 0.4, 0.6); e.rotation.z = (k - 1) * 0.3; }
      peca(new THREE.SphereGeometry(0.9, 12, 8), toon("#ffffff"), x + 0.4, -0.3, z + 0.6).scale.y = 0.45;
    });
    for (const [x, z] of frente) peca(new THREE.SphereGeometry(0.55, 10, 6), toon("#f4fdff"), x, -0.2, z).scale.y = 0.4;
  } else {
    // o Ginásio da Galera: torres de refletor nos cantos do fundo e bandeiras das duas cores
    for (const [x, z] of cantos.slice(0, 2)) {
      peca(caixa(0.3, 5, 0.3), toon("#59716d"), x, 2.3, z);
      const holofote = peca(caixa(1.2, 0.7, 0.4), toon("#31443c"), x, 4.9, z); holofote.rotation.x = 0.4;
      peca(caixa(1, 0.5, 0.05), basico("#fffbe0"), x, 4.92, z + 0.22, false).rotation.x = 0.4;
    }
    T.torcida.forEach((cor, i) => [-1, 1].forEach((k) => {
      const x = (i ? 1 : -1) * (4 + k * 2);
      peca(caixa(0.08, 1.2, 0.08), toon("#cad7cc"), x, 3.95, -9.7); // o mastro
      const bandeira = peca(caixa(0.9, 0.55, 0.04), toon(cor), x + 0.45, 4.25, -9.7);
      animados.push((t) => { if (!calmo()) bandeira.rotation.y = Math.sin(t * 2 + x) * 0.25; });
    }));
  }
  const clima = montarClima3d(T, grupo);
  return (agora) => { const t = agora / 1000; for (const a of animados) a(t); clima?.(t); };
}

// ---------- o clima em 3D ----------
// cada clima: quantos, o desenho, as cores e onde fica cada um no tempo t (tudo pelo relógio: não guarda nada)
function montarClima3d(T, grupo) {
  const tipo = T.clima;
  if (!tipo || tipo === "faiscas") return null;
  const dragao = T === TEMAS["Dragão"], leve = cena3d.leve;
  const DADOS = {
    brasas: { n: 70, geo: new THREE.BoxGeometry(1, 1, 1), cores: dragao ? ["#c79bff", "#ffcf6b"] : ["#ffb04a", "#ff5b2e", "#fff3a0"], tam: 0.09 },
    bolhas: { n: 45, geo: new THREE.IcosahedronGeometry(1, 1), cores: ["#e2fbff"], tam: 0.13, opacidade: 0.55 },
    folhas: { n: 45, geo: new THREE.BoxGeometry(1, 0.15, 0.6), cores: ["#7fd36b", "#e7c24a", "#4cb04a"], tam: 0.22 },
    neve: { n: 110, geo: new THREE.BoxGeometry(1, 1, 1), cores: ["#ffffff", "#e8f8ff"], tam: 0.07 },
    poeira: { n: 30, geo: new THREE.PlaneGeometry(1, 1), cores: ["#e9dcbb"], tam: 1.1, opacidade: 0.3, macio: true },
    estrelas: { n: 40, geo: new THREE.OctahedronGeometry(1, 0), cores: ["#ffe0f2", "#c79bff"], tam: 0.08 },
    nevoa: { n: 10, geo: new THREE.PlaneGeometry(1, 1), cores: ["#d9d0ff"], tam: 7, opacidade: 0.16, macio: true },
  }[tipo];
  if (!DADOS) return null;
  const n = Math.round(DADOS.n * (leve ? 0.45 : 1));
  // poeira e névoa são manchas macias (o degradê redondo do brilho dos golpes)
  const mat = new THREE.MeshBasicMaterial({ color: 0xffffff, map: DADOS.macio ? G3.texBrilho : null, transparent: DADOS.opacidade != null, opacity: DADOS.opacidade ?? 1, depthWrite: DADOS.opacidade == null, side: THREE.DoubleSide });
  const malha = new THREE.InstancedMesh(DADOS.geo, mat, n); malha.frustumCulled = false; grupo.add(malha);
  for (let i = 0; i < n; i++) malha.setColorAt(i, new THREE.Color(DADOS.cores[i % DADOS.cores.length]));
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), p = new THREE.Vector3(), s = new THREE.Vector3();
  const caixa = (i) => ({ x: (fixo(i + 1) - 0.5) * 24, z: -9 + fixo(i + 50) * 17 });
  return (t) => {
    if (movimentoReduzido.matches) { malha.visible = false; return; }
    malha.visible = true;
    for (let i = 0; i < n; i++) {
      const { x, z } = caixa(i), ciclo = 4 + fixo(i) * 4, f = ((t + fixo(i + 9) * ciclo) % ciclo) / ciclo;
      let y = 0, k = DADOS.tam * (0.7 + fixo(i + 3) * 0.6), px = x, pz = z;
      e.set(0, 0, 0);
      if (tipo === "brasas" || tipo === "bolhas") { y = f * 6; px += Math.sin(t * 2 + i) * 0.3; k *= Math.sin(f * Math.PI); }
      else if (tipo === "folhas") { y = 7 - f * 7.2; px += Math.sin(t * 1.3 + i) * 1.2; e.set(t * 2 + i, t + i, Math.sin(t * 2 + i)); }
      else if (tipo === "neve") { y = 8 - f * 8.2; px += Math.sin(t + i) * 0.4; }
      else if (tipo === "poeira") { px = (f * 1.2 - 0.6) * 26; y = 0.3 + fixo(i + 40) * 1.2; k *= Math.sin(f * Math.PI); e.set(-INCLINACAO, 0, 0); }
      else if (tipo === "estrelas") { y = 0.8 + fixo(i + 17) * 4; k *= Math.max(0, Math.sin(t * (1.5 + fixo(i) * 2) + i * 2)); e.set(0, t + i, 0); }
      else if (tipo === "nevoa") { px = (f * 1.4 - 0.7) * 26; y = 0.15 + fixo(i + 30) * 0.4; pz = -6 + fixo(i + 60) * 12; e.set(-Math.PI / 2, 0, 0); }
      q.setFromEuler(e); m.compose(p.set(px, y, pz), q, s.set(k, k, k)); malha.setMatrixAt(i, m);
    }
    malha.instanceMatrix.needsUpdate = true;
  };
}
