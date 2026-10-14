// Road to Champions — as telas do modo narrativo multiplayer, no jeito de "A Jornada".
// O servidor define escolhas, confrontos e resultados; a página só desenha e manda os comandos.
// Telas: entrada em três etapas (protagonista, visual, sala), vestiário (lobby), central (o apartamento, com as abas
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
// o nome do capítulo, curto no celular
const rotuloCap=i=>'<span class="longo">'+safe(CAPITULOS[i][0])+'</span><span class="curto">'+safe(CAPITULOS[i][2])+'</span>';
const ETAPAS=[["protagonista","Protagonista"],["visual","Visual"],["sala","Sala"]];
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
const tela={etapa:"protagonista",cat:"pele",aba:"central",editor:false,cena:null};
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
  if(r.estado){sala=r.estado;desenhar();}
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
function figura(p,tam=44){
  if(!p||!p.figura)return '<span class="rtc-fig"></span>';
  return '<span class="rtc-fig">'+figuraSVG(p.figura,p.clube,tam,p.avatar)+'</span>';
}
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
    return '<div class="rtc-lt-ponto '+cl+'">'+(e?'<span class="rtc-lt-cabeca">'+cabeca(fig,d.clube)+'</span>':"")+
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
      '<span class="rtc-fig">'+figuraSVG(fig,d.clube,sel?132:96,d.titulo)+'</span><small>'+safe(d.titulo.replace(/^(O|A) /,""))+'</small>'+
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
  return '<div class="rtc-entrada"><section class="rtc-bloco rtc-cartao-heroi">'+figuraSVG(rascunho.figura,d.clube,120,d.titulo)+
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
  const prox=tela.etapa==="protagonista"?'<button class="rtc-button primary" data-etapa="visual">Personalizar →</button><button class="rtc-button ghost" data-etapa="sala">Já tenho código</button>':"";
  let corpo="";
  if(tela.etapa==="protagonista")corpo=palco(ocupadosNaSala,null,prox,"Escolha o protagonista")+infoHeroi();
  else if(tela.etapa==="visual")corpo=editorVisual()+'<div class="rtc-custom-pe"><button class="rtc-button ghost" data-etapa="protagonista">← Protagonista</button>'+
    '<p class="rtc-small">Nada no visual muda força, forma ou lesões.</p><button class="rtc-button primary" data-etapa="sala">Continuar →</button></div>';
  else corpo=paginaSala()+'<div class="rtc-custom-pe"><button class="rtc-button ghost" data-etapa="visual">← Visual</button></div>';
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
    if(!p)return '<div class="rtc-armario vazio" style="--cor:'+safe(cor)+'">'+'<span class="rtc-fig">'+figuraSVG(d.figura,d.clube,78,d.titulo)+'</span><b>Vaga aberta</b><small>'+safe(d.titulo)+'<br>'+safe(nomeClube(d.clube))+'</small></div>';
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

