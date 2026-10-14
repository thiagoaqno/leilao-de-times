// Road to Champions: a foto de cada protagonista, da TheSportsDB (o visual principal; o boneco desenhado de aparencia.js
// fica de reserva, quando a foto não carrega). UMD: o servidor usa para baixar e servir as fotos do nosso endereço
// (GET /api/rtc-foto/:arquetipo?tipo=recorte|foto, em server.js, como os escudos), e a página para o nome e o texto
// alternativo. `recorte` é o PNG sem fundo (o corpo, na central e na seleção); `foto` é a 3×4 (os avatares redondos).
// Se o endereço guardado mudar na TheSportsDB, o servidor procura de novo pelo `busca` (searchplayers.php).
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.RoadFotos = factory();
})(typeof self !== "undefined" ? self : this, function () {
  const R2 = "https://r2.thesportsdb.com/images/media/player/";
  const FOTOS = {
    romantico: { nome: "Neymar", busca: "Neymar", id: "34146371", recorte: R2 + "cutout/av4ar01767782947.png", foto: R2 + "thumb/j60pdx1741319053.jpg" },
    prodigio: { nome: "Lamine Yamal", busca: "Lamine_Yamal", id: "34219490", recorte: R2 + "cutout/m9n4ja1761512633.png", foto: R2 + "thumb/cdjnqt1786385175.jpg" },
    resiliente: { nome: "Vinícius Júnior", busca: "Vinicius_Junior", id: "34161324", recorte: R2 + "cutout/z5o9zt1788114155.png", foto: R2 + "thumb/lxf1he1771264845.jpg" },
    imprevisivel: { nome: "Ousmane Dembélé", busca: "Ousmane_Dembele", id: "34161375", recorte: R2 + "cutout/pstgy21766335175.png", foto: R2 + "thumb/2w39ps1778803599.jpg" },
    enigma: { nome: "Michael Olise", busca: "Michael_Olise", id: "34172857", recorte: R2 + "cutout/r4vx6b1756408807.png", foto: R2 + "thumb/kumigl1778817330.jpg" },
    maquina: { nome: "Erling Haaland", busca: "Erling_Haaland", id: "34169116", recorte: R2 + "cutout/e8cart1789115621.png", foto: R2 + "thumb/bb1agj1727415216.jpg" },
  };
  const url = (arq, tipo = "recorte") => (FOTOS[arq] ? "/api/rtc-foto/" + arq + (tipo === "foto" ? "?tipo=foto" : "") : "");
  return { FOTOS, url };
});
