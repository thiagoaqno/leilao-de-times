// O navegador escolhe a GPU; o jogo só pode solicitar alto desempenho, não ativá-lo por permissão.
(() => {
  const chave = "corrida:aviso-gpu-v1";
  try { if (localStorage.getItem(chave)) return; } catch {} // navegação privada também pode jogar

  const windows = /Windows/i.test(navigator.userAgent);
  const dialog = document.createElement("dialog");
  dialog.className = "gpu-aviso";
  dialog.setAttribute("aria-labelledby", "gpu-aviso-titulo");
  dialog.setAttribute("aria-describedby", "gpu-aviso-descricao");
  dialog.innerHTML = `<div class="gpu-aviso-conteudo">
    <span class="gpu-aviso-kicker">ANTES DE IR PARA A PISTA</span>
    <h2 id="gpu-aviso-titulo">Mais desempenho na corrida</h2>
    <p id="gpu-aviso-descricao">O jogo já pede a placa gráfica de alto desempenho. A escolha final é do navegador e do seu aparelho.</p>
    ${windows ? `<p>Se o computador tiver uma placa dedicada, você pode selecionar o navegador nas configurações do Windows:</p>
    <ol><li>Abra <strong>Configurações → Sistema → Tela → Gráficos</strong> (ou <strong>Configurações de elementos gráficos</strong>).</li><li>Adicione ou selecione seu navegador e escolha <strong>Opções → Alto desempenho</strong>. Confira se a placa dedicada aparece nessa opção.</li><li>Salve, feche completamente o navegador e abra o jogo novamente.</li></ol>
    <p class="gpu-aviso-nota">A preferência vale para o navegador inteiro e pode aumentar o consumo de energia. Você pode jogar sem alterá-la.</p>` : `<p>Se o seu aparelho tiver mais de uma placa gráfica, verifique as opções de energia e gráficos do sistema para o navegador. Você pode jogar sem alterar nada.</p>`}
    <button type="button" class="gpu-aviso-fechar">Entendi, vamos correr</button>
  </div>`;
  const estilo = document.createElement("style");
  estilo.textContent = `.gpu-aviso{box-sizing:border-box;width:min(520px,calc(100% - 32px));max-height:min(90vh,740px);overflow:auto;padding:0;border:1px solid #ffffff26;border-radius:18px;background:#10151e;color:#f4f5f8;box-shadow:0 24px 80px #000a;font:15px/1.5 system-ui,sans-serif}.gpu-aviso::backdrop{background:#05080dc9}.gpu-aviso-conteudo{padding:clamp(22px,5vw,34px)}.gpu-aviso-kicker{color:#ff6268;font-size:11px;font-weight:800;letter-spacing:.12em}.gpu-aviso h2{margin:9px 0 12px;color:#fff;font-size:clamp(24px,5vw,30px);line-height:1.1}.gpu-aviso p{margin:12px 0;color:#d2d7e0}.gpu-aviso ol{margin:12px 0;padding-left:22px;color:#e5e8ee}.gpu-aviso li{padding-left:3px;margin:8px 0}.gpu-aviso strong{color:#fff}.gpu-aviso .gpu-aviso-nota{font-size:13px;color:#aab3c0}.gpu-aviso-fechar{width:100%;margin-top:10px;padding:13px 18px;border:0;border-radius:10px;background:#e52b36;color:white;font:700 15px system-ui,sans-serif;cursor:pointer}.gpu-aviso-fechar:focus-visible{outline:3px solid white;outline-offset:3px}`;
  document.head.appendChild(estilo);
  document.body.appendChild(dialog);
  function fechar() {
    try { localStorage.setItem(chave, "1"); } catch {}
    dialog.close();
  }
  dialog.querySelector("button").addEventListener("click", fechar);
  dialog.addEventListener("cancel", (e) => { e.preventDefault(); fechar(); });
  if (typeof dialog.showModal === "function") dialog.showModal();
  else { dialog.remove(); estilo.remove(); } // não impede a entrada em navegadores antigos
})();