// ---------- a central (o apartamento) ----------
const euDe=s=>s.jogadores.find(p=>p.id===s.eu);
const meuJogo=(s,cap)=>{const eu=euDe(s);return s.jogos.find(j=>j.rodada===cap&&(j.casa===eu.clube||j.fora===eu.clube))||null;};
function resultadoPara(j,clube){
  const r=j&&j.resultado;if(!r)return null;
  const meu=j.casa===clube?r.casa:r.fora,deles=j.casa===clube?r.fora:r.casa;
  const ganhou=r.vencedor?r.vencedor===clube:meu>deles;
  return {placar:meu+"–"+deles,cls:r.vencedor?(ganhou?"v":"d"):meu>deles?"v":meu<deles?"d":"e"};
}
function tileAvancar(s){
  const eu=euDe(s),cap=s.capitulo,j=meuJogo(s,cap);
  const cal='<div class="rtc-cal">'+CAPITULOS.map(([curto],i)=>{
    const jj=meuJogo(s,i),r=resultadoPara(jj,eu.clube);
    return '<div class="rtc-cal-dia '+(i===cap?"agora ":"")+(r?r.cls:"")+'"><b>'+rotuloCap(i)+'</b><span>'+(r?safe(r.placar):i===cap?"Hoje":i<cap?"—":"·")+'</span></div>';
  }).join("")+'</div>';
  let confronto;
  if(j){
    const outro=j.casa===eu.clube?j.fora:j.casa,dono=s.jogadores.find(p=>p.clube===outro);
    const lado=(id,extra)=>'<div class="rtc-confronto-lado">'+escudo(id,40)+'<div><b>'+safe(nomeClube(id))+'</b><small>'+safe(extra)+'</small></div></div>';
    confronto='<div class="rtc-confronto">'+lado(j.casa,j.casa===eu.clube?"Você":(dono&&dono.clube===j.casa?dono.avatar:"Computador"))+'<span class="rtc-confronto-x">×</span>'+
      lado(j.fora,j.fora===eu.clube?"Você":(dono&&dono.clube===j.fora?dono.avatar:"Computador"))+'</div>';
  }else confronto='<p class="rtc-small" style="margin:0">Seu clube está fora da disputa. A história segue: você ainda decide e acompanha os jogos.</p>';
  let acao;
  if(s.evento)acao='<p><b>Decisão pendente:</b> '+safe(s.evento.titulo)+'</p><button class="rtc-button" data-acao="abrir-cena">Abrir a cena →</button>';
  else if(s.dono===s.eu)acao='<p>'+s.prontos+' de '+s.jogadores.length+' protagonistas decidiram.</p><button class="rtc-button" data-acao="avancar"'+(s.prontos!==s.jogadores.length?' disabled':'')+'>Jogar a '+safe(CAPITULOS[cap]?.[0]||"jornada")+' →</button>';
  else acao='<p>Escolha registrada. '+s.prontos+' de '+s.jogadores.length+' decidiram; o anfitrião começa a jornada.</p>';
  const f=eu.forma;
  const forma=f?'<span class="rtc-forma '+(f.valor<0?"mal":f.valor>0?"bem":"")+'">Forma na última jornada: '+(f.valor>0?"+":"")+f.valor+(f.motivos?.length?" · "+safe(f.motivos.join(", ")):"")+'</span>':"";
  return '<section class="rtc-tile avancar largo"><div class="rtc-tile-topo"><h3>Avançar »</h3><small>'+safe(CAPITULOS[cap]?.[1]||"")+'</small></div>'+
    '<div class="rtc-tile-corpo">'+confronto+cal+'<div class="rtc-avancar-pe">'+acao+'</div>'+forma+'</div></section>';
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
  const av=autor?cabeca(autor.figura,autor.clube):x.clube?escudo(x.clube,24):'✦';
  const handle=x.autor?"@"+String(x.autor).normalize("NFD").replace(/[̀-ͯ]/g,"").replace(/[^A-Za-z0-9]/g,""):"@DiarioChampions";
  return '<article class="rtc-post"><span class="rtc-post-av">'+av+'</span><div><div class="rtc-post-topo"><b>'+safe(x.autor||"Diário da Champions")+'</b><span>'+safe(handle)+' · cap. '+(num(x.rodada)+1)+'</span><i>'+safe(TIPOS_FEED[x.tipo]||"NOTÍCIA")+'</i></div>'+
    '<p>'+safe(x.texto)+'</p></div></article>';
}
function tileSocial(s,limite=4){
  const itens=s.historico.slice(0,limite);
  return '<section class="rtc-tile"><div class="rtc-tile-topo"><h3>Social</h3><small>'+s.historico.length+' posts</small></div><div class="rtc-tile-corpo"><div class="rtc-posts">'+
    (itens.length?itens.map(x=>postHTML(x,s)).join(""):'<p class="rtc-muted" style="margin:0">As primeiras manchetes saem depois das decisões.</p>')+'</div></div></section>';
}
function tabelaHTML(s,g,eu,compacta){
  const linhas=s.grupos?.[g]||[];
  return '<table class="rtc-table"><thead><tr><th>Grupo '+g+'</th><th>Pts</th><th>J</th>'+(compacta?'':'<th>V</th><th>E</th><th>D</th>')+'<th>SG</th></tr></thead><tbody>'+
    linhas.map((t,i)=>'<tr class="'+(t.clube===eu.clube?"meu ":"")+(i<2?"passa":"")+'"><td><span class="clube">'+escudo(t.clube,20)+'<span>'+safe(nomeClube(t.clube))+'</span></span></td><td>'+num(t.p)+'</td><td>'+num(t.j)+'</td>'+
      (compacta?'':'<td>'+num(t.v)+'</td><td>'+num(t.e)+'</td><td>'+num(t.d)+'</td>')+'<td>'+(t.sg>0?"+":"")+num(t.sg)+'</td></tr>').join("")+'</tbody></table>';
}
function tileTabela(s,eu){
  const g=s.equipes?.find(e=>e.id===eu.clube)?.grupo||"A";
  return '<section class="rtc-tile"><div class="rtc-tile-topo"><h3>Classificação</h3><small>Os dois primeiros passam</small></div><div class="rtc-tile-corpo">'+tabelaHTML(s,g,eu,true)+'</div></section>';
}
function tileLacos(s,eu){
  const outros=s.jogadores.filter(p=>p.id!==eu.id);
  return '<section class="rtc-tile"><div class="rtc-tile-topo"><h3>Destinos cruzados</h3><small>Laços e rivalidades</small></div><div class="rtc-tile-corpo">'+
    (outros.length?outros.map(p=>{
      const v=num(eu.relacoes?.[p.id]),tipo=v>10?["Respeito","bom"]:v<-10?["Rivalidade","mau"]:["Neutro","neutro"];
      const laco=(s.lacos||[]).find(l=>(l.a===eu.id&&l.b===p.id)||(l.b===eu.id&&l.a===p.id));
      return '<div class="rtc-laco"><span class="rtc-laco-av">'+cabeca(p.figura,p.clube,p.avatar)+'</span><div><b>'+safe(p.avatar)+'</b><small>'+safe(laco?laco.texto:nomeClube(p.clube))+'</small>'+
        '<div class="rtc-laco-barra"><span style="left:'+((v+100)/2)+'%"></span></div></div><em class="'+tipo[1]+'">'+tipo[0]+' '+(v>0?"+":"")+v+'</em></div>';
    }).join(""):'<p class="rtc-muted" style="margin:0">Sozinho na sala. Os laços aparecem com outros protagonistas.</p>')+'</div></section>';
}
function apartamento(s){
  const eu=euDe(s),d=eu.arquetipo&&R.PERSONAGENS[eu.arquetipo],cor=coresDe(eu.clube)[0]||"#3d7ae0";
  return '<div class="rtc-ape" style="--cor:'+safe(cor)+'"><div class="rtc-ape-cena" aria-hidden="true"><div class="rtc-ape-janela">'+skyline(eu.clube,cor)+'</div>'+
    '<div class="rtc-ape-chao"></div><div class="rtc-ape-sofa"></div><div class="rtc-ape-luz"></div></div>'+
    '<div class="rtc-ape-heroi">'+figura(eu,170)+'<div class="rtc-ape-placa"><b>'+safe(eu.avatar)+'</b><small>'+(d?safe(d.titulo)+' · ':'')+safe(nomeClube(eu.clube))+' · '+safe(eu.pos)+(eu.idade?' · '+eu.idade+' anos':'')+'</small></div></div>'+
    '<div class="rtc-tiles">'+tileAvancar(s)+tileAtributos(eu)+tileEstilo(eu)+tileSocial(s)+tileTabela(s,eu)+(s.jogadores.length>1?tileLacos(s,eu):"")+'</div></div>';
}
function jogoHTML(j,eu){
  const r=j.resultado,meu=j.casa===eu.clube||j.fora===eu.clube;
  const lado=id=>'<span class="lado'+(r&&r.vencedor===id?" venceu":"")+'">'+escudo(id,22)+'<span>'+safe(nomeClube(id))+'</span></span>';
  return '<div class="rtc-jogo'+(meu?" meu":"")+'">'+lado(j.casa)+'<strong>'+(r?num(r.casa)+" : "+num(r.fora):"×")+'</strong>'+lado(j.fora)+
    (r&&r.penaltis?'<span class="pen">Pênaltis '+num(r.penaltis.casa)+' × '+num(r.penaltis.fora)+' · passou '+safe(nomeClube(r.vencedor))+'</span>':'')+'</div>';
}
function abaClassificacao(s){
  const eu=euDe(s),etapa=(nome,lista)=>lista.length?'<section class="rtc-bloco rtc-escuro"><span class="rtc-kicker">'+safe(nome)+'</span>'+lista.map(j=>jogoHTML(j,eu)).join("")+'</section>':"";
  const grupos=[0,1,2].map(r=>etapa("Jornada "+(r+1),s.jogos.filter(j=>j.etapa==="grupos"&&j.rodada===r))).join("");
  return '<div class="rtc-duas-col"><section class="rtc-bloco rtc-escuro">'+tabelaHTML(s,"A",eu,false)+'</section><section class="rtc-bloco rtc-escuro">'+tabelaHTML(s,"B",eu,false)+'</section></div>'+
    '<div class="rtc-chave">'+etapa("Semifinais",s.jogos.filter(j=>j.etapa==="semifinal"))+etapa("Final",s.jogos.filter(j=>j.etapa==="final"))+'</div>'+
    (s.jogos.some(j=>j.etapa!=="grupos")?"":'<p class="rtc-small" style="margin-top:14px">Semifinais e final aparecem quando a fase de grupos terminar.</p>')+
    '<div class="rtc-duas-col" style="margin-top:16px">'+grupos+'</div>';
}
function abaDiario(s){
  const eu=euDe(s);
  return '<div class="rtc-duas-col"><section class="rtc-bloco rtc-escuro"><span class="rtc-kicker">A imprensa não esquece</span><h3>Diário da Champions</h3><div class="rtc-posts">'+
    (s.historico.length?s.historico.map(x=>postHTML(x,s)).join(""):'<p class="rtc-muted">As primeiras manchetes saem depois das decisões.</p>')+'</div></section>'+
    '<div style="display:grid;gap:10px;align-content:start">'+tileAtributos(eu)+tileEstilo(eu)+'</div></div>';
}
function telaJogo(s){
  const eu=euDe(s);
  app.innerHTML='<div class="rtc-entra"><div class="rtc-cabeca"><div><span class="rtc-kicker">Sala '+safe(s.codigo)+' · capítulo '+(s.capitulo+1)+' de 5</span><h1>'+safe(CAPITULOS[s.capitulo]?.[1]||"A Champions")+'</h1></div>'+
    '<div class="rtc-row" style="display:flex;gap:8px;flex-wrap:wrap"><nav class="rtc-abas" role="tablist" aria-label="Painéis">'+[["central","Central"],["tabela","Classificação"],["diario","Diário"]].map(([id,t])=>
      '<button type="button" class="rtc-aba" role="tab" data-aba="'+id+'" aria-selected="'+(tela.aba===id)+'">'+t+'</button>').join("")+'</nav>'+
    '<button class="rtc-button ghost" data-acao="copiar">Convidar</button></div></div>'+
    (tela.aba==="tabela"?abaClassificacao(s):tela.aba==="diario"?abaDiario(s):apartamento(s))+'</div>'+cenaHTML(s);
  const box=app.querySelector(".rtc-cena");if(box&&tela.cena?.foco){tela.cena.foco=false;box.querySelector("h2")?.focus();}
}

