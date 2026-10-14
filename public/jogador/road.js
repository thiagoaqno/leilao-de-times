// Road to Champions — interface do modo narrativo multiplayer.
// O servidor define escolhas, confrontos e resultados; a página nunca altera o save diretamente.
(() => {
"use strict";
const socket=io("/road-to-champions");
const app=document.getElementById("app"), conexao=document.getElementById("conexao");
const toastBox=document.getElementById("rtc-toast");
let catalogo=[], clubes=new Map(), sala=null, aba="central", sorteio="equilibrado";
const storage={code:"rtc:codigo",token:"rtc:token"};
const safe=x=>String(x==null?"":x).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const nomeClube=id=>clubes.get(id)?.nome||id||"Clube";
const num=x=>Number.isFinite(x)?x:0;
const roundNames=["FASE DE GRUPOS · JORNADA 01","FASE DE GRUPOS · JORNADA 02","FASE DE GRUPOS · JORNADA 03","SEMIFINAIS","A GRANDE FINAL"];
const attrNames={respeito:"Respeito",ambicao:"Ambição",disciplina:"Disciplina",prestigio:"Prestígio"};
const R=window.RoadRegras;
// o protagonista que está sendo montado (na entrada e no lobby): arquétipo, nome e figura (aparência, visual, expressão)
const copiaFigura=f=>JSON.parse(JSON.stringify(f));
const rascunho={arquetipo:R.IDS[0],avatar:"",figura:copiaFigura(R.PERSONAGENS[R.IDS[0]].figura),de:null,aba:"aparencia"};
let ocupadosNaSala=[], timerCodigo=null;
const tomNomes={respeito:"Respeito",provoca:"Provocação",neutro:"Neutro"};
function toast(texto){
  toastBox.textContent=String(texto);toastBox.hidden=false;
  clearTimeout(toastBox._timer);toastBox._timer=setTimeout(()=>toastBox.hidden=true,4500);
}
function pedido(evento,dados={}){
  return new Promise(resolve=>socket.timeout(9000).emit(evento,dados,(err,r)=>resolve(err?{ok:false,error:"Servidor indisponível. Tente novamente."}:r||{ok:false,error:"Não houve resposta."})));
}
function setSala(r) {
  if(r.token){localStorage.setItem(storage.code,r.codigo);localStorage.setItem(storage.token,r.token);}
  if(r.estado){sala=r.estado;desenhar();}
}
function tagClube(id,tam=""){
  const c=clubes.get(id);
  const fundo=c?.cores?.[0]||"#264ca0", borda=c?.cores?.[1]||"#bdd8ff";
  return '<span class="rtc-crest '+safe(tam)+'" style="background:'+safe(fundo)+';border-color:'+safe(borda)+'" title="'+safe(nomeClube(id))+'">'+safe(c?.curto||String(id||"?").slice(0,3).toUpperCase())+'</span>';
}
function figura(p,tam=44){
  if(!p.figura)return boneco(p);
  const c=clubes.get(p.clube);
  return '<span class="rtc-fig">'+Aparencia.svg(p.figura,c?.cores||[],{tam,titulo:p.avatar})+'</span>';
}
function boneco(p){
  const c=clubes.get(p.clube),camisa=c?.cores?.[0]||"#245ba3",detalhe=c?.cores?.[1]||"#c8dcff";
  return '<span class="rtc-boneco" style="--camisa:'+safe(camisa)+';--detalhe:'+safe(detalhe)+'" aria-hidden="true">'+
    '<span class="rtc-cabelo"></span><span class="rtc-rosto"></span><span class="rtc-camisa"></span><span class="rtc-calcoes"></span></span>';
}
function escolherArquetipo(id){
  rascunho.arquetipo=id;rascunho.figura=copiaFigura(R.PERSONAGENS[id].figura);
}
function cartoesArquetipos(ocupados=[],meu=null){
  return '<div class="rtc-arqs" role="radiogroup" aria-label="Os seis protagonistas">'+R.IDS.map(id=>{
    const d=R.PERSONAGENS[id],c=clubes.get(d.clube),tomado=ocupados.includes(id)&&id!==meu,sel=rascunho.arquetipo===id;
    return '<button type="button" class="rtc-arq" role="radio" aria-checked="'+sel+'" data-arq="'+id+'"'+(tomado?' disabled':'')+'>'+
      '<span class="rtc-arq-fig">'+Aparencia.svg(d.figura,c?.cores||[],{tam:52,titulo:d.titulo})+'</span>'+
      '<b>'+safe(d.titulo)+'</b><small>'+safe(c?.nome||d.clube)+' · '+safe(d.pos)+' · '+d.idade+' anos</small>'+
      (tomado?'<i>JÁ ESCOLHIDO</i>':'')+'</button>';
  }).join('')+'</div>';
}
function barra(valor,min,max,nome){
  return '<div class="rtc-eixo"><span class="rtc-label">'+safe(nome)+'</span><div class="rtc-eixo-trilho"><span style="left:'+num(valor)+'%"></span></div>'+
    '<div class="rtc-eixo-fim"><small>'+safe(min)+'</small><small>'+safe(max)+'</small></div></div>';
}
function eixosHTML(eixos){
  return Object.entries(R.EIXOS).map(([k,e])=>barra(eixos?.[k],e.min,e.max,e.nome)).join('');
}
// `campo` é "parte.chave" (ex.: "aparencia.cabelo"); `lista` é { valor: rótulo }
function opcoesSelect(campo,rotulo,lista,atual,sugestao){
  return '<div><label>'+safe(rotulo)+'</label><select data-ap="'+campo+'" aria-label="'+safe(rotulo)+'">'+Object.entries(lista).map(([v,t])=>
    '<option value="'+safe(v)+'"'+(v===atual?' selected':'')+'>'+safe(typeof t==="string"?t:t.nome)+(v===sugestao?' ★':'')+'</option>').join('')+'</select></div>';
}
const ABAS_FIGURA=[["aparencia","Aparência física"],["visual","Visual e acessórios"],["expressao","Expressão pessoal"]];
const nomesCores=Object.fromEntries(Object.keys(R.CORES_CABELO).map(k=>[k,k[0].toUpperCase()+k.slice(1)]));
// o editor da figura em três abas; a prévia ao lado muda na hora (atualizarPreview)
function editorFigura(){
  const {aparencia:a,visual:v,expressao:e}=rascunho.figura,sug=R.PERSONAGENS[rascunho.arquetipo].figura,ab=rascunho.aba;
  let corpo="";
  if(ab==="aparencia")corpo='<label>Tom de pele</label><div class="rtc-peles">'+Object.entries(R.PELES).map(([n,cor])=>
      '<button type="button" class="rtc-pele" data-pele="'+n+'" aria-pressed="'+(String(a.pele)===n)+'" aria-label="Tom '+n+'" style="background:'+cor+'"></button>').join('')+'</div>'+
    '<div class="rtc-duas">'+opcoesSelect("aparencia.rosto","Rosto",R.ROSTOS,a.rosto,sug.aparencia.rosto)+opcoesSelect("aparencia.barba","Barba",R.BARBAS,a.barba,sug.aparencia.barba)+'</div>'+
    '<div class="rtc-duas">'+opcoesSelect("aparencia.cabelo","Cabelo",R.CABELOS,a.cabelo,sug.aparencia.cabelo)+opcoesSelect("aparencia.corCabelo","Cor do cabelo",nomesCores,a.corCabelo,sug.aparencia.corCabelo)+'</div>'+
    '<div class="rtc-duas"><div><label>Altura</label><input data-ap="aparencia.altura" type="range" min="0.9" max="1.1" step="0.05" value="'+a.altura+'"></div>'+
    '<div><label>Porte</label><input data-ap="aparencia.largura" type="range" min="0.9" max="1.1" step="0.05" value="'+a.largura+'"></div></div>';
  if(ab==="visual")corpo='<div class="rtc-duas"><div><label>Número da camisa</label><input data-ap="visual.numero" type="number" min="1" max="99" value="'+num(v.numero)+'"></div>'+
    opcoesSelect("visual.chuteiras","Chuteiras",R.CHUTEIRAS,v.chuteiras,sug.visual.chuteiras)+'</div>'+
    opcoesSelect("visual.acessorio","Acessório",R.ACESSORIOS,v.acessorio,sug.visual.acessorio);
  if(ab==="expressao")corpo=opcoesSelect("expressao.semblante","Semblante",R.SEMBLANTES,e.semblante,sug.expressao.semblante)+
    opcoesSelect("expressao.comemoracao","Comemoração de gol",R.COMEMORACOES,e.comemoracao,sug.expressao.comemoracao)+
    opcoesSelect("expressao.postura","Postura nas entrevistas",R.POSTURAS,e.postura,sug.expressao.postura)+
    '<p class="rtc-small">A comemoração vira notícia nas vitórias que todo mundo acompanha.</p>';
  return '<div class="rtc-editor" id="rtc-editor"><span class="rtc-kicker">SUA FIGURA</span>'+
    '<div class="rtc-subabas" role="tablist" aria-label="Partes da figura">'+ABAS_FIGURA.map(([id,t])=>
      '<button type="button" role="tab" data-fig-aba="'+id+'" aria-selected="'+(ab===id)+'">'+safe(t)+'</button>').join('')+'</div>'+
    corpo+'<p class="rtc-small rtc-nota">★ é a sugestão do personagem. Nada aqui muda força, forma ou lesões: em campo, todos têm as mesmas chances.</p></div>';
}
function previewHTML(){
  const d=R.PERSONAGENS[rascunho.arquetipo],c=clubes.get(d.clube);
  return Aparencia.svg(rascunho.figura,c?.cores||[],{tam:120,titulo:d.titulo});
}
function fichaArquetipo(){
  const d=R.PERSONAGENS[rascunho.arquetipo],c=clubes.get(d.clube);
  return '<div class="rtc-perfil"><div class="rtc-preview" id="rtc-preview">'+previewHTML()+'</div><div>'+
    '<span class="rtc-kicker">'+safe(c?.nome||d.clube)+' · '+safe(d.pos)+' · '+d.idade+' ANOS · '+safe(d.jeito.toUpperCase())+'</span>'+
    '<h2>'+safe(d.titulo)+'</h2><p>'+safe(d.resumo)+'</p>'+
    '<p class="rtc-message"><b>Objetivo:</b> '+safe(d.objetivo)+'</p></div></div>'+
    '<ul class="rtc-mecanicas">'+d.mecanicas.map(m=>'<li>'+safe(m)+'</li>').join('')+'</ul>'+
    '<div class="rtc-eixos">'+eixosHTML(d.eixos)+'</div>';
}
function paginaInicial() {
  const salvo=localStorage.getItem(storage.code);
  const d=R.PERSONAGENS[rascunho.arquetipo];
  app.innerHTML='<section class="rtc-hero"><span class="rtc-eyebrow">THE ROAD STARTS HERE · TEMPORADA 2026</span>'+
    '<h1>SEIS ESTRELAS.<br><em>SEIS VIDAS.</em><br>UMA CHAMPIONS.</h1>'+
    '<p>Escolha o seu protagonista, dê o nome e o rosto a ele e dispute a mesma Champions com até cinco amigos. Cada um tem o seu clube, o seu estilo de vida e escolhas que só ele recebe.</p>'+
    '<span class="rtc-badge">1–6 JOGADORES · UM PROTAGONISTA POR CLUBE · SALVAMENTO ONLINE</span></section>'+
    '<section class="rtc-card rtc-margin"><span class="rtc-kicker">CAPÍTULO ZERO</span><h2>ESCOLHA SEU PROTAGONISTA</h2>'+
    cartoesArquetipos(ocupadosNaSala)+'</section>'+
    '<div class="rtc-grid"><section class="rtc-card">'+fichaArquetipo()+'</section>'+
    '<div class="rtc-stack"><section class="rtc-card"><span class="rtc-kicker">IDENTIDADE</span><h3>QUEM É VOCÊ</h3>'+
    '<label for="rtc-nome">Seu nome na sala</label><input id="rtc-nome" maxlength="24" placeholder="Seu nome" autocomplete="nickname">'+
    '<label for="rtc-avatar">Nome do jogador</label><input id="rtc-avatar" maxlength="24" placeholder="Ex.: '+safe(d.sugestao)+'" value="'+safe(rascunho.avatar)+'">'+
    editorFigura()+
    '<div class="rtc-row rtc-margin"><button class="rtc-button primary" data-acao="criar">CRIAR CAMPANHA</button></div></section>'+
    '<section class="rtc-card"><span class="rtc-kicker">JÁ EXISTE UMA HISTÓRIA?</span><h3>ENTRAR NA CHAMPIONS</h3>'+
    '<p>Digite o código da sala: os protagonistas que já têm dono ficam bloqueados.</p>'+
    '<label for="rtc-code">Código da campanha</label><input id="rtc-code" maxlength="8" spellcheck="false" autocapitalize="characters" placeholder="ABCDE" value="'+safe(salvo||"")+'">'+
    '<div class="rtc-margin"><button class="rtc-button" data-acao="entrar">ENTRAR NA SALA</button></div></section></div></div>';
}
function jogadores(s) {
  return s.jogadores.map(p=>'<div class="rtc-person">'+figura(p,34)+tagClube(p.clube)+'<span><strong>'+safe(p.avatar)+'</strong>'+
    '<small>'+(p.arquetipo?safe(R.PERSONAGENS[p.arquetipo].titulo)+' · ':'')+safe(p.nome)+' · '+safe(nomeClube(p.clube))+' · '+safe(p.pos)+'</small></span>'+
    '<i>'+ (p.id===s.dono?"ANFITRIÃO":p.id===s.eu?"VOCÊ":"PROTAGONISTA")+'</i></div>').join("");
}
function paginaLobby(s){
  const eu=s.jogadores.find(p=>p.id===s.eu),ocupados=s.jogadores.filter(p=>p.id!==s.eu).map(p=>p.arquetipo);
  if(rascunho.de!==eu.id+":"+eu.arquetipo&&eu.arquetipo){
    rascunho.de=eu.id+":"+eu.arquetipo;rascunho.arquetipo=eu.arquetipo;rascunho.avatar=eu.avatar;rascunho.figura=copiaFigura(eu.figura);
  }
  app.innerHTML='<section class="rtc-hero"><span class="rtc-eyebrow">LOBBY · SUA HISTÓRIA COMEÇA AQUI</span>'+
    '<h1>A EUROPA <em>ESPERA.</em></h1><p>Convoque até cinco amigos. Cada um escolhe um protagonista, e o clube vem junto. Quando a sala começar, protagonista e aparência ficam fixos.</p></section>'+
    '<div class="rtc-grid"><div class="rtc-stack"><section class="rtc-card"><span class="rtc-kicker">VESTIÁRIO · '+s.jogadores.length+'/6</span>'+
    '<h2>OS PROTAGONISTAS</h2>'+jogadores(s)+'</section>'+
    (eu.arquetipo?'<section class="rtc-card"><span class="rtc-kicker">SEU PROTAGONISTA</span><h3>AJUSTAR ANTES DO APITO</h3>'+
    '<p class="rtc-small">Trocar de protagonista troca o clube junto. Os que já têm dono ficam bloqueados.</p>'+
    cartoesArquetipos(ocupados,eu.arquetipo)+fichaArquetipo()+
    '<label for="rtc-avatar">Nome do jogador</label><input id="rtc-avatar" maxlength="24" value="'+safe(rascunho.avatar)+'">'+
    editorFigura()+
    '<div class="rtc-margin"><button class="rtc-button ghost" data-acao="mudar">SALVAR PROTAGONISTA</button></div></section>':'')+'</div>'+
    '<div class="rtc-stack"><section class="rtc-card"><span class="rtc-kicker">CONVITE DA SALA</span>'+
    '<div class="rtc-code">'+safe(s.codigo)+'</div><p>Compartilhe este código. O progresso é salvo no servidor e você poderá retomar com este navegador.</p>'+
    '<button class="rtc-button ghost" data-acao="copiar">COPIAR CONVITE</button></section>'+
    '<section class="rtc-card"><span class="rtc-kicker">PRIMEIRO APITO</span><h2>COMEÇAR A CAMPANHA</h2>'+
    '<p>O anfitrião inicia quando o grupo estiver pronto. Também é possível jogar sozinho, contra clubes da CPU.</p>'+
    (s.dono===s.eu?'<button class="rtc-button primary" data-acao="iniciar">INICIAR A CHAMPIONS ✦</button>':'<p class="rtc-message">Esperando o anfitrião iniciar a competição.</p>')+
    '<div class="rtc-margin"><button class="rtc-button ghost" data-acao="sair">VOLTAR AO MENU</button></div></section></div></div>';
}
function linhaPartida(j,s) {
  const r=j.resultado;const eu=s.jogadores.find(p=>p.id===s.eu);
  const minha=j.casa===eu.clube||j.fora===eu.clube;
  return '<div class="rtc-fix"'+(minha?' style="background:#83bbff15"':'')+'>'+
    '<span class="rtc-side">'+safe(nomeClube(j.casa))+'</span>'+
    '<strong>'+(r?num(r.casa)+' : '+num(r.fora):'×')+'</strong>'+
    '<span class="rtc-side">'+safe(nomeClube(j.fora))+'</span></div>'+
    (r&&r.penaltis?'<p class="rtc-small">Pênaltis: '+num(r.penaltis.casa)+' × '+num(r.penaltis.fora)+' · Classificado: '+safe(nomeClube(r.vencedor))+'</p>':'');
}
function tabela(s,g) {
  const linhas=s.grupos?.[g]||[];
  return '<div class="rtc-card"><span class="rtc-kicker">FASE DE GRUPOS</span><h3>GRUPO '+g+'</h3>'+
    '<table class="rtc-table"><thead><tr><th>CLUBE</th><th>PTS</th><th>J</th><th>V</th><th>SG</th></tr></thead><tbody>'+
    linhas.map(t=>'<tr><td>'+safe(nomeClube(t.clube))+'</td><td>'+num(t.p)+'</td><td>'+num(t.j)+'</td><td>'+num(t.v)+'</td><td>'+num(t.sg)+'</td></tr>').join('')+
    '</tbody></table><p class="rtc-small">Os dois primeiros avançam às semifinais.</p></div>';
}
const TIPOS_FEED={decisao:'DECISÃO',manchete:'MANCHETE',repercussao:'REPERCUSSÃO',visual:'VISUAL NOVO',comemoracao:'COMEMORAÇÃO'};
function feed(s){
  return '<section class="rtc-card"><div class="rtc-titleline"><div><span class="rtc-kicker">A IMPRENSA NÃO ESQUECE</span><h3>DIÁRIO DA CHAMPIONS</h3></div></div>'+
    '<div class="rtc-feed">'+(s.historico.length?s.historico.map(x=>'<div class="rtc-news"><small>CAPÍTULO '+(num(x.rodada)+1)+' · '+(TIPOS_FEED[x.tipo]||'PLACAR')+'</small>'+
    (x.autor?'<b>'+safe(x.autor)+'</b> · ':'')+safe(x.texto)+'</div>').join(''):'<p>As primeiras manchetes ainda serão escritas.</p>')+
    '</div></section>';
}
function atributos(s){
  const eu=s.jogadores.find(p=>p.id===s.eu),d=eu.arquetipo&&R.PERSONAGENS[eu.arquetipo];
  const med=d&&d.medidor,valorMed=med?num(eu.medidores?.[med.chave]):0;
  const f=eu.forma;
  return '<section class="rtc-card"><span class="rtc-kicker">FICHA DO PROTAGONISTA</span><h3>'+safe(eu.avatar)+'</h3>'+
    '<div class="rtc-person">'+figura(eu,52)+tagClube(eu.clube)+'<span><b>'+(d?safe(d.titulo):safe(nomeClube(eu.clube)))+'</b>'+
    '<small>'+safe(nomeClube(eu.clube))+' · '+safe(eu.pos)+(eu.idade?' · '+eu.idade+' anos':'')+'</small></span></div>'+
    '<div class="rtc-attributes rtc-margin">'+Object.entries(attrNames).map(([k,label])=>'<div class="rtc-attribute">'+
    '<small class="rtc-label">'+label+'</small><b>'+num(eu.atributos[k])+'</b></div>').join('')+'</div>'+
    (eu.figura?'<p class="rtc-small rtc-margin"><b>Comemoração:</b> '+safe(R.COMEMORACOES[eu.figura.expressao.comemoracao]?.nome||"")+
      ' · <b>Postura:</b> '+safe(R.POSTURAS[eu.figura.expressao.postura]||"")+'</p>':'')+
    (eu.eixos?'<h4 class="rtc-margin">ESTILO DE VIDA</h4>'+eixosHTML(eu.eixos):'')+
    (med?'<div class="rtc-medidor rtc-margin"><span class="rtc-label">'+safe(med.nome)+'</span><b>'+valorMed+'</b>'+
      '<div class="rtc-medidor-barra"><span style="width:'+valorMed+'%"></span></div><small>'+safe(med.texto)+'</small></div>':'')+
    (f?'<p class="rtc-small rtc-margin"><b>Forma na última jornada: '+(f.valor>0?'+':'')+f.valor+'</b>'+(f.motivos.length?' · '+safe(f.motivos.join(', ')):'')+'</p>':'')+
    (d?'<details class="rtc-margin"><summary class="rtc-label">O QUE MUDA PARA ESTE PROTAGONISTA</summary><ul class="rtc-mecanicas">'+
      d.mecanicas.map(m=>'<li>'+safe(m)+'</li>').join('')+'</ul><p class="rtc-small"><b>Objetivo:</b> '+safe(d.objetivo)+'</p></details>':'')+
    '</section>';
}
function rivalidades(s){
  const eu=s.jogadores.find(p=>p.id===s.eu);
  return '<section class="rtc-card"><span class="rtc-kicker">DESTINOS CRUZADOS</span><h3>LAÇOS E RIVALIDADES</h3>'+
    s.jogadores.filter(p=>p.id!==eu.id).map(p=>{
      const valor=num(eu.relacoes[p.id]);const tipo=valor>10?"Respeito":valor< -10?"Rivalidade":"Neutro";
      const laco=(s.lacos||[]).find(l=>(l.a===eu.id&&l.b===p.id)||(l.b===eu.id&&l.a===p.id));
      return '<div class="rtc-statline"><span>'+safe(eu.avatar)+' × '+safe(p.avatar)+(laco?'<small class="rtc-laco">'+safe(laco.texto)+'</small>':'')+'</span><b>'+tipo+' · '+valor+'</b></div>';
    }).join('')+
    (s.jogadores.length===1?'<p class="rtc-muted">Convide outras pessoas para criar relações entre protagonistas.</p>':'')+'</section>';
}
function narrativa(s){
  if(s.feito)return '<section class="rtc-card"><span class="rtc-kicker">ESCOLHA REGISTRADA</span><h2>O FUTURO FOI ESCRITO.</h2>'+
    '<p class="rtc-message">Você tomou sua decisão. '+s.prontos+' de '+s.jogadores.length+' protagonistas já responderam neste capítulo.</p>'+
    (s.dono===s.eu?'<button class="rtc-button primary" data-acao="avancar"'+(s.prontos!==s.jogadores.length?' disabled':'')+'>SIMULAR JORNADA E AVANÇAR →</button>':
     '<p class="rtc-small">O anfitrião avança quando todos estiverem prontos.</p>')+'</section>';
  const ev=s.evento;
  return '<section class="rtc-card'+(ev.exclusivo?' rtc-exclusivo':'')+'"><span class="rtc-kicker">'+(ev.exclusivo?'SÓ NA SUA HISTÓRIA':'DECISÃO QUE MUDA SEU LEGADO')+'</span><h2>'+safe(ev.titulo)+'</h2>'+
    '<p class="rtc-message">'+safe(ev.texto)+'</p>'+
    '<label for="rtc-tatica">Como seu clube entrará em campo?</label><select id="rtc-tatica">'+
    '<option value="equilibrado">Equilibrado — administrar o jogo</option>'+
    '<option value="pressionar">Pressionar — recuperar a bola no ataque</option>'+
    '<option value="recuar">Recuar — explorar contra-ataques</option></select>'+
    '<p class="rtc-small">O resultado é simulado a partir da força do elenco, da estratégia e de um fator de imprevisibilidade. As escolhas da história não determinam o placar.</p>'+
    ev.opcoes.map(x=>'<button type="button" class="rtc-choice'+(x.propria?' propria':'')+'" data-acao="decidir" data-opcao="'+x.id+'"><b>'+safe(x.texto)+'</b>'+
    '<small>'+safe(x.dica)+'</small><span class="rtc-tom tom-'+safe(x.tom)+'">'+(x.propria?'★ SÓ SUA · ':'')+safe(tomNomes[x.tom]||"")+'</span></button>').join('')+'</section>';
}
function telaJogo(s) {
  const stage=roundNames[s.capitulo]||"A CHAMPIONS";
  const jogos=s.jogos.filter(j=>j.rodada===s.capitulo);
  app.innerHTML='<div class="rtc-head"><div><span class="rtc-kicker">CHAMPIONS · DESTINOS CRUZADOS · SALA '+safe(s.codigo)+'</span>'+
    '<h1>'+safe(stage)+'</h1><span class="rtc-label"><span class="rtc-blip"></span> '+s.jogadores.length+' PROTAGONISTAS · '+s.prontos+' DECISÕES REGISTRADAS</span></div>'+
    '<button class="rtc-button ghost" data-acao="copiar">CONVIDAR / COPIAR CÓDIGO</button></div>'+
    '<nav class="rtc-tabs" role="tablist" aria-label="Painéis do Road to Champions">'+
    [['central','CENTRAL'],['tabela','CLASSIFICAÇÃO'],['historia','HISTÓRIA']].map(([id,t])=>'<button class="rtc-tab" role="tab" data-aba="'+id+'" aria-selected="'+(aba===id)+'">'+t+'</button>').join('')+'</nav>'+
    (aba==="central"?
      '<div class="rtc-grid"><div class="rtc-stack">'+narrativa(s)+
      '<section class="rtc-card"><span class="rtc-kicker">CENTRAL DE JOGOS</span><h3>CONFRONTOS DA JORNADA</h3>'+
      (jogos.length?jogos.map(j=>linhaPartida(j,s)).join(''):'<p class="rtc-muted">Confrontos sendo definidos.</p>')+
      '</section></div><div class="rtc-stack">'+atributos(s)+rivalidades(s)+'</div></div>':
    aba==="tabela"?
      '<div class="rtc-grid"><div class="rtc-stack">'+tabela(s,"A")+'</div><div class="rtc-stack">'+tabela(s,"B")+'</div></div>'+
      '<section class="rtc-card rtc-margin"><span class="rtc-kicker">CAMINHO ATÉ A TAÇA</span><h3>TODOS OS CONFRONTOS</h3>'+
      s.jogos.map(j=>'<h4 class="rtc-margin">'+safe(j.etapa.toUpperCase())+' · JORNADA '+(j.rodada+1)+'</h4>'+linhaPartida(j,s)).join('')+'</section>':
    '<div class="rtc-grid"><div class="rtc-stack">'+feed(s)+'</div><div class="rtc-stack">'+atributos(s)+rivalidades(s)+'</div></div>');
}
function final(s){
  app.innerHTML='<section class="rtc-hero"><span class="rtc-eyebrow">EPÍLOGO · O FIM É APENAS O COMEÇO</span>'+
    '<h1>UMA TAÇA.<br><em>SEIS DESTINOS.</em></h1>'+
    '<p>A Champions terminou, mas cada protagonista deixa um legado diferente.</p>'+
    '<span class="rtc-win">✦ CAMPEÃO: '+safe(nomeClube(s.campeao))+'</span></section>'+
    '<div class="rtc-grid"><div class="rtc-stack"><section class="rtc-card"><h2>OS FINAIS DA TEMPORADA</h2>'+
    s.epilogos.map(ep=>'<div class="rtc-epilogo">'+
      '<span class="rtc-kicker">'+safe(ep.avatar)+' · '+safe(nomeClube(ep.clube))+'</span>'+
      '<h3>'+safe(ep.titulo)+'</h3><p>'+safe(ep.descricao)+'</p><small>'+(ep.campeao?'CAMPEÃO DA CHAMPIONS':'TRAJETÓRIA ENCERRADA')+'</small></div>').join('')+
    '</section><button class="rtc-button primary" data-acao="sair">INICIAR OUTRA HISTÓRIA</button></div>'+
    '<div class="rtc-stack"><section class="rtc-card"><span class="rtc-kicker">O ÚLTIMO APITO</span><h3>A GRANDE FINAL</h3>'+
    s.jogos.filter(j=>j.etapa==="final").map(j=>linhaPartida(j,s)).join('')+'</section>'+feed(s)+'</div></div>';
}
function desenhar(){if(!sala)paginaInicial();else if(sala.fase==="lobby")paginaLobby(sala);else if(sala.fase==="jogando")telaJogo(sala);else final(sala);}
const identidade=()=>({nome:document.getElementById("rtc-nome")?.value,avatar:document.getElementById("rtc-avatar")?.value,
  arquetipo:rascunho.arquetipo,figura:rascunho.figura});
let ocupado=false;
app.addEventListener("click",async e=>{
  const arq=e.target.closest("[data-arq]");
  if(arq&&!arq.disabled){
    rascunho.avatar=document.getElementById("rtc-avatar")?.value||"";
    const nomeSala=document.getElementById("rtc-nome")?.value,codigo=document.getElementById("rtc-code")?.value;
    escolherArquetipo(arq.dataset.arq);desenhar();
    if(nomeSala!=null&&document.getElementById("rtc-nome"))document.getElementById("rtc-nome").value=nomeSala;
    if(codigo!=null&&document.getElementById("rtc-code"))document.getElementById("rtc-code").value=codigo;
    return;
  }
  const pele=e.target.closest("[data-pele]");
  if(pele){
    rascunho.figura.aparencia.pele=Number(pele.dataset.pele);
    for(const b of app.querySelectorAll("[data-pele]"))b.setAttribute("aria-pressed",String(b===pele));
    atualizarPreview();return;
  }
  const abaFig=e.target.closest("[data-fig-aba]");
  if(abaFig){
    rascunho.aba=abaFig.dataset.figAba;
    const box=document.getElementById("rtc-editor");if(box)box.outerHTML=editorFigura();
    document.querySelector('[data-fig-aba="'+rascunho.aba+'"]')?.focus();return;
  }
  const tab=e.target.closest("[data-aba]");
  if(tab){aba=tab.dataset.aba;desenhar();return;}
  const botao=e.target.closest("[data-acao]");if(!botao||ocupado)return;
  const acao=botao.dataset.acao;
  if(acao==="sair"){localStorage.removeItem(storage.code);localStorage.removeItem(storage.token);location.reload();return;}
  if(acao==="copiar"){
    const code=sala?.codigo||"";
    try{await navigator.clipboard.writeText(code);toast("Código copiado: "+code);}catch{toast("Código da campanha: "+code);}
    return;
  }
  let evento=null,dados={};
  if(acao==="criar"){evento="criar";dados=identidade();}
  if(acao==="entrar"){evento="entrar";dados={...identidade(),codigo:document.getElementById("rtc-code")?.value};}
  if(acao==="mudar"){evento="protagonista";const i=identidade();dados={arquetipo:i.arquetipo,figura:i.figura,avatar:i.avatar};}
  if(acao==="iniciar")evento="iniciar";
  if(acao==="avancar")evento="avancar";
  if(acao==="decidir"){evento="decidir";dados={opcao:Number(botao.dataset.opcao),tatica:document.getElementById("rtc-tatica")?.value||"equilibrado"};}
  if(!evento)return;
  ocupado=true;botao.disabled=true;
  const r=await pedido(evento,dados);ocupado=false;
  if(!r.ok){toast(r.error);botao.disabled=false;return;}
  if(r.estado)setSala(r);
  if(acao==="decidir")toast("Sua escolha mudou a história. Os outros protagonistas também decidirão.");
});
function atualizarPreview(){const box=document.getElementById("rtc-preview");if(box)box.innerHTML=previewHTML();}
// os campos da aparência mudam só o rascunho e o desenho, sem redesenhar a página
app.addEventListener("input",e=>{
  const campo=e.target.dataset?.ap;
  if(campo){
    const [parte,chave]=campo.split("."),alvo=rascunho.figura[parte],base=R.PERSONAGENS[rascunho.arquetipo].figura[parte];
    if(chave==="numero")alvo.numero=Math.max(1,Math.min(99,Math.round(Number(e.target.value))||base.numero));
    else if(chave==="altura"||chave==="largura")alvo[chave]=Number(e.target.value);
    else alvo[chave]=e.target.value;
    atualizarPreview();return;
  }
  if(e.target.id==="rtc-avatar")rascunho.avatar=e.target.value;
  // com um código de sala, bloqueia os protagonistas que já têm dono
  if(e.target.id==="rtc-code"){
    clearTimeout(timerCodigo);
    const codigo=e.target.value.trim();
    timerCodigo=setTimeout(async()=>{
      if(codigo.length<5){if(ocupadosNaSala.length){ocupadosNaSala=[];redesenharCartoes();}return;}
      const r=await pedido("ocupados",{codigo});
      if(sala)return; // já entrou numa sala enquanto a resposta vinha
      ocupadosNaSala=r.ok?r.ocupados:[];
      if(ocupadosNaSala.includes(rascunho.arquetipo)){
        const livre=R.IDS.find(id=>!ocupadosNaSala.includes(id));if(livre){escolherArquetipo(livre);desenhar();const campo=document.getElementById("rtc-code");if(campo)campo.value=codigo;return;}
      }
      redesenharCartoes();
    },350);
  }
});
function redesenharCartoes(){const box=app.querySelector(".rtc-arqs");if(box)box.outerHTML=cartoesArquetipos(ocupadosNaSala);}
socket.on("catalogo",list=>{catalogo=Array.isArray(list)?list:[];catalogo.sort((a,b)=>b.forca-a.forca||a.nome.localeCompare(b.nome));clubes=new Map(catalogo.map(c=>[c.id,c]));desenhar();});
socket.on("estado",data=>{sala=data;desenhar();});
socket.on("connect",async()=>{
  conexao.textContent="● ONLINE";
  const codigo=localStorage.getItem(storage.code),token=localStorage.getItem(storage.token);
  if(codigo&&token){
    const r=await pedido("retomar",{codigo,token});
    if(r.ok)setSala(r);else{localStorage.removeItem(storage.code);localStorage.removeItem(storage.token);sala=null;desenhar();}
  }
});
socket.on("disconnect",()=>{conexao.textContent="○ DESCONECTADO";});
paginaInicial();
})();
