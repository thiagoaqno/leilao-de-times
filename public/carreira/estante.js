// Títulos conquistados no mundo desta carreira. O arquivo inclui todas as equipes,
// inclusive as controladas pelo computador; a temporada atual só entra após o fim
// visível de cada competição.
(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.EstanteCarreira = api;
})(typeof window !== "undefined" ? window : globalThis, function () {
  function conquistas(arquivo = [], atual = {}, temporadaAtual) {
    const porClube = new Map(), vistos = new Set();
    function registrar(temporada, id, comp) {
      if (!comp || !comp.campeao) return;
      const chave = `${temporada}:${id}`;
      if (vistos.has(chave)) return;
      vistos.add(chave);
      const clube = comp.campeao;
      const registro = porClube.get(clube) || { clube, total: 0, tacas: new Map() };
      const taca = registro.tacas.get(id) || { competicao: id, nome: comp.nome || id, anos: [] };
      taca.anos.push(temporada);
      registro.tacas.set(id, taca);
      registro.total++;
      porClube.set(clube, registro);
    }
    for (const ano of arquivo) {
      for (const [id, comp] of Object.entries(ano.competicoes || {})) registrar(ano.temporada ?? ano.ano, id, comp);
    }
    for (const [id, comp] of Object.entries(atual || {})) registrar(temporadaAtual, id, comp);
    return porClube;
  }
  return { conquistas };
});
