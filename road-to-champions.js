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
function jogosDaRodada(s){return s.jogos.filter(j=>j.rodada===s.capitulo);}
function rivalDe(s,p) {
  const j=jogosDaRodada(s).find(j=>j.casa===p.clube || j.fora===p.clube);
  const id=j?(j.casa===p.clube?j.fora:j.casa):null;
  return s.jogadores.find(x=>x.clube===id) || s.jogadores.find(x=>x.id!==p.id) || null;
}
// o evento do capítulo deste protagonista (o exclusivo do arquétipo ou o geral) e as opções que ele vê
function eventoDe(s,p){
  const e=R.eventoPara(p,clamp(s.capitulo,0,4));
  return {e,opcoes:e?R.opcoesPara(p,e,ctxDe(s)):[],exclusivo:!!e&&(R.EXCLUSIVOS[p.arquetipo]||[]).includes(e)};
}
function cena(s,p) {
  const {e,opcoes,exclusivo}=eventoDe(s,p),r=rivalDe(s,p);
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
  if(!e || !Number.isInteger(opcao) || !opcoes[opcao]) throw new Error("Escolha narrativa inválida.");
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
  s.entradas.push(entrada);s.historico.push({tipo:"decisao",rodada:s.capitulo,autor:p.avatar,texto:item.texto,clube:p.clube});
  manchete(s,p,efeito.manchete);
  manchete(s,p,efeito.figura,"visual"); // a evolução visual fica no diário, para todos verem
  return entrada;
}
// o prelúdio (a cena dublada com escolha própria antes da entrevista): grava o estado narrativo e um efeito pequeno
function preludio(s,p,id,opcao){
  R.garantir(p);
  const x=R.preludioPara(p,s.capitulo);
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
function estrategia(s,clube){const p=s.jogadores.find(p=>p.clube===clube);return s.entradas.find(x=>x.rodada===s.capitulo && x.jogador===p?.id)?.tatica||"equilibrado";}
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
// `formas`: o ajuste de cada clube com protagonista nesta jornada (de -2 a +2, R.formaDe)
function jogar(s,j,formas={}){
  const a=MAP.get(j.casa),b=MAP.get(j.fora),mata=j.etapa!=="grupos";
  // o mesmo motor da Carreira: só o resultado (modo 1), com semente da campanha e do jogo; o mata-mata é jogo único,
  // então empate vai para a disputa de pênaltis do motor; a final é em campo neutro
  const r=Motor.simularPartida({casa:timeDoMotor(s,j.casa,formas[j.casa]||0),fora:timeDoMotor(s,j.fora,formas[j.fora]||0),
    semente:s.codigo+":"+j.id,modo:1,neutro:j.etapa==="final",...(mata?{desempate:{agregado:[0,0]}}:{})});
  const [casa,fora]=r.placar;
  const resultado={casa,fora,penaltis:null,vencedor:null};
  if(mata){
    if(r.penaltis){resultado.penaltis={casa:r.penaltis[0],fora:r.penaltis[1]};resultado.vencedor=r.penaltis[0]>r.penaltis[1]?j.casa:j.fora;}
    else resultado.vencedor=casa>fora?j.casa:j.fora;
  }
  j.resultado=resultado;
  // os lances ficam fora de s.jogos (o estado de todo mundo não carrega a narração): a página pede com `partida`
  (s.partidas||={})[j.id]={eventos:r.eventos,times:r.times.map(t=>({id:t.id,formacao:t.formacao,titulares:t.titulares})),
    estatisticas:r.estatisticas,nomes:nomesDaPartida(r,j.casa,j.fora)};
  s.resultados.push({id:j.id,rodada:j.rodada,etapa:j.etapa,casa:j.casa,fora:j.fora,...resultado});
  s.historico.push({tipo:"jogo",rodada:j.rodada,texto:a.nome+" "+casa+" × "+fora+" "+b.nome});
  const vencedor=resultado.vencedor||(casa===fora?null:casa>fora?j.casa:j.fora);
  for(const p of s.jogadores){
    if(p.clube!==j.casa && p.clube!==j.fora)continue;
    if(vencedor!==p.clube)continue;
    p.vitorias++;
    // a comemoração (só expressão, sem efeito) vira notícia nos jogos que todos acompanham: mata-mata e protagonista
    // contra protagonista
    const rival=s.jogadores.find(x=>x.clube===(p.clube===j.casa?j.fora:j.casa));
    const com=p.figura&&R.COMEMORACOES[p.figura.expressao.comemoracao];
    if(com&&(j.etapa!=="grupos"||rival)){
      const curto=MAP.get(p.clube)?.nome||"clube";
      s.historico.push({tipo:"comemoracao",rodada:j.rodada,autor:p.avatar,clube:p.clube,
        texto:"Vitória do "+curto+(rival?" sobre "+rival.avatar:"")+": "+p.avatar+" comemora "+com.frase+"."});
    }
  }
}
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
// antes dos jogos: o risco de lesão de cada protagonista e a forma dele na jornada
function formasDaJornada(s,opinioes){
  const formas={};
  for(const p of s.jogadores){
    R.garantir(p);
    const ent=opinioes.find(x=>x.jogador===p.id)||{}, jogo=jogoDe(s,p);
    if(!jogo){p.forma=null;continue;} // eliminado: a história segue, mas não há jogo
    const chave=s.codigo+":"+p.id+":"+s.capitulo;
    const lesionado=sorte("lesao:"+chave)<R.riscoDe(p,ent.risco);
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
function avancar(s) {
  if(s.fase!=="jogando")throw new Error("A campanha não está em andamento.");
  if(!s.jogadores.every(p=>registrado(s,p.id)))throw new Error("Aguarde as decisões dos outros protagonistas.");
  const opinioes=s.entradas.filter(x=>x.rodada===s.capitulo);
  // o tom de cada escolha decide a repercussão (as entradas de campanhas antigas, sem tom, ainda usam o texto)
  const tomDe=x=>x.tom||(/elogio|apoio|grupo|Agradecer|conversar|distrações/i.test(x.escolha)?"respeito":
    /provoca|desafiar|melhor|Vazar|taça|Exigir/i.test(x.escolha)?"provoca":"neutro");
  const respeito=opinioes.filter(x=>tomDe(x)==="respeito").length;
  const provocacoes=opinioes.filter(x=>tomDe(x)==="provoca").length;
  if(s.jogadores.length>1){
    const noticia=respeito>provocacoes?"A imprensa destaca a união inesperada entre os protagonistas.":
      provocacoes>respeito?"As declarações dividem os protagonistas e alimentam novas rivalidades.":
      "Os protagonistas seguem divididos entre o respeito e a ambição.";
    s.historico.push({tipo:"repercussao",rodada:s.capitulo,texto:noticia});
  }
  const formas=formasDaJornada(s,opinioes);
  const jogos=jogosDaRodada(s);
  for(const j of jogos) jogar(s,j,formas);
  resolverApostas(s,opinioes);
  narrativaDaJornada(s);
  const n=s.capitulo;
  // a jornada ao vivo: a página de cada um assiste aos jogos no mesmo relógio (o mesmo minuto para a sala inteira)
  s.aoVivo={rodada:n,jogos:jogos.map(j=>j.id),inicio:Date.now()+ESPERA_MS,vel:VEL};
  if(n===2){
    const a=tabela(s,"A"),b=tabela(s,"B");
    s.jogos.push({id:"semi1",etapa:"semifinal",rodada:3,casa:a[0].clube,fora:b[1].clube,resultado:null},
      {id:"semi2",etapa:"semifinal",rodada:3,casa:b[0].clube,fora:a[1].clube,resultado:null});
  }
  if(n===3){
    const semis=s.jogos.filter(j=>j.etapa==="semifinal");
    s.jogos.push({id:"final",etapa:"final",rodada:4,casa:semis[0].resultado.vencedor,fora:semis[1].resultado.vencedor,resultado:null});
  }
  if(n===4){
    s.campeao=s.jogos.find(j=>j.etapa==="final").resultado.vencedor;
    s.epilogos=s.jogadores.map(p=>epilogo(s,p)); s.fase="fim";
  } else s.capitulo++;
}
function estado(s,p) {
  return {codigo:s.codigo,fase:s.fase,dono:s.dono,eu:p.id,capitulo:s.capitulo,limite:6,
    jogadores:s.jogadores.map(x=>({id:x.id,nome:x.nome,avatar:x.avatar,clube:x.clube,pos:x.pos,
      arquetipo:x.arquetipo||null,idade:x.idade||null,figura:x.figura||null,eixos:x.eixos||null,
      medidores:x.medidores||{},forma:x.forma||null,marcas:x.marcas||[],
      atributos:x.atributos,relacoes:x.relacoes,escolhas:x.escolhas,vitorias:x.vitorias})),
    lacos:s.lacos||[],
    equipes:s.equipes,jogos:s.jogos,grupos:s.fase==="lobby"?null:{A:tabela(s,"A"),B:tabela(s,"B")},
    evento:s.fase==="jogando"&&!registrado(s,p.id)?cena(s,p):null,
    feito:!!registrado(s,p.id),prontos:s.jogadores.filter(x=>registrado(s,x.id)).length,
    historico:s.historico.slice(-24).reverse(),campeao:s.campeao,epilogos:s.epilogos,
    aoVivo:s.aoVivo||null,agora:Date.now(),voz:vozDe(s,p)};
}
// a parte da dublagem que é só deste jogador: o estado narrativo, os callbacks dele e o prelúdio pendente
function vozDe(s,p){
  const x=s.fase==="jogando"&&p.arquetipo?R.preludioPara(p,s.capitulo):null,c=x&&cenaDeVoz("preludio",x.id);
  return {narrativa:p.narrativa||{},cenas:p.vozes||[],
    preludio:x&&c?{id:x.id,cena:c.id,titulo:x.titulo,texto:x.texto,
      opcoes:x.opcoes.map((o,i)=>({id:i,texto:o.texto,dica:o.dica,tom:o.tom,voz:o.voz||null}))}:null};
}
// os lances de um jogo já disputado (para assistir ao vivo ou rever): a narração, as escalações e os nomes
function partidaDe(s,id){
  const j=s.jogos.find(x=>x.id===id);
  if(!j||!j.resultado)throw new Error("Esse jogo ainda não aconteceu.");
  const p=s.partidas?.[id];
  if(!p)throw new Error("Esse jogo foi disputado antes da mesa ao vivo e só tem o placar.");
  return {id:j.id,etapa:j.etapa,rodada:j.rodada,casa:j.casa,fora:j.fora,resultado:j.resultado,...p};
}
function conectar(io){
  const nsp=io.of("/road-to-champions"), sessoes=new Map(), cache=new Map();
  const get=c=>{let s=cache.get(c);if(!s){s=recuperar(c);if(s){atualizarCampanha(s);cache.set(c,s);}}return s;};
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
      gruposIniciais(s);
    }));
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
      avancar(s);
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
  preludio,narrativaDaJornada,DUBLAGEM};
