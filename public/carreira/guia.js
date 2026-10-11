// O guia da carreira: o botão "Guia" na barra de cima abre uma janela com o "como jogar" por assunto, em qualquer tela,
// sem tirar nada do lugar. Abre no assunto da tela em que a pessoa está.
const Guia = (() => {
  const T = [
    ["visao", "O básico", `
      <p>Você é o técnico. Escolhe um clube, monta o time e leva o clube por temporadas de liga e copas (de 1 a 5, como no contrato).</p>
      <ol>
        <li>Na <b>Sede</b>, toque em <b>Jogar a próxima partida</b>.</li>
        <li>Entre uma rodada e outra, mexa no <b>Elenco e tática</b>, no <b>Mercado</b> e na caixa de entrada.</li>
        <li>No fim da temporada o elenco envelhece, jovens sobem, a diretoria cobra a meta e começa outra.</li>
      </ol>
      <p>A sede tem três abas: <b>Central</b> (jogar, notícias, tabela), <b>Meu time</b> (força, setores, finanças) e <b>Temporada</b> (tabela, artilharia, histórico). Os atalhos ao lado das abas levam às telas de gestão; para voltar, use o botão de cima.</p>`],
    ["partida", "A partida", `
      <p>Antes de jogar, escolha como quer viver o jogo (na Central, em <b>Como jogar</b>):</p>
      <ul>
        <li><b>Só o resultado:</b> a partida corre sozinha e você acompanha.</li>
        <li><b>Com decisões táticas:</b> o jogo para no intervalo e em momentos-chave para você mexer.</li>
        <li><b>Jogar os lances decisivos:</b> além das paradas, você escolhe nos ataques, faltas e pênaltis.</li>
      </ul>
      <p>Nas paradas você troca jogadores, formação e estilo. Se um titular for expulso ou se machucar, a vaga fica aberta: ponha alguém do campo ou um reserva nela. Mata-mata empatado vai para os <b>pênaltis</b>; nos modos com decisão, você escolhe o canto ao bater e o pulo ao defender.</p>
      <p>O resultado de cada lance sai de uma conta com sorte: um bom atributo aumenta a chance, mas não garante nada.</p>`],
    ["elenco", "Elenco e tática", `
      <p>Na prancheta, cada titular ocupa uma vaga da formação. Toque (ou arraste) para trocar de lugar com um reserva.</p>
      <ul>
        <li><b>Encaixe:</b> jogar fora da posição de origem custa nota. A prancheta mostra a nota e o rendimento real naquela vaga.</li>
        <li><b>Formação e variação:</b> mudam as vagas do campo (laterais, volantes, meias, pontas).</li>
        <li><b>Estilo de jogo:</b> dá bônus quando o elenco tem o perfil certo e pode piorar o time quando não tem. A prancheta mostra o que cada opção muda.</li>
        <li><b>Mentalidade, pressão e linha:</b> deixam o time mais ofensivo ou mais seguro, com custo no cansaço.</li>
        <li><b>Escalação automática:</b> o computador escolhe os melhores para cada vaga.</li>
      </ul>
      <p>Jogador cansado rende menos e se machuca mais; lesionados e suspensos não entram. Descanso e rodízio fazem parte do jogo.</p>`],
    ["mercado", "Mercado", `
      <p>Contratar e vender jogadores só vale nas <b>janelas</b>: o começo da temporada e o meio dela. O relógio da janela aparece no topo do Mercado.</p>
      <ul>
        <li><b>Contratar:</b> filtre por posição, nota e preço, e veja o que cabe no caixa. Na ficha, o clube diz quanto pede: \"Comprar pelo preço pedido\" fecha na hora (na carreira em grupo a compra é por leilão).</li>
        <li><b>Desvalorizados:</b> veteranos (a partir dos 29 anos) e jogadores em fase ruim valem menos; use o filtro \"Só desvalorizados\" para caçar pechinchas.</li>
        <li><b>Olheiro:</b> sugere quem melhora o time e cabe no caixa pelo preço que o clube realmente pede (e avisa quando o jogador está desvalorizado).</li>
        <li><b>Vender:</b> ponha na lista de vendas ou venda na hora.</li>
        <li><b>Propostas:</b> outros clubes mandam ofertas pelos seus jogadores na caixa de entrada.</li>
        <li><b>Aba Rival:</b> na Sede, a aba Rival mostra o próximo adversário: como ele joga, quem é o perigo e o que a sua formação rende contra a dele, com botões para trocar de formação na hora.</li>
        <li><b>Coletiva e torcida:</b> depois de jogos marcantes (goleada, derrota, clássico, sequência) chega uma coletiva, ou a torcida cobra ou abraça. O que você responde mexe com imprensa, torcida, vestiário e diretoria, e a torcida muda o clima do estádio: cheia e animada, vale +1 na nota em casa; irritada, vale -1. Fora, clube grande e clássico pressionam.</li>
        <li><b>Mercado de técnicos:</b> no fim de cada temporada (menos a última) e no começo da seguinte, antes do primeiro jogo, outros clubes sondam você; sempre sai pelo menos uma proposta. Na aba Temporada da Sede você aceita uma proposta ou se candidata a outro clube (cada um responde uma vez, com chance pela sua reputação e resultados). No fim da temporada a troca vale na virada; no começo, é na hora. Você leva a reputação; estádio, contratos e diretoria são os do clube novo.</li>
        <li><b>Personalidade:</b> todo jogador tem um jeito (líder, profissional, pavio curto, vaidoso, festeiro, guerreiro ou reservado), que você vê na ficha. O líder entre os titulares segura o time quando a moral está baixa (+1 na nota), o pavio curto é suspenso no 2º amarelo, e cada jeito abre eventos próprios na caixa de entrada, com escolhas que mexem na moral, no vestiário e no rendimento dele.</li>
      </ul>
      <p>Contratos acabam: renove os importantes na tela <b>Clube</b>, antes de perdê-los de graça.</p>`],
    ["temporada", "Temporada e copas", `
      <p>As ligas e as copas rodam juntas no calendário mundial, em semanas alternadas. Em cada competição vale a regra dela: pontos corridos, grupos, mata-mata de ida e volta ou jogo único.</p>
      <ul>
        <li><b>Tabela:</b> abas por competição, com artilharia e as chaves do mata-mata.</li>
        <li><b>Calendário:</b> seus próximos jogos. "TBA" quer dizer que o confronto ainda depende de uma fase anterior.</li>
        <li><b>Série A e B:</b> na virada, os quatro últimos da A descem e os quatro primeiros da B sobem.</li>
        <li><b>Meta da diretoria:</b> definida pela força do seu elenco contra a da sua liga. Cumprir rende bônus e confiança; falhar custa pressão.</li>
        <li><b>Estante:</b> troféus, campeões de cada ano e o ranking dos técnicos.</li>
      </ul>`],
    ["clube", "Clube", `
      <p>A tela <b>Clube</b> cuida do que vai além do campo:</p>
      <ul>
        <li><b>Contratos:</b> renovação com aumento, prazo e multa.</li>
        <li><b>Base:</b> garotos com potencial (visível só com olheiros) para promover, vender ou dispensar.</li>
        <li><b>Estrutura:</b> estádio, centro de treinamento, departamento médico, olheiros e base, uma obra por vez.</li>
        <li><b>Vestiário:</b> capitão e dilemas que cobram a conta depois.</li>
        <li><b>Técnico:</b> pontos de habilidade para escolher o seu jeito de trabalhar.</li>
      </ul>
      <p>A confiança da diretoria cai com maus resultados e com más escolhas. Abaixo de um limite, vem o ultimato.</p>`],
    ["grupo", "Em grupo", `
      <p>Na carreira em grupo, a turma joga no mesmo mundo, cada um com o seu clube, usando o código da sala de 5 letras.</p>
      <ul>
        <li><b>Anfitrião:</b> escolhe as regras, começa a carreira e puxa cada rodada. Pode passar o cargo.</li>
        <li><b>Rodada ao vivo:</b> todos jogam juntos. Quem não tem jogo acompanha os outros.</li>
        <li><b>Compras:</b> em cada janela vale uma opção (por exemplo, três jogadores de nota até 80, ou um de até 85). Ela não se repete na janela seguinte.</li>
        <li><b>Leilão e trocas:</b> o leilão vale um jogador por vez; as trocas entre técnicos ficam na tela Trocas.</li>
        <li><b>Entrar no meio:</b> quem chega depois assume um clube livre.</li>
      </ul>`],
  ];
  const TELA = { inicio: "visao", sede: "visao", feed: "visao", partida: "partida", elenco: "elenco", mercado: "mercado", tabela: "temporada", calendario: "temporada", temporadas: "temporada", clube: "clube", grupo: "grupo", trocas: "grupo" };
  let dlg = null, atual = "visao";

  function montar() {
    dlg = document.createElement("dialog");
    dlg.id = "guia"; dlg.className = "dialogo guia"; dlg.setAttribute("aria-labelledby", "guiaTitulo");
    dlg.innerHTML = `<h2 id="guiaTitulo">Como jogar</h2>
      <div class="guia-abas" role="tablist" aria-label="Assuntos">${T.map(([id, nome]) => `<button role="tab" data-guia="${id}">${nome}</button>`).join("")}</div>
      <div id="guiaCorpo" class="guia-corpo" role="tabpanel" tabindex="0"></div>
      <div class="linha fim"><button class="primario" id="guiaFechar">Entendi</button></div>`;
    document.body.appendChild(dlg);
    dlg.addEventListener("click", (e) => {
      if (e.target === dlg || e.target.id === "guiaFechar") return dlg.close();
      const b = e.target.closest("[data-guia]"); if (b) ir(b.dataset.guia);
    });
  }
  function ir(id) {
    atual = id;
    for (const b of dlg.querySelectorAll("[data-guia]")) { const on = b.dataset.guia === id; b.setAttribute("aria-selected", on); if (on) b.scrollIntoView({ inline: "nearest", block: "nearest" }); }
    $("guiaCorpo").innerHTML = T.find((t) => t[0] === id)[2];
    $("guiaCorpo").scrollTop = 0;
  }
  function abrir(assunto) {
    if (!dlg) montar();
    ir(assunto || TELA[document.body.dataset.tela] || "visao");
    if (!dlg.open) dlg.showModal();
  }
  document.addEventListener("click", (e) => { if (e.target.closest("#btnGuia")) abrir(); });
  return { abrir };
})();
