// Testes do Road to Champions: sala multiplayer, proteção por token, história e torneio.
process.env.DB_PATH=":memory:";
const test=require("node:test");
const assert=require("node:assert/strict");
const bd=require("../bd.js");
bd.abrir();
const rtc=require("../road-to-champions.js");
const {CLUBES}=rtc.paraTestes;
const R=require("../public/jogador/road-regras.js");
function simularServidor(){
  const sockets=new Map();
  const nsp={sockets,on(ev,fn){if(ev==="connection")this.conectar=fn;}};
  rtc({of(canal){assert.equal(canal,"/road-to-champions");return nsp;}});
  let count=0;
  return function conectar(){
    const handlers={},id="socket-"+(++count);
    const sk={id,on(ev,fn){handlers[ev]=fn;},emit(){},join(){}};
    sockets.set(id,sk);nsp.conectar(sk);
    return {call(ev,d={}){return new Promise(resolve=>handlers[ev](d,resolve));},sk};
  };
}
const d=(i,arquetipo)=>({nome:"Amigo "+(i+1),avatar:"Craque "+(i+1),arquetipo});
test("um jogador pode criar, e salas aceitam até seis clubes exclusivos",async()=>{
  const conectar=simularServidor(),jogadores=[conectar()];
  const primeiro=await jogadores[0].call("criar",d(0,R.IDS[0]));
  assert.equal(primeiro.ok,true,primeiro.error);assert.equal(primeiro.codigo.length,5);
  assert.equal(primeiro.estado.jogadores.length,1);
  assert.equal((await jogadores[0].call("iniciar")).ok,true); // solo também é permitido
  assert.equal((await jogadores[0].call("entrar",{...d(1,R.IDS[1]),codigo:primeiro.codigo})).ok,false);
});
test("seis protagonistas decidem; anfitrião avança cinco capítulos e finais individuais",async()=>{
  const conectar=simularServidor(),clients=[conectar()];
  const a=await clients[0].call("criar",d(0,R.IDS[0]));assert.equal(a.ok,true,a.error);
  const keys=[a];
  for(let i=1;i<6;i++){
    const sk=conectar();clients.push(sk);
    const b=await sk.call("entrar",{...d(i,R.IDS[i]),codigo:a.codigo});
    assert.equal(b.ok,true,b.error);keys.push(b);
  }
  const septimo=conectar();
  assert.equal((await septimo.call("entrar",{...d(6,R.IDS[0]),codigo:a.codigo})).ok,false);
  const invadido=conectar();
  assert.equal((await invadido.call("retomar",{codigo:a.codigo,token:"a".repeat(48)})).ok,false);
  assert.equal((await clients[1].call("iniciar")).ok,false);
  const inicio=await clients[0].call("iniciar");assert.equal(inicio.ok,true,inicio.error);
  assert.equal(inicio.estado.equipes.length,8);
  assert.equal(inicio.estado.jogos.length,12);
  assert.equal((await clients[0].call("avancar")).ok,false);
  for(let rodada=0;rodada<5;rodada++){
    for(let i=0;i<6;i++){
      const r=await clients[i].call("decidir",{opcao:i%3,tatica:["equilibrado","pressionar","recuar"][i%3]});
      assert.equal(r.ok,true,r.error);
      if(i===0)assert.equal((await clients[i].call("decidir",{opcao:2,tatica:"recuar"})).ok,false);
    }
    const r=await clients[0].call("avancar");assert.equal(r.ok,true,r.error);
    if(rodada<4)assert.equal(r.estado.capitulo,rodada+1);
    else{
      assert.equal(r.estado.fase,"fim");
      assert.equal(r.estado.epilogos.length,6);
      assert.ok(r.estado.campeao);
      assert.equal(r.estado.jogos.filter(j=>j.resultado!==null).length,15);
    }
  }
  const recon=conectar();
  const restored=await recon.call("retomar",{codigo:a.codigo,token:keys[0].token});
  assert.equal(restored.ok,true,restored.error);
  assert.equal(restored.estado.fase,"fim");
  assert.equal((await clients[0].call("avancar")).ok,false);
});
test("escolhas mexem em atributos e relacionamento sem alterar confrontos já resolvidos",async()=>{
  const conectar=simularServidor(),a=conectar(),b=conectar();
  const first=await a.call("criar",d(0,"enigma"));
  assert.equal((await b.call("entrar",{...d(1,"maquina"),codigo:first.codigo})).ok,true);
  assert.equal((await a.call("iniciar")).ok,true);
  const r=await a.call("decidir",{opcao:0,tatica:"equilibrado"});
  assert.equal(r.ok,true,r.error);
  const hero=r.estado.jogadores.find(x=>x.id===r.estado.eu);
  assert.equal(hero.atributos.respeito,R.PERSONAGENS.enigma.atributos.respeito+16);
  assert.equal(hero.escolhas[0].texto,"Retribuir o elogio");
  assert.equal(r.estado.jogos.filter(j=>j.resultado).length,0);
  assert.equal((await b.call("decidir",{opcao:999,tatica:"equilibrado"})).ok,false);
});
test("o protagonista vem do arquétipo: clube, posição, figura limpa e sem repetir",async()=>{
  const conectar=simularServidor(),a=conectar(),b=conectar(),c=conectar();
  const r=await a.call("criar",{...d(0,"prodigio"),figura:{
    aparencia:{pele:9,cabelo:"moicano",altura:5,rosto:"triangular"},
    visual:{numero:"23",acessorio:"nenhum",chuteiras:"roxas"},
    expressao:{comemoracao:"mortal",postura:"seca"}}});
  assert.equal(r.ok,true,r.error);
  const eu=r.estado.jogadores[0];
  assert.equal(eu.clube,"fc-barcelona");assert.equal(eu.pos,"PD");assert.equal(eu.idade,18);
  // o que vem errado fica com a sugestão do arquétipo; o acessório do personagem pode sair
  assert.deepEqual(eu.figura,{
    aparencia:{versao:1,pele:4,rosto:"fino",cabelo:"cacheado",corCabelo:"preto",barba:"nenhuma",altura:1.1,largura:0.9},
    visual:{numero:23,acessorio:"nenhum",chuteiras:"brancas"},
    expressao:{semblante:"sorriso",comemoracao:"joelhos",postura:"seca"}});
  assert.deepEqual(eu.eixos,R.PERSONAGENS.prodigio.eixos);
  assert.equal((await b.call("entrar",{...d(1,"prodigio"),codigo:r.codigo})).ok,false);
  assert.equal((await b.call("entrar",{...d(1,"nenhum"),codigo:r.codigo})).ok,false);
  assert.equal((await b.call("entrar",{...d(1,"romantico"),codigo:r.codigo})).ok,true);
  const ocup=await c.call("ocupados",{codigo:r.codigo});
  assert.deepEqual(ocup.ocupados.sort(),["prodigio","romantico"]);
  // trocar de protagonista no lobby troca o clube junto
  assert.equal((await a.call("protagonista",{arquetipo:"romantico"})).ok,false);
  const t=await a.call("protagonista",{arquetipo:"maquina"});
  assert.equal(t.ok,true,t.error);
  assert.equal(t.estado.jogadores[0].clube,"manchester-city");
  assert.equal(t.estado.jogadores[0].figura.visual.acessorio,"oculos");
  // ajustar só uma parte da figura no lobby mantém o resto
  const ajuste=await a.call("protagonista",{figura:{visual:{numero:99}}});
  assert.equal(ajuste.ok,true,ajuste.error);
  assert.equal(ajuste.estado.jogadores[0].figura.visual.numero,99);
  assert.equal(ajuste.estado.jogadores[0].figura.visual.acessorio,"oculos");
});
test("laços iniciais, evento exclusivo no capítulo 2 e opções próprias do arquétipo",async()=>{
  const conectar=simularServidor(),a=conectar(),b=conectar();
  const r=await a.call("criar",d(0,"prodigio"));
  const rb=await b.call("entrar",{...d(1,"romantico"),codigo:r.codigo});
  const ini=await a.call("iniciar");assert.equal(ini.ok,true,ini.error);
  const eu=ini.estado.jogadores.find(x=>x.id===ini.estado.eu);
  assert.equal(eu.relacoes[rb.estado.eu],30);
  assert.deepEqual(ini.estado.lacos.map(l=>l.texto),["Ídolo e herdeiro"]);
  // capítulo 1: geral, com a marra só para o Prodígio
  assert.ok(ini.estado.evento.opcoes.some(o=>o.propria&&/marra/i.test(o.texto)));
  assert.equal((await b.call("decidir",{opcao:0,tatica:"equilibrado"})).ok,true);
  await a.call("decidir",{opcao:0,tatica:"equilibrado"});
  const av=await a.call("avancar");assert.equal(av.ok,true,av.error);
  assert.equal(av.estado.evento.id,"bairro");assert.equal(av.estado.evento.exclusivo,true);
  const outro=await b.call("decidir",{opcao:0,tatica:"equilibrado"});
  assert.equal(outro.estado.jogadores.find(x=>x.id===outro.estado.eu).escolhas.at(-1).eventoId,"aniversario");
});
test("regras: eixos, enigma blindado, protocolo da Máquina, sorte e marra",()=>{
  const e=R.novoProtagonista("enigma");
  R.aplicar(e,{respeito:-10,exposicao:80,decifrado:12});
  assert.equal(e.atributos.respeito,45);assert.equal(e.eixos.exposicao,50);assert.equal(e.medidores.decifrado,12);
  const m=R.novoProtagonista("maquina");
  R.aplicar(m,{rotina:15});assert.equal(m.eixos.rotina,10);
  const bom=R.resolverSorte({sorte:{chance:0.5,bom:{prestigio:12},ruim:{respeito:-10}}},0.1);
  assert.equal(bom.resultado,"bom");assert.equal(bom.ef.prestigio,12);
  assert.equal(R.resolverSorte({sorte:{chance:0.5,bom:{},ruim:{respeito:-10}}},0.9).ef.respeito,-10);
  const pr=R.novoProtagonista("prodigio");
  R.aplicar(pr,R.MARRA.cumpriu);assert.equal(pr.medidores.marra,70);
});
test("regras: forma na jornada tem limite e segue cada arquétipo",()=>{
  const res=R.novoProtagonista("resiliente");
  assert.equal(R.formaDe(res,{etapa:"grupos"}).valor,0);
  res.medidores.tecnico=10;
  assert.equal(R.formaDe(res,{etapa:"grupos"}).valor,-1);
  res.medidores.tecnico=60;
  assert.equal(R.formaDe(res,{etapa:"final"}).valor,1);
  const maq=R.novoProtagonista("maquina");
  assert.equal(R.formaDe(maq,{etapa:"semifinal"}).valor,-1);
  maq.medidores.jogoGrande=55;
  assert.equal(R.formaDe(maq,{etapa:"final"}).valor,1);
  assert.equal(R.formaDe(maq,{etapa:"final",escolhida:2,lesionado:false}).valor,2);
  assert.equal(R.formaDe(res,{etapa:"grupos",lesionado:true,escolhida:-1}).valor,-2);
  const imp=R.novoProtagonista("imprevisivel");
  assert.equal(R.formaDe(imp,{etapa:"grupos",numero:0.9}).valor,1);
  imp.eixos.rotina=20;
  assert.equal(R.formaDe(imp,{etapa:"grupos",numero:0.9}).valor,0);
  assert.equal(R.riscoDe(R.novoProtagonista("maquina"),0.4),0.2);
});
test("todos os eventos têm tom válido e os seis têm dois exclusivos",()=>{
  for(const id of R.IDS){
    assert.equal(R.EXCLUSIVOS[id].length,2,id);
    assert.deepEqual(R.EXCLUSIVOS[id].map(e=>e.capitulo),[1,3]);
  }
  for(const e of [...R.GERAIS,...Object.values(R.EXCLUSIVOS).flat()])
    for(const o of e.opcoes) assert.ok(["respeito","provoca","neutro"].includes(o.tom),e.id+": "+o.texto);
  for(const id of R.IDS) assert.ok(CLUBES.some(c=>c.id===R.PERSONAGENS[id].clube),id);
});
test("campanha antiga, sem arquétipo, continua jogável",()=>{
  const {gruposIniciais,decidir,avancar,estado}=rtc.paraTestes;
  const velho={id:"v1",segredo:"x",nome:"Antigo",avatar:"Velho",clube:CLUBES[0].id,pos:"ATA",
    atributos:{respeito:50,ambicao:50,disciplina:50,prestigio:50},relacoes:{},escolhas:[],vitorias:0};
  const s={codigo:"ZZZZZ",criadaEm:0,fase:"lobby",dono:"v1",jogadores:[velho],equipes:[],jogos:[],capitulo:0,
    entradas:[],resultados:[],campeao:null,epilogos:[],historico:[]};
  gruposIniciais(s);
  for(let c=0;c<5;c++){
    assert.equal(estado(s,velho).evento.opcoes.length,3);
    decidir(s,velho,1,"equilibrado");avancar(s);
  }
  assert.equal(s.fase,"fim");assert.equal(velho.atributos.disciplina,81); // 0 + 10 + 7 + 14 + 0, as opções antigas
});

