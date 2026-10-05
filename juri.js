// Batalha dos pratos (hambúrguer, pizza, drink, sobremesa) julgada no próprio site.
// Nota final = metade júri do site + metade voto da galera. O resultado sai em partes (Markdown) para o modo suspense.
//
// PARA AJUSTAR: as tabelas abaixo são editáveis.
//   NOTAS: trecho do nome do ingrediente → nota base (0 a 10) e características:
//     forte, doce, fresco, azedo, amargo, picante, crocante, gordo, chique, raiz, ousado
//   COMBOS: ingredientes que combinam (bônus) ou brigam (nota negativa), com a frase que os jurados usam.
const Ratings = require("./public/ratings.js");

const NOTAS = {
  hamburguer: [
    ["brioche", 8, "chique"], ["australiano", 7.5, "ousado"], ["pao de batata", 7.5, ""], ["gergelim", 7, "raiz"], ["pao de fermentacao", 8, "chique"],
    ["ciabatta", 7, ""], ["pao preto", 7, "ousado"], ["pao de queijo", 7, "ousado gordo"],
    ["costela", 8.5, "gordo"], ["smash", 8.5, "raiz crocante"], ["frango empanado", 7.5, "crocante raiz"], ["picanha", 8.5, "chique"],
    ["cordeiro", 7.5, "ousado forte"], ["grao-de-bico", 6.5, "ousado fresco"], ["pulled pork", 8, "gordo doce"], ["wagyu", 9, "chique gordo"],
    ["cheddar", 8, "gordo raiz"], ["queijo prato", 7, "raiz"], ["provolone", 7.5, "forte"], ["gorgonzola", 7.5, "forte chique"], ["brie", 8, "chique"],
    ["bufala", 7.5, "chique fresco"], ["catupiry", 7.5, "gordo raiz"], ["coalho", 7.5, "raiz"],
    ["maionese de alho", 7.5, "forte"], ["barbecue", 8, "doce raiz"], ["molho especial", 8, ""], ["maionese de bacon", 7.5, "gordo"],
    ["mostarda e mel", 7.5, "doce"], ["goiabada", 7, "doce ousado"], ["chipotle", 8, "picante forte"], ["aioli", 7.5, "fresco chique"],
    ["bacon", 8.5, "crocante gordo raiz"], ["ovo", 8, "gordo raiz"], ["onion rings", 8, "crocante gordo"], ["cogumelos", 7.5, "chique"],
    ["batata palha", 7, "crocante raiz"], ["geleia de pimenta", 7.5, "doce picante ousado"], ["abacaxi", 6.5, "doce ousado fresco"], ["jalapeno", 7.5, "picante fresco"],
    ["cebola caramelizada", 8.5, "doce chique"], ["picles", 7.5, "fresco azedo"], ["alface", 7, "fresco"], ["tomate", 7, "fresco"], ["rucula", 7.5, "fresco forte"],
    ["cebola roxa", 7, "fresco forte"], ["pimentao", 7, "doce"], ["coleslaw", 7.5, "fresco crocante"],
  ],
  pizza: [
    ["napolitana", 8.5, "chique"], ["fina crocante", 7.5, "crocante"], ["fermentacao natural", 8.5, "chique"], ["borda recheada de catupiry", 8, "gordo raiz"],
    ["integral", 6.5, "fresco"], ["detroit", 8, "crocante gordo ousado"], ["borda de cheddar", 7.5, "gordo raiz"], ["semolina", 7.5, ""],
    ["san marzano", 9, "chique"], ["molho branco", 7, "gordo"], ["pesto", 8, "fresco forte"], ["molho barbecue", 7, "doce raiz"], ["azeite com alho", 7.5, "forte"],
    ["tomate apimentado", 7.5, "picante"], ["abobora", 7, "doce ousado"], ["tomate com ervas", 8, "fresco"],
    ["mussarela de bufala", 8.5, "chique fresco"], ["mussarela", 7.5, "raiz"], ["catupiry", 8, "gordo raiz"], ["gorgonzola", 7.5, "forte"], ["provolone", 7.5, "forte"],
    ["burrata", 9, "chique fresco"], ["cheddar", 7, "gordo"], ["parmesao ralado", 7.5, ""], ["parmesao", 7.5, "forte"],
    ["pimenta calabresa", 7.5, "picante"], ["calabresa", 8, "raiz"], ["pepperoni", 8.5, "picante gordo"], ["frango", 7.5, "raiz"], ["parma", 8.5, "chique"], ["bacon", 8, "gordo crocante"],
    ["carne seca", 8, "forte"], ["atum", 6.5, "forte ousado"], ["linguica", 7.5, "gordo"],
    ["tomate cereja", 8, "fresco"], ["rucula", 8, "fresco forte"], ["champignon", 7, ""], ["palmito", 7, "raiz"], ["azeitona", 7, "forte"],
    ["milho", 6, "doce raiz"], ["pimentao", 6.5, ""], ["cebola", 7, "raiz"],
    ["manjericao", 8, "fresco"], ["mel com pimenta", 8.5, "doce picante ousado"], ["oregano", 7, "raiz"], ["trufado", 8.5, "chique forte"],
    ["alho frito", 7.5, "crocante forte"], ["raspas de limao", 7.5, "fresco azedo"],
  ],
  drink: [
    ["cachaca", 8, "raiz"], ["vodka", 7, ""], ["gin", 8, "chique fresco"], ["rum", 7.5, "doce"], ["tequila", 7.5, "forte"], ["whisky", 8, "forte chique"],
    ["pisco", 7.5, "ousado"], ["mezcal", 8, "forte ousado chique"],
    ["vermute", 7.5, "chique"], ["campari", 7.5, "forte amargo"], ["aperol", 8, "fresco"], ["licor de laranja", 7.5, "doce"], ["licor de cafe", 7.5, "doce"],
    ["licor 43", 7.5, "doce"], ["espumante", 8, "fresco chique"], ["saque", 7, "ousado"],
    ["siciliano", 8, "azedo chique"], ["limao", 8, "azedo fresco raiz"], ["maracuja", 8, "azedo doce"], ["abacaxi", 7.5, "doce fresco"], ["laranja flambada", 8.5, "chique ousado"],
    ["laranja", 7.5, "doce fresco"], ["toranja", 7.5, "amargo fresco"], ["morango", 7.5, "doce"], ["melancia", 7, "doce fresco"],
    ["xarope simples", 7, ""], ["mel", 7.5, ""], ["mascavo", 7.5, "raiz"], ["gengibre", 8, "picante fresco"], ["canela", 7, "ousado"],
    ["baunilha", 7, "doce"], ["leite condensado", 7, "doce gordo raiz"], ["hibisco", 8, "ousado azedo"],
    ["hortela", 8, "fresco"], ["angostura", 8, "amargo chique"], ["tonica", 7.5, "amargo fresco"], ["club soda", 7, "fresco"], ["borda de sal", 7, ""],
    ["pimenta", 7.5, "picante ousado"], ["alecrim", 8, "chique fresco"],
  ],
  sobremesa: [
    ["sorvete de creme", 7.5, "raiz"], ["sorvete de chocolate", 8, "doce"], ["brownie", 8.5, "doce gordo"], ["pistache", 8.5, "chique"], ["cheesecake", 8, "chique"],
    ["petit gateau", 8.5, "doce gordo"], ["sorvete de doce de leite", 8, "doce raiz"], ["pudim", 8, "raiz"],
    ["ganache", 8, "doce"], ["caramelo salgado", 8.5, "chique"], ["doce de leite", 8, "doce raiz"], ["calda de frutas vermelhas", 8, "azedo fresco"],
    ["avela", 8.5, "doce gordo"], ["goiabada", 7.5, "doce raiz ousado"], ["chocolate branco", 7.5, "doce"],
    ["pacoca", 8, "raiz"], ["castanha", 7.5, "chique"], ["granola", 6.5, "fresco"], ["biscoito de chocolate", 7.5, "doce"], ["amendoim caramelizado", 8, "doce"],
    ["suspiro", 7, "doce"], ["crumble", 8, "gordo"], ["cookies", 8, "doce gordo"],
    ["morango", 8, "fresco"], ["banana caramelizada", 8, "doce"], ["frutas vermelhas", 8, "azedo fresco"], ["manga", 7.5, "fresco"], ["maracuja", 8, "azedo"],
    ["abacaxi grelhado", 7.5, "ousado"], ["cereja", 7.5, "chique"], ["kiwi", 6.5, "azedo ousado"],
    ["chantilly", 7.5, "gordo raiz"], ["flor de sal", 8, "chique ousado"], ["marshmallow", 8, "doce ousado"], ["raspas de limao", 7.5, "fresco azedo"],
    ["hortela", 7, "fresco"], ["leite em po", 8, "raiz doce"], ["canela", 7.5, ""], ["granulado", 8, "chique doce"],
  ],
};

