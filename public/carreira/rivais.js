// Carreira de Treinador: os clássicos de verdade (Fla-Flu, Gre-Nal, El Clásico...) e o peso de cada jogo (final, semifinal,
// jogo do título, clássico, duelo entre técnicos da sala). UMD: o servidor usa para os rivais do clube (carreira-clube.js:
// bilheteria, moral, confiança e as notícias) e o navegador para o clima dos jogos grandes (a sede, a partida e a rodada ao vivo).
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.Rivais = factory();
})(typeof self !== "undefined" ? self : this, function () {
  // [clube, clube, nome do clássico, peso: 3 o maior da cidade/país, 2 grande, 1 regional]. Os ids são os das bases (*-2026.js);
  // clube sem clássico aqui ganha o rival de tamanho parecido da liga (rivalDaLiga, em carreira-clube.js).
  const CLASSICOS = [
    // Brasil
    ["flamengo", "fluminense", "Fla-Flu", 3], ["flamengo", "vasco", "Clássico dos Milhões", 3], ["flamengo", "botafogo", "Clássico da Rivalidade", 2],
    ["fluminense", "vasco", "Clássico dos Gigantes", 2], ["fluminense", "botafogo", "Clássico Vovô", 2], ["botafogo", "vasco", "Clássico da Amizade", 1],
    ["corinthians", "palmeiras", "Derby Paulista", 3], ["corinthians", "saopaulo", "Majestoso", 2], ["palmeiras", "saopaulo", "Choque-Rei", 2],
    ["santos", "corinthians", "Clássico Alvinegro", 2], ["santos", "palmeiras", "Clássico da Saudade", 2], ["santos", "saopaulo", "San-São", 2],
    ["gremio", "internacional", "Gre-Nal", 3], ["cruzeiro", "atleticomg", "Clássico Mineiro", 3], ["bahia", "vitoria", "Ba-Vi", 3],
    ["athletico", "coritiba", "Atletiba", 3],
    // Argentina e sul-americanos
    ["boca-juniors", "river-plate", "Superclásico", 3], ["nacional", "penarol", "Clásico Uruguayo", 3], ["cerro-porteno", "libertad", "Clásico de Asunción", 1],
    ["universitario", "sporting-cristal", "Clásico Moderno", 1], ["ldu-quito", "independiente-del-valle", "Clásico Quiteño", 1],
    // Inglaterra
    ["arsenal", "tottenham", "North London Derby", 3], ["liverpool", "everton", "Merseyside Derby", 3], ["manchester-united", "manchester-city", "Manchester Derby", 3],
    ["manchester-united", "liverpool", "North West Derby", 3], ["newcastle-utd", "sunderland", "Tyne-Wear Derby", 3], ["chelsea", "tottenham", "Derby de Londres", 2],
    ["chelsea", "arsenal", "Derby de Londres", 2], ["crystal-palace", "brighton", "M23 Derby", 2], ["leeds-united", "manchester-united", "Roses Rivalry", 2],
    ["chelsea", "fulham", "West London Derby", 1], ["brentford", "fulham", "West London Derby", 1],
    // Espanha
    ["real-madrid", "fc-barcelona", "El Clásico", 3], ["real-madrid", "atletico-de-madrid", "Derbi Madrileño", 3], ["fc-barcelona", "rcd-espanyol", "Derbi Barceloní", 3],
    ["sevilla-fc", "real-betis", "Derbi Sevillano", 3], ["athletic-club", "real-sociedad", "Derbi Vasco", 3], ["celta-de-vigo", "deportivo-la-coruna", "Derbi Gallego", 3],
    ["valencia-cf", "levante-ud", "Derbi Valenciano", 2], ["valencia-cf", "villarreal-cf", "Derbi de la Comunitat", 2], ["fc-barcelona", "atletico-de-madrid", "Clássico espanhol", 1],
    // Itália
    ["inter-de-milao", "milan", "Derby della Madonnina", 3], ["as-roma", "lazio", "Derby della Capitale", 3], ["juventus", "torino", "Derby della Mole", 3],
    ["juventus", "inter-de-milao", "Derby d'Italia", 3], ["ssc-napoli", "as-roma", "Derby del Sole", 2], ["juventus", "milan", "Clássico italiano", 2],
    ["fiorentina", "juventus", "Rivalidade de Florença", 2], ["bologna", "fiorentina", "Derby dell'Appennino", 2], ["ssc-napoli", "juventus", "Derby do Norte e Sul", 2],
    // Alemanha
    ["borussia-dortmund", "schalke-04", "Revierderby", 3], ["fc-bayern-munchen", "borussia-dortmund", "Der Klassiker", 3], ["borussia-monchengladbach", "1-fc-koln", "Rheinderby", 3],
    ["hamburger-sv", "sv-werder-bremen", "Nordderby", 3], ["bayer-leverkusen", "1-fc-koln", "Derby do Reno", 2], ["eintracht-frankfurt", "1-fsv-mainz-05", "Rhein-Main-Derby", 2],
    ["vfb-stuttgart", "sc-freiburg", "Derby de Baden-Württemberg", 2], ["fc-bayern-munchen", "fc-augsburg", "Derby da Baviera", 1], ["vfb-stuttgart", "tsg-hoffenheim", "Derby do Sul", 1],
    // França
    ["paris-saint-germain", "olympique-de-marseille", "Le Classique", 3], ["losc-lille", "rc-lens", "Derby du Nord", 3], ["lyon", "olympique-de-marseille", "Olympico", 2],
    ["ogc-nice", "as-monaco", "Derby da Côte d'Azur", 2], ["stade-rennais-fc", "stade-brestois-29", "Derby Breton", 2], ["paris-fc", "paris-saint-germain", "Derby Parisiense", 2],
    ["stade-rennais-fc", "fc-lorient", "Derby Breton", 1], ["paris-saint-germain", "lyon", "Clássico francês", 1],
  ];
  const chave = (a, b) => (a < b ? `${a}|${b}` : `${b}|${a}`);
  const POR_DUPLA = new Map(CLASSICOS.map(([a, b, nome, peso]) => [chave(a, b), { nome, peso }]));

  // o clássico entre dois clubes (ou null)
  const classico = (a, b) => (a && b && a !== b ? POR_DUPLA.get(chave(a, b)) || null : null);
  // os rivais de verdade de um clube, do maior clássico para o menor
  const rivaisReais = (clube) => CLASSICOS.filter(([a, b]) => a === clube || b === clube)
    .map(([a, b, nome, peso]) => ({ id: a === clube ? b : a, nome, peso })).sort((x, y) => y.peso - x.peso);

  // o peso do jogo: o que faz dele um jogo grande. Devolve null num jogo comum, ou
  //   { tema: "final" | "decisivo" | "classico", titulo: "FINAL", nome: "Libertadores", selos: ["Fla-Flu", ...], classico, turma }
  // j: { casa, fora, fase, tipoComp ("liga" | "copa"), nomeComp }; humanos: os clubes dos técnicos da sala (o duelo entre eles é
  // sempre clássico: o "Clássico da turma"); titulo: o jogo pode decidir a liga (quem chama faz a conta com a tabela).
  function pesoDoJogo(j, { humanos = [], titulo = false } = {}) {
    if (!j || !j.casa || !j.fora) return null;
    const cl = classico(j.casa, j.fora), turma = humanos.includes(j.casa) && humanos.includes(j.fora);
    const fase = j.fase || "", nomeComp = j.nomeComp || "";
    const selos = [];
    if (turma) selos.push("Clássico da turma");
    if (cl) selos.push(cl.nome);
    let tema = null, tituloTxt = "", nome = "";
    if (fase === "final") { tema = "final"; tituloTxt = "Final"; nome = nomeComp; }
    else if (fase === "semifinal") { tema = "decisivo"; tituloTxt = "Semifinal"; nome = nomeComp; }
    else if (titulo) { tema = "decisivo"; tituloTxt = "Jogo do título"; nome = nomeComp; }
    else if (cl || turma) { tema = "classico"; tituloTxt = "Clássico"; nome = cl ? cl.nome : "Clássico da turma"; selos.splice(selos.indexOf(nome), 1); }
    if (!tema) return null;
    return { tema, titulo: tituloTxt, nome, selos, classico: cl, turma };
  }

  // a liga pode ser decidida neste jogo: faltam no máximo 3 jogos da liga para o clube e ele briga pelo topo (é o líder com
  // o 2º a até 3 pontos, ou está a até 3 pontos do líder). tabela: [{ id, p }] em ordem; restam: jogos da liga que faltam, contando este.
  function decideTitulo(tabela, clube, restam) {
    if (!tabela || tabela.length < 2 || restam > 3 || restam < 1) return false;
    const i = tabela.findIndex((l) => l.id === clube); if (i < 0) return false;
    const lider = tabela[0].p, maxGanho = restam * 3;
    if (i === 0) return lider - tabela[1].p <= Math.min(3, maxGanho);
    return lider - tabela[i].p <= Math.min(3, maxGanho);
  }

  return { CLASSICOS, classico, rivaisReais, pesoDoJogo, decideTitulo };
});
