// Controles de toque para os jogos que antes eram só de computador (Tiro, Pelada, Rocket e Batalha).
// Um joystick do lado esquerdo (vira as teclas W/A/S/D), uma área do lado direito para arrastar e olhar em volta,
// e botões grandes. Cada botão aperta e solta uma tecla de verdade (o jogo nem percebe a diferença) ou chama uma
// função. Só aparece em aparelho de toque.
(function (root) {
  const isTouch = () => matchMedia("(pointer: coarse)").matches || (navigator.maxTouchPoints > 0 && !matchMedia("(any-pointer: fine)").matches);
  const press = (code, key = "") => document.dispatchEvent(new KeyboardEvent("keydown", { code, key, bubbles: true, cancelable: true }));
  const release = (code, key = "") => document.dispatchEvent(new KeyboardEvent("keyup", { code, key, bubbles: true, cancelable: true }));
  const css = `
  #toque{position:fixed;inset:0;z-index:35;pointer-events:none;user-select:none;-webkit-user-select:none;-webkit-touch-callout:none;font-family:Figtree,system-ui,sans-serif}
  #toque.hidden{display:none}
  #toque .look{position:absolute;right:0;top:0;bottom:0;width:58%;pointer-events:auto;touch-action:none}
  #toque .stick{position:absolute;left:max(18px,env(safe-area-inset-left));bottom:22px;width:136px;height:136px;border-radius:50%;background:#ffffff14;border:2px solid #ffffff40;pointer-events:auto;touch-action:none;backdrop-filter:blur(2px)}
  #toque .stick i{position:absolute;left:50%;top:50%;width:58px;height:58px;margin:-29px 0 0 -29px;border-radius:50%;background:#ffffff55;border:2px solid #fffa;box-shadow:0 4px 12px #0006}
  #toque .btns{position:absolute;right:max(14px,env(safe-area-inset-right));bottom:16px;display:grid;grid-template-columns:repeat(3,64px);gap:10px;justify-items:center;align-items:end;pointer-events:none}
  #toque .top{position:absolute;right:max(10px,env(safe-area-inset-right));top:62px;display:flex;flex-direction:column;gap:8px;pointer-events:none}
  #toque button{pointer-events:auto;touch-action:none;width:64px;height:64px;border-radius:50%;border:2px solid #ffffff66;background:#0007;color:#fff;font:700 22px/1 system-ui;display:grid;place-items:center;padding:0;box-shadow:0 4px 12px #0006;backdrop-filter:blur(2px)}
  #toque button small{display:block;font:700 9.5px/1.1 Figtree,system-ui,sans-serif;margin-top:2px;opacity:.9}
  #toque button.big{width:78px;height:78px;font-size:28px;background:#e5393566}
  #toque button.on{background:#ffd84acc;color:#1b1500}
  #toque .top button{width:46px;height:46px;font-size:18px}
  #toque .turn{position:absolute;left:50%;top:40%;transform:translate(-50%,-50%);background:#000c;color:#fff;padding:12px 18px;border-radius:12px;font:700 15px Figtree,system-ui;display:none;text-align:center}
  @media (orientation:portrait){#toque .turn{display:block}}
  `;
  let el = null, cfg = null, stickId = null, lookId = null, lookLast = null, held = new Set(), on = false;
  function setKeys(x, y) { // joystick -> W/A/S/D (com uma folga no meio)
    const want = new Set(); const t = 0.38;
    if (y < -t) want.add(cfg.keys.up); if (y > t) want.add(cfg.keys.down);
    if (x < -t) want.add(cfg.keys.left); if (x > t) want.add(cfg.keys.right);
    for (const k of held) if (!want.has(k)) { release(k); held.delete(k); }
    for (const k of want) if (!held.has(k)) { press(k); held.add(k); }
    if (cfg.onStick) cfg.onStick(x, y);
  }
  function build() {
    const st = document.createElement("style"); st.textContent = css; document.head.appendChild(st);
    el = document.createElement("div"); el.id = "toque"; el.className = "hidden";
    el.innerHTML = `<div class="look"></div><div class="stick"><i></i></div><div class="btns"></div><div class="top"></div><div class="turn">📱↻ Deite o celular para jogar</div>`;
    document.body.appendChild(el);
    el.addEventListener("contextmenu", (e) => e.preventDefault());
    const stick = el.querySelector(".stick"), knob = stick.querySelector("i");
    const move = (e) => {
      const r = stick.getBoundingClientRect(), cx = r.left + r.width / 2, cy = r.top + r.height / 2, R = r.width / 2;
      let dx = (e.clientX - cx) / R, dy = (e.clientY - cy) / R; const d = Math.hypot(dx, dy); if (d > 1) { dx /= d; dy /= d; }
      knob.style.transform = `translate(${dx * R * 0.6}px,${dy * R * 0.6}px)`; setKeys(dx, dy);
    };
    stick.addEventListener("pointerdown", (e) => { e.preventDefault(); stickId = e.pointerId; stick.setPointerCapture(e.pointerId); move(e); });
    stick.addEventListener("pointermove", (e) => { if (e.pointerId === stickId) move(e); });
    const endStick = (e) => { if (e.pointerId !== stickId) return; stickId = null; knob.style.transform = ""; setKeys(0, 0); };
    stick.addEventListener("pointerup", endStick); stick.addEventListener("pointercancel", endStick);
    const look = el.querySelector(".look");
    look.addEventListener("pointerdown", (e) => { if (!cfg.look || lookId != null) return; lookId = e.pointerId; lookLast = [e.clientX, e.clientY]; look.setPointerCapture(e.pointerId); });
    look.addEventListener("pointermove", (e) => { if (e.pointerId !== lookId) return; cfg.look(e.clientX - lookLast[0], e.clientY - lookLast[1]); lookLast = [e.clientX, e.clientY]; });
    const endLook = (e) => { if (e.pointerId === lookId) lookId = null; };
    look.addEventListener("pointerup", endLook); look.addEventListener("pointercancel", endLook);
  }
  function addButton(parent, b) {
    const btn = document.createElement("button");
    btn.innerHTML = `<span>${b.icon}${b.label ? `<small>${b.label}</small>` : ""}</span>`; if (b.big) btn.className = "big";
    let id = null;
    const down = (e) => { e.preventDefault(); if (id != null) return; id = e.pointerId; btn.setPointerCapture(e.pointerId); btn.classList.add("on"); if (b.code) press(b.code, b.key); if (b.down) b.down(); };
    const up = (e) => { if (e.pointerId !== id) return; id = null; btn.classList.remove("on"); if (b.code) release(b.code, b.key); if (b.up) b.up(); };
    btn.addEventListener("pointerdown", down); btn.addEventListener("pointerup", up); btn.addEventListener("pointercancel", up);
    parent.appendChild(btn); return btn;
  }
  const api = {
    isTouch,
    press, release,
    // cfg: { keys: {up, down, left, right}, buttons: [{icon, label, code?, key?, down?, up?, big?}], top: [...], look?(dx, dy), onStick?(x, y) }
    setup(c) {
      if (!isTouch()) return false;
      if (!el) build();
      cfg = { keys: { up: "KeyW", down: "KeyS", left: "KeyA", right: "KeyD" }, ...c };
      const bs = el.querySelector(".btns"), tp = el.querySelector(".top"); bs.innerHTML = ""; tp.innerHTML = "";
      for (const b of cfg.buttons || []) addButton(bs, b);
      for (const b of cfg.top || []) addButton(tp, b);
      el.querySelector(".look").style.display = cfg.look ? "" : "none";
      tp.style.cssText = cfg.topStyle || "";
      return true;
    },
    show(v) {
      if (!el) return; on = !!v; el.classList.toggle("hidden", !on);
      if (!on) { for (const k of held) release(k); held.clear(); stickId = lookId = null; el.querySelector(".stick i").style.transform = ""; el.querySelectorAll("button.on").forEach((b) => b.classList.remove("on")); }
    },
    get on() { return on; },
    // tela cheia (no celular ajuda muito)
    fullscreen() { const d = document.documentElement; try { if (!document.fullscreenElement && d.requestFullscreen) d.requestFullscreen({ navigationUI: "hide" }).catch(() => {}); screen.orientation?.lock?.("landscape").catch(() => {}); } catch {} },
  };
  root.Toque = api;
})(window);