// ---------- a figura: aparência, visual e expressão ----------
const {gruposIniciais,decidir,avancar,cena,estado,atualizarCampanha,jogar}=rtc.paraTestes;
let n=0;
// uma campanha montada à mão com os protagonistas dados (arquétipo e figura)
function campanha(codigo,lista){
  const jogadores=lista.map(([arq,figura],i)=>({id:"p"+i,segredo:"x",nome:"Amigo "+i,avatar:"Craque "+i,
    ...R.novoProtagonista(arq,figura),relacoes:{},escolhas:[],vitorias:0}));
  const s={codigo,criadaEm:0,fase:"lobby",dono:"p0",jogadores,equipes:[],jogos:[],capitulo:0,
    entradas:[],resultados:[],campeao:null,epilogos:[],historico:[]};
  gruposIniciais(s);return s;
}
const textoOpcao=(s,p,re)=>cena(s,p).opcoes.find(o=>re.test(o.texto));
test("figura: a aparência não muda placar, forma, risco nem atributos",()=>{
  const outra={aparencia:{pele:1,rosto:"redondo",cabelo:"longo",corCabelo:"ruivo",barba:"cheia",altura:0.9,largura:1.1},
    visual:{numero:1,acessorio:"nenhum",chuteiras:"brancas"},expressao:{semblante:"serio",comemoracao:"discreta",postura:"humilde"}};
  const codigo="FIG"+(++n);
  const a=campanha(codigo,[["romantico"],["imprevisivel"],["maquina"]]);
  const b=campanha(codigo,[["romantico",outra],["imprevisivel",outra],["maquina",outra]]);
  for(let c=0;c<5;c++){
    for(const s of [a,b]){for(const p of s.jogadores)decidir(s,p,0,"equilibrado");avancar(s);}
  }
  assert.deepEqual(b.resultados,a.resultados);assert.equal(b.campeao,a.campeao);
  for(let i=0;i<3;i++){
    const pa=a.jogadores[i],pb=b.jogadores[i];
    for(const k of ["atributos","eixos","medidores","forma","vitorias"])assert.deepEqual(pb[k],pa[k],k);
  }
});
test("figura: persiste ao reconectar e ao recarregar a campanha do banco, e todos veem a mesma",async()=>{
  const conectar=simularServidor(),a=conectar(),b=conectar();
  const r=await a.call("criar",{...d(0,"enigma"),figura:{aparencia:{cabelo:"trancas"},expressao:{comemoracao:"bracos"}}});
  assert.equal(r.ok,true,r.error);
  const rb=await b.call("entrar",{...d(1,"resiliente"),codigo:r.codigo});assert.equal(rb.ok,true,rb.error);
  const minha=rb.estado.jogadores.find(x=>x.arquetipo==="enigma").figura;
  assert.equal(minha.aparencia.cabelo,"trancas");
  assert.deepEqual(minha,r.estado.jogadores[0].figura); // quem criou e quem entrou veem a mesma figura
  assert.equal((await a.call("iniciar")).ok,true);
  // outro servidor (cache vazio): a campanha vem do banco igual
  const outro=simularServidor()();
  const volta=await outro.call("retomar",{codigo:r.codigo,token:r.token});
  assert.equal(volta.ok,true,volta.error);
  assert.deepEqual(volta.estado.jogadores.find(x=>x.arquetipo==="enigma").figura,minha);
  assert.deepEqual(volta.estado.jogadores.find(x=>x.arquetipo==="resiliente").figura,
    rb.estado.jogadores.find(x=>x.arquetipo==="resiliente").figura);
});
test("figura: o formato antigo (tudo em `aparencia`) vira as três partes",async()=>{
  const conectar=simularServidor(),a=conectar();
  const r=await a.call("criar",{...d(0,"imprevisivel"),aparencia:{pele:2,cabelo:"black",numero:8,marca:false}});
  assert.equal(r.ok,true,r.error);
  const f=r.estado.jogadores[0].figura;
  assert.equal(f.aparencia.pele,2);assert.equal(f.aparencia.cabelo,"black");
  assert.equal(f.visual.numero,8);assert.equal(f.visual.chuteiras,"pretas"); // a marca desligada
  // uma campanha salva no formato antigo
  const p={id:"v",arquetipo:"resiliente",clube:"real-madrid",aparencia:{pele:5,cabelo:"trancas",corCabelo:"preto",barba:"nenhuma",
    altura:1,largura:0.95,numero:11,marca:"sorriso"},atributos:{respeito:1,ambicao:2,disciplina:3,prestigio:4}};
  atualizarCampanha({jogadores:[p]});
  assert.equal("aparencia" in p,false);
  assert.equal(p.figura.aparencia.versao,R.VERSAO_FIGURA);
  assert.equal(p.figura.visual.numero,11);assert.equal(p.figura.expressao.semblante,"sorriso");
  assert.deepEqual(p.atributos,{respeito:1,ambicao:2,disciplina:3,prestigio:4});
});
test("figura: escolhas mudam o visual e entram no diário de todos",()=>{
  const s=campanha("EVO"+(++n),[["prodigio"],["romantico"],["enigma"],["maquina",{visual:{acessorio:"nenhum"}}]]);
  const [pr,ro,en,ma]=s.jogadores;
  // capítulo 3 (índice 2): o Romântico pode ficar discreto; a Máquina sem óculos já não vê a opção dos óculos
  for(let c=0;c<2;c++){for(const p of s.jogadores)decidir(s,p,0,"equilibrado");avancar(s);}
  assert.equal(textoOpcao(s,ma,/óculos/),undefined);
  const disc=textoOpcao(s,ro,/sem a corrente/);assert.ok(disc);
  const antes={...ro.atributos};
  decidir(s,ro,disc.id,"equilibrado");
  assert.equal(ro.figura.visual.acessorio,"nenhum");assert.equal(ro.figura.aparencia.cabelo,"curto");
  assert.equal(ro.figura.aparencia.pele,R.PERSONAGENS.romantico.figura.aparencia.pele); // o resto fica
  for(const k of ["respeito","ambicao","prestigio"])assert.equal(ro.atributos[k],antes[k],k); // só a disciplina da opção
  const diario=estado(s,en).historico.find(x=>x.tipo==="visual");
  assert.ok(diario&&/sem a corrente/.test(diario.texto)&&diario.texto.includes(ro.avatar));
  for(const p of [pr,en,ma])decidir(s,p,0,"equilibrado");avancar(s);
  // capítulo 4 (índice 3): o Prodígio descolore o cabelo na faixa da semifinal
  const corte=textoOpcao(s,pr,/descolorir/);assert.ok(corte);
  decidir(s,pr,corte.id,"equilibrado");
  assert.equal(pr.figura.aparencia.corCabelo,"platinado");
  for(const p of [ro,en,ma])decidir(s,p,0,"equilibrado");avancar(s);
  assert.equal(textoOpcao(s,pr,/descolorir/),undefined);
  // capítulo 5: o Enigma promete comemorar de verdade
  const fest=textoOpcao(s,en,/comemorar de verdade/);assert.ok(fest);
  decidir(s,en,fest.id,"equilibrado");
  assert.equal(en.figura.expressao.comemoracao,"efusiva");
});
test("figura: a comemoração vira notícia na vitória de mata-mata",()=>{
  const s=campanha("COM"+(++n),[["romantico"],["maquina"]]);
  const [ro,ma]=s.jogadores;
  const j={id:"final",etapa:"final",rodada:4,casa:ro.clube,fora:ma.clube,resultado:null};
  jogar(s,j);
  const venceu=s.jogadores.find(p=>p.clube===j.resultado.vencedor),perdeu=s.jogadores.find(p=>p!==venceu);
  const nota=s.historico.find(x=>x.tipo==="comemoracao");
  assert.ok(nota,"sem notícia da comemoração");
  assert.equal(nota.autor,venceu.avatar);
  assert.ok(nota.texto.includes(R.COMEMORACOES[venceu.figura.expressao.comemoracao].frase));
  assert.ok(nota.texto.includes(perdeu.avatar));
});
test("figura: todas as opções que mudam a figura usam valores que existem",()=>{
  const listas={aparencia:{rosto:R.ROSTOS,cabelo:R.CABELOS,corCabelo:R.CORES_CABELO,barba:R.BARBAS},
    visual:{acessorio:R.ACESSORIOS,chuteiras:R.CHUTEIRAS},expressao:{semblante:R.SEMBLANTES,comemoracao:R.COMEMORACOES,postura:R.POSTURAS}};
  let total=0;
  for(const e of [...R.GERAIS,...Object.values(R.EXCLUSIVOS).flat()])for(const o of e.opcoes){
    const f=o.ef.figura;if(!f)continue;total++;
    assert.ok(f.texto,o.texto);
    for(const parte of ["aparencia","visual","expressao"])for(const [k,v] of Object.entries(f[parte]||{}))
      assert.ok(listas[parte][k]&&v in listas[parte][k],o.texto+": "+parte+"."+k+"="+v);
  }
  assert.equal(total,4);
  for(const id of R.IDS)assert.deepEqual(R.limparFigura(id,R.PERSONAGENS[id].figura),
    {...R.PERSONAGENS[id].figura,aparencia:{versao:R.VERSAO_FIGURA,...R.PERSONAGENS[id].figura.aparencia}},id);
});

