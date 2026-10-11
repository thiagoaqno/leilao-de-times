const test = require("node:test");
const assert = require("node:assert/strict");
const { escolher } = require("../fotos-jogadores.js");

const cutout = "https://r2.thesportsdb.com/images/media/player/cutout/2p9j0d1750919894.png";

test("usa o recorte quando o nome completo confere", () => {
  assert.equal(escolher({ nome: "Giorgian de Arrascaeta", clube: "Flamengo" }, [
    { strSport: "Soccer", strPlayer: "Giorgian De Arrascaeta", strTeam: "Flamengo", strCutout: cutout },
  ]), cutout);
});

test("não troca um jogador por homônimo de outro clube", () => {
  assert.equal(escolher({ nome: "Pedro", clube: "Flamengo" }, [
    { strSport: "Soccer", strPlayer: "Pedro", strTeam: "Lazio", strCutout: cutout },
  ]), null);
});

test("ignora imagens de fora do domínio esperado e jogadores sem recorte", () => {
  assert.equal(escolher({ nome: "Lucas Paquetá", clube: "Flamengo" }, [
    { strSport: "Soccer", strPlayer: "Lucas Paquetá", strCutout: "https://example.com/foto.png" },
    { strSport: "Soccer", strPlayer: "Lucas Paquetá", strThumb: "https://example.com/foto.jpg" },
  ]), null);
});
