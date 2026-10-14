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
function comboClubes(id,selecionado,excluir=[]){
  const opt=catalogo.filter(c=>!excluir.includes(c.id)).map(c=>'<option value="'+safe(c.id)+'"'+(c.id===selecionado?' selected':'')+'>'+safe(c.nome)+' · '+safe(c.liga)+' · '+num(c.forca)+'</option>').join("");
  return '<select id="'+safe(id)+'" aria-label="Escolha o seu clube">'+opt+'</select>';
}
function paginaInicial() {
  const salvo=localStorage.getItem(storage.code);
  app.innerHTML='<section class="rtc-hero"><span class="rtc-eyebrow">THE ROAD STARTS HERE · TEMPORADA 2026</span>'+
    '<h1>SEU NOME.<br><em>SUA HISTÓRIA.</em><br>SUA CHAMPIONS.</h1>'+
    '<p>Crie seu protagonista, escolha um clube europeu e dispute uma campanha com até seis amigos. Suas decisões afetam a imprensa, os rivais e os finais individuais.</p>'+
    '<span class="rtc-badge">1–6 JOGADORES · CAMINHOS INTERLIGADOS · SALVAMENTO ONLINE</span></section>'+
    '<div class="rtc-grid"><section class="rtc-card"><span class="rtc-kicker">CAPÍTULO ZERO</span><h2>CRIE SEU PROTAGONISTA</h2>'+
    '<p>Um boneco e um clube por participante. Todos partilham a mesma Champions.</p>'+
    '<label for="rtc-nome">Seu nome na sala</label><input id="rtc-nome" maxlength="24" placeholder="Seu nome" autocomplete="nickname">'+
    '<label for="rtc-avatar">Nome do jogador criado</label><input id="rtc-avatar" maxlength="24" placeholder="Ex.: Alex Almeida">'+
    '<label for="rtc-pos">Posição do protagonista</label><select id="rtc-pos"><option>ATA</option><option>MEI</option><option>MC</option><option>VOL</option><option>PE</option><option>PD</option><option>ZAG</option><option>LD</option><option>LE</option><option>GOL</option></select>'+
    '<label for="rtc-clube">Clube europeu</label>'+comboClubes("rtc-clube",null)+
    '<div class="rtc-row rtc-margin"><button class="rtc-button primary" data-acao="criar">CRIAR CAMPANHA</button></div></section>'+
    '<div class="rtc-stack"><section class="rtc-card"><span class="rtc-kicker">JÁ EXISTE UMA HISTÓRIA?</span><h2>ENTRAR NA CHAMPIONS</h2>'+
    '<p>Informe os dados do seu protagonista ao lado e entre na sala de outro jogador.</p>'+
    '<label for="rtc-code">Código da campanha</label><input id="rtc-code" maxlength="8" spellcheck="false" autocapitalize="characters" placeholder="ABCDE" value="'+safe(salvo||"")+'">'+
    '<div class="rtc-margin"><button class="rtc-button" data-acao="entrar">ENTRAR NA SALA</button></div></section>'+
    '<section class="rtc-card"><span class="rtc-kicker">FORMATO EXPERIMENTAL</span><h3>8 CLUBES, UMA TAÇA</h3>'+
    '<p>Dois grupos de quatro, semifinal e final. Os clubes não escolhidos são controlados pela CPU. Antes de cada rodada, todos decidem como reagir a um acontecimento.</p>'+
    '<p class="rtc-small">A versão inicial usa simulação tática, sem partidas 3D ou regulamento oficial de 36 clubes.</p></section></div></div>';
}
function jogadores(s) {
  return s.jogadores.map(p=>'<div class="rtc-person">'+tagClube(p.clube)+'<span><strong>'+safe(p.avatar)+'</strong>'+
    '<small>'+safe(p.nome)+' · '+safe(nomeClube(p.clube))+' · '+safe(p.pos)+'</small></span>'+
    '<i>'+ (p.id===s.dono?"ANFITRIÃO":p.id===s.eu?"VOCÊ":"PROTAGONISTA")+'</i></div>').join("");
}
function paginaLobby(s){
  const eu=s.jogadores.find(p=>p.id===s.eu),ocupados=s.jogadores.filter(p=>p.id!==s.eu).map(p=>p.clube);
  app.innerHTML='<section class="rtc-hero"><span class="rtc-eyebrow">LOBBY · SUA HISTÓRIA COMEÇA AQUI</span>'+
    '<h1>A EUROPA <em>ESPERA.</em></h1><p>Convoque até cinco amigos. Cada um assume um clube e cria seu personagem. Quando a sala começar, as escolhas serão permanentes.</p></section>'+
    '<div class="rtc-grid"><div class="rtc-stack"><section class="rtc-card"><span class="rtc-kicker">VESTIÁRIO · '+s.jogadores.length+'/6</span>'+
    '<h2>OS PROTAGONISTAS</h2>'+jogadores(s)+'</section>'+
    '<section class="rtc-card"><span class="rtc-kicker">SUA CAMISA</span><h3>TROCAR DE CLUBE</h3>'+
    '<label for="rtc-mudar">Clube disponível</label>'+comboClubes("rtc-mudar",eu.clube,ocupados)+
    '<div class="rtc-margin"><button class="rtc-button ghost" data-acao="mudar">CONFIRMAR CLUBE</button></div></section></div>'+
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
function feed(s){
  return '<section class="rtc-card"><div class="rtc-titleline"><div><span class="rtc-kicker">A IMPRENSA NÃO ESQUECE</span><h3>DIÁRIO DA CHAMPIONS</h3></div></div>'+
    '<div class="rtc-feed">'+(s.historico.length?s.historico.map(x=>'<div class="rtc-news"><small>CAPÍTULO '+(num(x.rodada)+1)+' · '+(x.tipo==='decisao'?'DECISÃO':'PLACAR')+'</small>'+
    (x.autor?'<b>'+safe(x.autor)+'</b> · ':'')+safe(x.texto)+'</div>').join(''):'<p>As primeiras manchetes ainda serão escritas.</p>')+
    '</div></section>';
}
function atributos(s){
  const eu=s.jogadores.find(p=>p.id===s.eu);
  return '<section class="rtc-card"><span class="rtc-kicker">FICHA DO PROTAGONISTA</span><h3>'+safe(eu.avatar)+'</h3>'+
    '<div class="rtc-person">'+tagClube(eu.clube)+'<span><b>'+safe(nomeClube(eu.clube))+'</b><small>'+safe(eu.pos)+'</small></span></div>'+
    '<div class="rtc-attributes rtc-margin">'+Object.entries(attrNames).map(([k,label])=>'<div class="rtc-attribute">'+
    '<small class="rtc-label">'+label+'</small><b>'+num(eu.atributos[k])+'</b></div>').join('')+'</div></section>';
}
function rivalidades(s){
  const eu=s.jogadores.find(p=>p.id===s.eu);
  return '<section class="rtc-card"><span class="rtc-kicker">DESTINOS CRUZADOS</span><h3>LAÇOS E RIVALIDADES</h3>'+
    s.jogadores.filter(p=>p.id!==eu.id).map(p=>{
      const valor=num(eu.relacoes[p.id]);const tipo=valor>10?"Respeito":valor< -10?"Rivalidade":"Neutro";
      return '<div class="rtc-statline"><span>'+safe(eu.avatar)+' × '+safe(p.avatar)+'</span><b>'+tipo+' · '+valor+'</b></div>';
    }).join('')+
    (s.jogadores.length===1?'<p class="rtc-muted">Convide outras pessoas para criar relações entre protagonistas.</p>':'')+'</section>';
}
function narrativa(s){
  if(s.feito)return '<section class="rtc-card"><span class="rtc-kicker">ESCOLHA REGISTRADA</span><h2>O FUTURO FOI ESCRITO.</h2>'+
    '<p class="rtc-message">Você tomou sua decisão. '+s.prontos+' de '+s.jogadores.length+' protagonistas já responderam neste capítulo.</p>'+
    (s.dono===s.eu?'<button class="rtc-button primary" data-acao="avancar"'+(s.prontos!==s.jogadores.length?' disabled':'')+'>SIMULAR JORNADA E AVANÇAR →</button>':
     '<p class="rtc-small">O anfitrião avança quando todos estiverem prontos.</p>')+'</section>';
  const ev=s.evento;
  return '<section class="rtc-card"><span class="rtc-kicker">DECISÃO QUE MUDA SEU LEGADO</span><h2>'+safe(ev.titulo)+'</h2>'+
    '<p class="rtc-message">'+safe(ev.texto)+'</p>'+
    '<label for="rtc-tatica">Como seu clube entrará em campo?</label><select id="rtc-tatica">'+
    '<option value="equilibrado">Equilibrado — administrar o jogo</option>'+
    '<option value="pressionar">Pressionar — recuperar a bola no ataque</option>'+
    '<option value="recuar">Recuar — explorar contra-ataques</option></select>'+
    '<p class="rtc-small">O resultado é simulado a partir da força do elenco, da estratégia e de um fator de imprevisibilidade. As escolhas da história não determinam o placar.</p>'+
    ev.opcoes.map(x=>'<button type="button" class="rtc-choice" data-acao="decidir" data-opcao="'+x.id+'"><b>'+safe(x.texto)+'</b>'+
    '<small>'+safe(x.dica)+'</small></button>').join('')+'</section>';
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
  clube:document.getElementById("rtc-clube")?.value,pos:document.getElementById("rtc-pos")?.value});
let ocupado=false;
app.addEventListener("click",async e=>{
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
  if(acao==="mudar"){evento="clube";dados={clube:document.getElementById("rtc-mudar")?.value};}
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