// ---------- os jogos pelo motor da Carreira e a jornada ao vivo ----------
const Motor=require("../public/carreira/motor.js");
const {partidaDe,timeDoMotor,TATICA_MOTOR}=rtc.paraTestes;
test("motor: os jogos passam pelo motor da Carreira, com os lances guardados para assistir",async()=>{
  const conectar=simularServidor(),a=conectar(),b=conectar();
  const ca=await a.call("criar",d(0,"romantico"));await b.call("entrar",{...d(1,"prodigio"),codigo:ca.codigo});
  await a.call("iniciar");
  assert.equal((await a.call("partida",{id:"g0A0"})).ok,false,"o jogo ainda não aconteceu");
  await a.call("decidir",{opcao:0,tatica:"pressionar"});await b.call("decidir",{opcao:0,tatica:"recuar"});
  const r=await a.call("avancar");assert.equal(r.ok,true,r.error);
  // a jornada ao vivo: os quatro jogos da rodada, no mesmo relógio para a sala
  const av=r.estado.aoVivo;
  assert.equal(av.rodada,0);assert.deepEqual(av.jogos.sort(),r.estado.jogos.filter(j=>j.rodada===0).map(j=>j.id).sort());
  assert.ok(av.inicio>=r.estado.agora&&av.vel>0);
  // o estado de todo mundo não carrega a narração; quem quer assistir pede o jogo
  assert.ok(!JSON.stringify(r.estado.jogos).includes("eventos"));
  for(const id of av.jogos){
    const p=await b.call("partida",{id});assert.equal(p.ok,true,p.error);
    const fim=p.partida.eventos.find(e=>e.tipo==="fim");
    assert.deepEqual(fim.placar,[p.partida.resultado.casa,p.partida.resultado.fora],"o placar é o do último apito do motor");
    assert.equal(p.partida.eventos.filter(e=>e.tipo==="gol").length,p.partida.resultado.casa+p.partida.resultado.fora);
    assert.equal(p.partida.times.length,2);
    // quem terminou em campo (expulsos e machucados sem troca saem; a mesa desfaz as trocas para montar o começo)
    for(const t of p.partida.times)assert.ok(t.titulares.length>=7&&t.titulares.length<=11);
    for(const e of p.partida.eventos.filter(e=>e.jogador))assert.ok(p.partida.nomes[e.jogador],"todo lance tem o nome de quem fez");
  }
});
test("motor: a mesma campanha dá o mesmo jogo, e o mata-mata empatado vai para os pênaltis do motor",()=>{
  const s={codigo:"TESTE",entradas:[],jogadores:[],capitulo:3,historico:[],resultados:[],jogos:[]};
  const um=()=>{const j={id:"semi1",etapa:"semifinal",rodada:3,casa:"arsenal",fora:"manchester-city",resultado:null};const c={...s,historico:[],resultados:[],jogos:[j]};jogar(c,j);return {j,c};};
  const x=um(),y=um();
  assert.deepEqual(x.j.resultado,y.j.resultado);assert.deepEqual(x.c.partidas.semi1.eventos,y.c.partidas.semi1.eventos);
  // procura uma semente que empate: o vencedor sai da disputa, com os números do motor
  let achou=null;
  for(let k=0;k<60&&!achou;k++){
    const j={id:"semi"+k,etapa:"semifinal",rodada:3,casa:"arsenal",fora:"chelsea",resultado:null},c={...s,historico:[],resultados:[],jogos:[j]};
    jogar(c,j);if(j.resultado.casa===j.resultado.fora)achou={j,c};
  }
  assert.ok(achou,"em 60 jogos algum empata");
  const {j,c}=achou,pen=j.resultado.penaltis;
  assert.ok(pen&&pen.casa!==pen.fora);assert.equal(j.resultado.vencedor,pen.casa>pen.fora?j.casa:j.fora);
  assert.ok(c.partidas[j.id].eventos.some(e=>e.tipo==="disputa"));
  assert.deepEqual(partidaDe(c,j.id).resultado,j.resultado);
});
test("motor: a estratégia vira a tática do motor e a forma mexe na nota do time",()=>{
  const p={id:"p1",clube:"arsenal"},s={capitulo:0,jogadores:[p],entradas:[{rodada:0,jogador:"p1",tatica:"recuar"}]};
  const t=timeDoMotor(s,"arsenal",2),base=timeDoMotor(s,"arsenal",0);
  assert.deepEqual({...t.tatica,estilo:undefined},{...TATICA_MOTOR.recuar,estilo:undefined});
  assert.equal(t.tatica.estilo,"auto");
  t.jogadores.forEach((j,i)=>assert.equal(j.nota,Math.min(97,base.jogadores[i].nota+2)));
  // o computador (sem protagonista) joga equilibrado
  assert.deepEqual({...timeDoMotor(s,"chelsea").tatica,estilo:undefined},{...TATICA_MOTOR.equilibrado,estilo:undefined});
  // e o motor aceita o time como o da Carreira
  const r=Motor.simularPartida({casa:t,fora:timeDoMotor(s,"chelsea"),semente:"x"});
  assert.equal(r.completo,true);
});
