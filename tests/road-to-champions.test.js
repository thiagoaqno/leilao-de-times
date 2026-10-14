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
test("o protagonista vem do arquétipo: clube, posição, aparência limpa e sem repetir",async()=>{
  const conectar=simularServidor(),a=conectar(),b=conectar(),c=conectar();
  const r=await a.call("criar",{...d(0,"prodigio"),aparencia:{pele:9,cabelo:"moicano",numero:"23",altura:5,marca:false}});
  assert.equal(r.ok,true,r.error);
  const eu=r.estado.jogadores[0];
  assert.equal(eu.clube,"fc-barcelona");assert.equal(eu.pos,"PD");assert.equal(eu.idade,18);
  assert.deepEqual(eu.aparencia,{pele:5,cabelo:"cacheado",corCabelo:"preto",barba:"nenhuma",altura:1.1,largura:0.9,numero:23,marca:""});
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
  assert.equal(t.estado.jogadores[0].aparencia.marca,"oculos");
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
