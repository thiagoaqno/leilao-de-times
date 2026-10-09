// Carreira: o fundo da sede. A foto do estádio do clube (estadios-api.js, da TheSportsDB, gerado por tools/baixar-estadios.js) fica atrás
// de tudo, borrada e com pouco brilho para não atrapalhar a leitura. Sem foto (clube fora do arquivo, imagem que não abre ou sem internet),
// vale o estádio desenhado em pixel-art (estadios.js), também borrado. Só aparece na sede (CSS: body[data-tela="sede"]); o crédito
// fica no canto de baixo.
const rotulo = (nome) => (/est[aá]dio|stadium|arena|parque|park|campo|ground/i.test(nome) ? nome : `Estádio ${nome}`);
function atualizarFundoEstadio() {
  const el = $("fundoEstadio"), credito = $("creditoEstadio");
  if (!el || !E || !CLUBES[E.clube]) return;
  if (el.dataset.clube === E.clube) return;
  el.dataset.clube = E.clube; el.innerHTML = "";
  const clube = CLUBES[E.clube], api = window.ESTADIOS_API && window.ESTADIOS_API[E.clube];
  const desenhado = () => {
    if (el.dataset.clube !== E.clube) return;
    el.innerHTML = ""; el.dataset.tipo = "desenho";
    const cv = document.createElement("canvas"); cv.width = Estadio.W; cv.height = Estadio.H; cv.className = "fundo-estadio-desenho";
    Estadio.quadro(cv.getContext("2d"), clube, clube, { hora: "noite", chuva: false }, null);
    el.append(cv);
    if (credito) credito.textContent = `${rotulo(clube.estadio)} · ilustração`;
  };
  if (!api) return desenhado();
  const img = new Image(), id = E.clube;
  img.onload = () => {
    if (el.dataset.clube !== id) return;
    el.innerHTML = ""; el.dataset.tipo = "foto";
    const foto = document.createElement("div"); foto.className = "fundo-estadio-foto"; foto.style.backgroundImage = `url("${api.url}")`;
    el.append(foto);
    if (credito) credito.textContent = `${rotulo(api.nome || clube.estadio)} · foto: TheSportsDB`;
  };
  img.onerror = desenhado;
  img.src = api.url;
  if (credito) credito.textContent = rotulo(clube.estadio);
}
