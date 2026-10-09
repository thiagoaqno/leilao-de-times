// O resultado vem do motor da carreira: esta cena só encena o que o servidor já decidiu.
// Renderização 3D leve, feita com a mesma Three.js local que a Pelada usa.
import * as THREE from "/vendor/three/three.module.js";

(function () {
  const DURACAO = 5.2;
  const GOL_Z = -11;
  const LIMITES = { esquerda: -3.66, direita: 3.66, trave: 2.44 };
  const ZONAS = { ea: [-2.95, 2.05], ma: [0, 2.05], da: [2.95, 2.05],
    eb: [-2.95, 0.42], mb: [0, 0.42], db: [2.95, 0.42] };
  let atual = null;
  const misturar = (a, b, v) => a + (b - a) * v;
  const limitar = (v) => Math.max(0, Math.min(1, v));
  const suave = (v) => { const n = limitar(v); return n * n * (3 - 2 * n); };
  const menosMovimento = () => matchMedia("(prefers-reduced-motion: reduce)").matches;

  function material(cor, extras = {}) {
    return new THREE.MeshStandardMaterial({ color: cor, roughness: 0.78, ...extras });
  }
  function caixa(pai, w, h, d, cor, x, y, z) {
    const o = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material(cor));
    o.position.set(x, y, z); pai.add(o); return o;
  }
  function esfera(pai, raio, cor, x, y, z, segmentos = 16) {
    const o = new THREE.Mesh(new THREE.SphereGeometry(raio, segmentos, 12), material(cor));
    o.position.set(x, y, z); pai.add(o); return o;
  }
  function tubo(pai, a, b, raio, cor) {
    const inicio = new THREE.Vector3(...a), fim = new THREE.Vector3(...b);
    const o = new THREE.Mesh(new THREE.CylinderGeometry(raio, raio, inicio.distanceTo(fim), 8), material(cor));
    o.position.copy(inicio).add(fim).multiplyScalar(0.5);
    o.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), fim.sub(inicio).normalize());
    pai.add(o); return o;
  }
  function linha(pai, coordenadas, cor = 0xffffff, opacidade = 0.8) {
    const geometria = new THREE.BufferGeometry().setFromPoints(coordenadas.map((p) => new THREE.Vector3(...p)));
    const objeto = new THREE.Line(geometria, new THREE.LineBasicMaterial({ color: cor, transparent: true, opacity: opacidade }));
    pai.add(objeto); return objeto;
  }

  function boneco(pai, uniforme, goleiro = false) {
    // Boneco articulado de caixas, no estilo visual da Pelada: sem modelos externos.
    const grupo = new THREE.Group(); pai.add(grupo);
    const cor = goleiro ? "#efc94d" : (uniforme && uniforme[0]) || "#e8e8e8";
    const detalhe = goleiro ? "#161a2c" : (uniforme && uniforme[1]) || "#212121";
    const calcao = goleiro ? "#232f43" : (uniforme && uniforme[3]) || "#202632";
    const pele = "#d1a075", chuteira = "#101216";
    caixa(grupo, 0.59, 0.28, 0.36, calcao, 0, 1.03, 0);
    caixa(grupo, 0.79, 0.83, 0.38, cor, 0, 1.58, 0);
    caixa(grupo, 0.44, 0.07, 0.39, detalhe, 0, 1.95, 0);
    caixa(grupo, 0.19, 0.17, 0.2, pele, 0, 2.11, 0);
    esfera(grupo, 0.245, pele, 0, 2.29, 0, 14);
    caixa(grupo, 0.5, 0.1, 0.32, "#29201b", 0, 2.48, -0.01);
    const pernas = [], bracos = [];
    for (const lado of [-1, 1]) {
      const perna = new THREE.Group(); perna.position.set(lado * 0.19, 1.02, 0); grupo.add(perna);
      caixa(perna, 0.25, 0.49, 0.26, calcao, 0, -0.23, 0);
      caixa(perna, 0.19, 0.42, 0.22, goleiro ? "#efc94d" : detalhe, 0, -0.66, 0);
      caixa(perna, 0.23, 0.13, 0.44, chuteira, 0, -0.91, -0.13);
      pernas.push(perna);
      const braco = new THREE.Group(); braco.position.set(lado * 0.49, 1.9, 0); grupo.add(braco);
      caixa(braco, 0.22, 0.4, 0.28, cor, 0, -0.21, 0);
      caixa(braco, 0.19, 0.33, 0.22, pele, 0, -0.56, 0);
      caixa(braco, 0.22, 0.14, 0.24, goleiro ? "#dff7f4" : pele, 0, -0.76, 0);
      bracos.push(braco);
    }
    return { grupo, pernas, bracos };
  }

  function estadio(cena) {
    const verde = material("#237746");
    const grama = new THREE.Mesh(new THREE.PlaneGeometry(50, 64), verde);
    grama.rotation.x = -Math.PI / 2; grama.position.z = -3;
    cena.add(grama);
    // Faixas de grama, grande área e marca do pênalti.
    for (let i = 0; i < 9; i++) {
      const faixa = new THREE.Mesh(new THREE.PlaneGeometry(50, 3.4), material(i % 2 ? "#287d4b" : "#2b8450"));
      faixa.rotation.x = -Math.PI / 2; faixa.position.set(0, 0.009, 8 - i * 3.4); cena.add(faixa);
    }
    const l = (p) => linha(cena, p.map(([x, z]) => [x, 0.024, z]));
    l([[-20, -1.8], [-20, -16], [20, -16], [20, -1.8]]);
    l([[-20, -5.5], [20, -5.5]]);
    l([[-9.16, GOL_Z], [-9.16, 5.5], [9.16, 5.5], [9.16, GOL_Z]]);
    l([[-5.5, GOL_Z], [-5.5, -5.5], [5.5, -5.5], [5.5, GOL_Z]]);
    const marca = new THREE.Mesh(new THREE.CircleGeometry(0.11, 20), material("#ffffff"));
    marca.rotation.x = -Math.PI / 2; marca.position.set(0, 0.03, 0); cena.add(marca);
    // Gol em tamanho oficial (7,32 x 2,44 m) e rede com profundidade.
    const zFundo = GOL_Z - 1.8;
    const A = LIMITES;
    for (const x of [A.esquerda, A.direita]) {
      tubo(cena, [x, 0, GOL_Z], [x, A.trave, GOL_Z], 0.066, "#fafafa");
      tubo(cena, [x, A.trave, GOL_Z], [x, A.trave, zFundo], 0.025, "#c9d5d4");
      tubo(cena, [x, 0, GOL_Z], [x, 0, zFundo], 0.026, "#c9d5d4");
    }
    tubo(cena, [A.esquerda, A.trave, GOL_Z], [A.direita, A.trave, GOL_Z], 0.065, "#fafafa");
    tubo(cena, [A.esquerda, A.trave, zFundo], [A.direita, A.trave, zFundo], 0.024, "#c9d5d4");
    for (let x = A.esquerda; x <= A.direita + 0.01; x += 0.37) {
      linha(cena, [[x, 0, zFundo], [x, A.trave, zFundo], [x, A.trave, GOL_Z]], "#dbe6e4", 0.45);
    }
    for (let y = 0; y <= A.trave + 0.01; y += 0.31) {
      linha(cena, [[A.esquerda, y, zFundo], [A.direita, y, zFundo]], "#dbe6e4", 0.45);
      for (const x of [A.esquerda, A.direita]) linha(cena, [[x, y, zFundo], [x, y, GOL_Z]], "#dbe6e4", 0.4);
    }
    // Arquibancada e torcida como pontos, sem texturas remotas.
    const bancadas = material("#172332");
    for (const s of [-1, 1]) {
      const lateral = new THREE.Mesh(new THREE.BoxGeometry(12, 5, 62), bancadas);
      lateral.position.set(s * 29, 2, -4); cena.add(lateral);
    }
    const fundo = new THREE.Mesh(new THREE.BoxGeometry(74, 8, 9), bancadas);
    fundo.position.set(0, 3, -20); cena.add(fundo);
    const vertices = [], cores = [];
    const paleta = ["#dae3ed", "#cf385b", "#f3be48", "#3994bd", "#8ab6af"];
    for (let i = 0; i < 1350; i++) {
      const t = (i * 0.6180339887) % 1, u = (i * 0.4142135623) % 1;
      const fundo = i < 650;
      const x = fundo ? -33 + t * 66 : (i % 2 ? -1 : 1) * (23 + t * 9);
      const z = fundo ? -16 - (i % 7) * 1.0 : -24 + u * 48;
      vertices.push(x, 2.4 + ((i * 17) % 49) / 9, z);
      const c = new THREE.Color(paleta[i % paleta.length]); cores.push(c.r, c.g, c.b);
    }
    const pontosGeo = new THREE.BufferGeometry();
    pontosGeo.setAttribute("position", new THREE.Float32BufferAttribute(vertices, 3));
    pontosGeo.setAttribute("color", new THREE.Float32BufferAttribute(cores, 3));
    cena.add(new THREE.Points(pontosGeo, new THREE.PointsMaterial({ size: 0.18, vertexColors: true })));
    const placa = caixa(cena, 28, 0.8, 0.12, "#174d70", 0, 0.44, -15.8);
    placa.material.emissive = new THREE.Color("#0a394f");
  }

  function bola3D(cena) {
    const grupo = new THREE.Group(); cena.add(grupo);
    const bola = esfera(grupo, 0.115, "#f9f7eb", 0, 0, 0, 20);
    for (let i = 0; i < 5; i++) {
      const m = esfera(grupo, 0.034, "#1c2636", Math.sin(i * 2.4) * 0.103,
        Math.cos(i * 1.75) * 0.092, Math.cos(i * 2.4) * 0.07, 8);
      m.scale.z = 0.45;
    }
    grupo.position.set(0, 0.115, 0);
    return grupo;
  }

  function encenar(info) {
    if (atual) fechar();
    if (menosMovimento() || !ZONAS[info.chute] || !ZONAS[info.pulo]) return false;
    let palco, renderer;
    try {
      const raiz = document.createElement("div");
      raiz.className = "pen3d"; raiz.setAttribute("role", "dialog");
      raiz.setAttribute("aria-label", "Replay cinematográfico da cobrança de pênalti");
      raiz.innerHTML = '<div class="pen3d-topo"><span>● REPLAY DA CARREIRA</span><button class="pen3d-pular" type="button">Pular animação →</button></div>' +
        '<div class="pen3d-palco"></div><div class="pen3d-hud"><div class="pen3d-batedor"></div><div class="pen3d-resultado"></div><div class="pen3d-goleiro"></div></div>';
      document.body.append(raiz);
      palco = raiz.querySelector(".pen3d-palco");
      raiz.querySelector(".pen3d-batedor").textContent = info.batedor || "Batedor";
      raiz.querySelector(".pen3d-goleiro").textContent = info.goleiro || "Goleiro";
      raiz.querySelector(".pen3d-pular").onclick = fechar;
      const cena = new THREE.Scene(); cena.background = new THREE.Color("#081722");
      cena.fog = new THREE.Fog("#081722", 26, 70);
      cena.add(new THREE.HemisphereLight("#c9e7ff", "#0d4229", 2));
      const luz = new THREE.DirectionalLight("#fff1db", 2.6); luz.position.set(-5, 17, 5); cena.add(luz);
      const contra = new THREE.DirectionalLight("#9ddcf7", 1.5); contra.position.set(8, 10, -13); cena.add(contra);
      estadio(cena);
      const atacante = boneco(cena, info.uniforme, false);
      const arqueiro = boneco(cena, null, true);
      const bola = bola3D(cena);
      const camera = new THREE.PerspectiveCamera(61, 1, 0.1, 90);
      const tamanho = () => {
        const largura = palco.clientWidth || innerWidth, altura = palco.clientHeight || innerHeight;
        camera.aspect = largura / Math.max(1, altura); camera.updateProjectionMatrix();
        renderer.setSize(largura, altura, false);
      };
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: "low-power" });
      renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 1.6));
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.14;
      palco.append(renderer.domElement);
      const redimensionar = () => tamanho();
      addEventListener("resize", redimensionar);
      tamanho();

      const alvoChute = ZONAS[info.chute], alvoPulo = ZONAS[info.pulo];
      const saiu = !!info.fora, gol = !saiu && !!info.entrou, defesa = !saiu && !gol;
      const desvio = alvoChute[0] < 0 ? -1 : 1;
      const destinoX = saiu ? (Math.abs(alvoChute[0]) < 0.1 ? 0.5 : desvio * 4.5) : alvoChute[0];
      const destinoY = saiu && info.chute.endsWith("a") ? 3.3 : alvoChute[1];
      const inicio = performance.now();
      atual = { raiz, renderer, cena, redimensionar, raf: 0 };
      const resultado = raiz.querySelector(".pen3d-resultado");

      function quadro(agora) {
        if (!atual || atual.raiz !== raiz) return;
        const t = (agora - inicio) / 1000;
        const correndo = suave(t / 1.85);
        atacante.grupo.position.set(0.65 * (1 - correndo), 0.026 * Math.sin(t * 19) * (1 - correndo), 3.25 - 2.66 * correndo);
        atacante.grupo.rotation.y = -0.09;
        const passo = t < 1.85 ? Math.sin(t * 17) * 0.65 * (1 - t / 3) : 0;
        atacante.pernas[0].rotation.x = passo;
        atacante.pernas[1].rotation.x = -passo;
        atacante.bracos[0].rotation.x = -passo * 0.8;
        atacante.bracos[1].rotation.x = passo * 0.8;
        if (t >= 1.78 && t < 2.43) atacante.pernas[1].rotation.x = -Math.sin(suave((t - 1.78) / 0.65) * Math.PI) * 1.4;
        if (t > 3.22) {
          if (gol) { atacante.bracos[0].rotation.z = 2.3; atacante.bracos[1].rotation.z = -2.3; atacante.grupo.position.y = 0.06 + Math.abs(Math.sin(t * 7)) * 0.08; }
          else { atacante.bracos[0].rotation.x = -0.8; atacante.bracos[1].rotation.x = -0.8; atacante.grupo.rotation.x = 0.17; }
        }
        const salto = suave((t - 1.93) / 0.72);
        const chegada = t < 1.93 ? 0 : salto;
        arqueiro.grupo.position.set(alvoPulo[0] * 0.78 * chegada, (alvoPulo[1] > 1 ? 0.6 : 0.2) * Math.sin(chegada * Math.PI), -10.5);
        arqueiro.grupo.rotation.z = -Math.sign(alvoPulo[0]) * chegada * 1.14;
        arqueiro.bracos[0].rotation.z = -2.3 * chegada;
        arqueiro.bracos[1].rotation.z = 2.3 * chegada;
        if (t > 3.25 && defesa) { arqueiro.bracos[0].rotation.z = -2.9; arqueiro.bracos[1].rotation.z = 2.9; }
        const voo = limitar((t - 2.09) / 0.74);
        if (t < 2.09) {
          bola.position.set(0, 0.115, 0);
        } else if (voo < 1) {
          const z = misturar(0, -10.95, voo);
          const x = destinoX * Math.pow(voo, 1.13);
          const y = misturar(0.115, destinoY, voo) + 0.36 * Math.sin(voo * Math.PI);
          bola.position.set(x, y, z);
        } else if (defesa) {
          const repique = limitar((t - 2.83) / 0.9);
          bola.position.set(misturar(destinoX, destinoX + 1.6, repique),
            Math.max(0.115, destinoY + Math.sin(repique * Math.PI) * 0.8 - repique * 0.7),
            misturar(-10.95, -6.6, repique));
        } else {
          const queda = limitar((t - 2.83) / 1.2);
          bola.position.set(destinoX + (gol ? 0 : desvio * queda), Math.max(0.115, destinoY * (1 - queda * queda)), -11.15 - (gol ? 1.35 * queda : -0.5 * queda));
        }
        bola.rotation.x += 0.13; bola.rotation.y += 0.05;
        // Câmera sempre atrás do batedor; aproxima na corrida e abre no desfecho.
        const andamento = suave(t / 2.4);
        camera.position.set(0.45 * (1 - andamento), 2.65 - 0.37 * andamento, 8.7 - 2.3 * andamento + (t > 2.9 ? suave((t - 2.9) / 1.3) * 1.25 : 0));
        camera.lookAt(0, 1.2, -7.6);
        if (t >= 3.05) {
          const legenda = saiu ? "PRA FORA!" : gol ? "GOOOOL!" : "DEFENDEU!";
          if (resultado.textContent !== legenda) { resultado.textContent = legenda; resultado.className = "pen3d-resultado visivel " + (gol ? "gol" : "nao-gol"); }
        }
        renderer.render(cena, camera);
        if (t >= DURACAO) fechar();
        else if (atual && atual.raiz === raiz) atual.raf = requestAnimationFrame(quadro);
      }
      atual.raf = requestAnimationFrame(quadro);
      return true;
    } catch (erro) {
      console.warn("Replay 3D indisponível:", erro);
      fechar();
      if (renderer) renderer.dispose();
      return false;
    }
  }

  function fechar() {
    if (!atual) return;
    const { raiz, renderer, cena, raf, redimensionar } = atual;
    atual = null;
    cancelAnimationFrame(raf);
    removeEventListener("resize", redimensionar);
    cena.traverse((o) => {
      if (o.geometry) o.geometry.dispose();
      if (o.material) for (const m of Array.isArray(o.material) ? o.material : [o.material]) m.dispose();
    });
    renderer.dispose();
    renderer.forceContextLoss();
    raiz.remove();
  }
  document.addEventListener("visibilitychange", () => { if (document.hidden) fechar(); });
  window.Penalti3D = { reproduzir: encenar, ocupado: () => !!atual, fechar };
})();