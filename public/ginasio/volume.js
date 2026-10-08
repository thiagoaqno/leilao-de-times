// Os bichos com volume: o sprite de sempre (GIF do Black/White ou os quadros dos Galeramon, já com o pisca branco, o
// esticar, o tombo...) vira uma pilha de camadas, como voxels. Cada pixel ganha uma espessura que cresce com a
// distância até a borda do desenho, então o bicho fica estufado no meio e fino nas bordas. A luz da cena bate no
// relevo (a inclinação da espessura) em três tons, como o resto da arena, e a sombra no chão sai da pilha toda.
// - medirEspessura: depois que desenho.js pinta o bicho na casa do atlas, mede a distância até a borda de cada pixel
//   e guarda em ESPESSURA (uma textura de um canal só, do tamanho do atlas).
// - cada casa do atlas tem, além do cartaz plano (cena3d.js), uma malha de camadas (CAMADAS para cada lado) e um
//   cartaz "fantasma" que só mostra o que é meio transparente (o rastro, o sumir do desmaio).
// - no modo leve fica só o cartaz plano.
const CAMADAS = 8; // camadas para cada lado do meio
const FUNDO_PX = 16; // a espessura máxima, para cada lado, em pixels do atlas
const ESPESSURA = new Uint8Array(ATLAS.w * ATLAS.h);
const distancias = new Uint16Array(ATLAS.casa * ATLAS.casa);

// a distância até a borda (chanfro 3-4: duas passadas), só dos pixels bem opacos
function medirEspessura(ctxAtlas, x0, y0) {
  const n = ATLAS.casa, img = ctxAtlas.getImageData(x0, y0, n, n).data, d = distancias, INF = 60000;
  for (let i = 0; i < n * n; i++) d[i] = img[i * 4 + 3] > 127 ? INF : 0;
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
    const i = y * n + x; if (!d[i]) continue;
    let v = d[i];
    if (x > 0) v = Math.min(v, d[i - 1] + 3); else v = Math.min(v, 3);
    if (y > 0) { v = Math.min(v, d[i - n] + 3); if (x > 0) v = Math.min(v, d[i - n - 1] + 4); if (x < n - 1) v = Math.min(v, d[i - n + 1] + 4); } else v = Math.min(v, 3);
    d[i] = v;
  }
  for (let y = n - 1; y >= 0; y--) for (let x = n - 1; x >= 0; x--) {
    const i = y * n + x; if (!d[i]) continue;
    let v = d[i];
    if (x < n - 1) v = Math.min(v, d[i + 1] + 3); else v = Math.min(v, 3);
    if (y < n - 1) { v = Math.min(v, d[i + n] + 3); if (x < n - 1) v = Math.min(v, d[i + n + 1] + 4); if (x > 0) v = Math.min(v, d[i + n - 1] + 4); } else v = Math.min(v, 3);
    d[i] = v;
  }
  // a textura fica de cabeça para baixo em relação ao canvas (a linha 0 é a de baixo)
  for (let y = 0; y < n; y++) {
    const linha = (ATLAS.h - 1 - (y0 + y)) * ATLAS.w + x0;
    for (let x = 0; x < n; x++) {
      const px = d[y * n + x] / 3; // em pixels
      ESPESSURA[linha + x] = px ? Math.round(Math.min(1, (px * 0.85 + 0.6) / FUNDO_PX) * 255) : 0;
    }
  }
}
function limparEspessura(x0, y0) {
  const n = ATLAS.casa;
  for (let y = 0; y < n; y++) ESPESSURA.fill(0, (ATLAS.h - 1 - (y0 + y)) * ATLAS.w + x0, (ATLAS.h - 1 - (y0 + y)) * ATLAS.w + x0 + n);
}