// [trechos que precisam estar todos no prato, bônus, nome da combinação]
const COMBOS = {
  hamburguer: [
    [["coalho", "goiabada"], 1.5, "queijo coalho com goiabada, o Romeu e Julieta no pão"], [["gorgonzola", "mel"], 1, "gorgonzola com mel"],
    [["brie", "geleia"], 1.2, "brie com geleia de pimenta"], [["bacon", "cheddar"], 0.8, "bacon com cheddar"], [["cheddar", "caramelizada"], 0.8, "cheddar com cebola caramelizada"],
    [["costela", "barbecue"], 0.8, "costela com barbecue"], [["pulled pork", "coleslaw"], 1.2, "pulled pork com coleslaw"], [["wagyu", "cogumelos"], 0.8, "wagyu com cogumelos"],
    [["smash", "cheddar"], 0.8, "smash com cheddar"], [["smash", "picles"], 0.6, "smash com picles"], [["frango empanado", "maionese de alho"], 0.7, "frango crocante com maionese de alho"],
    [["abacaxi", "bacon"], 0.6, "abacaxi com bacon"], [["ovo", "bacon"], 0.7, "ovo com bacon"], [["grao-de-bico", "rucula"], 0.6, "grão-de-bico com rúcula"],
    [["gorgonzola", "goiabada"], -1, "gorgonzola com goiabada"], [["brie", "jalapeno"], -0.6, "brie com jalapeño"], [["wagyu", "batata palha"], -0.4, "wagyu com batata palha de pacote"],
  ],
  pizza: [
    [["bufala", "manjericao"], 0.8, "búfala com manjericão"], [["san marzano", "manjericao"], 0.6, "San Marzano com manjericão"], [["burrata", "tomate cereja"], 1, "burrata com tomate cereja"],
    [["pepperoni", "mel com pimenta"], 1.3, "pepperoni com mel e pimenta"], [["parma", "rucula"], 1.2, "parma com rúcula"], [["calabresa", "cebola"], 1, "calabresa com cebola"],
    [["frango", "catupiry"], 1.2, "frango com catupiry, patrimônio nacional"], [["gorgonzola", "mel"], 1, "gorgonzola com mel"], [["carne seca", "catupiry"], 1, "carne seca com catupiry"],
    [["champignon", "trufado"], 1, "champignon com azeite trufado"], [["abobora", "carne seca"], 0.8, "abóbora com carne seca"], [["atum", "cebola"], 0.6, "atum com cebola"],
    [["milho", "parma"], -0.8, "milho com parma"], [["atum", "burrata"], -0.8, "atum com burrata"],
  ],
  drink: [
    [["cachaca", "limao"], 1.5, "cachaça com limão, a caipirinha raiz"], [["cachaca", "maracuja"], 1, "cachaça com maracujá"], [["cachaca", "leite condensado"], 0.8, "a batidinha de cachaça"],
    [["gin", "tonica"], 1.3, "gin tônica"], [["campari", "vermute"], 1.5, "Campari com vermute, meio caminho do Negroni"], [["gin", "campari"], 0.5, "gin com Campari"],
    [["aperol", "espumante"], 1.5, "Aperol com espumante, o spritz"], [["tequila", "limao"], 1, "tequila com limão"], [["tequila", "sal"], 0.7, "tequila com borda de sal"],
    [["rum", "hortela"], 1.2, "rum com hortelã, um mojito"], [["rum", "abacaxi"], 0.8, "rum com abacaxi"], [["whisky", "angostura"], 1.3, "whisky com angostura, um Old Fashioned"],
    [["whisky", "laranja"], 0.8, "whisky com laranja"], [["mezcal", "toranja"], 0.8, "mezcal com toranja"], [["vodka", "maracuja"], 0.8, "vodka com maracujá"],
    [["vodka", "licor de cafe"], 1, "vodka com licor de café"], [["pisco", "limao"], 1, "pisco com limão"], [["vodka", "gengibre"], 0.8, "vodka com gengibre, quase um Moscow Mule"],
    [["gin", "alecrim"], 0.6, "gin com alecrim"], [["saque", "morango"], 0.7, "saquê com morango"],
    [["leite condensado", "tonica"], -1.2, "leite condensado com tônica"], [["campari", "leite condensado"], -1.2, "Campari com leite condensado"], [["licor de cafe", "toranja"], -0.8, "licor de café com toranja"],
  ],
  sobremesa: [
    [["brownie", "ganache"], 0.6, "brownie com ganache"], [["petit gateau", "frutas vermelhas"], 0.8, "petit gâteau com frutas vermelhas"],
    [["cheesecake", "frutas vermelhas"], 1.3, "cheesecake com frutas vermelhas"], [["cheesecake", "goiabada"], 1.2, "cheesecake com goiabada, o Romeu e Julieta"],
    [["pudim", "caramelo"], 0.6, "pudim com caramelo"], [["banana", "doce de leite"], 1, "banana com doce de leite"], [["banana", "canela"], 0.8, "banana com canela"],
    [["pistache", "chocolate branco"], 0.8, "pistache com chocolate branco"], [["morango", "ganache"], 1, "morango com chocolate"], [["morango", "chocolate"], 1, "morango com chocolate"],
    [["morango", "leite em po"], 0.8, "morango com leite em pó"], [["pacoca", "doce de leite"], 0.8, "paçoca com doce de leite"], [["manga", "maracuja"], 0.7, "manga com maracujá"],
    [["caramelo salgado", "flor de sal"], 0.8, "caramelo com flor de sal"], [["sorvete de creme", "avela"], 0.6, "sorvete de creme com avelã"],
    [["kiwi", "ganache"], -0.8, "kiwi com ganache"], [["granola", "petit gateau"], -0.6, "granola no petit gâteau"],
  ],
};

