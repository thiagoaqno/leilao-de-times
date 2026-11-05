// Corrida da Galera — o carro 3D da garagem (o mesmo modelo da corrida), girando devagar sobre um piso escuro.
// Precisa de window.Pistas (pistas.js) e do importmap do three na página. Um único renderer por palco.
import * as THREE from "three";
import { montarF1, coresDa, f1Pronto, TAM } from "/corrida/f1.js";

export async function montar(palco, equipeId) {
  const cv = palco.querySelector("canvas"), eq = window.F1Pilotos.EQUIPES[equipeId] || {};
  const r = new THREE.WebGLRenderer({ canvas: cv, antialias: true, alpha: true, powerPreference: "low-power" });
  r.setClearColor(0x000000, 0); r.outputColorSpace = THREE.SRGBColorSpace; r.toneMapping = THREE.ACESFilmicToneMapping;
  const cena = new THREE.Scene(), cam = new THREE.PerspectiveCamera(30, 16 / 9, 0.1, 100);
  cena.add(new THREE.HemisphereLight(0xffffff, 0x333a48, 1.5));
  const sol = new THREE.DirectionalLight(0xffffff, 2.4); sol.position.set(-4, 6, 5); cena.add(sol);
  const luz = new THREE.DirectionalLight(eq.cor || 0xff4a3a, 2); luz.position.set(5, 2, -4); cena.add(luz);
  const piso = new THREE.Mesh(new THREE.CircleGeometry(3.6, 48), new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.35 })); piso.rotation.x = -Math.PI / 2; piso.position.y = 0.005; cena.add(piso);
  const [c1, c2] = coresDa(eq.pintura, eq.cor || "#e10600");
  // A pintura da equipe depende dos logos; só monta depois de carregar o modelo e os desenhos.
  await f1Pronto.catch(() => {});
  const k = montarF1({ cor: c1, cor2: c2, equipe: equipeId }); cena.add(k.g);
  const vitrine = !!palco.closest(".vt-carro"), giro = vitrine ? Math.PI * 0.66 : Math.PI * 0.82, balanco = vitrine ? 0.3 : 0.55; // na vitrine o carro aparece grande e de lado
  k.g.rotation.y = giro;
  cam.position.set(0, vitrine ? 0.95 : 1.5, (vitrine ? 4.3 : 7.2) * (TAM / 4.35)); cam.lookAt(0, vitrine ? 0.32 : 0.45, 0);
  let vivo = true, visivel = !window.IntersectionObserver, raf = 0, sujo = true, ultimo = 0;
  const t0 = performance.now(), movimento = matchMedia("(prefers-reduced-motion:reduce)");
  const podeDesenhar = () => vivo && visivel && !document.hidden && cv.isConnected && cv.clientWidth > 0;
  function acordar() {
    sujo = true;
    if (podeDesenhar() && !raf) raf = requestAnimationFrame(laco);
  }
  function laco(t) {
    raf = 0;
    if (!podeDesenhar()) return;
    // A oscilação lenta não precisa renderizar acima de 30 quadros por segundo.
    if (sujo || t - ultimo >= 1000 / 30 - 2) {
      k.g.rotation.y = movimento.matches ? giro : giro + Math.sin((t - t0) / 4200) * balanco;
      r.render(cena, cam); ultimo = t; sujo = false;
    }
    if (!movimento.matches) raf = requestAnimationFrame(laco);
  }
  const ajusta = () => {
    if (!cv.isConnected || !cv.clientWidth || !cv.clientHeight) return;
    const w = cv.clientWidth, hh = cv.clientHeight;
    r.setPixelRatio(Math.min(devicePixelRatio || 1, 1.5)); r.setSize(w, hh, false);
    cam.aspect = w / hh; cam.updateProjectionMatrix(); acordar();
  };
  const ro = new ResizeObserver(ajusta); ro.observe(cv);
  const io = window.IntersectionObserver ? new IntersectionObserver(([e]) => {
    visivel = e.isIntersecting;
    if (visivel) { ajusta(); acordar(); }
    else if (raf) { cancelAnimationFrame(raf); raf = 0; }
  }) : null;
  io?.observe(cv);
  const aoVoltar = () => {
    if (document.hidden && raf) { cancelAnimationFrame(raf); raf = 0; }
    else if (!document.hidden) { ajusta(); acordar(); }
  };
  document.addEventListener("visibilitychange", aoVoltar);
  movimento.addEventListener?.("change", acordar);
  ajusta(); acordar();
  palco._parar = () => {
    vivo = false; if (raf) cancelAnimationFrame(raf); raf = 0;
    ro.disconnect(); io?.disconnect(); document.removeEventListener("visibilitychange", aoVoltar);
    movimento.removeEventListener?.("change", acordar); piso.geometry.dispose(); piso.material.dispose(); r.dispose();
  };
}
