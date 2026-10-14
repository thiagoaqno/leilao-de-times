// Road to Champions — campanha narrativa online (1 a 6 protagonistas).
// A lógica esportiva é um torneio reduzido de 8 clubes: 2 grupos, semifinais e final.
// O Carreira tradicional e seus saves permanecem separados.
const crypto = require("node:crypto");
const bd = require("./bd.js");
const mundo = require("./public/carreira/base/mundo-2026.js");
const EUROPA = new Set(["inglaterra-2026", "espanha-2026", "italia-2026", "alemanha-2026", "franca-2026"]);
const ligas = mundo.ligas.filter(l => EUROPA.has(l.id));
const CLUBES = ligas.flatMap(l => require("./public/carreira/base/" + l.id + ".js").clubes.map(c => {
  const melhores = [...c.jogadores].sort((a,b) => b.nota-a.nota).slice(0,11);
  const forca = Math.round(melhores.reduce((s,j)=>s+j.nota,0)/Math.max(1,melhores.length));
  return { id:c.id, nome:c.nome, curto:c.curto, liga:l.nome, cores:c.cores, forca,
    escudo:c.escudo };
}));
const MAP = new Map(CLUBES.map(c => [c.id,c]));
const TATICAS = ["equilibrado", "pressionar", "recuar"];
const POSICOES = ["GOL","ZAG","LD","LE","VOL","MC","MEI","PE","PD","ATA"];
const CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const hash = x => crypto.createHash("sha256").update(String(x)).digest("hex");
const clamp = (n,a,b) => Math.max(a,Math.min(b,n));
const nome = x => String(x||"").trim().replace(/\s+/g," ").slice(0,24);
const codigoLimpo = x => String(x||"").toUpperCase().replace(/[^A-Z0-9]/g,"");
const sorte = key => parseInt(hash(key).slice(0,13),16)/0x10000000000000;
const code = () => Array.from(crypto.randomBytes(5),n=>CHARS[n%CHARS.length]).join("");
const tokenNovo = () => crypto.randomBytes(24).toString("hex");
const eventos = [
  { titulo:"A resposta inesperada", texto:"Uma declaração provocativa sobre os protagonistas viraliza na imprensa. O jornalista pede sua reação.",
    opcoes:[["Retribuir o elogio","O respeito vem antes da rivalidade.",{respeito:16,prestigio:8,rel:16}],
            ["Responder com provocação","A guerra psicológica começa agora.",{ambicao:12,prestigio:5,rel:-20}],
            ["Não dar importância","Prefiro falar dentro de campo.",{disciplina:10,rel:0}]] },
  { titulo:"O convite nos bastidores", texto:"Depois da última rodada, o protagonista rival sugere uma conversa fora das câmeras.",
    opcoes:[["Aceitar e conversar","A rivalidade pode se transformar em amizade.",{respeito:12,rel:22}],
            ["Recusar educadamente","A disputa fica restrita ao gramado.",{disciplina:10,rel:0}],
            ["Vazar o convite","Uma manchete nasce de uma conversa privada.",{ambicao:12,prestigio:-8,rel:-24}]] },
  { titulo:"Uma promessa para a Europa", texto:"Um repórter pergunta até onde seu clube pode chegar nesta Champions.",
    opcoes:[["Prometer a taça","Uma promessa pública pode cobrar seu preço.",{ambicao:18,prestigio:5,rel:-4}],
            ["Priorizar o grupo","Ninguém levanta a taça sozinho.",{respeito:12,disciplina:7,rel:9}],
            ["Desafiar os rivais","O futebol europeu escuta seu recado.",{ambicao:11,prestigio:9,rel:-13}]] },
  { titulo:"O peso da semifinal", texto:"O acesso ao vestiário é disputado pela imprensa. Seus rivais aguardam sua palavra.",
    opcoes:[["Dar apoio aos eliminados","O respeito existe mesmo na derrota.",{respeito:18,rel:16}],
            ["Evitar distrações","O trabalho em campo continua.",{disciplina:14,rel:0}],
            ["Falar que será o melhor","Sua imagem fica ligada à vitória.",{ambicao:15,rel:-12}]] },
  { titulo:"O último capítulo", texto:"A final se aproxima. O mundo inteiro acompanha os seis protagonistas.",
    opcoes:[["Agradecer aos adversários","O legado está além da taça.",{respeito:20,prestigio:10,rel:15}],
            ["Assumir o protagonismo","Você deseja escrever a última manchete.",{ambicao:17,prestigio:6,rel:-5}],
            ["Exigir respeito","Cada palavra pode reacender uma antiga rivalidade.",{disciplina:8,ambicao:8,rel:-15}]] }
];
function salvar(s) {
  const db = bd.abrir(); const now = Date.now();
  db.prepare("INSERT INTO rtc_campanhas (codigo,dados,criada_em,atualizada_em) VALUES (?,?,?,?) ON CONFLICT(codigo) DO UPDATE SET dados=excluded.dados, atualizada_em=excluded.atualizada_em").run(s.codigo,JSON.stringify(s),s.criadaEm,now);
}
function recuperar(codigo) {
  const row = bd.abrir().prepare("SELECT dados FROM rtc_campanhas WHERE codigo=?").get(codigo);
  if(!row) return null;
  try { return JSON.parse(row.dados); } catch { return null; }
}
function participante(d) {
  const apelido=nome(d.nome), avatar=nome(d.avatar || d.nome), clube=String(d.clube||"");
  if(apelido.length<2 || avatar.length<2) throw new Error("Informe seu nome e o nome do protagonista.");
  if(!MAP.has(clube)) throw new Error("Escolha um clube europeu válido.");
  const pos=POSICOES.includes(d.pos) ? d.pos : "ATA";
  return {id:crypto.randomUUID(),segredo:hash(d.token || tokenNovo()),nome:apelido,avatar,clube,pos,
    atributos:{respeito:50,ambicao:50,disciplina:50,prestigio:50},relacoes:{},escolhas:[],vitorias:0};
}
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
function cena(s,p) {
  const e=eventos[clamp(s.capitulo,0,4)],r=rivalDe(s,p);
  const rel=r?(p.relacoes[r.id]||0):0;
  const anterior=r?.escolhas?.findLast(x=>x.capitulo<s.capitulo);
  const vinculo=!r?"":rel>=18?" Vocês construíram um vínculo de respeito.":rel<=-18?" Há uma tensão crescente entre vocês.":" A relação entre vocês segue indefinida.";
  const memoria=anterior?" A imprensa recorda a última declaração de "+r.avatar+": “"+anterior.texto+"”.":"";
  const repercussao=s.historico.filter(x=>x.tipo==="repercussao").at(-1);
  const eco=repercussao&&s.capitulo>0?" "+repercussao.texto:"";
  return {titulo:e.titulo,texto:e.texto+(r?" O nome de "+r.avatar+" surge novamente.":"")+memoria+vinculo+eco,
    rival:r?{id:r.id,avatar:r.avatar}:null,
    opcoes:e.opcoes.map((x,i)=>({id:i,texto:x[0],dica:x[1]}))};
}
function registrado(s,id) {return s.entradas.find(x=>x.rodada===s.capitulo && x.jogador===id);}
function decidir(s,p,opcao,tatica) {
  const e=eventos[s.capitulo];if(!e || !Number.isInteger(opcao) || !e.opcoes[opcao]) throw new Error("Escolha narrativa inválida.");
  if(registrado(s,p.id)) throw new Error("Você já decidiu neste capítulo.");
  if(!TATICAS.includes(tatica)) throw new Error("Escolha uma estratégia válida.");
  const rival=rivalDe(s,p),item=e.opcoes[opcao],delta=item[2];
  for(const [k,v] of Object.entries(delta))if(k!=="rel") p.atributos[k]=clamp(p.atributos[k]+v,0,100);
  if(rival && delta.rel){
    p.relacoes[rival.id]=clamp((p.relacoes[rival.id]||0)+delta.rel,-100,100);
    // A opinião do protagonista é dele; o impacto público também atinge o outro lado.
    rival.relacoes[p.id]=clamp((rival.relacoes[p.id]||0)+Math.round(delta.rel/2),-100,100);
  }
  p.escolhas.push({capitulo:s.capitulo,evento:e.titulo,opcao,texto:item[0],rival:rival?.id||null});
  const entrada={rodada:s.capitulo,jogador:p.id,avatar:p.avatar,clube:p.clube,tatica,escolha:item[0],rival:rival?.id||null};
  s.entradas.push(entrada);s.historico.push({tipo:"decisao",rodada:s.capitulo,autor:p.avatar,texto:item[0],clube:p.clube});
  return entrada;
}
function randGol(s,j,salt){return sorte(s.codigo+":"+j.id+":"+salt);}
function estrategia(s,clube){const p=s.jogadores.find(p=>p.clube===clube);return s.entradas.find(x=>x.rodada===s.capitulo && x.jogador===p?.id)?.tatica||"equilibrado";}
function jogar(s,j){
  const a=MAP.get(j.casa),b=MAP.get(j.fora),ta=estrategia(s,j.casa),tb=estrategia(s,j.fora);
  const vantagem={equilibrado:{equilibrado:0,pressionar:-1,recuar:1},
    pressionar:{equilibrado:1,pressionar:0,recuar:-1},recuar:{equilibrado:-1,pressionar:1,recuar:0}};
  const dif=clamp((a.forca-b.forca)/11 + vantagem[ta][tb]*0.3,-2,2);
  const casa=clamp(Math.round(1.25+dif*0.48+(randGol(s,j,"c")-.5)*3.5),0,5);
  const fora=clamp(Math.round(1.15-dif*0.48+(randGol(s,j,"f")-.5)*3.5),0,5);
  const resultado={casa,fora,penaltis:null,vencedor:null};
  if(j.etapa!=="grupos"){
    if(casa===fora){
      const pc=3+Math.floor(randGol(s,j,"pc")*3);
      const pf=pc+(randGol(s,j,"pf")>.5?1:-1);
      resultado.penaltis={casa:pc,fora:pf};resultado.vencedor=pc>pf?j.casa:j.fora;
    } else resultado.vencedor=casa>fora?j.casa:j.fora;
  }
  j.resultado=resultado;
  s.resultados.push({id:j.id,rodada:j.rodada,etapa:j.etapa,casa:j.casa,fora:j.fora,...resultado});
  s.historico.push({tipo:"jogo",rodada:j.rodada,texto:a.nome+" "+casa+" × "+fora+" "+b.nome});
  for(const p of s.jogadores){
    if(p.clube!==j.casa && p.clube!==j.fora)continue;
    if((resultado.vencedor|| (casa===fora?null:casa>fora?j.casa:j.fora))===p.clube)p.vitorias++;
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
  return {jogador:p.id,avatar:p.avatar,clube:p.clube,titulo,descricao,campeao};
}
function avancar(s) {
  if(s.fase!=="jogando")throw new Error("A campanha não está em andamento.");
  if(!s.jogadores.every(p=>registrado(s,p.id)))throw new Error("Aguarde as decisões dos outros protagonistas.");
  const opinioes=s.entradas.filter(x=>x.rodada===s.capitulo);
  const respeito=opinioes.filter(x=>/elogio|apoio|grupo|Agradecer|conversar|distrações/i.test(x.escolha)).length;
  const provocacoes=opinioes.filter(x=>/provoca|desafiar|melhor|Vazar|taça|Exigir/i.test(x.escolha)).length;
  if(s.jogadores.length>1){
    const noticia=respeito>provocacoes?"A imprensa destaca a união inesperada entre os protagonistas.":
      provocacoes>respeito?"As declarações dividem os protagonistas e alimentam novas rivalidades.":
      "Os protagonistas seguem divididos entre o respeito e a ambição.";
    s.historico.push({tipo:"repercussao",rodada:s.capitulo,texto:noticia});
  }
  for(const j of jogosDaRodada(s)) jogar(s,j);
  const n=s.capitulo;
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
      atributos:x.atributos,relacoes:x.relacoes,escolhas:x.escolhas,vitorias:x.vitorias})),
    equipes:s.equipes,jogos:s.jogos,grupos:s.fase==="lobby"?null:{A:tabela(s,"A"),B:tabela(s,"B")},
    evento:s.fase==="jogando"&&!registrado(s,p.id)?cena(s,p):null,
    feito:!!registrado(s,p.id),prontos:s.jogadores.filter(x=>registrado(s,x.id)).length,
    historico:s.historico.slice(-24).reverse(),campeao:s.campeao,epilogos:s.epilogos};
}
function conectar(io){
  const nsp=io.of("/road-to-champions"), sessoes=new Map(), cache=new Map();
  const get=c=>{let s=cache.get(c);if(!s){s=recuperar(c);if(s)cache.set(c,s);}return s;};
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
      try{const extra=fn(s,p)||{};salvar(s);emitir(s.codigo);ok(cb,extra);}catch(e){erro(cb,e);}
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
        if(s.jogadores.some(p=>p.clube===d.clube))throw Error("Esse clube já tem protagonista.");
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
    socket.on("clube",(d={},cb)=>autenticado(cb,(s,p)=>{
      if(s.fase!=="lobby")throw Error("Campanha já começou.");
      if(!MAP.has(d.clube))throw Error("Clube inválido.");
      if(s.jogadores.some(x=>x.id!==p.id&&x.clube===d.clube))throw Error("Clube já escolhido.");
      p.clube=d.clube;
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
    socket.on("avancar",(_d={},cb)=>autenticado(cb,(s,p)=>{
      if(p.id!==s.dono)throw Error("Apenas o anfitrião avança.");
      avancar(s);
    }));
    socket.on("disconnect",()=>sessoes.delete(socket.id));
  });
  return {get,clubes:CLUBES};
}
module.exports=conectar;
module.exports.paraTestes={CLUBES,gruposIniciais,tabela,decidir,avancar,cena,estado,recuperar};
