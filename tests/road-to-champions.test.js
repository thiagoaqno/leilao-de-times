// Testes do Road to Champions: sala multiplayer, proteção por token, história e torneio.
process.env.DB_PATH=":memory:";
const test=require("node:test");
const assert=require("node:assert/strict");
const bd=require("../bd.js");
bd.abrir();
const rtc=require("../road-to-champions.js");
const {CLUBES}=rtc.paraTestes;
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
const d=(i,clube)=>({nome:"Amigo "+(i+1),avatar:"Craque "+(i+1),pos:"ATA",clube});
test("um jogador pode criar, e salas aceitam até seis clubes exclusivos",async()=>{
  const conectar=simularServidor(),jogadores=[conectar()];
  const primeiro=await jogadores[0].call("criar",d(0,CLUBES[0].id));
  assert.equal(primeiro.ok,true,primeiro.error);assert.equal(primeiro.codigo.length,5);
  assert.equal(primeiro.estado.jogadores.length,1);
  assert.equal((await jogadores[0].call("iniciar")).ok,true); // solo também é permitido
  assert.equal((await jogadores[0].call("entrar",{...d(1,CLUBES[1].id),codigo:primeiro.codigo})).ok,false);
});
test("seis protagonistas decidem; anfitrião avança cinco capítulos e finais individuais",async()=>{
  const conectar=simularServidor(),clients=[conectar()];
  const a=await clients[0].call("criar",d(0,CLUBES[0].id));assert.equal(a.ok,true,a.error);
  const keys=[a];
  for(let i=1;i<6;i++){
    const sk=conectar();clients.push(sk);
    const b=await sk.call("entrar",{...d(i,CLUBES[i].id),codigo:a.codigo});
    assert.equal(b.ok,true,b.error);keys.push(b);
  }
  const septimo=conectar();
  assert.equal((await septimo.call("entrar",{...d(6,CLUBES[6].id),codigo:a.codigo})).ok,false);
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
  const first=await a.call("criar",d(0,CLUBES[4].id));
  assert.equal((await b.call("entrar",{...d(1,CLUBES[5].id),codigo:first.codigo})).ok,true);
  assert.equal((await a.call("iniciar")).ok,true);
  const r=await a.call("decidir",{opcao:0,tatica:"equilibrado"});
  assert.equal(r.ok,true);
  const hero=r.estado.jogadores.find(x=>x.id===r.estado.eu);
  assert.equal(hero.atributos.respeito,66);
  assert.equal(hero.escolhas[0].texto,"Retribuir o elogio");
  assert.equal(r.estado.jogos.filter(j=>j.resultado).length,0);
  assert.equal((await b.call("decidir",{opcao:999,tatica:"equilibrado"})).ok,false);
});
