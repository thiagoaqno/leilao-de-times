// Road to Champions — a partida ao vivo. O servidor simula cada jogo com o MESMO motor da Carreira
// (public/carreira/motor.js, modo 1: os protagonistas são jogadores, não técnicos, então não há paradas) e guarda os lances;
// aqui eles tocam num relógio único para a sala (sala.aoVivo: início e minutos por segundo), na mesma mesa de botão da
// Carreira (public/carreira/mesa.js, com taticas.js e camisas.js) e com a narração no jeito de partida.js.
// Quem chega depois do apito não abre sozinho; os jogos ficam para rever na Classificação (RoadPartida.rever).
// Ao vivo, o relógio é o do servidor (aoVivo: base + (agora - desde) × vel, parado no `teto`): quando o jogo de um
// protagonista chega num momento (25', intervalo, 70'), o relógio para ali, a decisão abre dentro da partida
// (momentoHTML) e os lances seguintes chegam depois dela (aoVivo.versoes: a página pede o jogo de novo).
// O narrador e a torcida são os da Carreira (public/carreira/som-partida.js, SomPartida.configurar).
// Uso (road.js): RoadPartida.configurar(dependências), RoadPartida.verificar(sala) a cada estado, RoadPartida.rever(sala, id).
window.RoadPartida=(()=>{
"use strict";
const D={pedido:null,nomeClube:id=>id,escudo:()=>"",cabecaDe:()=>"",clube:()=>null,aoFechar:()=>{}};
const ETAPA={grupos:r=>"Fase de grupos · Jornada "+(r+1),semifinal:()=>"Semifinal",final:()=>"A grande final"};
const PEN_MS=1400; // o intervalo entre as cobranças da disputa, depois do apito final
// mesa.js declara `const Mesa` no escopo global (não fica em window)
const mesa=()=>typeof Mesa!=="undefined"?Mesa:null;
const calmo=()=>matchMedia("(prefers-reduced-motion: reduce)").matches;
const safe=x=>String(x==null?"":x).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const tempoDe=e=>e.min+(e.acr?e.acr/100:0);
const minutoTexto=e=>e.min+"'"+(e.acr?"+"+e.acr:"");
// V: o que está aberto. jogos: os da jornada (id, casa, fora e, depois do pedido, os lances); atual: o da mesa
const V={aberta:false,chave:null,jogos:[],atual:null,eu:null,minuto:0,vel:2,mult:1,ultimo:0,timer:null,vivo:false,pulando:false,raiz:null,
  rodada:null,inicio:0,base:null,desde:0,teto:null,offset:0,salto:0,momentoChave:""};

// a mesa de botão escreve o número com `tintaSobre`, que na Carreira mora em inicio.js: a mesma conta de contraste, aqui
if(typeof window.tintaSobre!=="function"){
  const luz=hx=>{const n=parseInt(String(hx).slice(1,7),16),c=[n>>16,(n>>8)&255,n&255].map(v=>{v/=255;return v<=0.03928?v/12.92:((v+0.055)/1.055)**2.4;});return 0.2126*c[0]+0.7152*c[1]+0.0722*c[2];};
  const contraste=(a,b)=>{const [x,y]=[luz(a),luz(b)].sort((p,q)=>q-p);return (x+0.05)/(y+0.05);};
  window.tintaSobre=(fundo,preferida)=>contraste(fundo,preferida)>=3?preferida:contraste(fundo,"#ffffff")>=contraste(fundo,"#111111")?"#ffffff":"#111111";
}
// ---------- o uniforme (o mesmo critério da Carreira: o visitante troca se a camisa parecer com a do mandante) ----------
const rgb=hx=>{const n=parseInt(String(hx||"#888").slice(1,7),16);return[n>>16,(n>>8)&255,n&255];};
const distancia=(a,b)=>{const x=rgb(a),y=rgb(b);return Math.hypot(x[0]-y[0],x[1]-y[1],x[2]-y[2]);};
function uniforme(id,contra){
  const camisa=c=>window.Camisas?Camisas.de(D.clube(c)):[(D.clube(c)?.cores||["#3a4a5a"])[0],"#ffffff","","#1a1a1a"];
  let [cam,det,desenho,calcao]=camisa(id);
  if(contra&&distancia(cam,camisa(contra)[0])<110){
    const casa=camisa(contra)[0];
    [cam,det,desenho,calcao]=distancia(det,casa)>=110?[det,cam,"",det]:distancia("#f4f4f4",casa)>=110?["#f4f4f4",cam,"","#f4f4f4"]:["#1a1a1a",cam,"","#1a1a1a"];
  }
  return {cam,det,desenho,calcao,meiao:calcao==="#f4f4f4"||calcao==="#ffffff"?cam:calcao,chuteira:"#1a1a1a"};
}

// ---------- a narração (as mesmas falas da partida da Carreira) ----------
const ZONA=(window.Ritmo&&Ritmo.ZONA_NOME)||{};
function narrar(g,e){
  const nome=pid=>safe(g.nomes?.[pid]||"Um jogador"),jog=nome(e.jogador),clube=safe(D.nomeClube(e.lado===0?g.casa:g.fora));
  switch(e.tipo){
    case "gol":{const como={penalti:" de pênalti",falta:" de falta",contra_ataque:" no contra-ataque"}[e.como]||"";
      return ["<b>GOL do "+clube+"!</b> "+jog+como+(e.assist?", passe de "+nome(e.assist):"")+".","gol"];}
    case "defesa":return [(e.goleiro?nome(e.goleiro):"O goleiro")+" defende "+(e.como==="penalti"?"o pênalti":"o chute")+" de "+jog+".",""];
    case "perdeu":return [e.como==="penalti"?jog+" perde o pênalti!":jog+" perde uma boa chance para o "+clube+".",""];
    case "penalti":return [e.chute?jog+" bate "+(ZONA[e.chute]||"")+(e.fora?"... e manda para fora!":"; o goleiro pula "+(ZONA[e.pulo]||"")+"."):"Pênalti para o "+clube+"! "+jog+" vai bater.",""];
    case "amarelo":return ["Amarelo para "+jog+" ("+clube+").","cartao"];
    case "vermelho":return ["<b>Expulso!</b> "+jog+" ("+clube+") "+(e.como==="segundo_amarelo"?"leva o segundo amarelo":"recebe o vermelho direto")+".","vermelho"];
    case "lesao":return [jog+" sente e sai machucado ("+clube+").",""];
    case "sub":return ["Troca no "+clube+": sai "+nome(e.sai)+", entra "+nome(e.entra)+".",""];
    case "contra_ataque":return ["Roubou e saiu no contra-ataque o "+clube+"!",""];
    case "disputa_inicio":return ["Empate no tempo normal: disputa de pênaltis!","apito"];
    case "disputa":{const lance=e.fora?"bate "+(ZONA[e.chute]||"")+"... e manda para fora!":e.entrou?"bate "+(ZONA[e.chute]||"")+". <b>Gol!</b>":"bate "+(ZONA[e.chute]||"")+" e o goleiro defende!";
      return [jog+" ("+clube+") "+lance+" Pênaltis: "+e.placar[0]+" × "+e.placar[1]+".",e.entrou?"gol":""];}
    case "intervalo":return ["Intervalo · "+e.placar[0]+" × "+e.placar[1],"apito"];
    case "momento":return ["<b>"+safe(e.texto)+"</b>","momento"]; // a decisão do protagonista no meio do jogo
    case "fim":return ["Fim de jogo · "+e.placar[0]+" × "+e.placar[1],"apito"];
    default:return [null,""];
  }
}
// o placar de um jogo até o lance que já apareceu
function placarDe(g){
  let gols=[0,0],pen=null;
  for(let k=0;k<g.i;k++){const e=g.eventos[k];if(e.tipo==="gol")gols=e.placar;else if(e.tipo==="disputa")pen=e.placar;}
  return {gols,pen};
}
const acabou=g=>!!g.eventos&&!g.parcial&&g.i>=g.eventos.length; // o jogo parado num momento ainda não acabou
function relogioTexto(g){
  const {pen}=placarDe(g);
  if(acabou(g))return g.resultado?.penaltis?"Pênaltis "+g.resultado.penaltis.casa+" × "+g.resultado.penaltis.fora:"Fim";
  if(pen||g.passouFim)return "Pênaltis";
  const r=V.minuto;
  if(r<0)return "Já começa";
  if(parado())return Math.floor(r)+"' · parado";
  return r>=90?"90+'":r>45&&r<46?"45+'":Math.floor(r)+"'";
}

// ---------- abrir e fechar ----------
function fora(){
  if(!V.raiz){V.raiz=document.createElement("div");V.raiz.id="rtc-partida";V.raiz.className="rtc-ao-vivo";V.raiz.hidden=true;document.body.appendChild(V.raiz);
    V.raiz.addEventListener("click",clique);}
  return V.raiz;
}
// sala.aoVivo chegou: abre sozinho uma vez por jornada, se o jogo ainda está rolando (quem chega no fim só vê na Classificação)
function verificar(sala){
  const av=sala&&sala.aoVivo;
  if(V.aberta&&V.vivo&&av&&av.rodada===V.rodada){sincronizar(sala);return;}
  if(!av||!av.jogos?.length||V.aberta)return;
  const chave="rtc:aovivo:"+sala.codigo+":"+av.rodada;
  try{if(sessionStorage.getItem(chave)==="1")return;}catch{}
  const offset=(sala.agora||Date.now())-Date.now(),agora=Date.now()+offset;
  // o apito final, com os acréscimos e uma possível disputa de pênaltis (com um momento parado, o jogo ainda não acabou)
  const fimEstimado=av.base!=null?av.desde+Math.max(0,100-av.base)/av.vel*1000+20000:av.inicio+100/av.vel*1000+20000;
  if(av.teto==null&&agora>fimEstimado)return;
  try{sessionStorage.setItem(chave,"1");}catch{}
  abrir(sala,av.jogos,{vivo:true,inicio:av.inicio,vel:av.vel,offset,chave,av});
}
// o relógio do servidor (ao vivo): o minuto da sala, sem passar do momento parado
function minutoServidor(){
  const agora=Date.now()+V.offset;
  return V.base!=null?V.base+(agora-V.desde)/1000*V.vel:(agora-V.inicio)/1000*V.vel;
}
function relogioDe(av,offset){Object.assign(V,{rodada:av.rodada,inicio:av.inicio,vel:av.vel,base:av.base??null,desde:av.desde||av.inicio,teto:av.teto??null,offset});}
// chegou um estado novo com o jogo aberto: o relógio (a decisão soltou o momento), os lances novos e o momento
async function sincronizar(sala){
  V.sala=sala;
  const av=sala.aoVivo;relogioDe(av,(sala.agora||Date.now())-Date.now());
  const mudaram=V.jogos.filter(g=>(av.versoes?.[g.id]||0)!==(g.versao||0)&&!g.buscando);
  for(const g of mudaram)g.buscando=true;
  const respostas=await Promise.all(mudaram.map(g=>D.pedido("partida",{id:g.id})));
  respostas.forEach((r,k)=>{const g=mudaram[k];g.buscando=false;if(!r.ok)return;
    const i=g.i;Object.assign(g,r.partida);g.i=Math.min(i,g.eventos.length);}); // os lances que já passaram continuam iguais
  if(V.aberta)atualizar();
}
// rever um jogo que já acabou: só ele, do começo, no ritmo de quem está vendo
function rever(sala,id){abrir(sala,[id],{vivo:false,vel:2});}
async function abrir(sala,ids,o){
  const eu=sala.jogadores.find(p=>p.id===sala.eu);
  if(o.av)relogioDe(o.av,o.offset);else Object.assign(V,{rodada:null,base:null,teto:null});
  Object.assign(V,{aberta:true,chave:o.chave||null,vivo:o.vivo,vel:o.vel||2,mult:1,pulando:false,eu,sala,salto:0,momentoChave:"",
    jogos:ids.map(id=>({id,...(sala.jogos.find(j=>j.id===id)||{}),eventos:null,i:0,passouFim:false,proxPen:0}))});
  // o meu jogo vai para a mesa; quem está fora assiste ao primeiro (no mata-mata, ao de protagonistas)
  V.atual=V.jogos.find(g=>eu&&(g.casa===eu.clube||g.fora===eu.clube))||V.jogos.find(g=>sala.jogadores.some(p=>p.clube===g.casa||p.clube===g.fora))||V.jogos[0];
  V.minuto=o.vivo?minutoAoVivo():-3*V.vel; // ao rever, 3 s de abertura
  V.ultimo=performance.now();
  const raiz=fora();raiz.hidden=false;document.body.classList.add("rtc-sem-rolagem");
  raiz.innerHTML='<div class="rtc-av-caixa"><p class="rtc-muted" style="padding:30px">Entrando no estádio…</p></div>';
  const respostas=await Promise.all(V.jogos.map(g=>D.pedido("partida",{id:g.id})));
  if(!V.aberta)return;
  respostas.forEach((r,k)=>{const g=V.jogos[k];if(r.ok)Object.assign(g,r.partida);else{g.eventos=[];g.erro=r.error;}});
  if(V.atual.erro&&V.jogos.some(g=>!g.erro))V.atual=V.jogos.find(g=>!g.erro);
  // quem entrou com o jogo andando vê os lances que já passaram sem animação
  V.pulando=true;avancarLances();V.pulando=false;
  somAbrir();
  clearInterval(V.timer);V.timer=setInterval(quadro,200);
  montar();quadro();
  raiz.querySelector("h2")?.focus();
}
function fechar(){
  if(!V.aberta)return;
  V.aberta=false;clearInterval(V.timer);
  if(window.SomPartida)try{SomPartida.tela("central");}catch(err){console.warn("som",err);}
  if(mesa()){mesa().ativa=false;mesa().parar();}
  if(V.raiz){V.raiz.hidden=true;V.raiz.innerHTML="";}
  document.body.classList.remove("rtc-sem-rolagem");
  D.aoFechar();
}

// ---------- o relógio ----------
// solta os lances que o relógio já alcançou; depois do apito final, a disputa de pênaltis sai uma cobrança por vez
// tudo: vai até o fim (o botão "Ir para o fim"), sem esperar o relógio nem as cobranças
function avancarLances(tudo=false){
  const agora=performance.now(),novos=[];
  for(const g of V.jogos){
    if(!g.eventos)continue;
    while(g.i<g.eventos.length){
      const e=g.eventos[g.i];
      if(g.passouFim){if(!tudo&&agora<g.proxPen)break;g.proxPen=agora+PEN_MS/V.mult;}
      else if(!tudo&&tempoDe(e)>V.minuto)break;
      g.i++;if(e.tipo==="fim"){g.passouFim=true;g.proxPen=agora+PEN_MS/V.mult;}
      if(g===V.atual)novos.push(e);
    }
  }
  return novos;
}
const parado=()=>V.vivo&&V.teto!=null&&V.minuto>=V.teto-1e-6;
function minutoAoVivo(){const m=minutoServidor()+V.salto;return V.teto==null?m:Math.min(m,V.teto);}
function quadro(){
  if(!V.aberta)return;
  const agora=performance.now(),dt=(agora-V.ultimo)/1000;V.ultimo=agora;
  if(V.vivo)V.minuto=Math.max(V.minuto,minutoAoVivo()); // o relógio da sala (nunca volta)
  else V.minuto+=dt*V.vel*V.mult;
  const novos=avancarLances();
  for(const e of novos)mostrarLance(e);
  atualizar();
}
// ---------- o narrador e a torcida (os da Carreira) ----------
function pesoDoJogo(g){
  const dois=V.sala?.jogadores.some(p=>p.clube===g.casa)&&V.sala?.jogadores.some(p=>p.clube===g.fora);
  return g.etapa==="final"?{tema:"final"}:dois?{tema:"classico"}:g.etapa&&!["grupos","liga"].includes(g.etapa)?{tema:"decisivo"}:null;
}
function somAbrir(){
  if(!window.SomPartida)return;
  try{
    SomPartida.configurar({naPartida:()=>V.aberta,velocidade:()=>V.vivo?1:V.mult,
      jogo:()=>{const g=V.atual;return g&&g.eventos?{casa:g.casa,fora:g.fora,eventos:g.eventos,i:g.i,relogio:V.minuto,pulando:V.pulando,
        decidindo:parado(),completo:!g.parcial,peso:pesoDoJogo(g),vel:1}:null;}});
    SomPartida.abrir(true);SomPartida.tela("partida");
  }catch(err){console.warn("som",err);}
}

// ---------- o desenho ----------
// no formato novo (liga de 36), o nome da rodada vem de road-formato.js
const rotuloEtapa=g=>window.RoadFormato&&(g.etapa==="liga"||g.perna||g.rodada>4)?(RoadFormato.RODADAS[g.rodada]?.nome||""):(ETAPA[g.etapa]||ETAPA.grupos)(g.rodada||0);
function ladoHTML(id,classe){
  const cab=D.cabecaDe(id);
  return '<div class="rtc-av-time '+classe+'">'+D.escudo(id,46)+'<div><b>'+safe(D.nomeClube(id))+'</b>'+(cab?'<small>'+cab+'</small>':'<small class="cpu">Computador</small>')+'</div></div>';
}
function montar(){
  const g=V.atual,raiz=fora();
  const outros=V.jogos.length>1?'<nav class="rtc-av-outros" aria-label="Os jogos da jornada">'+V.jogos.map(x=>'<button type="button" class="rtc-av-mini" data-ver="'+safe(x.id)+'" aria-pressed="'+(x===g)+'">'+
    D.escudo(x.casa,18)+'<span data-placar="'+safe(x.id)+'">'+placarTexto(x)+'</span>'+D.escudo(x.fora,18)+'<small data-rel="'+safe(x.id)+'">'+relogioTexto(x)+'</small></button>').join("")+'</nav>':"";
  raiz.style.cssText="--casa:"+((D.clube(g.casa)?.cores||["#3d7ae0"])[0])+";--fora:"+((D.clube(g.fora)?.cores||["#3d7ae0"])[0]);
  raiz.innerHTML='<div class="rtc-av-caixa" role="dialog" aria-modal="true" aria-labelledby="rtc-av-titulo">'+
    '<header class="rtc-av-topo"><span class="rtc-kicker">'+(V.vivo?'<i class="rtc-av-vivo">AO VIVO</i> ':'Replay · ')+safe(rotuloEtapa(g))+'</span>'+
      '<h2 id="rtc-av-titulo" tabindex="-1" class="rtc-sr">'+safe(D.nomeClube(g.casa))+' contra '+safe(D.nomeClube(g.fora))+'</h2>'+
      '<div class="rtc-av-ritmo" role="group" aria-label="Velocidade">'+(V.vivo?"":[1,3].map(m=>'<button type="button" data-mult="'+m+'" aria-pressed="'+(V.mult===m)+'">'+m+'×</button>').join(""))+
      (window.SomPartida&&window.SOM_PARTIDA?'<button type="button" data-acao-av="som" aria-pressed="'+(SomPartida.modo!=="mudo")+'">'+somRotulo()+'</button>':"")+
      '<button type="button" data-acao-av="pular">Ir para o fim</button><button type="button" data-acao-av="fechar" class="fechar">'+(V.vivo?"Ver na central":"Fechar")+'</button></div></header>'+
    '<div class="rtc-av-placar">'+ladoHTML(g.casa,"casa")+'<div class="rtc-av-centro"><strong id="rtc-av-gols" aria-live="polite">'+placarTexto(g)+'</strong><span id="rtc-av-relogio">'+relogioTexto(g)+'</span></div>'+ladoHTML(g.fora,"fora")+'</div>'+
    outros+
    '<div class="rtc-av-corpo"><div class="rtc-av-campo"><div class="mesa-caixa"><div class="mesa" id="rtc-mesa"></div></div>'+
      (g.erro?'<p class="rtc-av-aviso">'+safe(g.erro)+'</p>':'')+'</div>'+
      '<section class="rtc-av-narra" aria-label="Narração"><ol id="rtc-av-lances"></ol></section></div>'+
    '<div id="rtc-av-abertura" class="rtc-av-abertura" hidden></div><div id="rtc-av-momento" class="rtc-av-momento" hidden></div><div id="rtc-av-fim" class="rtc-av-fim" hidden></div></div>';
  // a narração do que já passou, sem animação
  const ol=raiz.querySelector("#rtc-av-lances");
  for(let k=0;k<g.i;k++){const li=itemDeLance(g,g.eventos[k]);if(li){li.classList.add("sem-entrada");ol.prepend(li);}}
  if(mesa()&&!g.erro&&g.eventos){
    const forma=id=>D.clube(id)?.formacao||"4-3-3";
    // a mesa é enfeite: se falhar, o relógio e a narração seguem
    try{mesa().montar(raiz.querySelector("#rtc-mesa"),{chave:(V.sala?.codigo||"")+":"+g.id+":"+Date.now(),uniformes:[uniforme(g.casa),uniforme(g.fora,g.casa)],
      formacoes:[forma(g.casa),forma(g.fora)],times:g.times&&g.times.length===2?g.times:null,eventos:g.eventos.slice(0,g.i),nome:pid=>String(g.nomes?.[pid]||"").split(" ").pop()});
      mesa().vel=V.mult;}catch(err){console.warn("mesa",err);raiz.querySelector(".mesa-caixa")?.remove();}
  }
  atualizar(true);
}
const placarTexto=g=>{const {gols,pen}=placarDe(g);return gols[0]+" × "+gols[1]+(pen?" ("+pen[0]+" × "+pen[1]+")":"");};
function itemDeLance(g,e){
  const [texto,classe]=narrar(g,e);if(!texto)return null;
  const li=document.createElement("li"),meu=V.eu&&(e.lado===0?g.casa:g.fora)===V.eu.clube&&e.lado!=null;
  li.className=(classe||"")+" lado"+(e.lado??"")+(meu?" nosso":"");
  li.innerHTML=classe==="apito"?'<span class="txt">'+texto+'</span>':'<span class="min">'+(e.tipo==="disputa"?"Pên.":minutoTexto(e))+'</span><span class="txt">'+texto+'</span>';
  if(V.pulando||calmo())li.classList.add("sem-entrada");
  return li;
}
function mostrarLance(e){
  const g=V.atual,ol=V.raiz?.querySelector("#rtc-av-lances");if(!ol)return;
  if(window.SomPartida)try{SomPartida.evento(e);}catch(err){console.warn("som",err);}
  const li=itemDeLance(g,e);if(li)ol.prepend(li);
  if(mesa()){mesa().rapido=V.pulando;try{mesa().evento(e);}catch(err){console.warn("mesa",err);}}
  if(e.tipo==="gol"&&!V.pulando&&!calmo()){const p=V.raiz.querySelector(".rtc-av-placar");p.classList.remove("festa");void p.offsetWidth;p.classList.add("festa");}
}
// o que muda a cada quadro: placar, relógio, os outros jogos, a abertura e o fim
function atualizar(){
  const g=V.atual,raiz=V.raiz;if(!raiz||!g)return;
  const gols=raiz.querySelector("#rtc-av-gols"),rel=raiz.querySelector("#rtc-av-relogio");
  if(gols&&gols.textContent!==placarTexto(g))gols.textContent=placarTexto(g);
  if(rel)rel.textContent=relogioTexto(g);
  for(const x of V.jogos){
    const p=raiz.querySelector('[data-placar="'+CSS.escape(x.id)+'"]'),r=raiz.querySelector('[data-rel="'+CSS.escape(x.id)+'"]');
    if(p&&p.textContent!==placarTexto(x))p.textContent=placarTexto(x);
    if(r)r.textContent=relogioTexto(x);
  }
  if(mesa()){mesa().ativa=V.minuto>=0&&!acabou(g)&&!document.hidden;mesa().vel=V.mult;}
  // a abertura: os dois escudos antes do apito (na final, o túnel com a taça; entre protagonistas, o encontro no túnel)
  const ab=raiz.querySelector("#rtc-av-abertura");
  if(ab){
    const mostrar=V.minuto<0;
    if(mostrar&&ab.hidden){
      const dois=V.sala?.jogadores.some(p=>p.clube===g.casa)&&V.sala?.jogadores.some(p=>p.clube===g.fora);
      const arte=g.etapa==="final"?"/jogador/popups/rtc-popup-final.webp":dois?"/jogador/cenas/rivalidade.webp":"";
      ab.innerHTML=(arte?'<img src="'+arte+'" alt="" onerror="this.remove()">':'')+'<div class="rtc-av-ab-texto"><span class="rtc-kicker">'+safe(rotuloEtapa(g))+'</span>'+
        '<div class="rtc-av-ab-confronto">'+D.escudo(g.casa,72)+'<em>×</em>'+D.escudo(g.fora,72)+'</div><b>'+safe(D.nomeClube(g.casa))+' × '+safe(D.nomeClube(g.fora))+'</b><small id="rtc-av-conta"></small></div>';
    }
    ab.hidden=!mostrar;
    const c=raiz.querySelector("#rtc-av-conta");if(c&&mostrar)c.textContent="Bola rolando em "+Math.max(1,Math.ceil(-V.minuto/V.vel/V.mult))+" s";
  }
  pintarMomento();
  const fim=raiz.querySelector("#rtc-av-fim");
  if(fim&&acabou(g)&&fim.hidden&&!g.erro){fim.innerHTML=fimHTML(g);fim.classList.toggle("sem-arte",!fim.querySelector("img"));fim.hidden=false;}
}
// o fim do jogo: o resultado do seu clube com a arte do momento, os números da partida e a volta para a central
function fimHTML(g){
  const r=g.resultado||{},clube=V.eu?.clube,meu=clube&&(g.casa===clube||g.fora===clube);
  const ganhou=r.vencedor?r.vencedor===clube:meu&&(g.casa===clube?r.casa>r.fora:r.fora>r.casa);
  const empate=!r.vencedor&&r.casa===r.fora,mata=g.etapa!=="grupos";
  let arte="",titulo="Fim de jogo";
  if(meu){
    if(g.etapa==="final"&&ganhou){arte="campeao";titulo="Campeão da Europa!";}
    else if(mata&&!ganhou){arte="eliminacao";titulo="Fim da linha";}
    else if(mata){arte="gol-vitoria";titulo="Classificado para a final!";}
    else if(ganhou){arte="comemoracao";titulo="Vitória";}
    else if(empate){titulo="Empate";}
    else{arte="gol-derrota";titulo="Derrota";}
  }else if(g.etapa==="final"){arte="campeao";titulo=D.nomeClube(r.vencedor)+" campeão!";}
  const est=g.estatisticas||[],linha=(nome,k)=>est.length===2?'<tr><td>'+est[0][k]+'</td><th>'+nome+'</th><td>'+est[1][k]+'</td></tr>':"";
  const outros=V.jogos.filter(x=>x!==g);
  return (arte?'<img src="/jogador/cenas/'+arte+'.webp" alt="" onerror="this.remove()">':'')+
    '<div class="rtc-av-fim-caixa"><span class="rtc-kicker">'+safe(rotuloEtapa(g))+'</span><h3>'+safe(titulo)+'</h3>'+
    '<p class="rtc-av-fim-placar">'+D.escudo(g.casa,30)+'<b>'+safe(r.casa)+' × '+safe(r.fora)+'</b>'+D.escudo(g.fora,30)+'</p>'+
    (r.penaltis?'<p class="rtc-small">Pênaltis '+r.penaltis.casa+' × '+r.penaltis.fora+'</p>':'')+
    (est.length===2?'<table class="rtc-av-numeros"><tbody>'+linha("Finalizações","chutes")+linha("No alvo","noAlvo")+linha("Faltas","faltas")+linha("Amarelos","amarelos")+'</tbody></table>':'')+
    '<div class="rtc-av-fim-acoes">'+(outros.some(x=>!x.erro)?'<button type="button" class="rtc-button ghost" data-acao-av="outro">Ver outro jogo</button>':'')+
    '<button type="button" class="rtc-button primary" data-acao-av="fechar">Voltar à central</button></div></div>';
}

// ---------- o momento do jogo, dentro da partida ----------
const somRotulo=()=>({tudo:"Som: narrador",torcida:"Som: torcida",mudo:"Sem som"})[window.SomPartida?.modo]||"Som";
function momentoHTML(){
  const s=V.sala,esperando=s?.jornada?.esperando||[];
  // o meu próximo momento só conta quando o relógio chega nele (o jogo já pode estar simulado até o intervalo)
  const m=s?.jornada?.momento&&s.jornada.momento.min<=V.minuto+0.01?s.jornada.momento:null;
  if(m&&!m.respondido){
    const meu=m.placar[m.lado],deles=m.placar[1-m.lado],rival=D.nomeClube(m.lado===0?m.fora:m.casa);
    const rotulo=m.id==="intervalo"?"Intervalo":m.min+" minutos";
    return {chave:"m:"+m.jogo+":"+m.id,html:'<div class="rtc-av-mom-caixa" role="dialog" aria-labelledby="rtc-av-mom-t"><span class="rtc-kicker">Momento do jogo · '+safe(rotulo)+'</span>'+
      '<h3 id="rtc-av-mom-t" tabindex="-1">'+(meu>deles?"Vocês vencem":meu<deles?"Vocês perdem":"Empate")+' por '+meu+' a '+deles+' contra o '+safe(rival)+'. Como você joga agora?</h3>'+
      (m.resumo?.length?'<p class="rtc-small">'+m.resumo.map(x=>safe(x.min+"' "+x.texto)).join(" · ")+'</p>':"")+
      '<div class="rtc-av-mom-opcoes">'+m.opcoes.map((o,i)=>'<button type="button" class="rtc-mom-opcao" data-momento-av="'+safe(o.id)+'"><span class="n">'+(i+1)+'</span><span><b>'+safe(o.texto)+'</b>'+(o.dica?'<small>'+safe(o.dica)+'</small>':"")+'</span></button>').join("")+'</div>'+
      '<p class="rtc-small" data-prazo-av="'+(m.prazo||0)+'"></p></div>'};
  }
  if(m&&m.respondido){const outros=esperando.filter(x=>x!==V.eu?.avatar);
    return {chave:"r:"+m.jogo+":"+m.id+":"+outros.join(","),html:'<div class="rtc-av-mom-caixa curto"><b>Decisão enviada.</b> '+(outros.length?"Esperando "+safe(outros.join(", "))+" decidir.":"O jogo já volta.")+'</div>'};}
  const outros=esperando.filter(x=>!m&&x!==V.eu?.avatar||m);
  if(outros.length)return {chave:"e:"+outros.join(","),html:'<div class="rtc-av-mom-caixa curto"><b>Jogo parado.</b> '+safe(outros.join(", "))+(outros.length>1?" estão":" está")+' decidindo como jogar.</div>'};
  return {chave:"",html:""};
}
function pintarMomento(){
  const el=V.raiz?.querySelector("#rtc-av-momento");if(!el)return;
  const x=parado()?momentoHTML():{chave:"",html:""};
  if(x.chave!==V.momentoChave){V.momentoChave=x.chave;el.innerHTML=x.html;el.hidden=!x.html;if(x.chave.startsWith("m:"))el.querySelector("h3")?.focus();}
  const prazo=el.querySelector("[data-prazo-av]");
  if(prazo){const t=Number(prazo.dataset.prazoAv)-(Date.now()+V.offset);prazo.textContent=t>0?"Sem resposta em "+Math.ceil(t/1000)+" s, o time mantém o plano.":"Mantendo o plano…";}
}
async function escolherMomento(b,opcao){
  for(const x of V.raiz.querySelectorAll("[data-momento-av]"))x.disabled=true;
  b.classList.add("escolhida");
  const r=await D.pedido("momento",{opcao});
  if(!r.ok){for(const x of V.raiz.querySelectorAll("[data-momento-av]"))x.disabled=false;b.classList.remove("escolhida");}
}

// ---------- os botões ----------
function trocarJogo(id){
  const g=V.jogos.find(x=>x.id===id);
  if(!g||g===V.atual||g.erro)return;
  V.atual=g;montar();somAbrir();
}
function clique(e){
  const b=e.target.closest("button");if(!b)return;
  if(b.dataset.ver){trocarJogo(b.dataset.ver);return;}
  if(b.dataset.mult){V.mult=Number(b.dataset.mult)||1;for(const x of V.raiz.querySelectorAll("[data-mult]"))x.setAttribute("aria-pressed",String(x===b));return;}
  const a=b.dataset.acaoAv;
  if(b.dataset.momentoAv){escolherMomento(b,b.dataset.momentoAv);return;}
  if(a==="fechar")fechar();
  else if(a==="som"){SomPartida.alternar();b.textContent=somRotulo();b.setAttribute("aria-pressed",String(SomPartida.modo!=="mudo"));}
  else if(a==="pular"){
    // ao vivo, o salto para no momento parado (a decisão vem antes do resto do jogo)
    if(V.vivo&&V.teto!=null){V.salto=Math.max(V.salto,V.teto-minutoServidor());V.pulando=true;V.minuto=minutoAoVivo();const novos=avancarLances();for(const ev of novos)mostrarLance(ev);V.pulando=false;atualizar();return;}
    if(V.vivo)V.salto=1e6;
    V.pulando=true;V.minuto=Math.max(V.minuto,200);const novos=avancarLances(true);for(const ev of novos)mostrarLance(ev);V.pulando=false;atualizar();}
  else if(a==="outro"){const i=V.jogos.indexOf(V.atual),prox=[...V.jogos.slice(i+1),...V.jogos.slice(0,i)].find(x=>!x.erro);if(prox)trocarJogo(prox.id);}
}
document.addEventListener("keydown",e=>{if(e.key==="Escape"&&V.aberta)fechar();});

function configurar(dep){Object.assign(D,dep);}
const api={configurar,verificar,rever,fechar};
Object.defineProperty(api,"aberta",{get:()=>V.aberta});
if(location.hash==="#debug")api.__V=V;
return api;
})();
