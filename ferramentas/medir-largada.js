"use strict";
const T=require("../public/corrida/pistas.js"), F=require("../public/corrida/f1-regras.js"), R=require("../corrida-robos.js"), D=require("../corrida-f1-direcao.js");
function medir({semente=951, pista="monaco", nivel="dificil", segundos=15}={}) {
  const antigo=Date.now, random=Math.random; let agora=1000000; Date.now=()=>agora; Math.random=F.sorteio("largada:"+semente);
  try {
    R.usarFonte(()=>[]);
    const room={config:{pista,regras:"f1",caixas:false,robos:22,nivel,voltas:2},players:{},order:[],phase:"race",startAt:agora,semente,finishOrder:[]};
    R.preparar(room,["#a","#b"],()=>"x");
    room.order.forEach((id,i)=>Object.assign(room.players[id],{grid:i,laps:0,sector:T.SECTORS-1,started:false,finish:null}));
    R.largar(room);D.iniciar(room);
    for(const id of room.order){const p=room.players[id];p.ia.plano=null;p.ia.pneu=F.pneuNovo("macio");p.ia.sim.pneu=p.ia.pneu;p.pneu=p.pneuAtual="macio";}
    let batidas=0;const emit=(e,d)=>{if(e==="batida"){batidas++;D.bater(room,room.players[d.id],d.forca,d.tipo,agora,()=>{},d.chave)}};
    const setor=(p,s)=>{if(s!==(p.sector+1)%T.SECTORS)return;p.sector=s;if(s===0){if(!p.started)p.started=true;else p.laps++;}};
    const marcos=[], duracoes=[];for(let t=0;t<segundos;t+=.05){agora+=50;const inicio=process.hrtime.bigint();R.passo(room,.05,setor,emit);duracoes.push(Number(process.hrtime.bigint()-inicio)/1e6);if(Math.abs((t+.05)%5)<.025 || Math.abs((t+.05)%5-5)<.025){const carros=room.order.map(id=>room.players[id].ia.sim);marcos.push({s:Math.round(t+.05),media:+(carros.reduce((a,c)=>a+c.v,0)/carros.length).toFixed(1),parados:carros.filter(c=>c.v<20).length,batidas});}}
    duracoes.sort((a,b)=>a-b);return {pista,semente,nivel,carros:room.order.length,marcos,batidas,cpu:{mediana:+duracoes[Math.floor(duracoes.length*.5)].toFixed(2),p95:+duracoes[Math.floor(duracoes.length*.95)].toFixed(2),acima50:duracoes.filter(x=>x>50).length}};
  } finally {Date.now=antigo;Math.random=random;R.usarFonte(()=>[]);}
}
if(require.main===module)for(const pista of ["monaco","interlagos"])for(const semente of [951,952])console.log(JSON.stringify(medir({pista,semente})));
module.exports={medir};