const VOLUME_VERTICE = `
attribute float camada;
varying vec2 vUv; varying float vCamada;
void main() { vUv = uv; vCamada = camada; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`;
const VOLUME_PIXEL = `
uniform sampler2D mapa, espessura; uniform vec2 texel; uniform vec3 sol; uniform float sombraCena;
varying vec2 vUv; varying float vCamada;
void main() {
  vec4 c = texture2D(mapa, vUv);
  if (c.a < 0.5) discard;
  float t = texture2D(espessura, vUv).r, nivel = abs(vCamada);
  if (nivel > t + 0.002) discard; // este pixel não chega até esta camada
  float tx = texture2D(espessura, vUv + vec2(texel.x, 0.0)).r - texture2D(espessura, vUv - vec2(texel.x, 0.0)).r;
  float ty = texture2D(espessura, vUv + vec2(0.0, texel.y)).r - texture2D(espessura, vUv - vec2(0.0, texel.y)).r;
  vec3 n = normalize(vec3(-tx * 4.0, -ty * 4.0, 1.0)); // a inclinação, medida dois pixels para cada lado
  if (vCamada < 0.0) n.z = -n.z;
  float luz = floor(max(dot(n, sol), 0.0) * 3.0 + 0.5) / 3.0; // três tons, como o resto da arena
  float l = 0.8 + 0.42 * luz - 0.12 * (t - nivel) / max(t, 0.05); // o fundo da pilha um pouco mais escuro
  gl_FragColor = vec4(c.rgb * l * sombraCena, 1.0);
  #include <colorspace_fragment>
}`;
const FANTASMA_PIXEL = `
uniform sampler2D mapa; varying vec2 vUv;
void main() {
  vec4 c = texture2D(mapa, vUv);
  if (c.a >= 0.5 || c.a < 0.03) discard;
  gl_FragColor = c;
  #include <colorspace_fragment>
}`;
const SOMBRA_PIXEL = `
uniform sampler2D mapa, espessura; varying vec2 vUv; varying float vCamada;
void main() {
  if (texture2D(mapa, vUv).a < 0.5 || abs(vCamada) > texture2D(espessura, vUv).r + 0.002) discard;
  gl_FragColor = vec4(1.0);
}`;

// as peças do volume, criadas junto com a cena (chamado por iniciarCena3d)
function montarVolume(c) {
  const texEspessura = new THREE.DataTexture(ESPESSURA, ATLAS.w, ATLAS.h, THREE.RedFormat);
  texEspessura.magFilter = texEspessura.minFilter = THREE.NearestFilter; texEspessura.needsUpdate = true;
  // o sol no jeito do cartaz (que deita DEITA_CARTAZ para trás): é por ele que o relevo acende
  const sol = c.sol.position.clone().normalize().applyAxisAngle(new THREE.Vector3(1, 0, 0), DEITA_CARTAZ);
  const uniforms = { mapa: { value: c.texAtlas }, espessura: { value: texEspessura }, texel: { value: new THREE.Vector2(2 / ATLAS.w, 2 / ATLAS.h) }, sol: { value: sol }, sombraCena: { value: 1 } };
  const matVolume = new THREE.ShaderMaterial({ uniforms, vertexShader: VOLUME_VERTICE, fragmentShader: VOLUME_PIXEL, side: THREE.DoubleSide });
  const matFantasma = new THREE.ShaderMaterial({ uniforms, vertexShader: VOLUME_VERTICE, fragmentShader: FANTASMA_PIXEL, transparent: true, depthWrite: false });
  const matSombra = new THREE.ShaderMaterial({ uniforms, vertexShader: VOLUME_VERTICE, fragmentShader: SOMBRA_PIXEL, side: THREE.DoubleSide });
  const lado = ATLAS.casa / PX_CARTAZ, fundo = FUNDO_PX / PX_CARTAZ;
  c.volumes = c.cartazes.map((plano) => {
    const uv = plano.geometry.attributes.uv, pos = [], uvs = [], cam = [], ind = [];
    for (let k = -CAMADAS; k <= CAMADAS; k++) {
      const base = pos.length / 3;
      for (const [x, y] of [[-1, 1], [1, 1], [-1, -1], [1, -1]]) { pos.push(x * lado / 2, y * lado / 2, (k / CAMADAS) * fundo); cam.push(k / CAMADAS); }
      for (let i = 0; i < 4; i++) uvs.push(uv.getX(i), uv.getY(i));
      ind.push(base, base + 2, base + 1, base + 2, base + 3, base + 1);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
    g.setAttribute("camada", new THREE.Float32BufferAttribute(cam, 1)); g.setIndex(ind);
    const plana = plano.geometry.clone(); plana.setAttribute("camada", new THREE.Float32BufferAttribute(new Float32Array(4), 1));
    const volume = new THREE.Mesh(g, matVolume), fantasma = new THREE.Mesh(plana, matFantasma);
    volume.customDepthMaterial = matSombra; volume.visible = fantasma.visible = false; volume.frustumCulled = fantasma.frustumCulled = false;
    fantasma.renderOrder = 1;
    c.scene.add(volume, fantasma);
    return { volume, fantasma };
  });
  Object.assign(c, { texEspessura, matVolume });
}
