// Corrida da Galera — os avisos da corrida no estilo da transmissão da F1 (regras de F1). Só lógica pura, testável em node:
// o tipo de cada aviso (cor, rótulo, prioridade), como uma linha do log da direção de prova vira aviso e a fila (vários
// avisos sem um tapar o outro). hud.js desenha; o que muda no DOM só muda quando a fila muda (`versao`).
(function (root) {

// fundo: a cor da faixa · txt: a cor do texto · bloco: o quadrado do ícone · prio: quanto menor, mais urgente
// direcao: vem da direção de prova (cabeçalho "DIREÇÃO DE PROVA · RACE CONTROL"); senão o `rotulo` é o cabeçalho
const TIPOS = {
  vermelha:     { prio: 0, fundo: "#e10600", txt: "#ffffff", bloco: "#7a0300", icone: "bandeira", bandeira: "#ff4d44", direcao: true, rotulo: "BANDEIRA VERMELHA" },
  sc:           { prio: 1, fundo: "#ff8a00", txt: "#14110a", bloco: "#14110a", icone: "sc", direcao: true, rotulo: "SAFETY CAR" },
  amarela:      { prio: 2, fundo: "#ffd800", txt: "#14110a", bloco: "#14110a", icone: "bandeira", bandeira: "#ffd800", direcao: true, rotulo: "BANDEIRA AMARELA" },
  azul:         { prio: 3, fundo: "#0a57d8", txt: "#ffffff", bloco: "#04285f", icone: "bandeira", bandeira: "#4f9bff", direcao: true, rotulo: "BANDEIRA AZUL" },
  punicao:      { prio: 4, fundo: "#f2f2f5", txt: "#0a0c12", bloco: "#e10600", icone: "relogio", direcao: true, rotulo: "PUNIÇÃO" },
  investigacao: { prio: 4, fundo: "#f2f2f5", txt: "#0a0c12", bloco: "#0a0c12", icone: "lupa", direcao: true, rotulo: "INVESTIGAÇÃO" },
  limite:       { prio: 5, fundo: "#f2f2f5", txt: "#0a0c12", bloco: "#0a0c12", icone: "xadrez", direcao: true, rotulo: "LIMITES DA PISTA" },
  verde:        { prio: 5, fundo: "#00a859", txt: "#ffffff", bloco: "#005c31", icone: "bandeira", bandeira: "#2ee08a", direcao: true, rotulo: "BANDEIRA VERDE" },
  batida:       { prio: 5, fundo: "#f2f2f5", txt: "#0a0c12", bloco: "#e10600", icone: "alerta", rotulo: "INCIDENTE" },
  dnf:          { prio: 3, fundo: "#7a0b10", txt: "#ffffff", bloco: "#e10600", icone: "alerta", rotulo: "ABANDONO" },
  quebra:       { prio: 4, fundo: "#f2f2f5", txt: "#0a0c12", bloco: "#e10600", icone: "alerta", rotulo: "FALHA MECÂNICA" },
  box:          { prio: 6, fundo: "#0b8fd9", txt: "#ffffff", bloco: "#04446b", icone: "pit", rotulo: "BOX" },
  drs:          { prio: 7, fundo: "#19c37d", txt: "#04210f", bloco: "#04210f", icone: "drs", rotulo: "DRS HABILITADO" },
  vmr:          { prio: 6, fundo: "#7b2ff7", txt: "#ffffff", bloco: "#3c0f8a", icone: "losango", rotulo: "VOLTA MAIS RÁPIDA" },
  chegada:      { prio: 5, fundo: "#f2f2f5", txt: "#0a0c12", bloco: "#0a0c12", icone: "xadrez", rotulo: "BANDEIRADA" },
  largada:      { prio: 2, fundo: "#00a859", txt: "#ffffff", bloco: "#005c31", icone: "bandeira", bandeira: "#2ee08a", rotulo: "LARGADA" },
  alerta:       { prio: 7, fundo: "#1b1f2a", txt: "#ffffff", bloco: "#ffd23f", icone: "alerta", rotulo: "ATENÇÃO" },
  sistema:      { prio: 9, fundo: "#1b1f2a", txt: "#ffffff", bloco: "#3a3f4b", icone: "info", rotulo: "SISTEMA" },
};
const tipoDe = (t) => TIPOS[t] || TIPOS.sistema;

// tira os emojis e os símbolos das mensagens do servidor ("🟡 Bandeira amarela…" vira "Bandeira amarela…")
function limpar(texto) {
  return String(texto == null ? "" : texto).replace(/[\p{Extended_Pictographic}\u200d\ufe0f\u20e3]/gu, "").replace(/\s+/g, " ").replace(/^[\s:·\-–—]+/, "").trim();
}

// O tipo do aviso a partir do texto (o log da direção de prova, os avisos do HUD e os toasts). Primeiro o que é mais grave.
function tipoDoTexto(texto) {
  const t = String(texto || "").toLowerCase();
  if (/bandeira vermelha|corrida interrompida/.test(t)) return "vermelha";
  if (/safety car recolhido|relargada|pista liberada|bandeira verde/.test(t)) return "verde";
  if (/safety car|\bvsc\b|virtual/.test(t)) return "sc";
  if (/perda total|abandonou|\bdnf\b|está fora/.test(t)) return "dnf";
  if (/quebrou|falha mec|modo de emerg/.test(t)) return "quebra";
  if (/amarela|devolva a posi/.test(t)) return "amarela";
  if (/bandeira azul|deixe o líder|deixe passar|ignorou três bandeiras|\bazul\b/.test(t)) return "azul";
  if (/investig/.test(t)) return "investigacao";
  if (/limites? da pista|limite de pista|saídas de pista/.test(t)) return "limite";
  if (/\+\s?\d+(?:[.,]\d+)?\s?s\b|queimou|não devolveu|penaliza|punição|acréscimo/.test(t)) return "punicao";
  if (/batida|atingido|encolhido/.test(t)) return "batida";
  if (/volta mais r[aá]pida|recorde/.test(t)) return "vmr";
  if (/\bdrs\b/.test(t)) return "drs";
  if (/\bbox(es)?\b|\bpit\b/.test(t)) return "box";
  if (/bandeirada|cruzou a chegada|fim de corrida|venceu|chegada/.test(t)) return "chegada";
  if (/\blargada\b/.test(t)) return "largada";
  if (/pneu no fim|contramão|checkpoint|última volta|para cruzar/.test(t)) return "alerta";
  return "sistema";
}

// Uma linha do log do servidor vira { tipo, texto } ou null (ruído: os robôs, quem entra e sai, e o que é dos outros pilotos e
// só atrapalharia: as paradas, as batidas e os limites de pista deles). `nome`: o meu nome, para o que é só meu.
function deLinha(texto, nome) {
  const bruto = String(texto || ""), limpo = limpar(bruto);
  if (!limpo || /^🤖|^🏎️/.test(bruto) || /saiu da sala|Box aberto por|chegou ao box|aprenderam a volta|box da temporada|abriu o box|Classificação:/.test(bruto)) return null;
  const tipo = tipoDoTexto(bruto), meu = !!nome && bruto.includes(nome);
  if ((tipo === "box" || tipo === "limite" || tipo === "batida") && !meu) return null;
  if (tipo === "chegada" && /cruzou a chegada/.test(bruto)) return null; // a minha bandeirada vem do estado do meu carro
  return { tipo, texto: limpo };
}

// As linhas novas do log (as que o servidor acrescentou depois de `visto` e que ainda são recentes). Devolve { novos, visto }.
function novosDoLog(log, visto, agora, idade = 8000) {
  const ini = Number.isFinite(visto) ? visto : -Infinity, novos = []; let v = ini;
  for (const l of log || []) {
    if (!l || !Number.isFinite(l.t) || l.t <= ini) continue;
    v = Math.max(v, l.t);
    if (agora - l.t <= idade) novos.push(l);
  }
  return { novos, visto: v };
}

// A fila: no máximo `max` avisos na tela; os outros esperam (os mais urgentes passam na frente) até alguém sair. Um aviso com
// `chave` é um só (o texto novo troca o velho no lugar); `fixo` fica até `remover(chave)`. `versao` sobe a cada mudança.
function criarFila({ max = 3, espera = 8, ttl = 5200 } = {}) {
  const vis = [], fila = []; let seq = 0;
  const api = {
    versao: 0,
    empurrar(a, agora) {
      const tipo = TIPOS[a.tipo] ? a.tipo : "sistema", texto = String(a.texto || ""); if (!texto) return null;
      if (a.chave) {
        const i = vis.find((x) => x.chave === a.chave) || fila.find((x) => x.chave === a.chave);
        if (i) {
          if (i.texto !== texto || i.tipo !== tipo) { i.texto = texto; i.tipo = tipo; i.prio = tipoDe(tipo).prio; api.versao++; }
          return i;
        }
      } else if (vis.some((x) => x.tipo === tipo && x.texto === texto) || fila.some((x) => x.tipo === tipo && x.texto === texto)) return null;
      const it = { id: ++seq, chave: a.chave || null, tipo, texto, fixo: !!a.fixo, ttl: a.ttl ?? ttl, prio: tipoDe(tipo).prio, t0: 0, ate: Infinity };
      fila.push(it); fila.sort((x, y) => x.prio - y.prio || x.id - y.id);
      while (fila.length > espera) fila.pop(); // cheia: some o menos urgente e mais novo
      api.promover(agora); return it;
    },
    remover(chave, agora = Date.now()) {
      let i = vis.findIndex((x) => x.chave === chave);
      if (i >= 0) { vis.splice(i, 1); api.versao++; api.promover(agora); return true; }
      i = fila.findIndex((x) => x.chave === chave); if (i >= 0) { fila.splice(i, 1); return true; }
      return false;
    },
    promover(agora) {
      for (let i = vis.length - 1; i >= 0; i--) if (!vis[i].fixo && agora >= vis[i].ate) { vis.splice(i, 1); api.versao++; }
      while (vis.length < max && fila.length) { const it = fila.shift(); it.t0 = agora; it.ate = it.fixo ? Infinity : agora + it.ttl; vis.push(it); api.versao++; }
    },
    visiveis(agora) { api.promover(agora); return vis; },
    esperando: () => fila.length,
    limpar() { if (vis.length || fila.length) api.versao++; vis.length = fila.length = 0; },
  };
  return api;
}

// os ícones (SVG pequeno, 24x24) de cada faixa
const FONTE = "Titillium Web,Arial,sans-serif";
const ICONES = {
  bandeira: (c) => `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 2v21" stroke="#fff" stroke-width="2" fill="none"/><path d="M6 3h14l-3.5 5L20 13H6z" fill="${c || "#fff"}"/></svg>`,
  xadrez: () => `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 2v21" stroke="#fff" stroke-width="2" fill="none"/><path d="M6 3h14v10H6z" fill="#fff"/><path d="M6 3h3.5v3.3H6zM13 3h3.5v3.3H13zM9.5 6.3H13v3.4H9.5zM16.5 6.3H20v3.4h-3.5zM6 9.7h3.5V13H6zM13 9.7h3.5V13H13z" fill="#0a0c12"/></svg>`,
  sc: () => `<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="2" y="5" width="20" height="14" rx="2" fill="#ff8a00"/><text x="12" y="16" text-anchor="middle" font-family="${FONTE}" font-weight="900" font-size="11" fill="#14110a">SC</text></svg>`,
  relogio: () => `<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="13" r="8" fill="none" stroke="#fff" stroke-width="2"/><path d="M12 8v5l3 2M9 2h6" stroke="#fff" stroke-width="2" fill="none"/></svg>`,
  lupa: () => `<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="10" cy="10" r="6" fill="none" stroke="#fff" stroke-width="2.2"/><path d="M15 15l7 7" stroke="#fff" stroke-width="2.6"/></svg>`,
  alerta: () => `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2L23 21H1z" fill="#fff"/><path d="M12 9v6M12 17.5v1.5" stroke="#0a0c12" stroke-width="2.2"/></svg>`,
  pit: () => `<svg viewBox="0 0 24 24" aria-hidden="true"><text x="12" y="16" text-anchor="middle" font-family="${FONTE}" font-weight="900" font-size="10" fill="#fff">PIT</text></svg>`,
  drs: () => `<svg viewBox="0 0 24 24" aria-hidden="true"><text x="12" y="16" text-anchor="middle" font-family="${FONTE}" font-weight="900" font-size="10" fill="#19c37d">DRS</text></svg>`,
  losango: () => `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2l9 10-9 10-9-10z" fill="#c9a4ff"/></svg>`,
  info: () => `<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9" fill="none" stroke="#fff" stroke-width="2"/><path d="M12 11v6M12 7v1.5" stroke="#fff" stroke-width="2.2"/></svg>`,
};
const iconeDe = (tipo) => { const t = tipoDe(tipo); return (ICONES[t.icone] || ICONES.info)(t.bandeira); };

const api = { TIPOS, tipoDe, limpar, tipoDoTexto, deLinha, novosDoLog, criarFila, iconeDe };
if (typeof module !== "undefined" && module.exports) module.exports = api;
else root.AvisosF1 = api;
})(typeof self !== "undefined" ? self : this);