// categoria que o prato não pode deixar de ter
const OBRIGATORIO = { hamburguer: ["Pão", "Carne"], pizza: ["Massa", "Molho", "Queijo"], drink: ["Destilado"], sobremesa: ["Base"] };
const NOME = { hamburguer: "Hambúrguer", pizza: "Pizza", drink: "Drink", sobremesa: "Sobremesa" };
const EMOJI = { hamburguer: "🍔", pizza: "🍕", drink: "🍹", sobremesa: "🍨" };

// ---------------------------------------------------------------------------------
const rnd = () => Math.random();
const pick = (a) => a[Math.floor(rnd() * a.length)];
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
const low = (s) => String(s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
const fmt = (x) => x.toFixed(1).replace(".", ",");
// trecho como palavra inteira ("mel" não casa com "caramelizada")
const tem = (texto, k) => new RegExp(`(^|[^a-z])${k.replace(/[.*+?^${}()|[]\]/g, "\const joinE =")}([^a-z]|$)`).test(texto);
const joinE = (a) => (a.length <= 1 ? a.join("") : a.slice(0, -1).join(", ") + " e " + a[a.length - 1]);

function ingrediente(skin, item) {
  const { name, cat } = Ratings.parseItem(item);
  const n = low(name), row = (NOTAS[skin] || []).find(([k]) => tem(n, k));
  return { name, cat, nota: row ? row[1] : 7, tags: row ? row[2].split(" ").filter(Boolean) : [] };
}

// análise do prato: nota comum + tudo que os jurados podem comentar
function analisar(skin, team, perTeam) {
  const ing = team.map((t) => ingrediente(skin, t.player));
  const nomes = ing.map((i) => low(i.name)).join(" | ");
  const conta = (tag) => ing.filter((i) => i.tags.includes(tag)).length;
  const com = (tag) => ing.filter((i) => i.tags.includes(tag)).map((i) => i.name);
  const combos = [], brigas = [];
  for (const [keys, bonus, frase] of COMBOS[skin] || []) if (keys.every((k) => tem(nomes, k))) (bonus > 0 ? combos : brigas).push({ bonus, frase });
  const faltaCat = (OBRIGATORIO[skin] || []).filter((c) => !ing.some((i) => i.cat === c));
  const vagas = Math.max(0, perTeam - ing.length);
  const salgado = skin === "hamburguer" || skin === "pizza";
  const flags = {
    fortes: conta("forte") >= 3, pesado: salgado && conta("fresco") === 0, docesDemais: salgado && conta("doce") >= 2,
    gordo: conta("gordo"), chique: com("chique"), raiz: conta("raiz"), ousado: com("ousado"), crocante: conta("crocante"), fresco: conta("fresco"),
    equilibrado: skin === "drink" && conta("azedo") > 0 && (conta("doce") > 0 || ing.some((i) => i.cat === "Adoçante")),
    doisDestilados: skin === "drink" && ing.filter((i) => i.cat === "Destilado").length >= 2,
    enjoativo: skin === "sobremesa" && conta("doce") >= 4, corta: skin === "sobremesa" && conta("azedo") + conta("fresco") > 0,
  };
  // média dos ingredientes espalhada em volta do 6: ingrediente 7 é "normal", 9 é excelente
  const media = ing.length ? ing.reduce((a, i) => a + i.nota, 0) / ing.length : 5;
  let nota = 6 + (media - 7.5) * 1.8;
  // combinações ajudam, mas com teto: três clássicos juntos não viram nota 10 sozinhos
  nota += Math.min(1.5, combos.reduce((a, c) => a + c.bonus, 0) * 0.6) + brigas.reduce((a, c) => a + c.bonus, 0);
  if (flags.fortes) nota -= 0.8;
  if (flags.pesado) nota -= 0.4;
  if (flags.docesDemais) nota -= 0.6;
  if (flags.equilibrado) nota += 0.5;
  if (flags.doisDestilados) nota -= 0.8;
  nota -= faltaCat.length * 2 + vagas * 0.4;
  return { ing, combos, brigas, faltaCat, vagas, flags, nota };
}

// ---------------- jurados ----------------
const JURADOS = [
  {
    nome: "Chef Armando", desc: "o exigente, que já trabalhou em restaurante com toalha na mesa",
    nota: (a) => a.nota + Math.min(2, a.combos.length) * 0.2 + a.flags.chique.length * 0.3 - (a.flags.gordo >= 3 ? 0.8 : 0) - a.flags.raiz * 0.15 + (a.flags.corta ? 0.4 : 0) - (a.flags.enjoativo ? 0.6 : 0),
    fala(a) {
      const f = [];
      if (a.faltaCat.length) f.push(`Falta ${joinE(a.faltaCat.map(low))}. Isso aqui é um rascunho de prato.`);
      else if (a.vagas >= 2) f.push("Metade do prato ficou faltando. Eu não julgo intenção, julgo o que chega na mesa.");
      if (a.brigas.length) f.push(`${cap(a.brigas[0].frase)}? Não. Simplesmente não.`);
      else if (a.combos.length) f.push(pick([`Tem ${a.combos[0].frase}. Isso é técnica, meus parabéns.`, `${cap(a.combos[0].frase)}: alguém aqui pensou antes de comprar.`]));
      if (a.flags.fortes) f.push("Sabor forte brigando com sabor forte. Ninguém ganha essa briga, só o meu estômago perde.");
      else if (a.flags.gordo >= 3) f.push("Pesado. Depois de duas mordidas eu preciso de um cochilo.");
      else if (a.flags.enjoativo) f.push("Doce em cima de doce. Enjoei na terceira colherada.");
      else if (a.flags.doisDestilados) f.push("Dois destilados no mesmo copo não é drink, é desafio.");
      else if (a.flags.chique.length) f.push(`Ingrediente bom aparece: ${joinE(a.flags.chique.slice(0, 2))}.`);
      return f;
    },
    fim: ["Vou fingir que não provei.", "Tem ideia, falta execução.", "Correto. Falta alma, mas está correto.", "Eu serviria isso no meu restaurante."],
  },
  {
    nome: "Dona Cida do Podrão", desc: "a rainha do lanche de madrugada depois do rolê",
    nota: (a) => a.nota + a.flags.raiz * 0.35 + (a.flags.crocante ? 0.3 : 0) + a.flags.gordo * 0.25 - a.flags.chique.length * 0.25 - (a.flags.fresco >= 3 ? 0.3 : 0),
    fala(a) {
      const f = [];
      if (a.faltaCat.length) f.push(`Cadê ${joinE(a.faltaCat.map(low))}, meu filho? Assim não dá.`);
      else if (a.vagas >= 2) f.push("Veio pouca coisa. Eu pago pelo lanche inteiro, não pela metade.");
      if (a.brigas.length) f.push(`Olha, eu como de tudo, mas ${a.brigas[0].frase} até eu passo.`);
      else if (a.combos.length) f.push(`${cap(a.combos[0].frase)}! Aí sim, isso é comida de verdade.`);
      if (a.flags.gordo >= 2 || a.flags.crocante) f.push(pick(["Crocante, gorduroso, do jeito que Deus fez.", "Isso aqui tem cara de madrugada depois do rolê, e eu digo isso como elogio."]));
      else if (a.flags.chique.length) f.push(`${cap(a.flags.chique[0])}? Muita frescura pro meu gosto.`);
      else if (a.flags.fresco >= 3) f.push("Tem mais mato que comida aqui.");
      return f;
    },
    fim: ["Isso aí nem o cachorro da rua.", "Dá pra comer, mas eu ia pedir um refri junto.", "Comia e ainda lambia o dedo.", "Pedia de novo agora."],
  },
  {
    nome: "Lulu Filtro", desc: "influenciadora que prova com os olhos antes da boca",
    nota: (a) => a.nota + a.flags.ousado.length * 0.35 + (a.flags.fresco ? 0.3 : 0) - (a.flags.raiz >= 3 && !a.flags.ousado.length ? 0.4 : 0),
    fala(a, n) {
      const f = [];
      if (a.vagas >= 2) f.push("Prato vazio fica feio na foto. Faltou recheio.");
      if (a.flags.ousado.length) f.push(`${cap(a.flags.ousado[0])} é ousado, e ousadia dá engajamento.`);
      else if (a.flags.raiz >= 3) f.push(n >= 8 ? "É raiz, mas raiz bem montado. Até o bege ficou bonito." : "É gostoso, mas é bege. Comida bege não viraliza.");
      if (a.combos.length && !a.brigas.length) f.push(`Amei a ideia: ${a.combos[a.combos.length - 1].frase}. Muito em alta.`);
      else if (a.flags.fresco) f.push("As cores ficaram lindas, já postei nos stories.");
      else if (a.brigas.length) f.push(`${cap(a.brigas[0].frase)} foi uma escolha... corajosa.`);
      return f;
    },
    fim: ["Nem o filtro salva.", "Precisa de um ângulo melhor.", "Postaria, com filtro.", "Isso aqui é capa de revista."],
  },
];
const cap = (s) => (s ? s[0].toUpperCase() + s.slice(1) : s);
const faixa = (n) => (n < 5.5 ? 0 : n < 7 ? 1 : n < 8.5 ? 2 : 3);

function julgar(room) {
  const terms = room.config.terms || {}, skin = terms.skin;
  if (!NOTAS[skin]) throw new Error("Esse tema não tem batalha no site. Use o prompt da IA.");
  const caps = room.order.map((id) => ({ id, ...room.captains[id] })).filter((c) => c.team.length);
  if (caps.length < 2) throw new Error("Precisa de pelo menos 2 pratos para ter batalha.");
  const votes = (room.judge && room.judge.votes) || {};
  const nomeDe = (id) => room.captains[id].name, prato = (c) => c.teamName || `${terms.prefix || NOME[skin]} ${c.name}`; // o nome que a pessoa deu, se deu

  const pratos = caps.map((c) => {
    const a = analisar(skin, c.team, room.config.perTeam);
    const jurados = JURADOS.map((j) => {
      // o gosto pessoal do jurado mexe no máximo 1,5 para cima ou para baixo
      const n = Math.round(clamp(a.nota + clamp(j.nota(a) - a.nota, -1.5, 1.5) + (rnd() - 0.5) * 1.0, 0, 10) * 10) / 10;
      return { nome: j.nome, nota: n, falas: [...j.fala(a, n).slice(0, 2), j.fim[faixa(n)]] };
    });
    const juri = jurados.reduce((s, j) => s + j.nota, 0) / jurados.length;
    const recebidos = Object.entries(votes).filter(([v, m]) => v !== c.id && m[c.id] != null).map(([v, m]) => ({ de: v, nota: m[c.id] }));
    const galera = recebidos.length ? recebidos.reduce((s, v) => s + v.nota, 0) / recebidos.length : null;
    const final = galera == null ? juri : (juri + galera) / 2;
    return { c, a, jurados, juri, recebidos, galera, final };
  });

  const sections = [], E = EMOJI[skin], titulo = `${E} Batalha de ${NOME[skin]} da Galera`;
  // 1. apresentação
  sections.push([`# ${titulo}`, "", `A nota final é **metade júri, metade galera**. O júri de hoje:`, "",
    ...JURADOS.map((j) => `- **${j.nome}**, ${j.desc}`), "", `## ${E} Os pratos`, "",
    ...pratos.map((p) => `- **${prato(p.c)}**: ${p.a.ing.map((i) => i.name).join(", ")}`)].join("\n"));
  // 2. um prato por vez, só com o júri
  for (const p of pratos.slice().sort(() => rnd() - 0.5)) {
    const s = [`## 🔔 ${prato(p.c)}`, "", `*${p.a.ing.map((i) => i.name).join(" · ")}*`, ""];
    for (const j of p.jurados) s.push(`**${j.nome}: ${fmt(j.nota)}**`, "", ...j.falas.map((l) => `> ${l}`), "");
    if (p.a.combos.length) s.push(`✨ Combinação: ${joinE(p.a.combos.map((c) => c.frase))}.`);
    if (p.a.brigas.length) s.push(`💥 Briga no prato: ${joinE(p.a.brigas.map((c) => c.frase))}.`);
    s.push("", `**Nota do júri: ${fmt(p.juri)}**`);
    sections.push(s.join("\n"));
  }
  // 3. voto da galera
  const todos = pratos.flatMap((p) => p.recebidos.map((v) => ({ ...v, para: p.c.id })));
  const g = [`## 🗳️ O voto da galera`, "", "| Prato | Notas recebidas | Média |", "|---|---|---|"];
  for (const p of pratos) g.push(`| ${p.c.name} | ${p.recebidos.map((v) => `${nomeDe(v.de)} ${v.nota}`).join(", ") || "ninguém votou"} | ${p.galera == null ? "–" : fmt(p.galera)} |`);
  if (todos.length) {
    const min = todos.reduce((a, b) => (b.nota < a.nota ? b : a)), max = todos.reduce((a, b) => (b.nota > a.nota ? b : a));
    // só vira destaque se for voto de verdade para zoar (nota baixa) ou para agradar (nota alta)
    if (todos.length >= 3 && min.nota <= 5) g.push("", `😈 **Voto mais cruel:** ${nomeDe(min.de)} deu **${min.nota}** para ${nomeDe(min.para)}.`);
    if (todos.length >= 3 && max.nota >= 8 && max.nota !== min.nota) g.push("", `🥰 **Voto mais puxa-saco:** ${nomeDe(max.de)} deu **${max.nota}** para ${nomeDe(max.para)}.`);
    const semVoto = caps.filter((c) => !votes[c.id] || !Object.keys(votes[c.id]).length).map((c) => c.name);
    if (semVoto.length) g.push("", `🙈 Não votaram: ${joinE(semVoto)}. Prato sem nenhum voto fica só com a nota do júri.`);
  } else g.push("", "Ninguém votou, então vale só a nota do júri.");
  sections.push(g.join("\n"));
  // 4. placar, do último para o campeão
  const rank = pratos.slice().sort((x, y) => y.final - x.final || y.juri - x.juri || rnd() - 0.5);
  const linha = (p, i) => `| ${i + 1}º | ${p.c.name} | ${fmt(p.juri)} | ${p.galera == null ? "–" : fmt(p.galera)} | **${fmt(p.final)}** |`;
  const tabela = ["| | Prato | Júri | Galera | Final |", "|---|---|---|---|---|"];
  if (rank.length >= 3) {
    const baixo = rank.slice(2).reverse();
    sections.push([baixo.length > 1 ? `## 📉 Do último ao terceiro lugar` : `## 🥉 Terceiro lugar`, "", ...baixo.map((p) => `- **${rank.indexOf(p) + 1}º: ${prato(p.c)}**, nota final ${fmt(p.final)}`)].join("\n"));
  }
  sections.push([`## 🥈 Vice-campeão`, "", `**${prato(rank[1].c)}**, com nota final **${fmt(rank[1].final)}**. Faltou pouco${rank[0].final - rank[1].final < 0.3 ? ", muito pouco" : ""}.`].join("\n"));
  const campeao = rank[0], diff = campeao.final - rank[1].final;
  const grito = diff >= 1.5 ? pick(["AMASSEI!", "PASSEI O CARRO!", "MOLESTEI!"]) : diff < 0.3 ? "NA RAÇA!" : "É CAMPEÃO!";
  sections.push([`## 🏆 ${grito}`, "", `# ${E} ${prato(campeao.c)}`, "", `Nota final **${fmt(campeao.final)}** (júri ${fmt(campeao.juri)}, galera ${campeao.galera == null ? "–" : fmt(campeao.galera)}).`, "",
    `*${campeao.a.ing.map((i) => i.name).join(" · ")}*`, "", "### Placar final", "", ...tabela, ...rank.map(linha)].join("\n"));
  return { sections, summary: null };
}

module.exports = { julgar, analisar, NOTAS, COMBOS, JURADOS, SKINS: Object.keys(NOTAS) };
