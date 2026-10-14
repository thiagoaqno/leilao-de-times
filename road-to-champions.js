// Road to Champions — campanha narrativa online (1 a 6 protagonistas).
// A lógica esportiva é um torneio reduzido de 8 clubes: 2 grupos, semifinais e final.
// Os protagonistas são os seis arquétipos de public/jogador/road-regras.js, cada um preso ao seu clube.
// O Carreira tradicional e seus saves permanecem separados, mas os jogos passam pelo MESMO motor da Carreira
// (public/carreira/motor.js): os elencos da base, minuto a minuto, com semente. Os lances de cada jogo ficam em
// s.partidas[id] e a página assiste ao vivo (road-partida.js) num relógio único para a sala (s.aoVivo).
const crypto = require("node:crypto");
const bd = require("./bd.js");
const mundo = require("./public/carreira/base/mundo-2026.js");
const Motor = require("./public/carreira/motor.js");
const R = require("./public/jogador/road-regras.js"); // os protagonistas, o estilo de vida e os eventos
// a dublagem: as condições das falas (sem eval) e o manifesto das cenas. O servidor só decide QUAL cena e qual ramo
// cada um vê (o estado narrativo é dele); o áudio toca no navegador de cada um (public/jogador/road-dublagem.js).
const Voz = require("./public/jogador/road-voz.js");
// o formato da Champions (a fase de liga de 36 e o mata-mata de ida e volta) e o tempo de cada momento do jogo
const F = require("./public/jogador/road-formato.js");
const MOMENTO_MS = process.env.RTC_MOMENTO_MS != null ? Number(process.env.RTC_MOMENTO_MS) : 30000;
const DUBLAGEM = require("./public/jogador/dublagem/manifesto.json");
const cenaDeVoz = (tipo, id) => Object.values(DUBLAGEM.cenas).find(c => c.gatilho.tipo === tipo && (c.gatilho.id === id || c.gatilho.evento === id)) || null;
const EUROPA = new Set(["inglaterra-2026", "espanha-2026", "italia-2026", "alemanha-2026", "franca-2026"]);
const ligas = mundo.ligas.filter(l => EUROPA.has(l.id));
const BASE = new Map(); // o clube inteiro da base (elenco e formação), para o motor
const CLUBES = ligas.flatMap(l => require("./public/carreira/base/" + l.id + ".js").clubes.map(c => {
  BASE.set(c.id, c);
  const melhores = [...c.jogadores].sort((a,b) => b.nota-a.nota).slice(0,11);
  const forca = Math.round(melhores.reduce((s,j)=>s+j.nota,0)/Math.max(1,melhores.length));
  return { id:c.id, nome:c.nome, curto:c.curto, liga:l.nome, cores:c.cores, forca,
    escudo:c.escudo, formacao:c.formacao, estadio:c.estadio };
}));
const MAP = new Map(CLUBES.map(c => [c.id,c]));
const TATICAS = ["equilibrado", "pressionar", "recuar"];
// a estratégia do pré-jogo vira a tática do motor (mentalidade, pressão e altura da linha); o estilo o motor escolhe
// pelo elenco, como faz com os clubes do computador na Carreira
const TATICA_MOTOR = {
  equilibrado: { mentalidade: 0, pressao: 1, linha: 1 },
  pressionar: { mentalidade: 1, pressao: 2, linha: 2 },
  recuar: { mentalidade: -1, pressao: 0, linha: 0 },
};
// o relógio do jogo ao vivo: minutos de jogo por segundo (90 min ≈ 45 s) e a espera antes do apito
const VEL = Number(process.env.RTC_VEL) || 2;
const ESPERA_MS = process.env.RTC_ESPERA_MS != null ? Number(process.env.RTC_ESPERA_MS) : 4000;
const CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const hash = x => crypto.createHash("sha256").update(String(x)).digest("hex");
const clamp = (n,a,b) => Math.max(a,Math.min(b,n));
const nome = x => String(x||"").trim().replace(/\s+/g," ").slice(0,24);
const codigoLimpo = x => String(x||"").toUpperCase().replace(/[^A-Z0-9]/g,"");
const sorte = key => parseInt(hash(key).slice(0,13),16)/0x10000000000000;
const code = () => Array.from(crypto.randomBytes(5),n=>CHARS[n%CHARS.length]).join("");
const tokenNovo = () => crypto.randomBytes(24).toString("hex");
function salvar(s) {
  const db = bd.abrir(); const now = Date.now();
  db.prepare("INSERT INTO rtc_campanhas (codigo,dados,criada_em,atualizada_em) VALUES (?,?,?,?) ON CONFLICT(codigo) DO UPDATE SET dados=excluded.dados, atualizada_em=excluded.atualizada_em").run(s.codigo,JSON.stringify(s),s.criadaEm,now);
}
// a campanha salva num formato anterior (aparência num objeto só) passa para a figura em três partes
function atualizarCampanha(s){for(const p of s.jogadores||[])if(p.arquetipo)R.garantir(p);return s;}
function recuperar(codigo) {
  const row = bd.abrir().prepare("SELECT dados FROM rtc_campanhas WHERE codigo=?").get(codigo);
  if(!row) return null;
  try { return JSON.parse(row.dados); } catch { return null; }
}
// o protagonista vem do arquétipo: clube, posição, idade, atributos, estilo de vida e medidor. O jogador dá o nome e
// monta a figura (aparência, visual e expressão: só dados, sem efeito em campo; o desenho fica no navegador).
// `figura` também aceita o formato antigo, em que tudo vinha em `aparencia`.
const figuraDe=d=>d.figura||d.aparencia;
function doArquetipo(arquetipo,figura){
  const base=R.novoProtagonista(String(arquetipo||""),figura);
  if(!base) throw new Error("Escolha um dos seis protagonistas.");
  if(!MAP.has(base.clube)) throw new Error("O clube deste protagonista não está na base.");
  return base;
}
function participante(d) {
  const apelido=nome(d.nome), avatar=nome(d.avatar || d.nome);
  if(apelido.length<2 || avatar.length<2) throw new Error("Informe seu nome e o nome do protagonista.");
  return {id:crypto.randomUUID(),segredo:hash(d.token || tokenNovo()),nome:apelido,avatar,
    ...doArquetipo(d.arquetipo,figuraDe(d)),relacoes:{},escolhas:[],vitorias:0};
}
const ctxDe=s=>({tem:arq=>s.jogadores.some(x=>x.arquetipo===arq)});
// a criação dos personagens recebe o token gerado pelo servidor: ele não vai para os broadcasts.
function novoParticipante(d) {
  const segredo=tokenNovo();
  const p=participante({...d,token:segredo}); return {p,segredo};
}
function gruposIniciais(s) {
  const escolhidos=s.jogadores.map(p=>p.clube), usados=new Set(escolhidos);
  // Reserva dois (ou mais) clubes grandes para completar o universo da campanha.
  const extras=[...CLUBES].sort((a,b)=>b.forca-a.forca || a.id.localeCompare(b.id)).filter(c=>!usados.has(c.id));
  const todos=[...escolhidos]; for(const c of extras){if(todos.length===8) break; todos.push(c.id);}
  // Os times humanos se alternam entre os grupos; os bots completam a tabela.
  s.equipes=todos.map((id,i)=>({id,grupo:i%2===0?"A":"B",humano:escolhidos.includes(id)}));
  const pareamentos=[[0,3,1,2],[0,2,3,1],[0,1,2,3]];
  s.jogos=[];
  for(let r=0;r<3;r++)for(const g of ["A","B"]){
    const a=s.equipes.filter(t=>t.grupo===g), p=pareamentos[r];
    for(let i=0;i<4;i+=2) s.jogos.push({id:"g"+r+g+i,etapa:"grupos",rodada:r,casa:a[p[i]].id,fora:a[p[i+1]].id,resultado:null});
  }
  s.fase="jogando"; s.capitulo=0;
  lacosIniciais(s);
}
// o formato novo: os clubes dos protagonistas e os mais fortes da base completam os 36; os potes saem da força
// (do 1º ao 9º no pote 1...). A fase de liga inteira é sorteada agora, com a semente da campanha. Os momentos do jogo
// (as decisões no meio da partida) valem só neste formato.
function ligaInicial(s){
  const escolhidos=s.jogadores.map(p=>p.clube), usados=new Set(escolhidos);
  const extras=[...CLUBES].sort((a,b)=>b.forca-a.forca||a.id.localeCompare(b.id)).filter(c=>!usados.has(c.id));
  const todos=[...escolhidos];for(const c of extras){if(todos.length===F.CLUBES)break;todos.push(c.id);}
  todos.sort((a,b)=>MAP.get(b).forca-MAP.get(a).forca||a.localeCompare(b));
  const {jogos,pote}=F.faseDeLiga(todos,s.codigo);
  s.formato="liga";s.momentos=true;
  s.equipes=todos.map(id=>({id,pote:pote[id],humano:usados.has(id)}));
  s.jogos=jogos;s.fase="jogando";s.capitulo=0;s.taticas={};
  lacosIniciais(s);
}
function lacosIniciais(s){
  // os laços que já nascem prontos entre os arquétipos que estão na sala
  for(const p of s.jogadores) R.garantir(p);
  s.lacos=[];
  for(const l of R.LACOS){
    const a=s.jogadores.find(p=>p.arquetipo===l.a), b=s.jogadores.find(p=>p.arquetipo===l.b);
    if(!a||!b) continue;
    a.relacoes[b.id]=l.valor; b.relacoes[a.id]=l.valor;
    s.lacos.push({a:a.id,b:b.id,texto:l.texto});
  }
}
function tabela(s,grupo) {
  const rows=s.equipes.filter(t=>t.grupo===grupo).map(t=>({clube:t.id,p:0,j:0,v:0,e:0,d:0,gp:0,gc:0,sg:0}));
  const map=Object.fromEntries(rows.map(r=>[r.clube,r]));
  for(const j of s.jogos.filter(x=>x.etapa==="grupos" && x.resultado)){
    if(!map[j.casa] || !map[j.fora]) continue;
    const a=map[j.casa],b=map[j.fora],r=j.resultado;
    a.j++;b.j++;a.gp+=r.casa;a.gc+=r.fora;b.gp+=r.fora;b.gc+=r.casa;
    if(r.casa>r.fora){a.v++;b.d++;a.p+=3;} else if(r.casa<r.fora){b.v++;a.d++;b.p+=3;} else {a.e++;b.e++;a.p++;b.p++;}
  }
  for(const x of rows)x.sg=x.gp-x.gc;
  return rows.sort((a,b)=>b.p-a.p || b.sg-a.sg || b.gp-a.gp || MAP.get(b.clube).forca-MAP.get(a.clube).forca || a.clube.localeCompare(b.clube));
}
const ehLiga=s=>s.formato==="liga";
const forcaDe=id=>MAP.get(id)?.forca||0;
const tabelaLiga=s=>F.tabela(s.equipes.map(t=>t.id),s.jogos,forcaDe);
// a rodada é s.capitulo (o nome antigo ficou); o capítulo da história é outro número: no formato de grupos, o mesmo;
// na liga, só algumas rodadas têm entrevista (F.CAPITULOS). -1: rodada sem entrevista.
const capNarrativo=s=>ehLiga(s)?F.capituloDaRodada(s.capitulo):clamp(s.capitulo,0,4);
const ultimaRodada=s=>ehLiga(s)?F.RODADAS.length-1:4;
function jogosDaRodada(s){return s.jogos.filter(j=>j.rodada===s.capitulo);}
function rivalDe(s,p) {
  const j=jogosDaRodada(s).find(j=>j.casa===p.clube || j.fora===p.clube);
  const id=j?(j.casa===p.clube?j.fora:j.casa):null;
  return s.jogadores.find(x=>x.clube===id) || s.jogadores.find(x=>x.id!==p.id) || null;
}
// o evento do capítulo deste protagonista (o exclusivo do arquétipo ou o geral) e as opções que ele vê
function eventoDe(s,p){
  const cap=capNarrativo(s),e=cap<0?null:R.eventoPara(p,cap);
  return {e,opcoes:e?R.opcoesPara(p,e,ctxDe(s)):[],exclusivo:!!e&&(R.EXCLUSIVOS[p.arquetipo]||[]).includes(e)};
}
function cena(s,p) {
  const {e,opcoes,exclusivo}=eventoDe(s,p),r=rivalDe(s,p);
  if(!e)return null;
  const rel=r?(p.relacoes[r.id]||0):0;
  const anterior=r?.escolhas?.findLast(x=>x.capitulo<s.capitulo);
  const vinculo=!r?"":rel>=18?" Vocês construíram um vínculo de respeito.":rel<=-18?" Há uma tensão crescente entre vocês.":" A relação entre vocês segue indefinida.";
  const memoria=anterior?" A imprensa recorda a última declaração de "+r.avatar+": “"+anterior.texto+"”.":"";
  const repercussao=s.historico.filter(x=>x.tipo==="repercussao").at(-1);
  const eco=repercussao&&s.capitulo>0?" "+repercussao.texto:"";
  // no evento exclusivo a história é do protagonista; o rival só aparece no rodapé
  const texto=exclusivo?e.texto:e.texto+(r?" O nome de "+r.avatar+" surge novamente.":"")+memoria+vinculo+eco;
  return {id:e.id,titulo:e.titulo,texto,exclusivo,
    rival:r?{id:r.id,avatar:r.avatar}:null,
    opcoes:opcoes.map((x,i)=>({id:i,texto:x.texto,dica:x.dica,tom:x.tom,propria:!!x.para,voz:x.voz||null}))};
}
function registrado(s,id) {return s.entradas.find(x=>x.rodada===s.capitulo && x.jogador===id);}
function mudarRelacao(p,q,valor){
  if(!q||q.id===p.id||!valor) return;
  p.relacoes[q.id]=clamp((p.relacoes[q.id]||0)+valor,-100,100);
  // A opinião do protagonista é dele; o impacto público também atinge o outro lado.
  q.relacoes[p.id]=clamp((q.relacoes[p.id]||0)+Math.round(valor/2),-100,100);
}
const manchete=(s,p,texto,tipo="manchete")=>{if(texto)s.historico.push({tipo,rodada:s.capitulo,autor:p.avatar,clube:p.clube,texto:texto.replaceAll("{nome}",p.avatar)});};
function decidir(s,p,opcao,tatica) {
  R.garantir(p);
  const {e,opcoes}=eventoDe(s,p);
  if(!e) throw new Error("Não há entrevista nesta rodada.");
  if(!Number.isInteger(opcao) || !opcoes[opcao]) throw new Error("Escolha narrativa inválida.");
  if(registrado(s,p.id)) throw new Error("Você já decidiu neste capítulo.");
  if(!TATICAS.includes(tatica)) throw new Error("Escolha uma estratégia válida.");
  const rival=rivalDe(s,p),item=opcoes[opcao];
  const {ef,resultado}=R.resolverSorte(item.ef,sorte(s.codigo+":sorte:"+p.id+":"+s.capitulo));
  const efeito=R.aplicar(p,ef);
  mudarRelacao(p,rival,efeito.rel);
  for(const [arq,v] of Object.entries(efeito.relCom||{})) mudarRelacao(p,s.jogadores.find(x=>x.arquetipo===arq),v);
  p.escolhas.push({capitulo:s.capitulo,evento:e.titulo,eventoId:e.id,opcao,texto:item.texto,tom:item.tom,sorte:resultado,rival:rival?.id||null,
    ...(item.voz?{voz:item.voz}:{})});
  if(item.narrativa)R.gravarNarrativa(p,item.narrativa); // o que a escolha deixa para as cenas de depois
  const entrada={rodada:s.capitulo,jogador:p.id,avatar:p.avatar,clube:p.clube,tatica,escolha:item.texto,tom:item.tom,
    risco:efeito.risco,forma:efeito.forma,aposta:efeito.aposta,rival:rival?.id||null};
  s.entradas.push(entrada);s.historico.push({tipo:"decisao",rodada:s.capitulo,autor:p.avatar,texto:item.texto,clube:p.clube,evento:e.id,titulo:e.titulo});
  (s.taticas||={})[p.id]=tatica; // vale para as rodadas seguintes, até mudar
  manchete(s,p,efeito.manchete);
  manchete(s,p,efeito.figura,"visual"); // a evolução visual fica no diário, para todos verem
  return entrada;
}
// o prelúdio (a cena dublada com escolha própria antes da entrevista): grava o estado narrativo e um efeito pequeno
function preludio(s,p,id,opcao){
  R.garantir(p);
  const x=R.preludioPara(p,capNarrativo(s));
  if(!x||x.id!==id)throw new Error("Essa cena não está disponível agora.");
  const item=x.opcoes[opcao];
  if(!Number.isInteger(opcao)||!item)throw new Error("Escolha narrativa inválida.");
  const efeito=R.aplicar(p,item.ef);
  R.gravarNarrativa(p,item.narrativa);
  (p.preludios||=[]).push(x.id);
  s.historico.push({tipo:"decisao",rodada:s.capitulo,autor:p.avatar,clube:p.clube,texto:x.titulo+": "+item.texto});
  manchete(s,p,efeito.manchete);
  return {voz:item.voz||null};
}
// depois dos jogos: o resultado de cada protagonista fica no estado narrativo, e os callbacks que valem entram na fila
// de cenas dele (p.vozes). Cada callback toca uma vez, numa variante só; quem não joga não muda nada.
function narrativaDaJornada(s){
  for(const p of s.jogadores){
    const j=jogoDe(s,p);if(!j||!j.resultado)continue;
    const r=j.resultado,venc=r.vencedor||(r.casa===r.fora?null:r.casa>r.fora?j.casa:j.fora);
    R.gravarNarrativa(p,{resultado_ultimo_jogo:venc===p.clube?"vitoria":venc?"derrota":"empate"});
    for(const cb of R.CALLBACKS){
      if(cb.arquetipo!==p.arquetipo||(p.vozes||[]).some(v=>v.id===cb.id))continue;
      if(!p.escolhas.some(e=>e.eventoId===cb.depoisDe&&e.capitulo===s.capitulo))continue;
      if(!Voz.avaliar(cb.quando,p.narrativa))continue;
      const c=cenaDeVoz("callback",cb.id),ramo=c&&Voz.varianteDe(DUBLAGEM,c.id,p.narrativa);
      if(ramo)(p.vozes||=[]).push({id:cb.id,cena:c.id,ramo,rodada:s.capitulo});
    }
  }
}
function estrategia(s,clube){
  const p=s.jogadores.find(p=>p.clube===clube);
  return s.entradas.find(x=>x.rodada===s.capitulo && x.jogador===p?.id)?.tatica||(p&&s.taticas?.[p.id])||"equilibrado";
}
// a estratégia fora das rodadas de entrevista (o pré-jogo sozinho): vale desta rodada em diante
function mudarTatica(s,p,tatica){
  if(s.fase!=="jogando")throw new Error("A campanha não está em andamento.");
  if(s.jornada)throw new Error("A rodada já está em andamento.");
  if(!TATICAS.includes(tatica))throw new Error("Escolha uma estratégia válida.");
  (s.taticas||={})[p.id]=tatica;
}
// o time que o motor da Carreira recebe: o elenco da base, a formação do clube e a tática da estratégia escolhida.
// A forma do protagonista na jornada (de -2 a +2) vale na nota de todo o time, como a moral na Carreira.
function timeDoMotor(s,clube,forma=0){
  const c=BASE.get(clube),tatica=TATICA_MOTOR[estrategia(s,clube)]||TATICA_MOTOR.equilibrado;
  return {id:c.id,nome:c.nome,formacao:c.formacao,tatica:{...tatica,estilo:"auto"},
    jogadores:c.jogadores.map(j=>({...j,base:j.nota,nota:clamp(j.nota+forma,40,97)}))};
}
// os nomes de quem aparece na partida (titulares, quem entrou e quem está nos lances), para a narração e a mesa
function nomesDaPartida(r,casa,fora){
  const ids=new Set([...Object.values(r.jogaram||{}).flat(),...r.times.flatMap(t=>t.titulares)]);
  for(const e of r.eventos)for(const k of ["jogador","assist","goleiro","sai","entra","a","b"])if(e[k])ids.add(String(e[k]));
  const nomes={};
  for(const c of [BASE.get(casa),BASE.get(fora)])for(const j of c.jogadores)if(ids.has(String(j.id)))nomes[j.id]=j.nome;
  return nomes;
}
// os lados de um jogo que têm protagonista (0 casa, 1 fora)
function ladosHumanos(s,j){return [j.casa,j.fora].map((c,l)=>s.jogadores.some(p=>p.clube===c)?l:-1).filter(l=>l>=0);}
// o jogo de ida de uma volta (formato de liga) e os gols de cada lado dela, do ponto de vista da volta
function agregadoAntes(s,j){
  if(j.perna!==2)return null;
  const a=s.jogos.find(x=>x.chave===j.chave&&x.perna===1),r=a&&a.resultado;
  if(!r)return [0,0];
  return [a.casa===j.casa?r.casa:r.fora,a.casa===j.casa?r.fora:r.casa];
}
// `formas`: o ajuste de cada clube com protagonista nesta jornada (de -2 a +2, R.formaDe).
// Roda o jogo no motor da Carreira, do começo, com as decisões que já vieram (o motor é determinístico: a mesma
// semente e as mesmas decisões dão o mesmo jogo). Com os momentos ligados e um protagonista em campo, o motor para nos
// minutos marcados (R.MINUTOS_DE_MOMENTO e o intervalo) e devolve `parado`; sem resposta, o jogo espera ali.
function rodar(s,j,formas={},decisoes={}){
  const liga=ehLiga(s),lados=s.momentos?ladosHumanos(s,j):[];
  const mata=liga?(j.perna===2||j.etapa==="final"):j.etapa!=="grupos";
  const antes=liga?agregadoAntes(s,j):null;
  return Motor.simularPartida({casa:timeDoMotor(s,j.casa,formas[j.casa]||0),fora:timeDoMotor(s,j.fora,formas[j.fora]||0),
    semente:s.codigo+":"+j.id,neutro:j.etapa==="final",...(mata?{desempate:{agregado:antes||[0,0]}}:{}),
    ...(lados.length?{modo:2,controla:lados.length===2?2:lados[0],decisoes,
      paradas:{minutos:R.MINUTOS_DE_MOMENTO,intervalo:true,robo:true}}:{modo:1})});
}
// o jogo acabou: grava o resultado, os lances (com os momentos do protagonista no meio) e as notícias
function fecharJogo(s,j,r,momentos=[]){
  const a=MAP.get(j.casa),b=MAP.get(j.fora),liga=ehLiga(s);
  const [casa,fora]=r.placar;
  const resultado={casa,fora,penaltis:null,vencedor:null};
  if(r.penaltis)resultado.penaltis={casa:r.penaltis[0],fora:r.penaltis[1]};
  if(liga){
    // vencedor: de quem foi o jogo (nos pênaltis, de quem ganhou a disputa); classificado: quem passou no confronto
    resultado.vencedor=r.penaltis?(r.penaltis[0]>r.penaltis[1]?j.casa:j.fora):casa>fora?j.casa:fora>casa?j.fora:null;
    const antes=agregadoAntes(s,j);
    if(antes){
      const ag=[antes[0]+casa,antes[1]+fora];resultado.agregado={casa:ag[0],fora:ag[1]};
      resultado.classificado=r.penaltis?resultado.vencedor:ag[0]>ag[1]?j.casa:j.fora;
    }
    if(j.etapa==="final")resultado.classificado=resultado.vencedor;
  }else if(j.etapa!=="grupos"){
    if(r.penaltis)resultado.vencedor=r.penaltis[0]>r.penaltis[1]?j.casa:j.fora;
    else resultado.vencedor=casa>fora?j.casa:j.fora;
  }
  j.resultado=resultado;
  const humano=ladosHumanos(s,j).length>0;
  // os lances ficam fora de s.jogos (o estado de todo mundo não carrega a narração): a página pede com `partida`.
  // Na liga, só os jogos com protagonista e os do mata-mata (os outros 18 por rodada ficam só com o placar).
  if(!liga||humano||j.etapa!=="liga")guardarLances(s,j,r,momentos);
  s.resultados.push({id:j.id,rodada:j.rodada,etapa:j.etapa,casa:j.casa,fora:j.fora,...resultado});
  if(!liga||humano||j.etapa!=="liga")s.historico.push({tipo:"jogo",rodada:j.rodada,texto:a.nome+" "+casa+" × "+fora+" "+b.nome,casa:j.casa,fora:j.fora,placar:[casa,fora]});
  const vencedor=resultado.vencedor||(casa===fora?null:casa>fora?j.casa:j.fora);
  for(const p of s.jogadores){
    if(p.clube!==j.casa && p.clube!==j.fora)continue;
    // o post dos momentos: o que o protagonista fez em campo e como acabou
    const meus=momentos.filter(m=>m.jogador===p.id);
    if(meus.length){
      const meu=p.clube===j.casa?casa:fora,deles=p.clube===j.casa?fora:casa,rival=p.clube===j.casa?b:a;
      s.historico.push({tipo:"momento",rodada:j.rodada,autor:p.avatar,clube:p.clube,
        texto:meus.map((m,i)=>(m.id==="intervalo"?(i?"no intervalo":"No intervalo"):(i?"aos ":"Aos ")+m.min+"'")+", "+(i?"":p.avatar+" ")+R.MOMENTOS[m.opcao].frase).join("; ")+". "+
          (meu>deles?"Vitória":meu<deles?"Derrota":"Empate")+" por "+meu+" a "+deles+" contra o "+rival.nome+"."});
    }
    if(vencedor!==p.clube)continue;
    p.vitorias++;
    // a comemoração (só expressão, sem efeito) vira notícia nos jogos que todos acompanham: mata-mata e protagonista
    // contra protagonista
    const rival=s.jogadores.find(x=>x.clube===(p.clube===j.casa?j.fora:j.casa));
    const com=p.figura&&R.COMEMORACOES[p.figura.expressao.comemoracao];
    if(com&&(!["grupos","liga"].includes(j.etapa)||rival)){
      const curto=MAP.get(p.clube)?.nome||"clube";
      s.historico.push({tipo:"comemoracao",rodada:j.rodada,autor:p.avatar,clube:p.clube,
        texto:"Vitória do "+curto+(rival?" sobre "+rival.avatar:"")+": "+p.avatar+" comemora "+com.frase+"."});
    }
  }
}
// os lances do jogo (com os momentos do protagonista no meio), fora de s.jogos. `parcial`: o jogo parou num momento e
// os lances vão até ali; a versão (aoVivo.versoes) avisa a página de quem assiste que chegaram lances novos
function guardarLances(s,j,r,momentos=[],parcial=false){
  const eventos=[...r.eventos];
  for(const m of momentos){
    const k=eventos.findIndex(e=>e.min>m.min||(e.min===m.min&&e.tipo==="intervalo"&&m.id!=="intervalo"));
    eventos.splice(k<0?eventos.length:k,0,{min:m.min,tipo:"momento",lado:m.lado,texto:m.texto});
  }
  (s.partidas||={})[j.id]={eventos,times:r.times.map(t=>({id:t.id,formacao:t.formacao,titulares:t.titulares})),
    estatisticas:r.estatisticas,nomes:nomesDaPartida(r,j.casa,j.fora),...(parcial?{parcial:true}:{})};
  if(s.aoVivo&&s.aoVivo.rodada===j.rodada){const v=(s.aoVivo.versoes||={});v[j.id]=(v[j.id]||0)+1;}
}
// ---------- o relógio ao vivo da rodada ----------
// Todos assistem no mesmo relógio: minuto = base + (agora - desde) × vel. Quando o jogo de um protagonista para num
// momento (25', intervalo, 70'), o relógio da sala inteira para nesse minuto (o teto) até a decisão; ao soltar, a
// base passa a ser o minuto parado, e o tempo de espera não conta.
const tetoDe=s=>{const p=s.jornada?Object.values(s.jornada.pendentes):[];return p.length?Math.min(...p.map(x=>x.min)):null;};
function minutoAoVivo(s,agora=Date.now()){
  const av=s.aoVivo;if(!av||av.base==null)return null;
  const m=av.base+(agora-av.desde)/1000*av.vel,t=tetoDe(s);
  return t==null?m:Math.min(m,t);
}
// antes de mudar os momentos parados: guarda o minuto de agora como base (o relógio continua dali)
function rebasear(s,agora=Date.now()){
  const av=s.aoVivo;if(!av||av.base==null||agora<av.desde)return;
  av.base=minutoAoVivo(s,agora);av.desde=agora;
}
// o prazo de cada momento conta a partir de quando o relógio chega nele (não de quando o servidor simulou)
function ajustarPrazos(s,agora=Date.now()){
  const av=s.aoVivo;if(!s.jornada)return;
  for(const pend of Object.values(s.jornada.pendentes)){
    const chega=av&&av.base!=null?av.desde+Math.max(0,pend.min-av.base)/av.vel*1000:agora;
    pend.prazo=Math.max(chega,agora)+MOMENTO_MS;
  }
}
// sem momentos (campanhas antigas e jogos sem protagonista): roda e fecha de uma vez
function jogar(s,j,formas={}){const r=rodar(s,j,formas);fecharJogo(s,j,r);return r;}
function epilogo(s,p) {
  const a=p.atributos,campeao=s.campeao===p.clube,finalista=s.jogos.some(j=>j.etapa==="final" && (j.casa===p.clube||j.fora===p.clube));
  let titulo,descricao;
  if(a.respeito>=85 && campeao){titulo="A lenda respeitada";descricao="Você conquistou a Europa sem perder o respeito dos rivais.";}
  else if(campeao && a.ambicao>=80){titulo="O dono da Europa";descricao="A ambição conduziu sua história até a taça.";}
  else if(campeao){titulo="O campeão improvável";descricao="Seu clube venceu a Champions e escreveu uma história única.";}
  else if(finalista){titulo="O rei sem coroa";descricao="A taça escapou, mas sua caminhada até a final foi inesquecível.";}
  else if(a.respeito>=80){titulo="O campeão sem taça";descricao="O respeito dos adversários foi o legado maior.";}
  else if(a.ambicao>=85 && a.respeito<50){titulo="O vilão da Europa";descricao="Sua ambição produziu manchetes e adversários para a próxima temporada.";}
  else if(a.disciplina>=75){titulo="O profissional exemplar";descricao="Mesmo fora da final, sua postura virou referência.";}
  else {titulo="O próximo capítulo";descricao="A eliminação encerrou a competição, mas não sua história.";}
  const vinculos=Object.entries(p.relacoes||{}).map(([id,n])=>({p:s.jogadores.find(x=>x.id===id),n})).filter(x=>x.p);
  const amigo=vinculos.filter(x=>x.n>=30).sort((x,y)=>y.n-x.n)[0];
  const inimigo=vinculos.filter(x=>x.n<=-30).sort((x,y)=>x.n-y.n)[0];
  if(amigo && amigo.p.relacoes[p.id]>=20) descricao+=" "+amigo.p.avatar+" aparece no epílogo como um rival que se tornou aliado.";
  if(inimigo) descricao+=" Sua rivalidade com "+inimigo.p.avatar+" ainda é assunto na imprensa.";
  const extra=R.epilogoExtra(p,{campeao,finalista}); if(extra) descricao+=" "+extra;
  return {jogador:p.id,avatar:p.avatar,clube:p.clube,titulo,descricao,campeao};
}
const jogoDe=(s,p)=>jogosDaRodada(s).find(j=>j.casa===p.clube||j.fora===p.clube)||null;
// o clube não joga mais nesta Champions: ficou fora dos 24 da liga ou perdeu um mata-mata (no formato antigo, ficou
// fora das semifinais ou perdeu uma delas). O campeão nunca é eliminado.
function eliminado(s,clube){
  if(s.fase!=="jogando")return s.fase==="fim"&&s.campeao!==clube;
  const dele=j=>j.casa===clube||j.fora===clube;
  if(ehLiga(s)){
    if(s.classificacaoFinal&&s.classificacaoFinal.indexOf(clube)>=24)return true;
    return s.jogos.some(j=>dele(j)&&j.resultado&&(j.perna===2||j.etapa==="final")&&j.resultado.classificado&&j.resultado.classificado!==clube);
  }
  if(s.capitulo>=3&&!s.jogos.some(j=>j.etapa==="semifinal"&&dele(j)))return true;
  return s.jogos.some(j=>j.etapa!=="grupos"&&dele(j)&&j.resultado&&j.resultado.vencedor&&j.resultado.vencedor!==clube);
}
const todosEliminados=s=>s.fase==="jogando"&&s.jogadores.length>0&&s.jogadores.every(p=>eliminado(s,p.clube));
// ninguém da sala joga mais: as rodadas que faltam saem de uma vez (a última, a final, fica para assistir ao vivo)
function simularAteFim(s){
  if(s.fase!=="jogando")throw new Error("A campanha não está em andamento.");
  if(s.jornada)throw new Error("Espere a rodada em andamento acabar.");
  if(!todosEliminados(s))throw new Error("Ainda tem protagonista vivo na Champions.");
  for(let k=0;k<40&&s.fase==="jogando";k++){
    avancar(s);
    if(s.jornada)throw new Error("Uma rodada ficou esperando um momento de jogo.");
  }
}
// antes dos jogos: o risco de lesão de cada protagonista e a forma dele na jornada
function formasDaJornada(s,opinioes){
  const formas={};
  for(const p of s.jogadores){
    R.garantir(p);
    const ent=opinioes.find(x=>x.jogador===p.id)||{}, jogo=jogoDe(s,p);
    if(!jogo){p.forma=null;continue;} // eliminado: a história segue, mas não há jogo
    const chave=s.codigo+":"+p.id+":"+s.capitulo;
    // na liga são 17 rodadas: sem entrevista na rodada, o risco do jeito de viver pesa um terço
    const lesionado=sorte("lesao:"+chave)<R.riscoDe(p,ent.risco)*(capNarrativo(s)<0?1/3:1);
    if(lesionado){
      if(p.arquetipo==="imprevisivel") R.aplicar(p,{vidro:15});
      const noite=p.marcas.includes("balada")&&ent.risco>=0.3?" depois da noite agitada":"";
      manchete(s,p,"{nome} sente a coxa"+noite+" e entra longe da forma ideal pelo "+(MAP.get(p.clube)?.nome||"clube")+".");
    }
    const f=R.formaDe(p,{etapa:jogo.etapa,escolhida:ent.forma||0,lesionado,numero:sorte("caos:"+chave)});
    p.forma={...f,capitulo:s.capitulo,lesionado};
    formas[p.clube]=(formas[p.clube]||0)+f.valor;
  }
  return formas;
}
// depois dos jogos: a marra (quem prometeu e cumpriu, ou não)
function resolverApostas(s,opinioes){
  for(const ent of opinioes.filter(x=>x.aposta)){
    const p=s.jogadores.find(x=>x.id===ent.jogador), j=p&&jogoDe(s,p);
    if(!j||!j.resultado) continue;
    const r=j.resultado, venceu=(r.vencedor||(r.casa===r.fora?null:r.casa>r.fora?j.casa:j.fora))===p.clube;
    const ef=venceu?R.MARRA.cumpriu:R.MARRA.falhou;
    manchete(s,p,R.aplicar(p,ef).manchete);
  }
}
// o anfitrião joga a rodada: as formas, os jogos e, com os momentos, as paradas de quem está em campo. A rodada só fecha
// (concluirJornada) quando todos os jogos acabam; sem protagonista parado, fecha na hora, como antes.
function avancar(s) {
  if(s.fase!=="jogando")throw new Error("A campanha não está em andamento.");
  if(s.jornada)throw new Error("A rodada já está em andamento.");
  if(capNarrativo(s)>=0&&!s.jogadores.filter(p=>!eliminado(s,p.clube)).every(p=>registrado(s,p.id)))throw new Error("Aguarde as decisões dos outros protagonistas.");
  const opinioes=s.entradas.filter(x=>x.rodada===s.capitulo);
  // o tom de cada escolha decide a repercussão (as entradas de campanhas antigas, sem tom, ainda usam o texto)
  const tomDe=x=>x.tom||(/elogio|apoio|grupo|Agradecer|conversar|distrações/i.test(x.escolha)?"respeito":
    /provoca|desafiar|melhor|Vazar|taça|Exigir/i.test(x.escolha)?"provoca":"neutro");
  const respeito=opinioes.filter(x=>tomDe(x)==="respeito").length;
  const provocacoes=opinioes.filter(x=>tomDe(x)==="provoca").length;
  if(s.jogadores.length>1&&opinioes.length){
    const noticia=respeito>provocacoes?"A imprensa destaca a união inesperada entre os protagonistas.":
      provocacoes>respeito?"As declarações dividem os protagonistas e alimentam novas rivalidades.":
      "Os protagonistas seguem divididos entre o respeito e a ambição.";
    s.historico.push({tipo:"repercussao",rodada:s.capitulo,texto:noticia});
  }
  const formas=formasDaJornada(s,opinioes),agora=Date.now();
  s.jornada={rodada:s.capitulo,formas,decisoes:{},momentos:{},pendentes:{}};
  // a jornada ao vivo começa agora: a página de cada um assiste aos jogos no mesmo relógio e decide no minuto do
  // momento, com o jogo parado. Na liga, só os jogos que guardam os lances (os dos protagonistas e os do mata-mata).
  const vivos=jogosDaRodada(s).filter(j=>!ehLiga(s)||ladosHumanos(s,j).length||j.etapa!=="liga");
  s.aoVivo={rodada:s.capitulo,jogos:vivos.map(j=>j.id),inicio:agora+ESPERA_MS,vel:VEL,base:0,desde:agora+ESPERA_MS,versoes:{}};
  for(const j of jogosDaRodada(s))continuarJogo(s,j,agora);
  ajustarPrazos(s,agora);
  if(!Object.keys(s.jornada.pendentes).length)concluirJornada(s);
}
// roda o jogo com as decisões que já vieram: ou fecha, ou fica esperando o próximo momento
function continuarJogo(s,j,agora=Date.now()){
  const J=s.jornada,r=rodar(s,j,J.formas,J.decisoes[j.id]||{});
  if(!r.parado){delete J.pendentes[j.id];fecharJogo(s,j,r,J.momentos[j.id]||[]);return true;}
  const par=r.parado,lados=par.ambos?Object.keys(par.pedidos).map(Number):[par.lado];
  const taticas={};for(const l of lados)taticas[l]=(par.ambos?par.pedidos[l]:par).tatica;
  // o que já aconteceu no jogo até aqui (gols e expulsões), para quem decide
  const nomes=nomesDaPartida(r,j.casa,j.fora);
  const resumo=r.eventos.filter(e=>["gol","vermelho","penalti"].includes(e.tipo)&&(e.tipo!=="penalti"||!e.chute)).map(e=>({min:e.min,
    texto:(e.tipo==="gol"?"Gol do "+MAP.get(e.lado===0?j.casa:j.fora).nome:e.tipo==="vermelho"?"Expulso no "+MAP.get(e.lado===0?j.casa:j.fora).nome:"Pênalti para o "+MAP.get(e.lado===0?j.casa:j.fora).nome)+
      (nomes[e.jogador]?" · "+nomes[e.jogador]:"")}));
  J.pendentes[j.id]={jogo:j.id,id:par.id,min:par.min,placar:par.placar,lados,taticas,respostas:{},prazo:agora+MOMENTO_MS,resumo};
  guardarLances(s,j,r,J.momentos[j.id]||[],true); // quem assiste vê o jogo até aqui; o resto chega depois da decisão
  return false;
}
// a resposta de um protagonista no momento do jogo dele
function momento(s,p,opcao,agora=Date.now()){
  const J=s.jornada;
  if(!J)throw new Error("Nenhum jogo em andamento.");
  const pend=Object.values(J.pendentes).find(x=>{const j=s.jogos.find(y=>y.id===x.jogo);return j&&(j.casa===p.clube||j.fora===p.clube);});
  if(!pend)throw new Error("Seu jogo não está parado agora.");
  const j=s.jogos.find(y=>y.id===pend.jogo),lado=j.casa===p.clube?0:1;
  if(pend.respostas[lado]!=null)throw new Error("Você já decidiu neste momento.");
  const meu=pend.placar[lado],deles=pend.placar[1-lado];
  if(!R.opcoesDoMomento(meu,deles).some(o=>o.id===opcao))throw new Error("Escolha um jeito de jogar válido.");
  pend.respostas[lado]=opcao;
  responderSeCompleto(s,pend,agora);
}
// todos os lados responderam: a decisão vira tática no motor e o jogo segue (até o próximo momento ou o apito final)
function responderSeCompleto(s,pend,agora){
  if(!pend.lados.every(l=>pend.respostas[l]!=null))return false;
  const J=s.jornada,j=s.jogos.find(y=>y.id===pend.jogo);
  const d=(J.decisoes[j.id]||={}),log=(J.momentos[j.id]||=[]);
  const tat=l=>({tatica:R.taticaDoMomento(pend.taticas[l],pend.respostas[l])});
  d[pend.id]=pend.lados.length===2?{0:tat(0),1:tat(1)}:tat(pend.lados[0]);
  for(const l of pend.lados){
    const p=s.jogadores.find(x=>x.clube===(l===0?j.casa:j.fora));
    log.push({id:pend.id,min:pend.min,lado:l,jogador:p.id,opcao:pend.respostas[l],
      texto:p.avatar+" "+R.MOMENTOS[pend.respostas[l]].frase+"."});
  }
  rebasear(s,agora);
  continuarJogo(s,j,agora);
  ajustarPrazos(s,agora);
  if(!Object.keys(J.pendentes).length)concluirJornada(s);
  return true;
}
// quem não respondeu a tempo mantém o plano (para a sala não ficar esperando ninguém)
function expirarMomentos(s,agora=Date.now()){
  const J=s.jornada;if(!J)return false;
  let mudou=false;
  for(const pend of Object.values(J.pendentes)){
    if(pend.prazo>agora)continue;
    for(const l of pend.lados)if(pend.respostas[l]==null)pend.respostas[l]="manter";
    mudou=responderSeCompleto(s,pend,agora)||mudou;
    if(!s.jornada)break;
  }
  return mudou;
}
// todos os jogos da rodada acabaram: a marra, o estado narrativo, o jogo ao vivo para a sala e a próxima fase
function concluirJornada(s){
  const opinioes=s.entradas.filter(x=>x.rodada===s.capitulo);
  resolverApostas(s,opinioes);
  narrativaDaJornada(s);
  delete s.jornada;
  const n=s.capitulo,jogos=jogosDaRodada(s);
  // a jornada ao vivo: a página de cada um assiste aos jogos no mesmo relógio (o mesmo minuto para a sala inteira).
  // Na liga, só os jogos que têm os lances guardados (os dos protagonistas e os do mata-mata).
  // (campanha salva antes do relógio novo: o ao vivo nasce aqui, como antes)
  if(!s.aoVivo||s.aoVivo.rodada!==n){
    const vivos=ehLiga(s)?jogos.filter(j=>s.partidas?.[j.id]):jogos;
    s.aoVivo={rodada:n,jogos:vivos.map(j=>j.id),inicio:Date.now()+ESPERA_MS,vel:VEL};
  }
  if(ehLiga(s))proximaFaseLiga(s,n);
  else{
    if(n===2){
      const a=tabela(s,"A"),b=tabela(s,"B");
      s.jogos.push({id:"semi1",etapa:"semifinal",rodada:3,casa:a[0].clube,fora:b[1].clube,resultado:null},
        {id:"semi2",etapa:"semifinal",rodada:3,casa:b[0].clube,fora:a[1].clube,resultado:null});
    }
    if(n===3){
      const semis=s.jogos.filter(j=>j.etapa==="semifinal");
      s.jogos.push({id:"final",etapa:"final",rodada:4,casa:semis[0].resultado.vencedor,fora:semis[1].resultado.vencedor,resultado:null});
    }
  }
  if(n===ultimaRodada(s)){
    s.campeao=s.jogos.find(j=>j.etapa==="final").resultado[ehLiga(s)?"classificado":"vencedor"];
    s.epilogos=s.jogadores.map(p=>epilogo(s,p)); s.fase="fim";
  } else s.capitulo++;
}
// o mata-mata da liga, montado quando a fase anterior termina
function proximaFaseLiga(s,n){
  const passou=chave=>s.jogos.find(j=>j.chave===chave&&j.perna===2)?.resultado?.classificado;
  const classif=tabelaLiga(s),pos=id=>classif.findIndex(x=>x.clube===id);
  if(n===F.RODADAS_LIGA-1){
    s.classificacaoFinal=classif.map(x=>x.clube);
    s.jogos.push(...F.playoff(classif));
  }
  if(n===9)s.jogos.push(...F.oitavas(classif,passou));
  if(n===11)s.jogos.push(...F.seguinte("quartas","qf",12,Array.from({length:8},(_,i)=>"oi"+i),passou,pos));
  if(n===13)s.jogos.push(...F.seguinte("semifinal","sf",14,["qf0","qf1","qf2","qf3"],passou,pos));
  if(n===15)s.jogos.push(...F.final(passou("sf0"),passou("sf1")));
}
function estado(s,p) {
  return {codigo:s.codigo,fase:s.fase,dono:s.dono,eu:p.id,capitulo:s.capitulo,limite:6,
    jogadores:s.jogadores.map(x=>({id:x.id,nome:x.nome,avatar:x.avatar,clube:x.clube,pos:x.pos,
      arquetipo:x.arquetipo||null,idade:x.idade||null,figura:x.figura||null,eixos:x.eixos||null,
      medidores:x.medidores||{},forma:x.forma||null,marcas:x.marcas||[],
      atributos:x.atributos,relacoes:x.relacoes,escolhas:x.escolhas,vitorias:x.vitorias})),
    lacos:s.lacos||[],
    equipes:s.equipes,jogos:s.jogos,formato:s.formato||"grupos",
    grupos:s.fase==="lobby"||ehLiga(s)?null:{A:tabela(s,"A"),B:tabela(s,"B")},
    liga:s.fase!=="lobby"&&ehLiga(s)?tabelaLiga(s):null,
    capNarrativo:s.fase==="lobby"?0:capNarrativo(s),entrevista:s.fase==="jogando"&&capNarrativo(s)>=0,
    tatica:s.taticas?.[p.id]||"equilibrado",jornada:jornadaDe(s,p),
    evento:s.fase==="jogando"&&!registrado(s,p.id)?cena(s,p):null,
    feito:!!registrado(s,p.id),prontos:s.jogadores.filter(x=>registrado(s,x.id)).length,
    eliminado:s.fase!=="lobby"&&eliminado(s,p.clube),todosEliminados:todosEliminados(s),
    historico:s.historico.slice(-160).reverse(),campeao:s.campeao,epilogos:s.epilogos,
    aoVivo:s.aoVivo?{...s.aoVivo,teto:tetoDe(s)}:null,agora:Date.now(),voz:vozDe(s,p)};
}
// a rodada em andamento (os momentos do jogo): para todos, quem a sala está esperando; para este jogador, o momento dele
function jornadaDe(s,p){
  const J=s.jornada;if(!J)return null;
  const pend=Object.values(J.pendentes);
  const esperando=pend.flatMap(x=>{const j=s.jogos.find(y=>y.id===x.jogo);
    return x.lados.filter(l=>x.respostas[l]==null).map(l=>s.jogadores.find(q=>q.clube===(l===0?j.casa:j.fora))?.avatar).filter(Boolean);});
  const meu=pend.find(x=>{const j=s.jogos.find(y=>y.id===x.jogo);return j.casa===p.clube||j.fora===p.clube;});
  let momento=null;
  if(meu){
    const j=s.jogos.find(y=>y.id===meu.jogo),lado=j.casa===p.clube?0:1;
    const outro=s.jogadores.find(q=>q.clube===(lado===0?j.fora:j.casa));
    momento={jogo:j.id,id:meu.id,min:meu.min,placar:meu.placar,casa:j.casa,fora:j.fora,lado,etapa:j.etapa,
      respondido:meu.respostas[lado]!=null,escolha:meu.respostas[lado]||null,prazo:meu.prazo,resumo:meu.resumo,
      rival:outro?{avatar:outro.avatar,respondido:meu.respostas[1-lado]!=null}:null,
      opcoes:R.opcoesDoMomento(meu.placar[lado],meu.placar[1-lado])};
  }
  return {rodada:J.rodada,esperando,momento,jogos:pend.length};
}
// a parte da dublagem que é só deste jogador: o estado narrativo, os callbacks dele e o prelúdio pendente
function vozDe(s,p){
  const x=s.fase==="jogando"&&p.arquetipo?R.preludioPara(p,capNarrativo(s)):null,c=x&&cenaDeVoz("preludio",x.id);
  return {narrativa:p.narrativa||{},cenas:p.vozes||[],
    preludio:x&&c?{id:x.id,cena:c.id,titulo:x.titulo,texto:x.texto,
      opcoes:x.opcoes.map((o,i)=>({id:i,texto:o.texto,dica:o.dica,tom:o.tom,voz:o.voz||null}))}:null};
}
// os lances de um jogo já disputado (para assistir ao vivo ou rever): a narração, as escalações e os nomes
function partidaDe(s,id){
  const j=s.jogos.find(x=>x.id===id);
  const p=s.partidas?.[id];
  if(!j||(!j.resultado&&!p?.parcial))throw new Error("Esse jogo ainda não aconteceu.");
  if(!p)throw new Error("Esse jogo foi disputado antes da mesa ao vivo e só tem o placar.");
  return {id:j.id,etapa:j.etapa,rodada:j.rodada,casa:j.casa,fora:j.fora,resultado:j.resultado||null,parcial:!!p.parcial,versao:s.aoVivo?.versoes?.[id]||0,...p};
}
function conectar(io){
  const nsp=io.of("/road-to-champions"), sessoes=new Map(), cache=new Map();
  const get=c=>{let s=cache.get(c);if(!s){s=recuperar(c);if(s){atualizarCampanha(s);cache.set(c,s);if(s.jornada)setImmediate(()=>agendar(s));}}return s;};
  const ok=(cb,data)=>typeof cb==="function"&&cb({ok:true,...data});
  const erro=(cb,e)=>typeof cb==="function"&&cb({ok:false,error:e instanceof Error?e.message:String(e)});
  function emitir(c){
    const s=get(c);if(!s)return;
    for(const [id,auth] of sessoes){
      if(auth.codigo!==c)continue;
      const sk=nsp.sockets.get(id),p=s.jogadores.find(x=>x.id===auth.pid);
      if(sk&&p)sk.emit("estado",estado(s,p));
    }
  }
  // o relógio dos momentos: quando o prazo do primeiro momento parado vence, quem não respondeu mantém o plano
  const relogios=new Map();
  function agendar(s){
    clearTimeout(relogios.get(s.codigo));relogios.delete(s.codigo);
    const prazos=s.jornada?Object.values(s.jornada.pendentes).map(x=>x.prazo):[];
    if(!prazos.length)return;
    relogios.set(s.codigo,setTimeout(()=>{
      relogios.delete(s.codigo);
      const atual=get(s.codigo);if(!atual)return;
      if(expirarMomentos(atual)){salvar(atual);emitir(atual.codigo);}
      agendar(atual);
    },Math.max(0,Math.min(...prazos)-Date.now())+50));
    relogios.get(s.codigo).unref?.(); // o relógio não segura o processo (testes, desligar o servidor)
  }
  nsp.on("connection",socket=>{
    socket.emit("catalogo",CLUBES);
    function autenticado(cb,fn) {
      const auth=sessoes.get(socket.id),s=auth&&get(auth.codigo),p=s&&s.jogadores.find(x=>x.id===auth.pid);
      if(!s||!p)return erro(cb,"Entre na campanha novamente.");
      try{const extra=fn(s,p)||{};salvar(s);emitir(s.codigo);ok(cb,{...extra,estado:estado(s,p)});}catch(e){erro(cb,e);}
    }
    function entrarNaSala(s,p,segredo,cb){
      sessoes.set(socket.id,{codigo:s.codigo,pid:p.id});
      socket.join("rtc-"+s.codigo);
      ok(cb,{codigo:s.codigo,token:segredo,estado:estado(s,p)});emitir(s.codigo);
    }
    socket.on("criar",(d={},cb)=>{
      try{
        const {p,segredo}=novoParticipante(d);
        let codigo=code();for(let i=0;i<24&&get(codigo);i++)codigo=code();
        if(get(codigo))throw Error("Não foi possível abrir a campanha.");
        const s={codigo,criadaEm:Date.now(),fase:"lobby",dono:p.id,jogadores:[p],equipes:[],jogos:[],capitulo:0,
          entradas:[],resultados:[],campeao:null,epilogos:[],historico:[]};
        cache.set(codigo,s);salvar(s);entrarNaSala(s,p,segredo,cb);
      }catch(e){erro(cb,e);}
    });
    socket.on("entrar",(d={},cb)=>{
      try{
        const codigo=codigoLimpo(d.codigo),s=get(codigo);
        if(!s)throw Error("Campanha não encontrada.");
        if(s.fase!=="lobby")throw Error("Campanha iniciada. Entre com seu token para retomar.");
        if(s.jogadores.length>=6)throw Error("Os seis lugares já foram preenchidos.");
        if(s.jogadores.some(p=>p.arquetipo===d.arquetipo))throw Error("Esse protagonista já foi escolhido por outra pessoa.");
        const {p,segredo}=novoParticipante(d);
        s.jogadores.push(p);salvar(s);entrarNaSala(s,p,segredo,cb);
      }catch(e){erro(cb,e);}
    });
    socket.on("retomar",(d={},cb)=>{
      const codigo=codigoLimpo(d.codigo),s=get(codigo),segredo=String(d.token||"");
      const p=s&&s.jogadores.find(x=>x.segredo===hash(segredo)&&segredo.length>=32);
      if(!p)return erro(cb,"Sessão não localizada neste código.");
      entrarNaSala(s,p,segredo,cb);
    });
    // quais protagonistas já têm dono numa sala (para a tela de entrada não oferecer os ocupados)
    socket.on("ocupados",(d={},cb)=>{
      const s=get(codigoLimpo(d.codigo));
      if(!s)return erro(cb,"Campanha não encontrada.");
      ok(cb,{fase:s.fase,ocupados:s.jogadores.map(p=>p.arquetipo).filter(Boolean)});
    });
    // trocar de protagonista (e, com ele, de clube) ou só ajustar a aparência, enquanto a sala espera
    socket.on("protagonista",(d={},cb)=>autenticado(cb,(s,p)=>{
      if(s.fase!=="lobby")throw Error("Campanha já começou.");
      const arq=d.arquetipo||p.arquetipo;
      if(s.jogadores.some(x=>x.id!==p.id&&x.arquetipo===arq))throw Error("Esse protagonista já foi escolhido por outra pessoa.");
      // mesmo protagonista: o que não veio fica como estava; outro protagonista: começa da figura sugerida dele
      const veio=figuraDe(d), mesmo=arq===p.arquetipo;
      const figura=mesmo?R.limparFigura(arq,veio||p.figura,p.figura):veio;
      Object.assign(p,doArquetipo(arq,figura));
      if(d.avatar){const a=nome(d.avatar);if(a.length>=2)p.avatar=a;}
    }));
    socket.on("iniciar",(_d={},cb)=>autenticado(cb,(s,p)=>{
      if(p.id!==s.dono)throw Error("Apenas o anfitrião inicia.");
      if(s.fase!=="lobby")throw Error("Campanha já iniciada.");
      ligaInicial(s);
    }));
    // a estratégia nas rodadas sem entrevista
    socket.on("tatica",(d={},cb)=>autenticado(cb,(s,p)=>mudarTatica(s,p,d.tatica)));
    // a decisão do protagonista no meio do jogo dele
    socket.on("momento",(d={},cb)=>autenticado(cb,(s,p)=>{momento(s,p,String(d.opcao||""));agendar(s);}));
    socket.on("decidir",(d={},cb)=>autenticado(cb,(s,p)=>{
      if(s.fase!=="jogando")throw Error("A campanha foi encerrada.");
      decidir(s,p,d.opcao,d.tatica);
    }));
    // a escolha do prelúdio dublado (só a do próprio jogador)
    socket.on("preludio",(d={},cb)=>autenticado(cb,(s,p)=>{
      if(s.fase!=="jogando")throw Error("A campanha não está em andamento.");
      return preludio(s,p,String(d.id||""),d.opcao);
    }));
    socket.on("avancar",(_d={},cb)=>autenticado(cb,(s,p)=>{
      if(p.id!==s.dono)throw Error("Apenas o anfitrião avança.");
      avancar(s);agendar(s);
    }));
    // todos eliminados: as rodadas que faltam de uma vez, até a final
    socket.on("simularFim",(_d={},cb)=>autenticado(cb,(s,p)=>{
      if(p.id!==s.dono)throw Error("Apenas o anfitrião avança.");
      simularAteFim(s);agendar(s);
    }));
    // só leitura: os lances de um jogo da campanha (não salva nem avisa ninguém)
    socket.on("partida",(d={},cb)=>{
      const auth=sessoes.get(socket.id),s=auth&&get(auth.codigo);
      if(!s)return erro(cb,"Entre na campanha novamente.");
      try{ok(cb,{partida:partidaDe(s,String(d.id||""))});}catch(e){erro(cb,e);}
    });
    socket.on("disconnect",()=>sessoes.delete(socket.id));
  });
  return {get,clubes:CLUBES};
}
module.exports=conectar;
module.exports.paraTestes={CLUBES,gruposIniciais,tabela,decidir,avancar,cena,estado,recuperar,atualizarCampanha,salvar,jogar,partidaDe,timeDoMotor,TATICA_MOTOR,
  preludio,narrativaDaJornada,DUBLAGEM,ligaInicial,tabelaLiga,momento,expirarMomentos,mudarTatica,capNarrativo,eliminado,todosEliminados,simularAteFim,minutoAoVivo,tetoDe};
