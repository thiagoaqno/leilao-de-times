// Confere o que o cenário põe dentro da pista: percorre todas as malhas da pista (e cada instância das InstancedMesh) e
// acusa o que é sólido (de `altMin` a `altMax` acima do asfalto de perto) e fica a menos de meia largura + folga de QUALQUER
// ponto da linha central, inclusive dos trechos vizinhos de um grampo ou de um cruzamento. O que passa por cima (ponte,
// passarela, pórtico: mais alto que `altMax`) e o que é rente ao chão (zebra, faixa, remendo) não conta.
// Fitas que acompanham a pista e o chão: zebra, margem, brita, guard-rail e terreno. Num grampo mais fechado que a meia largura
// (raio da curva < meia largura + muro) a fita de dentro passa do centro da curva e cai do outro lado: é a geometria da
// pista, não um enfeite posto no lugar errado, e fica de fora desta conferência.
const FITAS = /-(faixa|muro|terreno|chao|escape|borracha)$/;
export function invasoes(THREE, tr, { folga = 10, altMin = 2.2, altMax = 24, ignorar = () => false } = {}) {
  if (tr.t.espaco) return []; // o Arco-íris é uma fita no espaço, com a beirada rente
  const { pts, n, W } = tr, raio = W / 2 + folga, C = 64, grade = new Map();
  const chave = (cx, cy) => cx * 100003 + cy;
  pts.forEach((p, i) => { const k = chave(Math.floor(p.x / C), Math.floor(p.y / C)); (grade.get(k) || grade.set(k, []).get(k)).push(i); });
  const perto = (x, y) => { // pontos da linha central a menos de `raio` (x, y): [{ i, d }]
    const out = [], r = Math.ceil(raio / C) + 1, cx = Math.floor(x / C), cy = Math.floor(y / C);
    for (let a = cx - r; a <= cx + r; a++) for (let b = cy - r; b <= cy + r; b++) for (const i of grade.get(chave(a, b)) || []) { const d = Math.hypot(pts[i].x - x, pts[i].y - y); if (d < raio) out.push({ i, d }); }
    return out;
  };
  // (x, y, alt) está dentro da pista? Cada ponto da linha central vale como um disco de raio `raio` na altura dele
  // (para cada trecho da pista que passa por perto vale o ponto mais próximo dele: a altura do asfalto é a daquele ponto)
  const dentro = (x, y, alt) => {
    const lista = perto(x, y).sort((a, b) => a.d - b.d), escolhidos = [];
    for (const c of lista) if (escolhidos.every((e) => Math.min(Math.abs(e.i - c.i), n - Math.abs(e.i - c.i)) > 40)) escolhidos.push(c);
    for (const { i, d } of escolhidos) { const a = alt - pts[i].h; if (a >= altMin && a <= altMax) return { i, d, a }; }
    return null;
  };
  const achados = new Map(), m4 = new THREE.Matrix4(), v = new THREE.Vector3();
  const nomeDe = (o) => { const f = []; let orig = ""; for (let p = o; p && p !== tr.grp; p = p.parent) { f.push(p.name || p.type); if (!orig && globalThis.__origem?.has(p)) orig = " @" + globalThis.__origem.get(p).replace(/:d+(?= <|$)/g, ""); } return f.reverse().join(">") + orig; };
  const registra = (o, h, x, y, alt) => {
    const k = nomeDe(o) + "#" + (o.geometry?.type || "") + ":" + (o.geometry?.attributes?.position?.count || 0);
    const e = achados.get(k) || { nome: nomeDe(o), geo: o.geometry?.type, instanciada: !!o.isInstancedMesh, n: 0, pior: Infinity, frac: 0, lat: 0, alt: 0 };
    e.n++; if (h.d < e.pior) Object.assign(e, { pior: h.d, frac: h.i / n, lat: h.d, alt: h.a, x, y }); achados.set(k, e);
  };
  tr.grp.updateMatrixWorld(true);
  tr.grp.traverse((o) => {
    if (!o.isMesh || !o.geometry || FITAS.test(o.name) || o.userData.obstaculo || ignorar(o)) return; // (userData.obstaculo: sólido declarado na física da pista, como o canteiro do grampo de Mônaco: o carro bate nele)
    for (let p = o.parent; p && p !== tr.grp; p = p.parent) if (/-balizador$/.test(p.name)) return; // os balizadores leves das pistas antigas ficam dentro da pista de propósito
    const g = o.geometry, pos = g.attributes.position;
    if (o.isInstancedMesh) {
      // os vértices de verdade de cada instância (copa, cone, caixa): o canto da caixa em volta não está na malha
      const verts = [], q = g.attributes.position;
      for (let k = 0; k < q.count; k += Math.max(1, Math.floor(q.count / 48))) verts.push(new THREE.Vector3().fromBufferAttribute(q, k));
      const im = new THREE.Matrix4();
      for (let k = 0; k < o.count; k++) {
        o.getMatrixAt(k, im); m4.multiplyMatrices(o.matrixWorld, im);
        let achou = null;
        for (const vt of verts) { v.copy(vt).applyMatrix4(m4); const h = dentro(v.x, v.z, v.y); if (h && (!achou || h.d < achou.h.d)) achou = { h, x: v.x, y: v.z }; }
        if (achou) registra(o, achou.h, achou.x, achou.y);
      }
      return;
    }
    const passo = Math.max(1, Math.floor(pos.count / 40000));
    for (let k = 0; k < pos.count; k += passo) {
      v.fromBufferAttribute(pos, k).applyMatrix4(o.matrixWorld);
      const h = dentro(v.x, v.z, v.y); if (h) registra(o, h, v.x, v.z);
    }
  });
  return [...achados.values()].sort((a, b) => a.pior - b.pior);
}
