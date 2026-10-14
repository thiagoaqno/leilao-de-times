// Road to Champions — as telas do modo narrativo multiplayer, no jeito de "A Jornada".
// O servidor define escolhas, confrontos e resultados; a página só desenha e manda os comandos.
// Telas: entrada em três etapas (protagonista, boneco de reserva, sala), vestiário (lobby), central (o hub no jeito do FIFA 20, com as abas
// Central/Classificação/Diário), a cena da decisão com o pré-jogo, e o epílogo.
(() => {
"use strict";
const socket=io("/road-to-champions");
const app=document.getElementById("app"), conexao=document.getElementById("conexao");
const toastBox=document.getElementById("rtc-toast");
const R=window.RoadRegras;
let catalogo=[], clubes=new Map(), sala=null;
const storage={code:"rtc:codigo",token:"rtc:token"};
const safe=x=>String(x==null?"":x).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const num=x=>Number.isFinite(x)?x:0;
const nomeClube=id=>clubes.get(id)?.nome||id||"Clube";
const coresDe=id=>clubes.get(id)?.cores||[];
const copia=f=>JSON.parse(JSON.stringify(f));
const CAPITULOS=[["Jornada 1","Fase de grupos · Jornada 1","J1"],["Jornada 2","Fase de grupos · Jornada 2","J2"],["Jornada 3","Fase de grupos · Jornada 3","J3"],["Semifinal","Semifinal","Semi"],["Final","A grande final","Final"]];
// as rodadas: no formato novo (liga de 36 e mata-mata), as 17 de road-formato.js; nas campanhas antigas, os 5 capítulos
const RF=window.RoadFormato;
const ehLiga=s=>!!s&&s.formato==="liga";
const rotulos=s=>ehLiga(s)?RF.RODADAS.map(r=>[r.titulo,r.nome,r.curto]):CAPITULOS;
const rot=(s,i)=>rotulos(s)[i]||rotulos(s)[0];
// o nome do capítulo, curto no celular
const rotuloCap=i=>'<span class="longo">'+safe(CAPITULOS[i][0])+'</span><span class="curto">'+safe(CAPITULOS[i][2])+'</span>';
const ETAPAS=[["protagonista","Protagonista"],["visual","Boneco (reserva)"],["sala","Sala"]];
const ATR={respeito:"Respeito",ambicao:"Ambição",disciplina:"Disciplina",prestigio:"Prestígio"};
const TOM={respeito:"Respeito",provoca:"Provocação",neutro:"Neutro"};
const TIPOS_FEED={decisao:"DECISÃO",manchete:"MANCHETE",repercussao:"REPERCUSSÃO",visual:"VISUAL NOVO",comemoracao:"COMEMORAÇÃO",placar:"PLACAR"};
const TATICAS=[
  ["equilibrado","Equilibrado","Administrar o jogo, sem se expor nem recuar demais."],
  ["pressionar","Pressionar","Marcar alto para recuperar a bola perto do gol rival."],
  ["recuar","Recuar","Fechar os espaços e sair em velocidade no contra-ataque."],
];

// o protagonista que está sendo montado (na entrada e no vestiário)
const rascunho={arquetipo:R.IDS[0],avatar:"",nome:"",codigo:"",figura:copia(R.PERSONAGENS[R.IDS[0]].figura),de:null};
const tela={etapa:"protagonista",cat:"pele",aba:"central",editor:false,cena:null,noticia:0};
let ocupadosNaSala=[], timerCodigo=null, ocupado=false;

function toast(texto){
  toastBox.textContent=String(texto);toastBox.hidden=false;
  clearTimeout(toastBox._timer);toastBox._timer=setTimeout(()=>toastBox.hidden=true,4500);
}
function pedido(evento,dados={}){
  return new Promise(resolve=>socket.timeout(9000).emit(evento,dados,(err,r)=>resolve(err?{ok:false,error:"Servidor indisponível. Tente novamente."}:r||{ok:false,error:"Não houve resposta."})));
}
function setSala(r){
  if(r.token){localStorage.setItem(storage.code,r.codigo);localStorage.setItem(storage.token,r.token);}
  if(r.estado){sala=r.estado;relogio=(sala.agora||Date.now())-Date.now();RoadPartida.verificar(sala);desenhar();}
}
try{rascunho.nome=localStorage.getItem("galera:name")||"";rascunho.codigo=localStorage.getItem(storage.code)||"";}catch{}

// ---------- desenhos que se repetem ----------
// o escudo da Carreira (escudos.js) e, por cima, a imagem da API quando ela existe e carrega
function escudo(id,t=34){
  const c=clubes.get(id);
  if(!c)return '<span class="rtc-escudo" style="--t:'+t+'px"></span>';
  const svg=window.Escudos?Escudos.svg(c):'<svg viewBox="0 0 80 90"><path d="M4 4h72v44c0 22-18 34-36 38C22 82 4 70 4 48z" fill="'+safe(c.cores?.[0]||"#345")+'"/></svg>';
  const api=(window.ESCUDOS_API&&window.ESCUDOS_API[id])||(window.ESCUDOS_BUSCA&&Object.hasOwn(window.ESCUDOS_BUSCA,id))?"/api/escudo/"+encodeURIComponent(id):"";
  const img=api?'<img src="'+safe(api)+'" alt="" loading="lazy" decoding="async" onload="this.parentNode.classList.add(\'img-ok\')" onerror="this.remove()">':"";
  return '<span class="rtc-escudo" style="--t:'+t+'px" title="'+safe(c.nome)+'">'+svg+img+'</span>';
}
function figuraSVG(figura,clube,tam,titulo=""){return Aparencia.svg(figura,coresDe(clube),{tam,titulo});}
// o visual principal é a foto do jogador da TheSportsDB (road-fotos.js, servida por /api/rtc-foto); o boneco desenhado
// fica embaixo, de reserva: aparece enquanto a foto carrega e no lugar dela se ela não abrir (como os escudos)
const urlFoto=(arq,tipo)=>window.RoadFotos&&arq?RoadFotos.url(arq,tipo):"";
function corpoFoto(arq,fig,clube,tam,titulo=""){
  const url=urlFoto(arq,"recorte"),svg=fig?figuraSVG(fig,clube,tam,titulo):"";
  const img=url?'<img src="'+safe(url)+'" alt="'+safe(titulo)+'" decoding="async" onload="this.parentNode.classList.add(\'img-ok\')" onerror="this.remove()">':"";
  return '<span class="rtc-foto" style="--t:'+tam+'px">'+svg+img+'</span>';
}
function figura(p,tam=44){
  if(!p||(!p.figura&&!p.arquetipo))return '<span class="rtc-fig"></span>';
  return '<span class="rtc-fig">'+corpoFoto(p.arquetipo,p.figura,p.clube,tam,p.avatar)+'</span>';
}
// o rosto redondo: a foto 3×4 da TheSportsDB, com a cabeça do boneco de reserva
function rosto(arq,fig,clube,titulo=""){
  const url=urlFoto(arq,"foto"),svg=fig?cabeca(fig,clube,titulo):"";
  return '<span class="rtc-rosto">'+svg+(url?'<img src="'+safe(url)+'" alt="" decoding="async" onload="this.parentNode.classList.add(\'img-ok\')" onerror="this.remove()">':'')+'</span>';
}
const rostoDe=p=>rosto(p.arquetipo,p.figura,p.clube,p.avatar);
// só a cabeça: o mesmo SVG com o enquadramento no rosto (para avatares redondos e para a grade do editor)
function cabeca(fig,clube,titulo=""){
  const a=fig?.aparencia||{},alt=Number(a.altura)||1;
  const topo=93-91*alt,lado=42*alt;
  return figuraSVG(fig,clube,40,titulo).replace(/viewBox="[^"]*"/,'viewBox="'+(32-lado/2).toFixed(1)+' '+topo.toFixed(1)+' '+lado.toFixed(1)+' '+lado.toFixed(1)+'"')
    .replace(/width="[^"]*"/,'width="40"').replace(/height="[^"]*"/,'height="40"');
}
// uma cidade de prédios sorteados pelo id do clube, com as janelas acesas na cor dele
function skyline(id,cor){
  let a=2166136261;for(const ch of String(id))a=Math.imul(a^ch.charCodeAt(0),16777619);
  const r=()=>{a=(a+0x6d2b79f5)|0;let t=Math.imul(a^(a>>>15),1|a);t=(t+Math.imul(t^(t>>>7),61|t))^t;return((t^(t>>>14))>>>0)/4294967296;};
  let x=0,s="";
  while(x<400){
    const w=10+r()*26,h=30+r()*110;
    s+='<rect x="'+x.toFixed(1)+'" y="'+(160-h).toFixed(1)+'" width="'+w.toFixed(1)+'" height="'+h.toFixed(1)+'" fill="#06102a"/>';
    for(let j=0;j<5;j++)if(r()<.5)s+='<rect x="'+(x+2+r()*(w-5)).toFixed(1)+'" y="'+(160-h+4+r()*(h-8)).toFixed(1)+'" width="2" height="3" fill="'+(r()<.3?cor:"#ffe9b0")+'" opacity=".7"/>';
    if(r()<.12)s+='<rect x="'+(x+w/2-.6).toFixed(1)+'" y="'+(160-h-14).toFixed(1)+'" width="1.2" height="14" fill="#06102a"/>';
    x+=w+r()*3;
  }
  return '<svg viewBox="0 0 400 160" preserveAspectRatio="none" aria-hidden="true">'+s+'</svg>';
}
function barraEixo(valor,e){
  return '<div class="rtc-eixo"><span class="rtc-label">'+safe(e.nome)+'</span><div class="rtc-eixo-trilho"><span style="left:'+Math.max(0,Math.min(100,num(valor)))+'%"></span></div>'+
    '<div class="rtc-eixo-fim"><small>'+safe(e.min)+'</small><small>'+safe(e.max)+'</small></div></div>';
}
const eixosHTML=eixos=>Object.entries(R.EIXOS).map(([k,e])=>barraEixo(eixos?.[k],e)).join("");
function medidorHTML(d,valor){
  const m=d.medidor,v=Math.max(0,Math.min(100,num(valor)));
  return '<div class="rtc-medidor"><div class="rtc-medidor-topo"><span class="rtc-label">'+safe(m.nome)+'</span><b>'+v+'</b></div>'+
    '<div class="rtc-medidor-barra"><span style="width:'+v+'%"></span></div><span class="rtc-small">'+safe(m.texto)+'</span></div>';
}
// a linha do tempo da campanha: os cinco capítulos, com os exclusivos do protagonista marcados com a cabeça dele
function linhaDoTempo(arq,fig,agora=-1,feitos=-1){
  const d=R.PERSONAGENS[arq],ex=R.EXCLUSIVOS[arq]||[];
  return '<div class="rtc-linha-tempo"><span class="rtc-label">A campanha · cinco capítulos</span><div class="rtc-lt-trilho">'+CAPITULOS.map(([curto],i)=>{
    const e=ex.find(x=>x.capitulo===i),cl=[e?"so-seu":"",i===agora?"agora":"",i<=feitos?"feito":""].join(" ");
    return '<div class="rtc-lt-ponto '+cl+'">'+(e?'<span class="rtc-lt-cabeca">'+rosto(arq,fig,d.clube)+'</span>':"")+
      '<b>'+rotuloCap(i)+'</b><small>'+(e?safe(e.titulo):"Evento geral")+'</small></div>';
  }).join("")+'</div></div>';
}

// ---------- entrada, etapa 1: o protagonista ----------
function escolherArquetipo(id){rascunho.arquetipo=id;rascunho.figura=copia(R.PERSONAGENS[id].figura);}
function herois(ocupados,meu){
  return '<div class="rtc-herois" role="radiogroup" aria-label="Os seis protagonistas">'+R.IDS.map(id=>{
    const d=R.PERSONAGENS[id],tomado=ocupados.includes(id)&&id!==meu,sel=rascunho.arquetipo===id;
    const fig=sel?rascunho.figura:d.figura;
    return '<button type="button" class="rtc-heroi" role="radio" aria-checked="'+sel+'" data-arq="'+id+'"'+(tomado?' disabled':'')+' aria-label="'+safe(d.titulo)+'">'+
      '<span class="rtc-fig">'+corpoFoto(id,fig,d.clube,sel?132:96,d.titulo)+'</span><small>'+safe(d.titulo.replace(/^(O|A) /,""))+'</small>'+
      (tomado?'<i>JÁ TEM DONO</i>':'')+'</button>';
  }).join("")+'</div>';
}
function placaHeroi(acoes){
  const d=R.PERSONAGENS[rascunho.arquetipo];
  return '<div class="rtc-placa"><div class="rtc-placa-topo">'+escudo(d.clube,40)+'<div><span class="rtc-kicker">'+safe(d.jeito)+'</span><h2>'+safe(d.titulo)+'</h2></div></div>'+
    '<div class="rtc-placa-meta"><span>Clube <b>'+safe(nomeClube(d.clube))+'</b></span><span>Posição <b>'+safe(d.pos)+'</b></span><span>Idade <b>'+d.idade+'</b></span></div>'+
    (acoes?'<div class="rtc-placa-acoes">'+acoes+'</div>':'')+'</div>';
}
function palco(ocupados,meu,acoes,titulo){
  const d=R.PERSONAGENS[rascunho.arquetipo],cor=coresDe(d.clube)[0]||"#3d7ae0";
  return '<section class="rtc-palco" style="--cor:'+safe(cor)+'"><div class="rtc-ceu">'+skyline(d.clube,cor)+'</div>'+
    '<div class="rtc-palco-titulo"><h1>'+safe(titulo)+'</h1><p>Seis protagonistas, seis clubes, a mesma Champions. Cada um tem um só dono na sala.</p></div>'+
    herois(ocupados,meu)+placaHeroi(acoes)+linhaDoTempo(rascunho.arquetipo,rascunho.figura)+'</section>';
}
function infoHeroi(){
  const d=R.PERSONAGENS[rascunho.arquetipo];
  return '<div class="rtc-selecao-info"><section class="rtc-bloco"><span class="rtc-kicker">Quem é</span><h3>'+safe(d.titulo)+'</h3><p>'+safe(d.resumo)+'</p>'+
    '<div class="rtc-objetivo"><b>Objetivo:</b> '+safe(d.objetivo)+'</div><ul class="rtc-mecanicas">'+d.mecanicas.map(m=>'<li>'+safe(m)+'</li>').join("")+'</ul></section>'+
    '<section class="rtc-bloco"><span class="rtc-kicker">Estilo de vida no começo</span>'+eixosHTML(d.eixos)+medidorHTML(d,d.medidor.valor)+'</section></div>';
}
function etapasHTML(){
  const i=ETAPAS.findIndex(e=>e[0]===tela.etapa);
  return '<nav class="rtc-etapas" aria-label="Etapas">'+ETAPAS.map(([id,t],k)=>'<button type="button" class="rtc-etapa'+(k<i?' feita':'')+'" data-etapa="'+id+'"'+(k===i?' aria-current="step"':'')+'><b>'+(k+1)+'</b>'+safe(t)+'</button>').join("")+'</nav>';
}

// ---------- entrada, etapa 2: o visual (categorias à esquerda, grade de opções, prévia) ----------
const nomesCores=Object.fromEntries(Object.keys(R.CORES_CABELO).map(k=>[k,k[0].toUpperCase()+k.slice(1)]));
const CATS=[
  {grupo:"Aparência física",id:"pele",parte:"aparencia",nome:"Tom de pele",lista:Object.fromEntries(Object.keys(R.PELES).map(k=>[k,"Tom "+k])),n:true,arte:"pele"},
  {id:"rosto",parte:"aparencia",nome:"Rosto",lista:R.ROSTOS,arte:"cabeca"},
  {id:"cabelo",parte:"aparencia",nome:"Cabelo",lista:R.CABELOS,arte:"cabeca"},
  {id:"corCabelo",parte:"aparencia",nome:"Cor do cabelo",lista:nomesCores,arte:"cabeca"},
  {id:"barba",parte:"aparencia",nome:"Barba",lista:R.BARBAS,arte:"cabeca"},
  {id:"corpo",parte:"aparencia",nome:"Altura e porte"},
  {grupo:"Visual e acessórios",id:"numero",parte:"visual",nome:"Número"},
  {id:"acessorio",parte:"visual",nome:"Acessório",lista:R.ACESSORIOS,arte:"corpo"},
  {id:"chuteiras",parte:"visual",nome:"Chuteiras",lista:R.CHUTEIRAS,arte:"corpo"},
  {grupo:"Expressão pessoal",id:"semblante",parte:"expressao",nome:"Semblante",lista:R.SEMBLANTES,arte:"cabeca"},
  {id:"comemoracao",parte:"expressao",nome:"Comemoração de gol",lista:R.COMEMORACOES},
  {id:"postura",parte:"expressao",nome:"Postura nas entrevistas",lista:R.POSTURAS},
];
const rotulo=v=>typeof v==="string"?v:v?.nome||"";
function valorAtual(cat){
  const f=rascunho.figura[cat.parte]||{};
  if(cat.id==="corpo")return "Altura "+Math.round((f.altura||1)*100)+"% · porte "+Math.round((f.largura||1)*100)+"%";
  if(cat.id==="numero")return "Camisa "+f.numero;
  return rotulo(cat.lista?.[String(f[cat.id])]);
}
function opcoesDaCat(cat){
  const d=R.PERSONAGENS[rascunho.arquetipo],sug=d.figura[cat.parte]?.[cat.id],atual=rascunho.figura[cat.parte]?.[cat.id];
  if(cat.id==="corpo"){
    const a=rascunho.figura.aparencia;
    return '<div class="rtc-corpo"><div class="rtc-campo"><label for="rtc-altura">Altura</label><input id="rtc-altura" data-ap="aparencia.altura" type="range" min="0.9" max="1.1" step="0.05" value="'+a.altura+'"></div>'+
      '<div class="rtc-campo"><label for="rtc-largura">Porte</label><input id="rtc-largura" data-ap="aparencia.largura" type="range" min="0.9" max="1.1" step="0.05" value="'+a.largura+'"></div>'+
      '<p class="rtc-small">Só o desenho muda. Em campo, todos os protagonistas têm as mesmas chances.</p></div>';
  }
  if(cat.id==="numero")return '<div class="rtc-numero"><input id="rtc-numero" data-ap="visual.numero" type="number" min="1" max="99" value="'+num(rascunho.figura.visual.numero)+'" aria-label="Número da camisa"><span class="rtc-small">De 1 a 99. A sugestão do personagem é a '+safe(d.figura.visual.numero)+'.</span></div>';
  const textos=!cat.arte;
  return '<div class="rtc-grade'+(textos?' textos':'')+'">'+Object.entries(cat.lista).map(([v,t])=>{
    const valor=cat.n?Number(v):v,sel=String(atual)===String(v);
    let arte="";
    if(cat.arte==="pele")arte='<span class="rtc-pele-amostra" style="background:'+safe(R.PELES[v])+'"></span>';
    else if(cat.arte){
      const f=copia(rascunho.figura);f[cat.parte][cat.id]=valor;
      arte=cat.arte==="cabeca"?cabeca(f,d.clube):figuraSVG(f,d.clube,50);
    }
    return '<button type="button" class="rtc-op'+(textos?' texto':'')+'" data-op="'+safe(v)+'" aria-pressed="'+sel+'">'+
      (String(sug)===String(v)?'<em title="Sugestão do personagem">★</em>':'')+
      (arte?'<span class="rtc-op-arte">'+arte+'</span>':'')+'<span>'+safe(rotulo(t))+'</span>'+
      (cat.id==="comemoracao"?'<small>'+safe(t.frase[0].toUpperCase()+t.frase.slice(1))+'.</small>':'')+'</button>';
  }).join("")+'</div>';
}
function editorVisual(){
  const d=R.PERSONAGENS[rascunho.arquetipo],cat=CATS.find(c=>c.id===tela.cat)||CATS[0];
  return '<div class="rtc-custom"><nav class="rtc-cats" role="tablist" aria-label="O que personalizar">'+CATS.map(c=>
      (c.grupo?'<h4>'+safe(c.grupo)+'</h4>':'')+'<button type="button" class="rtc-cat" role="tab" data-cat="'+c.id+'" aria-selected="'+(c.id===cat.id)+'">'+safe(c.nome)+'<small>'+safe(valorAtual(c))+'</small></button>').join("")+'</nav>'+
    '<section class="rtc-opcoes" id="rtc-opcoes"><div class="rtc-opcoes-topo"><h3>'+safe(cat.nome)+'</h3><span class="rtc-small">★ sugestão do personagem</span></div>'+opcoesDaCat(cat)+'</section>'+
    '<aside class="rtc-vitrine" id="rtc-vitrine">'+vitrine()+'</aside></div>';
}
function vitrine(){
  const d=R.PERSONAGENS[rascunho.arquetipo];
  return '<span class="rtc-vitrine-fig">'+figuraSVG(rascunho.figura,d.clube,150,d.titulo)+'</span><b>'+safe(rascunho.avatar||d.sugestao)+'</b>'+
    '<small>'+safe(d.titulo)+' · '+safe(nomeClube(d.clube))+'</small>';
}
// trocar uma opção só mexe na grade, na prévia e nos rótulos das categorias, sem redesenhar a página
function atualizarEditor(){
  const v=document.getElementById("rtc-vitrine");if(v)v.innerHTML=vitrine();
  const cat=CATS.find(c=>c.id===tela.cat),box=document.getElementById("rtc-opcoes");
  if(box&&cat&&cat.lista){const g=box.querySelector(".rtc-grade");if(g)g.outerHTML=opcoesDaCat(cat);}
  for(const b of app.querySelectorAll("[data-cat]")){const c=CATS.find(x=>x.id===b.dataset.cat),s=b.querySelector("small");if(c&&s)s.textContent=valorAtual(c);}
}

// ---------- entrada, etapa 3: criar ou entrar ----------
function paginaSala(){
  const d=R.PERSONAGENS[rascunho.arquetipo];
  return '<div class="rtc-entrada"><section class="rtc-bloco rtc-cartao-heroi">'+corpoFoto(rascunho.arquetipo,rascunho.figura,d.clube,120,d.titulo)+
      '<b>'+safe(rascunho.avatar||d.sugestao)+'</b><span class="rtc-small">'+safe(d.titulo)+'</span>'+escudo(d.clube,34)+'</section>'+
    '<div><section class="rtc-bloco rtc-form"><span class="rtc-kicker">Identidade</span>'+
      '<div class="rtc-campo"><label for="rtc-nome">Seu nome na sala</label><input id="rtc-nome" maxlength="24" autocomplete="nickname" placeholder="Como os amigos te chamam" value="'+safe(rascunho.nome)+'"></div>'+
      '<div class="rtc-campo"><label for="rtc-avatar">Nome do jogador</label><input id="rtc-avatar" maxlength="24" placeholder="Ex.: '+safe(d.sugestao)+'" value="'+safe(rascunho.avatar)+'"></div></section>'+
    '<div class="rtc-portas"><section class="rtc-bloco rtc-form"><span class="rtc-kicker">Nova campanha</span><h3>Criar a sala</h3>'+
      '<p class="rtc-small">Você vira o anfitrião e manda o código para até cinco amigos. Dá para jogar sozinho contra o computador.</p>'+
      '<button class="rtc-button primary" data-acao="criar">Criar campanha</button></section>'+
    '<section class="rtc-bloco rtc-form"><span class="rtc-kicker">Já tem código?</span><h3>Entrar na sala</h3>'+
      '<div class="rtc-campo rtc-codigo-campo"><label for="rtc-code">Código da campanha</label><input id="rtc-code" maxlength="8" spellcheck="false" autocapitalize="characters" placeholder="ABCDE" value="'+safe(rascunho.codigo)+'"></div>'+
      '<button class="rtc-button" data-acao="entrar">Entrar na sala</button></section></div></div></div>';
}
function paginaInicial(){
  const prox=tela.etapa==="protagonista"?'<button class="rtc-button primary" data-etapa="sala">Continuar →</button><button class="rtc-button ghost" data-etapa="visual">Boneco de reserva</button>':"";
  let corpo="";
  if(tela.etapa==="protagonista")corpo=palco(ocupadosNaSala,null,prox,"Escolha o protagonista")+infoHeroi();
  else if(tela.etapa==="visual")corpo=editorVisual()+'<div class="rtc-custom-pe"><button class="rtc-button ghost" data-etapa="protagonista">← Protagonista</button>'+
    '<p class="rtc-small">O boneco só aparece quando a foto do jogador não carrega. Nada no visual muda força, forma ou lesões.</p><button class="rtc-button primary" data-etapa="sala">Continuar →</button></div>';
  else corpo=paginaSala()+'<div class="rtc-custom-pe"><button class="rtc-button ghost" data-etapa="protagonista">← Protagonista</button></div>';
  app.innerHTML='<div class="rtc-entra">'+etapasHTML()+corpo+'</div>';
}

// ---------- o vestiário (lobby) ----------
function paginaLobby(s){
  const eu=s.jogadores.find(p=>p.id===s.eu),ocupados=s.jogadores.filter(p=>p.id!==s.eu).map(p=>p.arquetipo);
  if(eu.arquetipo&&rascunho.de!==eu.id+":"+eu.arquetipo+":"+JSON.stringify(eu.figura)&&!tela.editor){
    rascunho.de=eu.id+":"+eu.arquetipo+":"+JSON.stringify(eu.figura);rascunho.arquetipo=eu.arquetipo;rascunho.avatar=eu.avatar;rascunho.figura=copia(eu.figura);
  }
  if(tela.editor){
    app.innerHTML='<div class="rtc-entra"><div class="rtc-cabeca"><div><span class="rtc-kicker">Vestiário · sala '+safe(s.codigo)+'</span><h1>Ajustar o protagonista</h1></div>'+
      '<div class="rtc-row"><button class="rtc-button ghost" data-acao="fechar-editor">Cancelar</button><button class="rtc-button primary" data-acao="mudar">Salvar protagonista</button></div></div>'+
      palco(ocupados,eu.arquetipo,"","Trocar ou manter")+'<section class="rtc-bloco" style="margin-top:16px"><div class="rtc-campo"><label for="rtc-avatar">Nome do jogador</label><input id="rtc-avatar" maxlength="24" value="'+safe(rascunho.avatar)+'"></div></section>'+
      '<div style="margin-top:16px">'+editorVisual()+'</div></div>';
    return;
  }
  const armarios=R.IDS.map(id=>{
    const d=R.PERSONAGENS[id],p=s.jogadores.find(x=>x.arquetipo===id),cor=coresDe(d.clube)[0]||"#2a4d95";
    if(!p)return '<div class="rtc-armario vazio" style="--cor:'+safe(cor)+'">'+'<span class="rtc-fig">'+corpoFoto(id,d.figura,d.clube,78,d.titulo)+'</span><b>Vaga aberta</b><small>'+safe(d.titulo)+'<br>'+safe(nomeClube(d.clube))+'</small></div>';
    const tag=p.id===s.eu?'<i class="voce">VOCÊ</i>':p.id===s.dono?'<i>ANFITRIÃO</i>':"";
    return '<div class="rtc-armario" style="--cor:'+safe(cor)+'">'+tag+figura(p,110)+escudo(p.clube,26)+'<b>'+safe(p.avatar)+'</b><small>'+safe(d.titulo)+'<br>'+safe(p.nome)+'</small></div>';
  }).join("");
  app.innerHTML='<div class="rtc-entra"><div class="rtc-cabeca"><div><span class="rtc-kicker">Vestiário · '+s.jogadores.length+' de 6 protagonistas</span><h1>A Europa espera</h1></div>'+
    (eu.arquetipo?'<button class="rtc-button ghost" data-acao="abrir-editor">Ajustar meu protagonista</button>':'')+'</div>'+
    '<div class="rtc-vestiario">'+armarios+'</div>'+
    '<div class="rtc-lobby-baixo"><section class="rtc-bloco"><span class="rtc-kicker">Convite da sala</span><div class="rtc-code" style="margin:10px 0 12px">'+safe(s.codigo)+'</div>'+
      '<p>Mande o código para os amigos. A campanha fica salva no servidor e volta sozinha neste navegador.</p><button class="rtc-button ghost" data-acao="copiar">Copiar código</button></section>'+
    '<section class="rtc-bloco"><span class="rtc-kicker">Primeiro apito</span><h3>Começar a Champions</h3>'+
      '<p>Quando o anfitrião começar, protagonista e visual ficam fixos. As vagas abertas viram clubes do computador.</p>'+
      (s.dono===s.eu?'<button class="rtc-button ouro" data-acao="iniciar">Iniciar a Champions ✦</button>':'<p class="rtc-espera">Esperando o anfitrião começar.</p>')+
      '<div style="margin-top:12px"><button class="rtc-button ghost" data-acao="sair">Sair da sala</button></div></section></div></div>';
}

// ---------- a central (o hub no jeito do FIFA 20) ----------
const euDe=s=>s.jogadores.find(p=>p.id===s.eu);
const meuJogo=(s,cap)=>{const eu=euDe(s);return s.jogos.find(j=>j.rodada===cap&&(j.casa===eu.clube||j.fora===eu.clube))||null;};
function resultadoPara(j,clube){
  const r=j&&j.resultado;if(!r)return null;
  const meu=j.casa===clube?r.casa:r.fora,deles=j.casa===clube?r.fora:r.casa;
  const ganhou=r.vencedor?r.vencedor===clube:meu>deles;
  return {placar:meu+"–"+deles,cls:r.vencedor?(ganhou?"v":"d"):meu>deles?"v":meu<deles?"d":"e"};
}
// a forma de um clube nos jogos que já aconteceram (V, E, D; no mata-mata vale quem passou), do mais antigo ao último
function formaDe(s,clube){
  return s.jogos.filter(j=>j.resultado&&(j.casa===clube||j.fora===clube)).sort((a,b)=>a.rodada-b.rodada).map(j=>{
    const r=j.resultado,meu=j.casa===clube?r.casa:r.fora,deles=j.casa===clube?r.fora:r.casa;
    return r.vencedor?(r.vencedor===clube?"V":"D"):meu>deles?"V":meu<deles?"D":"E";
  });
}
const formaHTML=lista=>'<span class="rtc-hub-forma">'+(lista.length?lista.slice(-5).map(x=>'<i class="f-'+x+'">'+x+'</i>').join(""):'<em>Estreia</em>')+'</span>';
// onde o clube está: a posição no grupo ou a fase do mata-mata
function situacaoDe(s,clube){
  if(s.campeao===clube)return "Campeão";
  if(ehLiga(s))return situacaoLiga(s,clube);
  const mata=s.jogos.filter(j=>j.etapa!=="grupos"&&(j.casa===clube||j.fora===clube));
  const ultimo=mata.at(-1);
  if(ultimo){if(ultimo.resultado&&ultimo.resultado.vencedor!==clube)return "Eliminado";return ultimo.etapa==="final"?"Na final":"Na semifinal";}
  const g=s.equipes?.find(e=>e.id===clube)?.grupo,lista=s.grupos?.[g]||[],i=lista.findIndex(t=>t.clube===clube);
  if(i<0)return "—";
  if(s.capitulo>=3)return "Eliminado nos grupos";
  return (i+1)+"º lugar · grupo "+g;
}
// no formato novo: a posição na liga e, depois, a fase do mata-mata
function situacaoLiga(s,clube){
  const mata=s.jogos.filter(j=>j.etapa!=="liga"&&(j.casa===clube||j.fora===clube)).sort((a,b)=>a.rodada-b.rodada),ultimo=mata.at(-1);
  if(ultimo){
    const fora=ultimo.resultado&&(ultimo.perna===2||ultimo.etapa==="final")&&ultimo.resultado.classificado!==clube;
    return fora?"Eliminado · "+RF.NOMES_ETAPA[ultimo.etapa]:ultimo.etapa==="final"?"Na final":RF.NOMES_ETAPA[ultimo.etapa];
  }
  const i=(s.liga||[]).findIndex(t=>t.clube===clube);
  if(i<0)return "—";
  if(s.capitulo>=RF.RODADAS_LIGA){const z=RF.zonaDe(i+1);if(z==="fora")return "Eliminado na liga · "+(i+1)+"º";}
  return (i+1)+"º na fase de liga";
}
// o bloco grande: Jogar a jornada (o adversário, o mando, a posição e a forma dele) com o protagonista em preto e branco
function tileJogar(s,eu){
  const cap=s.capitulo,j=meuJogo(s,cap),c=rot(s,cap);
  // sem entrevista na rodada (liga), ninguém precisa decidir antes: o anfitrião já pode jogar
  const precisa=s.entrevista!==false,todos=!precisa||s.prontos===s.jogadores.length;
  let acao,rotulo,dica="";
  if(s.todosEliminados&&!s.jornada&&!s.evento){acao=s.dono===s.eu?"simularFim":"";rotulo=s.dono===s.eu?"Simular até o fim":"Esperando o anfitrião";dica="Nenhum protagonista segue vivo na Champions: as rodadas que faltam saem de uma vez, e a final passa ao vivo.";}
  else if(s.jornada){acao="";rotulo="Rodada em andamento";dica=s.jornada.esperando.length?"Momento do jogo: esperando "+s.jornada.esperando.join(", ")+".":"Os jogos estão rolando.";}
  else if(s.evento){acao="abrir-cena";rotulo="Abrir a cena";dica="Decisão pendente: "+s.evento.titulo;}
  else if(s.dono===s.eu){acao="avancar";rotulo=todos?"Jogar: "+c[0]:"Esperando "+(s.jogadores.length-s.prontos)+" decisão(ões)";dica=precisa?s.prontos+" de "+s.jogadores.length+" protagonistas decidiram.":"Sem entrevista nesta rodada. Estratégia: "+(TATICAS.find(t=>t[0]===s.tatica)?.[1]||"Equilibrado")+".";}
  else{acao="";rotulo="Esperando o anfitrião";dica=precisa?s.prontos+" de "+s.jogadores.length+" decidiram.":"Sem entrevista nesta rodada.";}
  const pronto=acao==="abrir-cena"||acao==="simularFim"||(acao==="avancar"&&todos);
  let info;
  if(j){
    const outro=j.casa===eu.clube?j.fora:j.casa,dono=s.jogadores.find(p=>p.clube===outro),oc=clubes.get(j.casa);
    const mando=(j.etapa==="final"?"Campo neutro":j.casa===eu.clube?"Casa":"Fora")+(j.perna?" · "+(j.perna===1?"ida":"volta"):"");
    info='<div class="rtc-hub-adv">'+escudo(outro,92)+'<div><p><b>'+safe(mando)+'</b>'+(oc?.estadio&&j.etapa!=="final"?' | '+safe(oc.estadio):"")+'</p>'+
      '<p>'+safe(nomeClube(outro))+(dono?' · <span class="rtc-hub-dono">'+safe(dono.avatar)+'</span>':'')+'</p>'+
      '<p>Situação: <em>'+safe(situacaoDe(s,outro))+'</em></p><p>Forma: '+formaHTML(formaDe(s,outro))+'</p><p class="rtc-hub-data">'+safe(c[1])+'</p></div></div>';
  }else info='<div class="rtc-hub-adv"><p class="rtc-hub-semjogo">Seu clube está fora da disputa. A história segue: você ainda decide e acompanha os jogos.</p></div>';
  return '<button type="button" class="rtc-hub-tile rtc-hub-jogar"'+(acao?' data-acao="'+acao+'"':'')+(pronto?'':' aria-disabled="true"')+'>'+
    '<span class="rtc-hub-titulo"><b>'+(j?'Jogar':'Avançar')+'</b> <span class="rtc-hub-ucl">✦</span></span>'+info+
    '<span class="rtc-hub-heroi" aria-hidden="true">'+corpoFoto(eu.arquetipo,eu.figura,eu.clube,150,eu.avatar)+'</span>'+
    '<span class="rtc-hub-pe"><span>'+safe(dica)+'</span><strong>'+safe(rotulo)+(pronto?' →':'')+'</strong></span></button>';
}
const SETAS_CHEIAS='<svg viewBox="0 0 100 60" aria-hidden="true"><path d="M8 4l40 26-40 26z M52 4l40 26-40 26z" fill="#fff"/></svg>';
const SETAS_VAZADAS='<svg viewBox="0 0 100 60" aria-hidden="true"><path d="M10 7l36 23-36 23z M54 7l36 23-36 23z" fill="none" stroke="#fff" stroke-width="5" stroke-linejoin="round"/></svg>';
// os dois quadrados do meio: a entrevista (o "Sim match") e a mesa ao vivo (o "Visual sim")
function tileDecidir(s){
  const ev=s.evento,feito=s.feito;
  if(s.entrevista===false){
    const t=TATICAS.find(x=>x[0]===s.tatica)||TATICAS[0],livre=!s.jornada&&s.fase==="jogando";
    return '<button type="button" class="rtc-hub-tile rtc-hub-quad"'+(livre?' data-acao="abrir-tatica"':' aria-disabled="true"')+'>'+
      '<span class="rtc-hub-titulo"><b>Pré-jogo</b></span><small>Sem entrevista nesta rodada. Estratégia: '+safe(t[1])+'</small>'+SETAS_CHEIAS+
      '<span class="rtc-hub-estado">'+(livre?"Mudar":"Em jogo")+'</span></button>';
  }
  return '<button type="button" class="rtc-hub-tile rtc-hub-quad"'+(ev?' data-acao="abrir-cena"':' aria-disabled="true"')+'>'+
    '<span class="rtc-hub-titulo"><b>Entrevista</b></span><small>'+(ev?safe(ev.titulo):feito?"Resposta dada neste capítulo":"Sem entrevista agora")+'</small>'+SETAS_CHEIAS+
    '<span class="rtc-hub-estado">'+(ev?"Decisão pendente":feito?"✓ Feito":"—")+'</span></button>';
}
function tileAssistir(s,eu){
  const cap=s.capitulo,ultimo=[...s.jogos].filter(j=>j.resultado&&j.rodada<=cap&&(j.casa===eu.clube||j.fora===eu.clube)).sort((a,b)=>b.rodada-a.rodada)[0]
    ||[...s.jogos].filter(j=>j.resultado).sort((a,b)=>b.rodada-a.rodada)[0];
  return '<button type="button" class="rtc-hub-tile rtc-hub-quad"'+(ultimo?' data-rever="'+safe(ultimo.id)+'"':' aria-disabled="true"')+'>'+
    '<span class="rtc-hub-titulo"><b>Mesa ao vivo</b></span><small>'+(ultimo?"Rever "+safe(nomeClube(ultimo.casa))+" "+num(ultimo.resultado.casa)+" × "+num(ultimo.resultado.fora)+" "+safe(nomeClube(ultimo.fora))+" na mesa de botão":"Os jogos aparecem aqui depois do primeiro apito")+'</small>'+SETAS_VAZADAS+
    '<span class="rtc-hub-estado">'+(ultimo?"Replay":"—")+'</span></button>';
}
// o cartão de notícia com foto (o card do Frenkie de Jong): a decisão da vez, a última manchete e o último resultado
function noticiasDe(s,eu){
  const lista=[];
  if(s.evento)lista.push({img:"/jogador/popups/rtc-popup-"+s.evento.id+".webp",texto:"Decisão: "+s.evento.titulo});
  const man=s.historico.find(x=>x.tipo==="manchete"||x.tipo==="comemoracao");
  if(man)lista.push({img:"/jogador/cenas/"+(man.tipo==="comemoracao"?"comemoracao":"viral")+".webp",texto:man.texto});
  const j=[...s.jogos].filter(x=>x.resultado&&(x.casa===eu.clube||x.fora===eu.clube)).sort((a,b)=>b.rodada-a.rodada)[0];
  if(j){const r=resultadoPara(j,eu.clube);lista.push({img:"/jogador/cenas/"+(r.cls==="v"?"gol-vitoria":r.cls==="d"?"gol-derrota":"rivalidade")+".webp",
    texto:nomeClube(j.casa)+" "+num(j.resultado.casa)+" × "+num(j.resultado.fora)+" "+nomeClube(j.fora)});}
  const ultima=eu.escolhas?.at(-1);
  if(ultima?.eventoId)lista.push({img:"/jogador/popups/rtc-popup-"+ultima.eventoId+".webp",texto:eu.avatar+": “"+ultima.texto+"”"});
  if(!lista.length)lista.push({img:"/jogador/cenas/vestiario.webp",texto:"A Champions começa. Seis protagonistas, uma taça."});
  return lista.slice(0,4);
}
function tileNoticia(s,eu){
  const lista=noticiasDe(s,eu),i=Math.min(tela.noticia||0,lista.length-1),n=lista[i];
  return '<section class="rtc-hub-tile rtc-hub-noticia" aria-label="Notícias"><img src="'+safe(n.img)+'" alt="" onerror="this.remove()">'+
    '<p class="rtc-hub-legenda"><span class="rtc-hub-selo">✦</span><span>'+safe(n.texto)+'</span></p>'+
    (lista.length>1?'<span class="rtc-hub-pontos">'+lista.map((_,k)=>'<button type="button" data-noticia="'+k+'" aria-label="Notícia '+(k+1)+'" aria-pressed="'+(k===i)+'"></button>').join("")+'</span>':'')+'</section>';
}
function anel(valor,nome){
  const v=Math.max(0,Math.min(100,num(valor))),c=2*Math.PI*24;
  return '<div class="rtc-anel"><svg viewBox="0 0 60 60" role="img" aria-label="'+safe(nome)+' '+v+'"><circle cx="30" cy="30" r="24" fill="none" stroke="#d2dbee" stroke-width="6"/>'+
    '<circle cx="30" cy="30" r="24" fill="none" stroke="#1d3c7a" stroke-width="6" stroke-linecap="round" stroke-dasharray="'+(c*v/100).toFixed(1)+' '+c.toFixed(1)+'" transform="rotate(-90 30 30)"/>'+
    '<text x="30" y="36" text-anchor="middle" font-family="Barlow Condensed,Arial Narrow,sans-serif" font-weight="800" font-size="19" fill="#0a1736">'+v+'</text></svg><small>'+safe(nome)+'</small></div>';
}
function tileAtributos(eu){
  return '<section class="rtc-tile"><div class="rtc-tile-topo"><h3>Atributos</h3><small>Fora de campo</small></div><div class="rtc-tile-corpo">'+
    '<div class="rtc-aneis">'+Object.entries(ATR).map(([k,n])=>anel(eu.atributos?.[k],n)).join("")+'</div></div></section>';
}
function tileEstilo(eu){
  const d=eu.arquetipo&&R.PERSONAGENS[eu.arquetipo];
  return '<section class="rtc-tile"><div class="rtc-tile-topo"><h3>Estilo de vida</h3><small>Muda com as escolhas</small></div><div class="rtc-tile-corpo">'+
    eixosHTML(eu.eixos)+(d?medidorHTML(d,eu.medidores?.[d.medidor.chave]):"")+'</div></section>';
}
function postHTML(x,s){
  const autor=s.jogadores.find(p=>p.avatar===x.autor);
  const av=autor?rostoDe(autor):x.clube?escudo(x.clube,24):'✦';
  const handle=x.autor?"@"+String(x.autor).normalize("NFD").replace(/[̀-ͯ]/g,"").replace(/[^A-Za-z0-9]/g,""):"@DiarioChampions";
  return '<article class="rtc-post"><span class="rtc-post-av">'+av+'</span><div><div class="rtc-post-topo"><b>'+safe(x.autor||"Diário da Champions")+'</b><span>'+safe(handle)+' · cap. '+(num(x.rodada)+1)+'</span><i>'+safe(TIPOS_FEED[x.tipo]||"NOTÍCIA")+'</i></div>'+
    '<p>'+safe(x.texto)+'</p></div></article>';
}
function tileSocial(s,limite=4){
  const itens=s.historico.slice(0,limite);
  return '<section class="rtc-tile"><div class="rtc-tile-topo"><h3>Feed</h3><button type="button" class="rtc-ig-ver" data-aba="diario">Ver tudo · '+s.historico.length+' posts</button></div><div class="rtc-tile-corpo rtc-ig-mini">'+
    (itens.length?itens.map((x,k)=>postIG(x,s,"h"+k,true)).join(""):'<p class="rtc-muted" style="margin:0">As primeiras notícias saem depois das decisões.</p>')+'</div></section>';
}
function tabelaHTML(s,g,eu,compacta){
  const linhas=s.grupos?.[g]||[];
  return '<table class="rtc-table"><thead><tr><th>Grupo '+g+'</th><th>Pts</th><th>J</th>'+(compacta?'':'<th>V</th><th>E</th><th>D</th>')+'<th>SG</th></tr></thead><tbody>'+
    linhas.map((t,i)=>'<tr class="'+(t.clube===eu.clube?"meu ":"")+(i<2?"passa":"")+'"><td><span class="clube">'+escudo(t.clube,20)+'<span>'+safe(nomeClube(t.clube))+'</span></span></td><td>'+num(t.p)+'</td><td>'+num(t.j)+'</td>'+
      (compacta?'':'<td>'+num(t.v)+'</td><td>'+num(t.e)+'</td><td>'+num(t.d)+'</td>')+'<td>'+(t.sg>0?"+":"")+num(t.sg)+'</td></tr>').join("")+'</tbody></table>';
}
// a tabela da liga (36): as zonas do formato novo (1º-8º oitavas, 9º-24º playoff, o resto fora). Compacta: em volta do meu
function tabelaLigaHTML(s,eu,compacta){
  const linhas=s.liga||[],meu=linhas.findIndex(t=>t.clube===eu.clube);
  const mostrar=compacta?linhas.map((t,i)=>[t,i]).filter(([,i])=>i<3||Math.abs(i-meu)<=2):linhas.map((t,i)=>[t,i]);
  let ant=-1;
  return '<table class="rtc-table rtc-liga"><thead><tr><th>#</th><th>Fase de liga</th><th>Pts</th><th>J</th>'+(compacta?'':'<th>V</th><th>E</th><th>D</th><th>GP</th>')+'<th>SG</th></tr></thead><tbody>'+
    mostrar.map(([t,i])=>{
      const pulo=ant>=0&&i>ant+1?'<tr class="pulo"><td colspan="'+(compacta?5:9)+'">…</td></tr>':"";ant=i;
      const dono=s.jogadores.find(p=>p.clube===t.clube);
      return pulo+'<tr class="'+(t.clube===eu.clube?"meu ":"")+'z-'+RF.zonaDe(i+1)+'"><td>'+(i+1)+'</td><td><span class="clube">'+escudo(t.clube,20)+'<span>'+safe(nomeClube(t.clube))+(dono?' <em class="rtc-dono">'+safe(dono.avatar)+'</em>':'')+'</span></span></td><td>'+num(t.p)+'</td><td>'+num(t.j)+'</td>'+
        (compacta?'':'<td>'+num(t.v)+'</td><td>'+num(t.e)+'</td><td>'+num(t.d)+'</td><td>'+num(t.gp)+'</td>')+'<td>'+(t.sg>0?"+":"")+num(t.sg)+'</td></tr>';
    }).join("")+'</tbody></table>'+
    '<p class="rtc-zonas"><span class="z-oitavas">1º–8º oitavas</span><span class="z-playoff">9º–24º playoff</span><span class="z-fora">25º–36º fora</span></p>';
}
function tileTabela(s,eu){
  if(ehLiga(s))return '<section class="rtc-tile"><div class="rtc-tile-topo"><h3>Classificação</h3><small>Liga de 36</small></div><div class="rtc-tile-corpo">'+tabelaLigaHTML(s,eu,true)+'</div></section>';
  const g=s.equipes?.find(e=>e.id===eu.clube)?.grupo||"A";
  return '<section class="rtc-tile"><div class="rtc-tile-topo"><h3>Classificação</h3><small>Os dois primeiros passam</small></div><div class="rtc-tile-corpo">'+tabelaHTML(s,g,eu,true)+'</div></section>';
}
function tileLacos(s,eu){
  const outros=s.jogadores.filter(p=>p.id!==eu.id);
  const forte=outros.map(p=>num(eu.relacoes?.[p.id])).sort((a,b)=>Math.abs(b)-Math.abs(a))[0]||0;
  const foto=Math.abs(forte)>10?'<div class="rtc-foto-faixa"><img src="/jogador/cenas/'+(forte>0?"amizade":"rivalidade")+'.webp" alt="" onerror="this.parentNode.remove()"></div>':"";
  return '<section class="rtc-tile"><div class="rtc-tile-topo"><h3>Destinos cruzados</h3><small>Laços e rivalidades</small></div><div class="rtc-tile-corpo">'+foto+
    (outros.length?outros.map(p=>{
      const v=num(eu.relacoes?.[p.id]),tipo=v>10?["Respeito","bom"]:v<-10?["Rivalidade","mau"]:["Neutro","neutro"];
      const laco=(s.lacos||[]).find(l=>(l.a===eu.id&&l.b===p.id)||(l.b===eu.id&&l.a===p.id));
      return '<div class="rtc-laco"><span class="rtc-laco-av">'+rostoDe(p)+'</span><div><b>'+safe(p.avatar)+'</b><small>'+safe(laco?laco.texto:nomeClube(p.clube))+'</small>'+
        '<div class="rtc-laco-barra"><span style="left:'+((v+100)/2)+'%"></span></div></div><em class="'+tipo[1]+'">'+tipo[0]+' '+(v>0?"+":"")+v+'</em></div>';
    }).join(""):'<p class="rtc-muted" style="margin:0">Sozinho na sala. Os laços aparecem com outros protagonistas.</p>')+'</div></section>';
}
// a central, no jeito da central de carreira do FIFA 20: o cartão do jogador no alto, as abas inclinadas, o bloco Jogar,
// a entrevista e a mesa ao vivo, o cartão de notícia com foto e, embaixo, os painéis (atributos, classificação, estilo
// de vida, destinos cruzados e o social)
function cartaoHub(s,eu){
  const d=eu.arquetipo&&R.PERSONAGENS[eu.arquetipo];
  return '<div class="rtc-hub-cartao"><span class="rtc-hub-cartao-foto">'+rostoDe(eu)+'</span><div class="rtc-hub-cartao-txt">'+
    '<b>'+safe(eu.avatar)+' '+escudo(eu.clube,18)+'</b><span>'+safe(nomeClube(eu.clube))+' | Champions League</span>'+
    '<span>Situação: <em>'+safe(situacaoDe(s,eu.clube))+'</em></span><span>Forma: '+formaHTML(formaDe(s,eu.clube))+'</span></div>'+
    '<div class="rtc-hub-cartao-num"><span title="Respeito">RES <b>'+num(eu.atributos?.respeito)+'</b></span><span title="Prestígio">PRE <b>'+num(eu.atributos?.prestigio)+'</b></span></div>'+
    (d?'<small class="rtc-hub-arq">'+safe(d.titulo)+' · '+safe(eu.pos)+(eu.idade?' · '+eu.idade+' anos':'')+'</small>':'')+'</div>';
}
function centralHub(s){
  const eu=euDe(s);
  return '<div class="rtc-hub-grade">'+tileJogar(s,eu)+tileDecidir(s)+tileAssistir(s,eu)+tileNoticia(s,eu)+
    '<div class="rtc-hub-a">'+tileAtributos(eu)+'</div><div class="rtc-hub-b">'+tileTabela(s,eu)+'</div><div class="rtc-hub-c">'+tileEstilo(eu)+'</div>'+
    '<div class="rtc-hub-d">'+tileSocial(s,2)+'</div><div class="rtc-hub-e">'+(s.jogadores.length>1?tileLacos(s,eu):tileLinha(s,eu))+'</div></div>';
}
// sozinho na sala, o lugar dos laços mostra a campanha (os cinco capítulos e os resultados)
function tileLinha(s,eu){
  const R2=rotulos(s);
  return '<section class="rtc-tile"><div class="rtc-tile-topo"><h3>A campanha</h3><small>'+(ehLiga(s)?"17 rodadas":"Cinco capítulos")+'</small></div><div class="rtc-tile-corpo"><div class="rtc-cal'+(ehLiga(s)?" liga":"")+'">'+R2.map((rr,i)=>{
    const jj=meuJogo(s,i),r=resultadoPara(jj,eu.clube);
    const nome=ehLiga(s)?'<span class="longo">'+safe(rr[2])+(RF.RODADAS[i].perna?RF.RODADAS[i].perna:"")+'</span>':rotuloCap(i);
    return '<div class="rtc-cal-dia '+(i===s.capitulo?"agora ":"")+(r?r.cls:"")+'"><b>'+nome+'</b><span>'+(r?safe(r.placar):i===s.capitulo?"Hoje":"·")+'</span></div>';
  }).join("")+'</div></div></section>';
}
function jogoHTML(j,eu){
  const r=j.resultado,meu=j.casa===eu.clube||j.fora===eu.clube;
  const lado=id=>'<span class="lado'+(r&&r.vencedor===id?" venceu":"")+'">'+escudo(id,22)+'<span>'+safe(nomeClube(id))+'</span></span>';
  return '<div class="rtc-jogo'+(meu?" meu":"")+'">'+lado(j.casa)+'<strong>'+(r?num(r.casa)+" : "+num(r.fora):"×")+'</strong>'+lado(j.fora)+
    (j.perna?'<span class="perna">'+(j.perna===1?"Ida":"Volta")+'</span>':'')+
    (r&&r.agregado?'<span class="pen">Agregado '+num(r.agregado.casa)+' × '+num(r.agregado.fora)+(r.penaltis?' · pênaltis '+num(r.penaltis.casa)+' × '+num(r.penaltis.fora):'')+' · passou '+safe(nomeClube(r.classificado))+'</span>':
    r&&r.penaltis?'<span class="pen">Pênaltis '+num(r.penaltis.casa)+' × '+num(r.penaltis.fora)+' · passou '+safe(nomeClube(r.vencedor))+'</span>':'')+
    (r?'<button type="button" class="rtc-rever" data-rever="'+safe(j.id)+'" aria-label="Rever '+safe(nomeClube(j.casa))+' contra '+safe(nomeClube(j.fora))+'">▶ Rever</button>':'')+'</div>';
}
function abaClassificacao(s){
  const eu=euDe(s),etapa=(nome,lista)=>lista.length?'<section class="rtc-bloco rtc-escuro"><span class="rtc-kicker">'+safe(nome)+'</span>'+lista.map(j=>jogoHTML(j,eu)).join("")+'</section>':"";
  if(ehLiga(s)){
    // o mata-mata por fase (ida e volta lado a lado) e, embaixo, os jogos dos protagonistas na fase de liga
    const fases=["final","semifinal","quartas","oitavas","playoff"].map(e=>{
      const lista=s.jogos.filter(j=>j.etapa===e).sort((a,b)=>(a.chave||"").localeCompare(b.chave||"")||(a.perna||0)-(b.perna||0));
      return etapa(RF.NOMES_ETAPA[e],lista);
    }).join("");
    const meus=s.jogos.filter(j=>j.etapa==="liga"&&s.jogadores.some(p=>p.clube===j.casa||p.clube===j.fora)).sort((a,b)=>a.rodada-b.rodada);
    const porRodada=Array.from({length:RF.RODADAS_LIGA},(_,r)=>etapa("Rodada "+(r+1)+" · jogos dos protagonistas",meus.filter(j=>j.rodada===r))).join("");
    return '<div class="rtc-duas-col"><section class="rtc-bloco rtc-escuro">'+tabelaLigaHTML(s,eu,false)+'</section>'+
      '<div style="display:grid;gap:12px;align-content:start">'+(fases||'<section class="rtc-bloco rtc-escuro"><span class="rtc-kicker">Mata-mata</span><p class="rtc-small">Depois da 8ª rodada: do 1º ao 8º direto nas oitavas; do 9º ao 24º, o playoff de ida e volta.</p></section>')+'</div></div>'+
      '<div class="rtc-duas-col" style="margin-top:16px">'+porRodada+'</div>';
  }
  const grupos=[0,1,2].map(r=>etapa("Jornada "+(r+1),s.jogos.filter(j=>j.etapa==="grupos"&&j.rodada===r))).join("");
  return '<div class="rtc-duas-col"><section class="rtc-bloco rtc-escuro">'+tabelaHTML(s,"A",eu,false)+'</section><section class="rtc-bloco rtc-escuro">'+tabelaHTML(s,"B",eu,false)+'</section></div>'+
    '<div class="rtc-chave">'+etapa("Semifinais",s.jogos.filter(j=>j.etapa==="semifinal"))+etapa("Final",s.jogos.filter(j=>j.etapa==="final"))+'</div>'+
    (s.jogos.some(j=>j.etapa!=="grupos")?"":'<p class="rtc-small" style="margin-top:14px">Semifinais e final aparecem quando a fase de grupos terminar.</p>')+
    '<div class="rtc-duas-col" style="margin-top:16px">'+grupos+'</div>';
}
function abaDiario(s){
  const eu=euDe(s);
  return '<div class="rtc-duas-col"><section class="rtc-bloco rtc-escuro"><div class="rtc-foto-faixa alta"><img src="/jogador/cenas/manchetes.webp" alt="" onerror="this.parentNode.remove()"></div><span class="rtc-kicker">A imprensa não esquece</span><h3>Diário da Champions</h3><div class="rtc-posts">'+
    (s.historico.length?s.historico.map(x=>postHTML(x,s)).join(""):'<p class="rtc-muted">As primeiras manchetes saem depois das decisões.</p>')+'</div></section>'+
    '<div style="display:grid;gap:10px;align-content:start">'+tileAtributos(eu)+tileEstilo(eu)+'</div></div>';
}
// ---------- o momento do jogo: o protagonista decide como joga (25', intervalo e 70') ----------
// O jogo do jogador parou no motor; a sala espera a resposta de quem está em campo (ou o prazo vencer: mantém o plano).
let relogio=0; // a diferença entre o relógio do servidor e o daqui
// o minuto da sala no relógio do servidor (o mesmo do jogo ao vivo): a decisão só aparece quando o jogo chega nela
function minutoDaSala(s){const av=s.aoVivo;if(!av||av.base==null)return Infinity;const m=av.base+(Date.now()+relogio-av.desde)/1000*av.vel;return av.teto==null?m:Math.min(m,av.teto);}
function momentoHTML(s){
  const m=s.jornada?.momento;if(!m)return "";
  if(window.RoadPartida&&RoadPartida.aberta)return ""; // com o jogo ao vivo aberto, a decisão aparece lá dentro
  if(!m.respondido&&minutoDaSala(s)<m.min-0.01)return ""; // o jogo ainda não chegou nesse minuto
  const eu=euDe(s),meu=m.placar[m.lado],deles=m.placar[1-m.lado];
  const quando=m.id==="intervalo"?"Intervalo":m.min+"'";
  const escolhida=m.escolha&&R.MOMENTOS[m.escolha];
  const outros=s.jornada.esperando.filter(a=>a!==eu.avatar);
  const situacao=meu>deles?"Vocês estão na frente.":meu<deles?"Vocês estão atrás no placar.":"O jogo está empatado.";
  return '<div class="rtc-momento" role="dialog" aria-modal="true" aria-labelledby="rtc-mom-titulo"><div class="rtc-mom-caixa" style="--cor:'+safe(coresDe(eu.clube)[0]||"#3d7ae0")+'">'+
    '<div class="rtc-mom-topo"><span class="rtc-mom-vivo">● AO VIVO</span><span>'+safe(rot(s,s.capitulo)[1]||"")+'</span></div>'+
    '<div class="rtc-mom-placar"><span class="lado">'+escudo(m.casa,44)+'<b>'+safe(nomeClube(m.casa))+'</b></span><strong>'+num(m.placar[0])+' <i>'+safe(quando)+'</i> '+num(m.placar[1])+'</strong><span class="lado">'+escudo(m.fora,44)+'<b>'+safe(nomeClube(m.fora))+'</b></span></div>'+
    (m.resumo?.length?'<ul class="rtc-mom-lances">'+m.resumo.map(x=>'<li><b>'+num(x.min)+"'</b> "+safe(x.texto)+'</li>').join("")+'</ul>':'<p class="rtc-mom-lances vazio">Nenhum gol até aqui.</p>')+
    '<h2 id="rtc-mom-titulo" tabindex="-1">'+(m.respondido?"Escolha feita":safe(eu.avatar)+", como você joga agora?")+'</h2>'+
    (m.respondido?'<p class="rtc-mom-feito">'+safe(escolhida?escolhida.texto:"")+'. '+(m.rival&&!m.rival.respondido?"Esperando "+safe(m.rival.avatar)+" decidir do outro lado.":"O jogo continua…")+'</p>':
      '<p class="rtc-mom-sit">'+safe(situacao)+' A sua escolha puxa o time e muda o resto do jogo.</p>'+
      '<div class="rtc-mom-opcoes">'+m.opcoes.map((o,i)=>'<button type="button" class="rtc-mom-opcao" data-momento="'+safe(o.id)+'"><span class="n">'+(i+1)+'</span><span><b>'+safe(o.texto)+'</b><small>'+safe(o.dica)+'</small></span></button>').join("")+'</div>'+
      '<div class="rtc-mom-prazo" data-prazo="'+num(m.prazo)+'"><span></span><small></small></div>')+
    (outros.length?'<p class="rtc-mom-sala">Na sala, esperando: '+outros.map(safe).join(", ")+'</p>':'')+
    '</div></div>';
}
// com o jogo ao vivo fechado, a decisão aparece na central quando o relógio chega no minuto dela
setInterval(()=>{
  const m=sala?.jornada?.momento;
  if(m&&!m.respondido&&!(window.RoadPartida&&RoadPartida.aberta)&&!document.querySelector(".rtc-momento")&&minutoDaSala(sala)>=m.min-0.01)desenhar();
},1000);
// o prazo do momento andando (sem redesenhar a tela inteira)
setInterval(()=>{
  const el=document.querySelector(".rtc-mom-prazo");if(!el)return;
  const prazo=Number(el.dataset.prazo),resta=Math.max(0,prazo-(Date.now()+relogio));
  el.querySelector("span").style.width=Math.min(100,resta/300)+"%";
  el.querySelector("small").textContent=resta>0?Math.ceil(resta/1000)+" s para decidir (senão, você mantém o plano)":"Mantendo o plano…";
},250);

// ---------- o feed (no jeito do Instagram): as notícias de todos os protagonistas da sala ----------
const slug=t=>String(t||"").normalize("NFD").replace(/[̀-ͯ]/g,"").replace(/[^A-Za-z0-9]/g,"").toLowerCase();
const hashDe=t=>{let h=7;for(const c of String(t))h=(h*31+c.charCodeAt(0))>>>0;return h;};
const milhar=n=>String(n).replace(/\B(?=(\d{3})+(?!\d))/g,".");
let curtidas=new Set();try{curtidas=new Set(JSON.parse(localStorage.getItem("rtc:curtidas")||"[]"));}catch{}
// a foto do post: a arte da cena ao fundo e o protagonista na frente, num de vários jeitos sorteados pelo post (capa de
// revista, entrevista com a faixa, lance com o adesivo, polaroide, citação e o placar). Post sem protagonista (a
// repercussão da imprensa) fica só com a arte. A foto é a da TheSportsDB, com o boneco de reserva (corpoFoto).
const ARTES_FEED=["manchetes","viral","vestiario","hub-fundo","amizade","rivalidade"];
function arteDoPost(x,h){
  if(x.tipo==="decisao"&&x.evento)return "/jogador/popups/rtc-popup-"+x.evento+".webp";
  if(x.tipo==="visual")return "/jogador/cenas/viral.webp";
  if(x.tipo==="comemoracao")return "/jogador/cenas/comemoracao.webp";
  if(x.tipo==="momento"){const r=resultadoDoPost(x),l=r==="vitoria"?["gol-vitoria","comemoracao","viral"]:r==="derrota"?["gol-derrota","vestiario","departamento-medico"]:["rivalidade","vestiario","hub-fundo"];return "/jogador/cenas/"+l[h%3]+".webp";}
  if(x.tipo==="jogo")return "/jogador/cenas/"+(x.placar&&x.placar[0]!==x.placar[1]?["gol-vitoria","comemoracao"]:["rivalidade","hub-fundo"])[h%2]+".webp";
  if(x.tipo==="repercussao")return "/jogador/cenas/"+(/uni[ãa]o|respeito|amizade/i.test(x.texto)?"amizade":/provoca|rival|farpa|tens/i.test(x.texto)?"rivalidade":"manchetes")+".webp";
  return "/jogador/cenas/"+ARTES_FEED[h%ARTES_FEED.length]+".webp";
}
const protagonistaDoPost=(x,s)=>(x.autor&&s.jogadores.find(q=>q.avatar===x.autor))||(x.tipo==="jogo"&&s.jogadores.find(q=>q.clube===x.casa||q.clube===x.fora))||null;
const resultadoDoPost=x=>/Vitória/.test(x.texto)?"vitoria":/Derrota/.test(x.texto)?"derrota":"";
// a citação só nas respostas da entrevista (as únicas na primeira pessoa); as manchetes falam do jogador
function jeitoDoPost(x,h){
  if(x.tipo==="jogo")return "placar";
  if(x.tipo==="decisao")return ["entrevista","citacao","polaroide"][h%3];
  if(x.tipo==="momento"||x.tipo==="comemoracao")return ["lance","capa","polaroide"][h%3];
  if(x.tipo==="visual")return "polaroide";
  return ["capa","polaroide","lance"][h%3];
}
const curto=(t,n=96)=>{t=String(t||"");return t.length>n?t.slice(0,n-1).trimEnd()+"…":t;};
const ADESIVO={momento:"Em campo",vitoria:"Vitória!",derrota:"Dói",comemoracao:"Festa!",manchete:"Exclusivo",visual:"Novo visual",decisao:"Ao vivo",repercussao:"Repercute"};
function fotoDoPost(x,s,h){
  const arte='<img class="rtc-ig-arte" src="'+safe(arteDoPost(x,h))+'" alt="" loading="lazy" onerror="this.remove()">';
  const placar=x.tipo==="jogo"&&x.casa&&x.placar?'<div class="rtc-ig-placar">'+escudo(x.casa,46)+'<b>'+num(x.placar[0])+' – '+num(x.placar[1])+'</b>'+escudo(x.fora,46)+'</div>':"";
  const p=protagonistaDoPost(x,s);
  if(!p)return '<div class="rtc-ig-foto">'+arte+placar+'</div>';
  const jeito=jeitoDoPost(x,h),[c1,c2]=coresDe(p.clube),giro=((h>>>3)%9)-4;
  const corpo='<span class="rtc-ig-corpo">'+corpoFoto(p.arquetipo,p.figura,p.clube,200,p.avatar)+'</span>';
  const marca='<span class="rtc-ig-marca" aria-hidden="true">'+escudo(p.clube,120)+'</span>';
  const titulo=x.titulo||(x.tipo==="decisao"?"Entrevista":"");
  let meio="";
  if(jeito==="capa")meio=marca+'<b class="rtc-ig-revista" aria-hidden="true">'+safe(p.avatar)+'</b>'+corpo+'<p class="rtc-ig-chamada">'+safe(curto(x.texto,80))+'</p>';
  else if(jeito==="entrevista")meio=arte+corpo+'<p class="rtc-ig-faixa"><small>● Ao vivo'+(titulo?' · '+safe(titulo):'')+'</small><b>'+safe(p.avatar)+'</b>'+safe(nomeClube(p.clube))+'</p>';
  else if(jeito==="lance")meio=arte+corpo+'<b class="rtc-ig-adesivo" style="--giro:'+giro+'deg">'+safe(ADESIVO[x.tipo==="momento"&&resultadoDoPost(x)||x.tipo]||"Exclusivo")+'</b>';
  else if(jeito==="polaroide")meio=arte+'<figure class="rtc-ig-polaroide" style="--giro:'+giro+'deg"><span>'+corpoFoto(p.arquetipo,p.figura,p.clube,200,p.avatar)+'</span><figcaption>'+safe(curto(x.texto,48))+'</figcaption></figure>';
  else if(jeito==="citacao")meio=marca+corpo+'<blockquote class="rtc-ig-citacao">'+safe(curto(x.texto,110))+'<cite>'+safe(p.avatar)+'</cite></blockquote>';
  else meio=arte+corpo+placar;
  return '<div class="rtc-ig-foto jeito-'+jeito+'" style="--c1:'+safe(c1||"#3d7ae0")+';--c2:'+safe(c2||"#081230")+'">'+meio+'</div>';
}
const ROTULO_POST={decisao:"Entrevista",manchete:"Manchete",repercussao:"Repercussão",visual:"Visual novo",comemoracao:"Comemoração",jogo:"Resultado",momento:"Em campo",placar:"Resultado"};
// quem postou: o protagonista (pelo nome) ou o perfil da imprensa
function autorDoPost(x,s){
  const p=x.autor&&s.jogadores.find(q=>q.avatar===x.autor);
  if(p)return {p,nome:p.avatar,handle:slug(p.avatar)||"protagonista",av:rostoDe(p),sub:nomeClube(p.clube)};
  return {p:null,nome:"Diário da Champions",handle:"diariodachampions",av:'<span class="rtc-ig-logo">✦</span>',sub:"Imprensa",verificado:true};
}
const filtroDoFeed=(x,s,f)=>f==="todos"?true:f==="imprensa"?!x.autor||!s.jogadores.some(p=>p.avatar===x.autor):f==="meus"?x.autor===euDe(s).avatar:x.autor===s.jogadores.find(p=>p.id===f)?.avatar;
function postIG(x,s,k,compacto){
  const a=autorDoPost(x,s),chave=slug(x.texto).slice(0,40)+":"+x.rodada+":"+k,h=hashDe(x.texto+x.rodada);
  const amigos=s.jogadores.filter(p=>p.avatar!==x.autor),quem=amigos.length?amigos[h%amigos.length].avatar:"torcida_ucl";
  const curtiu=curtidas.has(chave),likes=180+h%9800+(curtiu?1:0);
  return '<article class="rtc-ig-post'+(compacto?" compacto":"")+'">'+
    '<header><span class="rtc-ig-av'+(a.p?" anel":"")+'">'+a.av+'</span><div><b>'+safe(a.handle)+(a.verificado?' <i class="rtc-ig-ok" title="Verificado">✓</i>':'')+'</b><small>'+safe(a.sub)+' · '+safe(rot(s,x.rodada||0)[0])+'</small></div><span class="rtc-ig-tipo">'+safe(ROTULO_POST[x.tipo]||"Notícia")+'</span></header>'+
    fotoDoPost(x,s,h)+
    '<div class="rtc-ig-acoes"><button type="button" data-curtir="'+safe(chave)+'" aria-pressed="'+curtiu+'" aria-label="Curtir">'+(curtiu?"♥":"♡")+'</button><span aria-hidden="true">💬</span><span aria-hidden="true">➤</span></div>'+
    '<p class="rtc-ig-likes">Curtido por <b>'+safe(quem)+'</b> e outras <b>'+milhar(likes)+'</b> pessoas</p>'+
    '<p class="rtc-ig-legenda"><b>'+safe(a.handle)+'</b> '+safe(x.texto)+'</p>'+
    (compacto?'':'<p class="rtc-ig-coment">Ver todos os '+(12+h%340)+' comentários</p>')+'</article>';
}
function abaFeed(s){
  const eu=euDe(s),f=tela.feed||"todos",lista=s.historico.filter(x=>filtroDoFeed(x,s,f));
  const story=(id,av,nome,anel)=>'<button type="button" class="rtc-ig-story'+(f===id?" ativo":"")+'" data-feed="'+safe(id)+'" aria-pressed="'+(f===id)+'"><span class="rtc-ig-av'+(anel?" anel":"")+'">'+av+'</span><small>'+safe(nome)+'</small></button>';
  return '<div class="rtc-ig"><div class="rtc-ig-coluna">'+
    '<nav class="rtc-ig-stories" aria-label="Filtrar o feed">'+story("todos",'<span class="rtc-ig-logo">✦</span>',"Todos",false)+story("meus",rostoDe(eu),"Você",true)+
      s.jogadores.filter(p=>p.id!==eu.id).map(p=>story(p.id,rostoDe(p),p.avatar,true)).join("")+story("imprensa",'<span class="rtc-ig-logo">📰</span>',"Imprensa",false)+'</nav>'+
    (lista.length?lista.map((x,k)=>postIG(x,s,k)).join(""):'<p class="rtc-muted rtc-ig-vazio">Nada por aqui ainda. As notícias saem depois das entrevistas e dos jogos.</p>')+
    '</div><aside class="rtc-ig-lado">'+(s.jogadores.length>1?tileLacos(s,eu):"")+tileAtributos(eu)+tileEstilo(eu)+'</aside></div>';
}
function telaJogo(s){
  const eu=euDe(s),cor=coresDe(eu.clube)[0]||"#3d7ae0";
  // os avisos nas abas, como a caixa de entrada do FIFA: a decisão pendente na Central e as notícias do último capítulo no Diário
  const novos=s.historico.filter(x=>x.rodada===Math.max(0,s.capitulo-1)&&x.tipo!=="decisao").length;
  const avisos={central:s.evento?1:0,diario:s.capitulo>0?novos:0};
  app.innerHTML='<div class="rtc-hub" style="--cor:'+safe(cor)+'"><div class="rtc-hub-topo">'+cartaoHub(s,eu)+
    '<div class="rtc-hub-status"><span>'+(ehLiga(s)?'RODADA <b>'+(s.capitulo+1)+'/17</b>':'CAP <b>'+(s.capitulo+1)+'/5</b>')+'</span><span>VITÓRIAS <b>'+num(eu.vitorias)+'</b></span><span>SALA <b>'+safe(s.codigo)+'</b></span>'+
    '<button type="button" class="rtc-hub-convite" data-acao="copiar" title="Copiar o código da sala">Convidar</button></div></div>'+
    '<nav class="rtc-hub-abas" role="tablist" aria-label="Painéis">'+[["central","Central"],["tabela","Classificação"],["diario","Feed"]].map(([id,t])=>
      '<button type="button" class="rtc-hub-aba" role="tab" data-aba="'+id+'" aria-selected="'+(tela.aba===id)+'"><span>'+t+(avisos[id]?'<i>'+avisos[id]+'</i>':'')+'</span></button>').join("")+'</nav>'+
    '<h1 class="rtc-sr">'+safe(rot(s,s.capitulo)[1]||"A Champions")+'</h1>'+
    (tela.aba==="tabela"?abaClassificacao(s):tela.aba==="diario"?abaFeed(s):centralHub(s))+'</div>'+cenaHTML(s)+momentoHTML(s);
  const box=app.querySelector(".rtc-cena");if(box&&tela.cena?.foco){tela.cena.foco=false;box.querySelector("h2")?.focus();}
  const mom=s.jornada?.momento,chaveMom=mom&&mom.jogo+":"+mom.id+":"+mom.respondido;
  if(mom&&tela.momento!==chaveMom){tela.momento=chaveMom;app.querySelector("#rtc-mom-titulo")?.focus();}
}

// ---------- a cena da decisão (entrevista) e o pré-jogo ----------
const chaveCena=s=>"rtc:cena:"+s.codigo+":"+s.capitulo;
function abrirCenaSePreciso(s){
  if(!s||s.fase!=="jogando"){if(tela.cena&&!s?.evento)tela.cena=null;return;}
  if(window.RoadPartida&&RoadPartida.aberta)return; // a cena do próximo capítulo espera o fim do jogo ao vivo
  if(window.RoadDublagem&&RoadDublagem.aberta)return; // a cena dublada está passando
  if(s.jornada)return; // a rodada está rolando (os momentos do jogo vêm antes de tudo)
  if(abrirVozSePreciso(s))return;
  if(!s.evento){if(tela.cena&&!tela.cena.soTatica)tela.cena=null;return;}
  if(tela.cena&&tela.cena.id===s.evento.id+":"+s.capitulo)return;
  let visto=false;try{visto=sessionStorage.getItem(chaveCena(s))==="1";}catch{}
  if(!visto)tela.cena={id:s.evento.id+":"+s.capitulo,passo:"cena",opcao:null,tatica:"equilibrado",foco:true};
}
// ---------- as cenas dubladas (road-dublagem.js) ----------
// A ordem: o callback que voltou depois do jogo, o prelúdio do capítulo e a versão dublada da entrevista. Tudo só
// neste navegador: o servidor manda em s.voz o que é deste jogador, e o áudio não passa pela sala.
const chaveVoz=(s,id)=>"rtc:voz:"+s.codigo+":"+id;
const guardado=(area,k)=>{try{return window[area].getItem(k)==="1";}catch{return false;}};
const guardar=(area,k)=>{try{window[area].setItem(k,"1");}catch{}};
function abrirVozSePreciso(s){
  const D=window.RoadDublagem;if(!D)return false;
  if(!D.carregado){D.carregar().then(()=>{if(sala)desenhar();});return true;} // alguns KB; a cena espera por eles
  const eu=euDe(s),v=s.voz||{},cor=coresDe(eu.clube)[0]||"#3d7ae0",base={protagonista:eu.avatar,cor,foto:urlFoto(eu.arquetipo,"recorte"),ctx:v.narrativa||{}};
  const cb=(v.cenas||[]).find(c=>!guardado("localStorage",chaveVoz(s,c.id)));
  if(cb&&D.cenaDe("callback",cb.id)){
    D.tocar({...base,tipo:"callback",id:cb.id,ramo:cb.ramo,kicker:"Coletiva pós-jogo · "+(rot(s,cb.rodada)[1]||""),
      aoFechar:()=>{guardar("localStorage",chaveVoz(s,cb.id));desenhar();}});
    return true;
  }
  const pre=v.preludio;
  if(pre&&!guardado("sessionStorage",chaveVoz(s,pre.id))&&D.cenaDe("preludio",pre.id)){
    D.tocar({...base,tipo:"preludio",id:pre.id,opcoes:pre.opcoes,podeAdiar:true,kicker:"★ Só na sua história · Antes da estreia",
      aoEscolher:async o=>{
        const r=await pedido("preludio",{id:pre.id,opcao:o.id});
        if(!r.ok){toast(r.error);return false;}
        if(r.estado)sala=r.estado; // sem redesenhar: a cena continua por cima
        return true;
      },
      aoFechar:()=>{guardar("sessionStorage",chaveVoz(s,pre.id));desenhar();}});
    return true;
  }
  const ev=s.evento,id=ev&&ev.id+":"+s.capitulo;
  if(ev&&D.cenaDe("evento",ev.id)&&!guardado("sessionStorage",chaveCena(s))&&!guardado("sessionStorage",chaveVoz(s,id))&&!(tela.cena&&tela.cena.id===id)){
    D.tocar({...base,tipo:"evento",id:ev.id,opcoes:ev.opcoes,podeAdiar:true,
      kicker:(ev.exclusivo?"★ Só na sua história":"Decisão que muda o seu legado")+" · "+(rot(s,s.capitulo)[1]||""),
      // a resposta da cena é a da entrevista: o pré-jogo vem em seguida e o "Confirmar" manda as duas ao servidor
      aoFechar:({opcao,adiou})=>{
        guardar("sessionStorage",chaveVoz(s,id));
        if(adiou){guardar("sessionStorage",chaveCena(s));tela.cena=null;}
        else tela.cena={id,passo:opcao!=null?"jogo":"cena",opcao:opcao??null,tatica:"equilibrado",foco:true,travada:opcao!=null};
        desenhar();
      }});
    return true;
  }
  return false;
}
function paredeDePatrocinio(){
  let s="";for(let y=0;y<8;y++)for(let x=0;x<6;x++)s+='<span style="left:'+(x*19-(y%2)*9)+'%;top:'+(y*14)+'%">✦ ROAD TO CHAMPIONS</span>';
  return s;
}
const iconeTatica={
  equilibrado:'<svg viewBox="0 0 54 40"><rect x="1" y="1" width="52" height="38" fill="none" stroke="#ffffff55"/><path d="M27 1v38" stroke="#ffffff33"/>'+[[14,10],[14,30],[24,20],[34,10],[34,30],[44,20]].map(([x,y])=>'<circle cx="'+x+'" cy="'+y+'" r="3" fill="#dfe7f6"/>').join("")+'</svg>',
  pressionar:'<svg viewBox="0 0 54 40"><rect x="1" y="1" width="52" height="38" fill="none" stroke="#ffffff55"/><path d="M27 1v38" stroke="#ffffff33"/>'+[[32,8],[32,20],[32,32],[42,12],[42,28],[48,20]].map(([x,y])=>'<circle cx="'+x+'" cy="'+y+'" r="3" fill="#ffd23f"/>').join("")+'<path d="M18 20h10m-3-3 3 3-3 3" stroke="#ffd23f" fill="none"/></svg>',
  recuar:'<svg viewBox="0 0 54 40"><rect x="1" y="1" width="52" height="38" fill="none" stroke="#ffffff55"/><path d="M27 1v38" stroke="#ffffff33"/>'+[[8,8],[8,20],[8,32],[15,12],[15,28],[22,20]].map(([x,y])=>'<circle cx="'+x+'" cy="'+y+'" r="3" fill="#7fb6ff"/>').join("")+'<path d="M30 20h16m-3-3 3 3-3 3" stroke="#7fb6ff" fill="none"/></svg>',
};
function cenaHTML(s){
  const c=tela.cena,ev=s.evento;
  if(!c||(!ev&&!c.soTatica))return "";
  if(c.soTatica&&(s.jornada||s.evento)){tela.cena=null;return "";}
  const eu=euDe(s),cor=coresDe(eu.clube)[0]||"#3d7ae0";
  const fechar='<button class="rtc-button ghost rtc-cena-fechar" data-acao="fechar-cena">Decidir depois</button>';
  if(c.passo==="cena"){
    const arte='<div class="rtc-cena-arte" style="--cor:'+safe(cor)+'"><div class="rtc-cena-parede">'+paredeDePatrocinio()+'</div>'+
      '<img src="/jogador/popups/rtc-popup-'+safe(ev.id)+'.webp" alt="" onerror="this.remove()">'+
      '<span class="rtc-cena-fig">'+figura(eu,190)+'</span>'+
      (window.RoadDublagem&&RoadDublagem.cenaDe("evento",ev.id)?'<button class="rtc-button ghost rtc-cena-voz" data-acao="ver-cena-voz">▶ Ver a cena dublada</button>':'')+
      '<svg class="rtc-cena-mic" viewBox="0 0 46 120" aria-hidden="true"><rect x="12" y="2" width="22" height="34" rx="11" fill="#1c1c22" stroke="#555"/><rect x="21" y="36" width="4" height="84" fill="#111"/><rect x="8" y="40" width="30" height="14" fill="#7fb6ff" opacity=".8"/></svg>'+fechar+'</div>';
    return '<div class="rtc-cena" role="dialog" aria-modal="true" aria-labelledby="rtc-cena-titulo"><div class="rtc-cena-caixa">'+arte+
      '<div class="rtc-cena-texto"><span class="rtc-kicker'+(ev.exclusivo?" exclusivo":"")+'">'+(ev.exclusivo?"★ Só na sua história":"Decisão que muda o seu legado")+' · '+safe(rot(s,s.capitulo)[1]||"")+'</span>'+
      '<h2 id="rtc-cena-titulo" tabindex="-1">'+safe(ev.titulo)+'</h2><div class="rtc-legenda">'+safe(ev.texto)+'</div>'+
      '<div class="rtc-opcoes-cena">'+ev.opcoes.map((x,i)=>'<button type="button" class="rtc-escolha'+(x.propria?" propria":"")+'" data-escolha="'+x.id+'" aria-pressed="'+(c.opcao===x.id)+'">'+
        '<span class="rtc-escolha-n">'+(i+1)+'</span><span><b>'+safe(x.texto)+'</b><small>'+safe(x.dica)+'</small></span><span class="rtc-tom tom-'+safe(x.tom)+'">'+(x.propria?"★ Só sua · ":"")+safe(TOM[x.tom]||"")+'</span></button>').join("")+'</div>'+
      '<div class="rtc-cena-pe"><span class="rtc-passos"><b>1 Resposta</b> · 2 Pré-jogo</span><button class="rtc-button primary" data-acao="cena-proximo"'+(c.opcao==null?" disabled":"")+'>Continuar →</button></div></div></div></div>';
  }
  const j=meuJogo(s,s.capitulo);
  const lado=id=>{const c2=clubes.get(id),dono=s.jogadores.find(p=>p.clube===id);return '<div class="lado">'+escudo(id,52)+'<div><b>'+safe(nomeClube(id))+'</b><small>'+(dono?safe(dono.avatar):"Computador")+(c2?" · força "+num(c2.forca):"")+'</small></div></div>';};
  const escolhida=ev?ev.opcoes.find(x=>x.id===c.opcao):null;
  // no pré-jogo sozinho (rodada sem entrevista) só a estratégia; com a entrevista, a resposta e a estratégia vão juntas
  const pe=c.soTatica?'<button class="rtc-button ghost" data-acao="fechar-tatica">Cancelar</button><button class="rtc-button ouro" data-acao="salvar-tatica">Salvar estratégia</button>':
    (c.travada?'<span class="rtc-cena-resposta">Resposta: <b>'+safe(escolhida?escolhida.texto:"")+'</b></span>':
      '<button class="rtc-button ghost" data-acao="cena-voltar">← Resposta: '+safe(escolhida?escolhida.texto:"")+'</button>')+
    '<button class="rtc-button ouro" data-acao="decidir">Confirmar escolhas</button>';
  return '<div class="rtc-cena" role="dialog" aria-modal="true" aria-labelledby="rtc-cena-titulo"><div class="rtc-cena-caixa"><div class="rtc-gramado">'+
    '<span class="rtc-kicker">Pré-jogo · '+safe(rot(s,s.capitulo)[1]||"")+'</span><h2 id="rtc-cena-titulo" tabindex="-1">Como o clube entra em campo</h2>'+
    (j?'<div class="rtc-prejogo-confronto">'+lado(j.casa)+'<em>×</em>'+lado(j.fora)+'</div>':'<p class="rtc-small">Seu clube não joga nesta rodada; a escolha vale para o registro da história.</p>')+
    '<div class="rtc-taticas" role="radiogroup" aria-label="Estratégia">'+TATICAS.map(([id,nome,texto])=>'<button type="button" class="rtc-tatica" role="radio" data-tatica="'+id+'" aria-pressed="'+(c.tatica===id)+'" aria-checked="'+(c.tatica===id)+'">'+
      iconeTatica[id]+'<span><b>'+nome+'</b><br><small>'+texto+'</small></span></button>').join("")+'</div>'+
    '<p class="rtc-aviso-jogo">O jogo passa pelo mesmo motor da Carreira, minuto a minuto, com o elenco do clube: a estratégia muda como o time joga, e a forma do protagonista mexe no time inteiro. '+
      'Aos 25\', no intervalo e aos 70\' o jogo para e você decide como joga: voltar para marcar, guardar fôlego para o contra-ataque, pressionar, pedir a bola. Isso muda o placar.</p></div>'+
    '<div class="rtc-cena-texto"><div class="rtc-cena-pe">'+pe+'</div></div></div></div>';
}

// ---------- o epílogo ----------
function final(s){
  const fin=s.jogos.find(j=>j.etapa==="final"),eu=euDe(s);
  app.innerHTML='<div class="rtc-entra"><section class="rtc-taca"><span class="rtc-kicker">Epílogo</span><h1>Uma taça. <em>Seis destinos.</em></h1>'+
    '<div class="rtc-taca-campeao">'+escudo(s.campeao,64)+'<div style="text-align:left"><span class="rtc-label">Campeão da Champions</span><br><b>'+safe(nomeClube(s.campeao))+'</b></div></div></section>'+
    '<div class="rtc-destinos">'+s.epilogos.map(ep=>{
      const p=s.jogadores.find(x=>x.id===ep.jogador)||s.jogadores.find(x=>x.avatar===ep.avatar);
      return '<article class="rtc-destino" style="--cor:'+safe(coresDe(ep.clube)[0]||"#3d7ae0")+'">'+(p?figura(p,70):"")+'<div><span class="rtc-kicker">'+safe(ep.avatar)+' · '+safe(nomeClube(ep.clube))+'</span>'+
        '<h3>'+safe(ep.titulo)+'</h3><p>'+safe(ep.descricao)+'</p>'+(ep.campeao?'<span class="campeao">✦ CAMPEÃO DA CHAMPIONS</span>':'')+'</div></article>';
    }).join("")+'</div>'+
    '<div class="rtc-duas-col" style="margin-top:16px"><section class="rtc-bloco rtc-escuro"><span class="rtc-kicker">O último apito</span>'+(fin?jogoHTML(fin,eu):"")+
      '<div style="margin-top:16px"><button class="rtc-button primary" data-acao="sair">Começar outra história</button></div></section>'+
    '<section class="rtc-bloco rtc-escuro"><span class="rtc-kicker">Diário da Champions</span><div class="rtc-posts">'+s.historico.slice(0,8).map(x=>postHTML(x,s)).join("")+'</div></section></div></div>';
}

function centralizarHeroi(){
  const fila=app.querySelector(".rtc-herois"),sel=fila&&fila.querySelector('[aria-checked="true"]');
  if(fila&&sel&&fila.scrollWidth>fila.clientWidth)fila.scrollLeft=sel.offsetLeft-(fila.clientWidth-sel.offsetWidth)/2;
}
function desenhar(){
  desenharTela();centralizarHeroi();
}
function desenharTela(){
  if(!sala)paginaInicial();
  else if(sala.fase==="lobby")paginaLobby(sala);
  else if(sala.fase==="jogando"){abrirCenaSePreciso(sala);telaJogo(sala);}
  else final(sala);
  document.body.classList.toggle("rtc-com-hub",sala?.fase==="jogando"); // o fundo da central: a cidade à noite, borrada
}
// os campos de texto da entrada guardam no rascunho, para sobreviver aos redesenhos
function lerCampos(){
  const v=id=>document.getElementById(id)?.value;
  if(v("rtc-nome")!=null)rascunho.nome=v("rtc-nome");
  if(v("rtc-avatar")!=null)rascunho.avatar=v("rtc-avatar");
  if(v("rtc-code")!=null)rascunho.codigo=v("rtc-code");
}
const identidade=()=>({nome:rascunho.nome,avatar:rascunho.avatar,arquetipo:rascunho.arquetipo,figura:rascunho.figura});

app.addEventListener("click",async e=>{
  const alvo=e.target.closest("button");if(!alvo||alvo.disabled||alvo.getAttribute("aria-disabled")==="true")return;
  const ds=alvo.dataset;
  if(ds.arq){lerCampos();escolherArquetipo(ds.arq);desenhar();app.querySelector('[data-arq="'+ds.arq+'"]')?.focus();return;}
  if(ds.etapa){lerCampos();tela.etapa=ds.etapa;desenhar();window.scrollTo({top:0});return;}
  if(ds.cat){tela.cat=ds.cat;const box=app.querySelector(".rtc-custom");if(box){lerCampos();box.outerHTML=editorVisual();app.querySelector('[data-cat="'+ds.cat+'"]')?.focus();}return;}
  if(ds.op!=null){
    const cat=CATS.find(c=>c.id===tela.cat);if(!cat)return;
    rascunho.figura[cat.parte][cat.id]=cat.n?Number(ds.op):ds.op;atualizarEditor();
    app.querySelector('[data-op="'+CSS.escape(ds.op)+'"]')?.focus();return;
  }
  if(ds.aba){tela.aba=ds.aba;desenhar();return;}
  if(ds.noticia!=null){tela.noticia=Number(ds.noticia);desenhar();app.querySelector('[data-noticia="'+ds.noticia+'"]')?.focus();return;}
  if(ds.rever){RoadPartida.rever(sala,ds.rever);return;}
  if(ds.feed){tela.feed=ds.feed;desenhar();app.querySelector('[data-feed="'+CSS.escape(ds.feed)+'"]')?.focus();return;}
  if(ds.curtir){if(curtidas.has(ds.curtir))curtidas.delete(ds.curtir);else curtidas.add(ds.curtir);
    try{localStorage.setItem("rtc:curtidas",JSON.stringify([...curtidas].slice(-400)));}catch{}desenhar();return;}
  if(ds.momento){
    if(ocupado)return;ocupado=true;alvo.disabled=true;
    const r=await pedido("momento",{opcao:ds.momento});ocupado=false;
    if(!r.ok){toast(r.error);alvo.disabled=false;return;}
    if(r.estado)setSala(r);return;
  }
  if(ds.escolha!=null){tela.cena.opcao=Number(ds.escolha);desenhar();app.querySelector('[data-escolha="'+ds.escolha+'"]')?.focus();return;}
  if(ds.tatica){tela.cena.tatica=ds.tatica;desenhar();app.querySelector('[data-tatica="'+ds.tatica+'"]')?.focus();return;}
  const acao=ds.acao;if(!acao||ocupado)return;
  if(acao==="sair"){window.RoadDublagem?.parar();localStorage.removeItem(storage.code);localStorage.removeItem(storage.token);location.reload();return;}
  if(acao==="copiar"){
    const code=sala?.codigo||"";
    try{await navigator.clipboard.writeText(code);toast("Código copiado: "+code);}catch{toast("Código da campanha: "+code);}
    return;
  }
  if(acao==="abrir-editor"){tela.editor=true;tela.cat="pele";desenhar();window.scrollTo({top:0});return;}
  if(acao==="fechar-editor"){tela.editor=false;rascunho.de=null;desenhar();return;}
  if(acao==="abrir-tatica"){tela.cena={id:"tatica:"+sala.capitulo,passo:"jogo",soTatica:true,opcao:null,tatica:sala.tatica||"equilibrado",foco:true};desenhar();return;}
  if(acao==="fechar-tatica"){tela.cena=null;desenhar();return;}
  if(acao==="abrir-cena"){tela.cena={id:sala.evento.id+":"+sala.capitulo,passo:"cena",opcao:null,tatica:"equilibrado",foco:true};desenhar();return;}
  if(acao==="fechar-cena"){try{sessionStorage.setItem(chaveCena(sala),"1");}catch{}tela.cena=null;desenhar();return;}
  if(acao==="cena-proximo"){tela.cena.passo="jogo";tela.cena.foco=true;desenhar();return;}
  if(acao==="cena-voltar"){tela.cena.passo="cena";tela.cena.foco=true;desenhar();return;}
  if(acao==="ver-cena-voz"){try{sessionStorage.removeItem(chaveVoz(sala,sala.evento.id+":"+sala.capitulo));sessionStorage.removeItem(chaveCena(sala));}catch{}tela.cena=null;desenhar();return;}
  lerCampos();
  let evento=null,dados={};
  if(acao==="criar"){evento="criar";dados=identidade();}
  if(acao==="entrar"){evento="entrar";dados={...identidade(),codigo:rascunho.codigo};}
  if(acao==="mudar"){evento="protagonista";const i=identidade();dados={arquetipo:i.arquetipo,figura:i.figura,avatar:i.avatar};}
  if(acao==="iniciar")evento="iniciar";
  if(acao==="avancar")evento="avancar";
  if(acao==="simularFim")evento="simularFim";
  if(acao==="decidir"){evento="decidir";dados={opcao:tela.cena.opcao,tatica:tela.cena.tatica};}
  if(acao==="salvar-tatica"){evento="tatica";dados={tatica:tela.cena.tatica};}
  if(!evento)return;
  if((acao==="criar"||acao==="entrar")&&rascunho.nome)try{localStorage.setItem("galera:name",rascunho.nome);}catch{}
  ocupado=true;alvo.disabled=true;
  const r=await pedido(evento,dados);ocupado=false;
  if(!r.ok){toast(r.error);alvo.disabled=false;return;}
  if(acao==="mudar"){tela.editor=false;rascunho.de=null;}
  if(acao==="decidir"){tela.cena=null;toast("Escolha registrada. A imprensa já está escrevendo.");}
  if(acao==="salvar-tatica"){tela.cena=null;toast("Estratégia salva para os próximos jogos.");}
  if(acao==="avancar"||acao==="simularFim")tela.aba="central";
  if(r.estado)setSala(r);
});
// os campos de número e do corpo mudam só o rascunho e o desenho
app.addEventListener("input",e=>{
  const campo=e.target.dataset?.ap;
  if(campo){
    const [parte,chave]=campo.split("."),alvo=rascunho.figura[parte],base=R.PERSONAGENS[rascunho.arquetipo].figura[parte];
    if(chave==="numero")alvo.numero=Math.max(1,Math.min(99,Math.round(Number(e.target.value))||base.numero));
    else alvo[chave]=Number(e.target.value);
    atualizarEditor();return;
  }
  if(e.target.id==="rtc-avatar"){rascunho.avatar=e.target.value;return;}
  if(e.target.id==="rtc-nome"){rascunho.nome=e.target.value;return;}
  // com um código de sala, bloqueia os protagonistas que já têm dono
  if(e.target.id==="rtc-code"){
    rascunho.codigo=e.target.value;
    clearTimeout(timerCodigo);
    const codigo=e.target.value.trim();
    timerCodigo=setTimeout(async()=>{
      if(codigo.length<5){ocupadosNaSala=[];return;}
      const r=await pedido("ocupados",{codigo});
      if(sala)return;
      ocupadosNaSala=r.ok?r.ocupados:[];
      if(ocupadosNaSala.includes(rascunho.arquetipo)){
        toast(R.PERSONAGENS[rascunho.arquetipo].titulo+" já tem dono nessa sala. Escolha outro protagonista.");
        const livre=R.IDS.find(id=>!ocupadosNaSala.includes(id));if(livre)escolherArquetipo(livre);
        tela.etapa="protagonista";desenhar();
      }
    },350);
  }
});
document.addEventListener("keydown",e=>{
  if(e.key==="Escape"&&tela.cena&&sala&&!RoadPartida.aberta&&!window.RoadDublagem?.aberta){try{sessionStorage.setItem(chaveCena(sala),"1");}catch{}tela.cena=null;desenhar();}
});
socket.on("catalogo",list=>{catalogo=Array.isArray(list)?list:[];clubes=new Map(catalogo.map(c=>[c.id,c]));desenhar();});
socket.on("estado",data=>{
  // não redesenha o editor do vestiário no meio da edição
  sala=data;relogio=(data.agora||Date.now())-Date.now();RoadPartida.verificar(sala); // antes de desenhar: com o jogo ao vivo aberto, a cena do capítulo espera
  // a cena dublada não toca por cima do jogo ao vivo, e a da entrevista sai se a decisão já foi feita (outra aba)
  const D=window.RoadDublagem,at=D?.atual;
  if(at&&(RoadPartida.aberta||data.jornada?.momento||(at.tipo==="evento"&&data.evento?.id!==at.id)))D.parar();
  if(!(data.fase==="lobby"&&tela.editor))desenhar();
});
socket.on("connect",async()=>{
  conexao.textContent="● Online";
  const codigo=localStorage.getItem(storage.code),token=localStorage.getItem(storage.token);
  if(codigo&&token){
    const r=await pedido("retomar",{codigo,token});
    if(r.ok)setSala(r);else{localStorage.removeItem(storage.code);localStorage.removeItem(storage.token);sala=null;desenhar();}
  }
});
socket.on("disconnect",()=>{conexao.textContent="○ Desconectado";});
// a partida ao vivo (road-partida.js) usa os mesmos desenhos da página; ao fechar, a central volta (e a cena, se houver)
RoadPartida.configurar({pedido,nomeClube,escudo,clube:id=>clubes.get(id),
  cabecaDe:id=>{const p=sala?.jogadores.find(x=>x.clube===id);return p?'<span class="rtc-av-cab">'+rostoDe(p)+'</span>'+safe(p.avatar):"";},
  aoFechar:()=>desenhar()});
// #debug: para os testes e as fotos
if(location.hash==="#debug")window.__rtc={tela,rascunho,get sala(){return sala;},desenhar};
desenhar();
})();