// ---------- a cena da decisão (entrevista) e o pré-jogo ----------
const chaveCena=s=>"rtc:cena:"+s.codigo+":"+s.capitulo;
function abrirCenaSePreciso(s){
  if(!s||s.fase!=="jogando"||!s.evento){if(tela.cena&&!s?.evento)tela.cena=null;return;}
  if(tela.cena&&tela.cena.id===s.evento.id+":"+s.capitulo)return;
  let visto=false;try{visto=sessionStorage.getItem(chaveCena(s))==="1";}catch{}
  if(!visto)tela.cena={id:s.evento.id+":"+s.capitulo,passo:"cena",opcao:null,tatica:"equilibrado",foco:true};
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
  if(!c||!ev)return "";
  const eu=euDe(s),cor=coresDe(eu.clube)[0]||"#3d7ae0";
  const fechar='<button class="rtc-button ghost rtc-cena-fechar" data-acao="fechar-cena">Decidir depois</button>';
  if(c.passo==="cena"){
    const arte='<div class="rtc-cena-arte" style="--cor:'+safe(cor)+'"><div class="rtc-cena-parede">'+paredeDePatrocinio()+'</div>'+
      '<img src="/jogador/popups/rtc-popup-'+safe(ev.id)+'.png" alt="" onerror="this.remove()">'+
      '<span class="rtc-cena-fig">'+figura(eu,190)+'</span>'+
      '<svg class="rtc-cena-mic" viewBox="0 0 46 120" aria-hidden="true"><rect x="12" y="2" width="22" height="34" rx="11" fill="#1c1c22" stroke="#555"/><rect x="21" y="36" width="4" height="84" fill="#111"/><rect x="8" y="40" width="30" height="14" fill="#7fb6ff" opacity=".8"/></svg>'+fechar+'</div>';
    return '<div class="rtc-cena" role="dialog" aria-modal="true" aria-labelledby="rtc-cena-titulo"><div class="rtc-cena-caixa">'+arte+
      '<div class="rtc-cena-texto"><span class="rtc-kicker'+(ev.exclusivo?" exclusivo":"")+'">'+(ev.exclusivo?"★ Só na sua história":"Decisão que muda o seu legado")+' · '+safe(CAPITULOS[s.capitulo]?.[1]||"")+'</span>'+
      '<h2 id="rtc-cena-titulo" tabindex="-1">'+safe(ev.titulo)+'</h2><div class="rtc-legenda">'+safe(ev.texto)+'</div>'+
      '<div class="rtc-opcoes-cena">'+ev.opcoes.map((x,i)=>'<button type="button" class="rtc-escolha'+(x.propria?" propria":"")+'" data-escolha="'+x.id+'" aria-pressed="'+(c.opcao===x.id)+'">'+
        '<span class="rtc-escolha-n">'+(i+1)+'</span><span><b>'+safe(x.texto)+'</b><small>'+safe(x.dica)+'</small></span><span class="rtc-tom tom-'+safe(x.tom)+'">'+(x.propria?"★ Só sua · ":"")+safe(TOM[x.tom]||"")+'</span></button>').join("")+'</div>'+
      '<div class="rtc-cena-pe"><span class="rtc-passos"><b>1 Resposta</b> · 2 Pré-jogo</span><button class="rtc-button primary" data-acao="cena-proximo"'+(c.opcao==null?" disabled":"")+'>Continuar →</button></div></div></div></div>';
  }
  const j=meuJogo(s,s.capitulo);
  const lado=id=>{const c2=clubes.get(id),dono=s.jogadores.find(p=>p.clube===id);return '<div class="lado">'+escudo(id,52)+'<div><b>'+safe(nomeClube(id))+'</b><small>'+(dono?safe(dono.avatar):"Computador")+(c2?" · força "+num(c2.forca):"")+'</small></div></div>';};
  const escolhida=ev.opcoes.find(x=>x.id===c.opcao);
  return '<div class="rtc-cena" role="dialog" aria-modal="true" aria-labelledby="rtc-cena-titulo"><div class="rtc-cena-caixa"><div class="rtc-gramado">'+
    '<span class="rtc-kicker">Pré-jogo · '+safe(CAPITULOS[s.capitulo]?.[1]||"")+'</span><h2 id="rtc-cena-titulo" tabindex="-1">Como o clube entra em campo</h2>'+
    (j?'<div class="rtc-prejogo-confronto">'+lado(j.casa)+'<em>×</em>'+lado(j.fora)+'</div>':'<p class="rtc-small">Seu clube não joga nesta jornada; a escolha vale para o registro da história.</p>')+
    '<div class="rtc-taticas" role="radiogroup" aria-label="Estratégia">'+TATICAS.map(([id,nome,texto])=>'<button type="button" class="rtc-tatica" role="radio" data-tatica="'+id+'" aria-pressed="'+(c.tatica===id)+'" aria-checked="'+(c.tatica===id)+'">'+
      iconeTatica[id]+'<span><b>'+nome+'</b><br><small>'+texto+'</small></span></button>').join("")+'</div>'+
    '<p class="rtc-aviso-jogo">O placar sai da força do elenco, da estratégia e da sorte. A resposta na entrevista mexe na história, nos laços e na forma do protagonista, não no resultado direto.</p></div>'+
    '<div class="rtc-cena-texto"><div class="rtc-cena-pe"><button class="rtc-button ghost" data-acao="cena-voltar">← Resposta: '+safe(escolhida?escolhida.texto:"")+'</button>'+
    '<button class="rtc-button ouro" data-acao="decidir">Confirmar escolhas</button></div></div></div></div>';
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
  const alvo=e.target.closest("button");if(!alvo||alvo.disabled)return;
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
  if(ds.escolha!=null){tela.cena.opcao=Number(ds.escolha);desenhar();app.querySelector('[data-escolha="'+ds.escolha+'"]')?.focus();return;}
  if(ds.tatica){tela.cena.tatica=ds.tatica;desenhar();app.querySelector('[data-tatica="'+ds.tatica+'"]')?.focus();return;}
  const acao=ds.acao;if(!acao||ocupado)return;
  if(acao==="sair"){localStorage.removeItem(storage.code);localStorage.removeItem(storage.token);location.reload();return;}
  if(acao==="copiar"){
    const code=sala?.codigo||"";
    try{await navigator.clipboard.writeText(code);toast("Código copiado: "+code);}catch{toast("Código da campanha: "+code);}
    return;
  }
  if(acao==="abrir-editor"){tela.editor=true;tela.cat="pele";desenhar();window.scrollTo({top:0});return;}
  if(acao==="fechar-editor"){tela.editor=false;rascunho.de=null;desenhar();return;}
  if(acao==="abrir-cena"){tela.cena={id:sala.evento.id+":"+sala.capitulo,passo:"cena",opcao:null,tatica:"equilibrado",foco:true};desenhar();return;}
  if(acao==="fechar-cena"){try{sessionStorage.setItem(chaveCena(sala),"1");}catch{}tela.cena=null;desenhar();return;}
  if(acao==="cena-proximo"){tela.cena.passo="jogo";tela.cena.foco=true;desenhar();return;}
  if(acao==="cena-voltar"){tela.cena.passo="cena";tela.cena.foco=true;desenhar();return;}
  lerCampos();
  let evento=null,dados={};
  if(acao==="criar"){evento="criar";dados=identidade();}
  if(acao==="entrar"){evento="entrar";dados={...identidade(),codigo:rascunho.codigo};}
  if(acao==="mudar"){evento="protagonista";const i=identidade();dados={arquetipo:i.arquetipo,figura:i.figura,avatar:i.avatar};}
  if(acao==="iniciar")evento="iniciar";
  if(acao==="avancar")evento="avancar";
  if(acao==="decidir"){evento="decidir";dados={opcao:tela.cena.opcao,tatica:tela.cena.tatica};}
  if(!evento)return;
  if((acao==="criar"||acao==="entrar")&&rascunho.nome)try{localStorage.setItem("galera:name",rascunho.nome);}catch{}
  ocupado=true;alvo.disabled=true;
  const r=await pedido(evento,dados);ocupado=false;
  if(!r.ok){toast(r.error);alvo.disabled=false;return;}
  if(acao==="mudar"){tela.editor=false;rascunho.de=null;}
  if(acao==="decidir"){tela.cena=null;toast("Escolha registrada. A imprensa já está escrevendo.");}
  if(acao==="avancar")tela.aba="central";
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
  if(e.key==="Escape"&&tela.cena&&sala){try{sessionStorage.setItem(chaveCena(sala),"1");}catch{}tela.cena=null;desenhar();}
});
socket.on("catalogo",list=>{catalogo=Array.isArray(list)?list:[];clubes=new Map(catalogo.map(c=>[c.id,c]));desenhar();});
socket.on("estado",data=>{
  // não redesenha o editor do vestiário no meio da edição
  sala=data;if(!(data.fase==="lobby"&&tela.editor))desenhar();
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
// #debug: para os testes e as fotos
if(location.hash==="#debug")window.__rtc={tela,rascunho,get sala(){return sala;},desenhar};
desenhar();
})();
