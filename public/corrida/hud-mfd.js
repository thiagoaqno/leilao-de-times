// Corrida da Galera — as contas do MFD (multi-function display) e do painel de F1 (mfd.js e hud-painel.js desenham). Só lógica pura,
// testável em node. Nada aqui inventa número: tudo sai do estado do carro (pneu, ERS, dano, box, voltas) e da torre.
(function (root) {

// As páginas do MFD, na ordem em que aparecem. `quando(ctx)` diz se a página tem dado nesta corrida: página sem dado não aparece.
const PAGINAS = [
  { id: "pneus", nome: "PNEUS", quando: (c) => !!c.pneu },
  { id: "box", nome: "BOX", quando: (c) => !!c.box }, // logo ao lado de Pneus: a parada nasce do desgaste
  { id: "danos", nome: "DANOS", quando: (c) => !!c.eu },
  { id: "ers", nome: "ERS", quando: (c) => !!c.ers },
  { id: "tempos", nome: "TEMPOS", quando: (c) => !!c.eu },
  { id: "classificacao", nome: "CLASSIF.", quando: (c) => !!c.compacta && c.total > 0 }, // com a torre completa na tela, ela já é a classificação
  { id: "ajustes", nome: "AJUSTES", quando: () => true },
];
const paginasDisponiveis = (ctx) => PAGINAS.filter((p) => p.quando(ctx)).map((p) => p.id);
const nomeDaPagina = (id) => (PAGINAS.find((p) => p.id === id) || PAGINAS[0]).nome;
// A página seguinte (d = 1) ou anterior (d = -1), dando a volta. Se a atual saiu da lista (sem dado), cai na primeira.
function vizinha(lista, atual, d) {
  if (!lista.length) return null;
  const i = lista.indexOf(atual);
  if (i < 0) return lista[0];
  return lista[(i + (d < 0 ? -1 : 1) + lista.length) % lista.length];
}

const limite = (v, a, b) => Math.max(a, Math.min(b, v));

// O V10 do jogo (motor-v10.js): o `rpm` do câmbio (0 a 1) vira o número que o som usa. Parado, a marcha lenta.
const RPM_LENTA = 4000, RPM_MIN = 6500, RPM_CORTE = 19000;
const rpmReal = (rpm01, kmh) => (kmh < 3 ? RPM_LENTA : Math.round(RPM_MIN + (RPM_CORTE - RPM_MIN) * limite(rpm01 || 0, 0, 1)));

// "1:23.456" (ou "—:--.---" sem tempo)
function tempoVolta(s) {
  if (s == null || !(s >= 0) || !isFinite(s)) return "—:--.---";
  const m = Math.floor(s / 60), r = s - m * 60;
  return `${m}:${r.toFixed(3).padStart(6, "0")}`;
}
// O relógio do HUD (tudo em segundos). A corrida conta desde a largada (`startAt`, hora do servidor), mesmo antes de cruzar a linha; a volta
// atual conta desde o começo da volta (`lapIni`; na volta 1 é a própria largada, como o servidor mede). Com a bandeirada para no tempo final.
// Antes de existir o jogador (assistindo) o relógio é o da corrida.
function relogioDaVolta({ now, startAt, lapIni, started, finish, last }) {
  const desde = (t0) => (t0 == null || !isFinite(t0) ? 0 : Math.max(0, (now - t0) / 1000));
  if (finish != null) return { corrida: finish, volta: last != null ? last : desde(lapIni), parado: true };
  const corrida = desde(startAt);
  return { corrida, volta: started && lapIni != null ? desde(lapIni) : corrida, parado: false };
}
// "12:34.5" (o tempo de corrida, com décimos)
function tempoCorrida(s) {
  if (s == null || !(s >= 0) || !isFinite(s)) return "0:00.0";
  const m = Math.floor(s / 60), r = s - m * 60;
  return `${m}:${r.toFixed(1).padStart(4, "0")}`;
}
// intervalo curto com sinal: "+1.4" / "-11.9" / "—" (sem valor)
function intervalo(s, sinal) {
  if (s == null || !(s >= 0) || !isFinite(s)) return "—";
  const t = s < 100 ? s.toFixed(1) : Math.round(s) + "";
  return `${sinal || ""}${t}`;
}

// Estado do pneu para o desenho: vida restante (1 novo, 0 no penhasco), a temperatura em texto e a cor do estado.
const TEMP_SAIDA = 0.6, TEMP_BOA = 0.75;
function estadoDoPneu(pneu, F) {
  const resta = F.vidaRestante(pneu), frio = pneu.temp < TEMP_BOA - 0.02, quente = pneu.temp > 1.02;
  const temp = frio ? "Frio" : quente ? "Quente" : "Ideal";
  const tempPct = limite((pneu.temp - TEMP_SAIDA) / (1 - TEMP_SAIDA), 0, 1);
  const nivel = pneu.desgaste > F.PENHASCO ? "fim" : resta < 0.25 ? "baixo" : resta < 0.5 ? "medio" : "bom";
  return { resta, vida: Math.round(resta * 100), desgaste: Math.round(pneu.desgaste * 100), temp, tempPct, nivel };
}

// Quantas voltas o pneu ainda aguenta até o penhasco. Com uma volta completa medida (`taxaMedida`, desgaste por volta do jogador,
// que já conta escorregão e trânsito) usa ela; senão, a nominal do composto (`PENHASCO / vida`, de f1-regras.js).
function voltasDePneu(pneu, F, { taxaMedida, fator } = {}) {
  const pn = F.PNEUS[pneu.composto] || F.PNEUS[F.COMPOSTO_PADRAO];
  const nominal = F.PENHASCO / F.vidaEmVoltas(pneu.composto, fator || 1); // desgaste por volta, no ritmo normal
  const taxa = taxaMedida > 0.001 ? taxaMedida : nominal;
  const resta = Math.max(0, F.PENHASCO - pneu.desgaste);
  return { taxa, medida: taxaMedida > 0.001, voltas: pn && taxa > 0 ? resta / taxa : 99 };
}

// A janela de box: da volta em que o pneu chegou a ~60% do caminho até o penhasco (daí já vale parar) até a volta do penhasco.
// `voltaAtual` é a volta que se corre (1 a N); nunca na última volta (passa pela chegada dentro do corredor). Devolve
// { abre, fecha, precisa, motivo }: `precisa` é false quando o pneu chega ao fim da corrida e já foram usados dois compostos.
function janelaDeBox({ voltaAtual, voltas, voltasDePneu: vp, compostosUsados, chuva }) {
  const ultima = voltas - 1; // a última volta em que dá para pedir a parada
  const fim = voltaAtual + Math.floor(vp), abre = voltaAtual + Math.floor(vp * 0.6);
  const obrigatoria = !chuva && compostosUsados < 2; // sem dois compostos secos leva penalidade proporcional no resultado
  if (fim >= voltas && !obrigatoria) return { precisa: false, motivo: "O pneu aguenta até o fim" };
  if (ultima < voltaAtual) return { precisa: false, motivo: "Última volta: sem box" };
  const a = Math.max(voltaAtual, Math.min(abre, ultima)), f = Math.max(a, Math.min(fim, ultima));
  return { precisa: true, abre: a, fecha: f, obrigatoria, motivo: obrigatoria && fim >= voltas ? "Falta usar um 2º composto" : "" };
}

// O tempo que uma parada custa (estimado): andar o corredor no limitador mais a parada normal, menos o que se levaria
// no mesmo trecho em ritmo de corrida (~80% da velocidade final). Em segundos.
function perdaNoBox({ comprimento, vmax, limitador, parada }) {
  if (!(comprimento > 0) || !(vmax > 0)) return null;
  return comprimento / (limitador * vmax) + parada - comprimento / (vmax * 0.8);
}
// Em que posição voltaria se parasse agora: quem está atrás e a menos de `perda` segundos passaria. `atras`: [{ seg }] (o atraso
// de cada carro que está atrás de mim, em segundos). Fora os que já saíram (dnf), que ninguém passa a conta.
function posicaoNoRetorno(minhaPos, atras, perda) {
  if (perda == null) return null;
  let n = 0;
  for (const a of atras) if (a.seg != null && a.seg < perda) n++;
  return minhaPos + n;
}

// A cor de um setor (S1/S2/S3): `t` o tempo, `melhor` o melhor setor do piloto (antes deste), `valido` (a volta de largada não vale).
function corDoSetor(t, melhor, valido) {
  if (!(t > 0)) return "off";
  if (!valido) return "neutro";
  if (!(melhor > 0) || t <= melhor + 1e-6) return "verde";
  return "amarelo";
}
// Em qual setor (0 a 2) o carro está, pelo checkpoint que acabou de passar (12 checkpoints, 4 por setor).
const setorAtual = (sector, total = 12) => Math.floor(limite(sector, 0, total - 1) / (total / 3)) % 3;

// A volta mais rápida da corrida: o id de quem tem o menor `best` (ou null)
function donoDaVoltaRapida(jogadores) {
  let m = null; for (const p of jogadores) if (p.best != null && (!m || p.best < m.best)) m = p;
  return m;
}

// Os intervalos para o carro da frente e o de trás, em segundos. `carros`: na ordem da corrida, [{ id, prog, v, dnf }];
// `esc` as unidades de pista por índice; a diferença é a distância dividida pela velocidade de quem vem atrás (o mesmo
// critério da torre): para o da frente, a minha velocidade; para o de trás, a dele.
function intervalos(carros, meuId, esc, vMin = 22, cron = null, agora = 0) {
  const i = carros.findIndex((c) => c.id === meuId); if (i < 0) return { frente: null, tras: null };
  const eu = carros[i], f = carros.slice(0, i).reverse().find((c) => !c.dnf), t = carros.slice(i + 1).find((c) => !c.dnf);
  const seg = (dist, v) => (v >= vMin ? Math.max(0, dist) * esc / v : null);
  // com a cronometragem (hud-torre.js) o intervalo é o tempo medido; sem histórico, a conta antiga (distância / velocidade)
  const medido = (idFrente, progTras) => (cron && Number.isFinite(progTras) && progTras > -1e8 ? cron.atraso(idFrente, progTras, agora) : null);
  const valido = (c) => Number.isFinite(c.prog) && c.prog > -1e8;
  return {
    frente: f && valido(f) ? { id: f.id, seg: medido(f.id, eu.prog) ?? seg(f.prog - eu.prog, eu.v) } : null,
    tras: t && valido(t) ? { id: t.id, seg: medido(eu.id, t.prog) ?? seg(eu.prog - t.prog, t.v) } : null,
  };
}

// O texto do modo do ERS sob a marcha: recarregando, desdobrando ou equilibrado.
function modoDoErs({ ativo, carga, subindo }) {
  if (ativo) return { id: "deploy", texto: "DEPLOY" };
  if (subindo) return { id: "harvest", texto: "HARVESTING" };
  return { id: "equilibrado", texto: carga <= 0.01 ? "BATERIA VAZIA" : "BALANCED" };
}

// Punição de stop-and-go (ou drive-through) lida do estado do jogador, se o servidor mandar. Aceita alguns nomes de campo para não
// depender de um só: `stopGo` / `stopAndGo` / `punicao` = { tipo?, voltas | restam | ate (volta limite), segundos? } ou um número de voltas.
// Devolve { tipo: "stopgo"|"drive", voltas: N, segundos } ou null.
function punicaoDoCarro(p, voltaAtual) {
  if (!p) return null;
  const bruto = p.stopGo ?? p.stopAndGo ?? p.punicao ?? p.punicaoBox ?? null;
  if (bruto == null || bruto === false) return null;
  const o = typeof bruto === "object" ? bruto : { voltas: bruto === true ? null : bruto };
  const tipo = /drive/i.test(String(o.tipo || "")) ? "drive" : "stopgo";
  let voltas = o.voltas ?? o.restam ?? (o.ate != null && voltaAtual != null ? o.ate - voltaAtual : null);
  if (voltas != null) voltas = Math.max(0, Math.round(voltas));
  return { tipo, voltas, segundos: o.segundos ?? o.s ?? (tipo === "stopgo" ? 10 : null) };
}
const textoDaPunicao = (pu) => !pu ? "" : `${pu.tipo === "drive" ? "Drive-through" : "Stop-and-go"}: cumpra ${pu.voltas == null ? "no box" : pu.voltas <= 0 ? "agora, no box" : pu.voltas === 1 ? "em 1 volta" : `em ${pu.voltas} voltas`}`;

const api = { relogioDaVolta, tempoCorrida, PAGINAS, paginasDisponiveis, nomeDaPagina, vizinha, rpmReal, tempoVolta, intervalo, estadoDoPneu, voltasDePneu, janelaDeBox, perdaNoBox, posicaoNoRetorno, corDoSetor, setorAtual, donoDaVoltaRapida, intervalos, modoDoErs, punicaoDoCarro, textoDaPunicao, RPM_LENTA, RPM_MIN, RPM_CORTE };
if (typeof module !== "undefined" && module.exports) module.exports = api;
else root.HudMfd = api;
})(typeof self !== "undefined" ? self : this);
