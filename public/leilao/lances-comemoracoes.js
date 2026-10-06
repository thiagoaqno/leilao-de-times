// Leilão da Galera — as comemorações dos replays (lances.js): 45 jeitos de festejar o gol, em close e de frente.
// Cada uma devolve, no tempo t desde o começo do close: { p: a pose, dx: andando para o lado, rot, vira, deitado, zoom,
// chao, fx: um efeito, extras: os companheiros }. Os craques com comemoração própria ficam em Lances.ASSINATURA: ela
// sai às vezes, e nas outras ele sorteia qualquer uma (todo mundo imita o "siu").
(function () {
  const C = Lances.COMEMORA;
  const { mix, fase, suave, quadros, marcha, corre, GOLEIRO } = Lances.kit;
  const F = (o) => ({ pes: "fora", ...o }); // de frente, com as chuteiras para os lados
  const EM_V = { bE: [-150, -160], bD: [150, 160] }; // os braços para cima, em V
  const pisca = (t, ms) => Math.floor(t / ms) % 2; // 0 ou 1, trocando a cada ms
  const BOCA = [-140, -110]; // o braço direito com a mão na boca (o esquerdo é o espelho: [140, 110])

  // ---------- as dos craques ----------
  // o soco no ar (o Pelé em 1970)
  C.soco = (t) => ({ p: quadros(t, [
    [0, F({ ag: 2, bE: [-25, 15], bD: [25, -15], pE: [-14, 6], pD: [14, -6] })],
    [260, F({ sobe: 5, bE: [-45, -20], bD: [150, 172], pE: [-10, 10], pD: [30, -10] })],
    [470, F({ sobe: 7, bE: [-60, -35], bD: [178, 180], pE: [-14, 6], pD: [45, -30] })],
    [720, F({ ag: 2, bE: [-25, 15], bD: [165, 178], pE: [-14, 6], pD: [14, -6] })],
    [1000, F({ ag: 2, bE: [-25, 15], bD: [25, -15], pE: [-14, 6], pD: [14, -6] })]], true) });
  // o "siu" do Cristiano: pula girando e cai de pernas abertas, braços para baixo
  C.siu = (t) => ({ vira: t > 380 && t < 560, p: quadros(t, [
    [0, F({ ...marcha(t), bE: [-30, -10], bD: [30, 10] })],
    [300, F({ ag: 3, bE: [-40, -20], bD: [40, 20], pE: [-12, 8], pD: [12, -8] })],
    [520, F({ sobe: 8, ...EM_V, pE: [-4, -2], pD: [4, 2] })],
    [760, F({ ag: 4, bE: [-38, -42], bD: [38, 42], pE: [-30, -30], pD: [30, 30] })],
    [1100, F({ ag: 3, bE: [-36, -40], bD: [36, 40], pE: [-30, -30], pD: [30, 30] })]]) });
  // os dois dedos para o céu (Messi, Kaká)
  C.ceu = (t) => ({ fx: "brilho", p: F({ ...marcha(t, 520), dedo: true, bE: [-160 - 4 * Math.sin(t / 200), -176], bD: [160 + 4 * Math.sin(t / 200), 176] }) });
  // embalando o nenê (o Bebeto em 1994)
  C.nene = (t) => {
    const s = Math.sin(t / 130);
    return { dx: 3 * s, p: F({ nene: true, bE: [-25 + 12 * s, 62 + 12 * s], bD: [25 + 12 * s, -62 + 12 * s], tr: 2 * s, pE: [-8 + 5 * s, -4], pD: [8 + 5 * s, 4] }) };
  };
  // o aviãozinho: braços abertos, inclinando de um lado para o outro
  C.aviao = (t) => {
    const s = Math.sin(t / 170);
    return { dx: 7 * Math.sin(t / 420), p: F({ ...marcha(t, 260), tr: 3 * s, bE: [-90 + 18 * s, -95 + 18 * s], bD: [90 + 18 * s, 95 + 18 * s] }) };
  };
  // de joelhos, deslizando na grama, de braços para cima
  C.joelhos = (t) => {
    const f = fase(t, 0, 600), b = Math.sin(t / 110) * 8 * (f >= 1 ? 1 : 0);
    return { dx: -38 * (1 - suave(f)), fx: f < 1 ? "grama" : "", p: F({ ag: 5, pE: [-10, -95], pD: [10, 95], bE: [-150 - b, -160 - b], bD: [150 + b, 160 + b] }) };
  };
  // sentado de pernas cruzadas, meditando (o Haaland)
  C.zen = (t) => ({ fx: "aura", p: F({ ag: 8, pE: [-78, 62], pD: [78, -62], bE: [-5, 5], bD: [5, -5], sobe: Math.sin(t / 500) > 0.6 ? 1 : 0 }) });
  // de braços cruzados (o Mbappé)
  C.cruzado = (t) => ({ p: F({ pE: [-12, -10], pD: [12, 10], bE: [20, 85], bD: [-25, -80], sobe: Math.sin(t / 400) > 0.7 ? 1 : 0 }) });
  // tremendo de frio, abraçado (o Cole Palmer)
  C.frio = (t) => { const s = pisca(t, 60) ? 1 : -1; return { dx: s * 0.5, p: F({ pE: [-8, -6], pD: [8, 6], bE: [20 + 4 * s, 85], bD: [-25 + 4 * s, -80], tr: s * 0.6 }) }; };
  // dancinha (Roger Milla, Vini Jr., Ronaldinho, Griezmann)
  C.danca = (t) => ({ dx: 3 * Math.sin((t / 600) * Math.PI * 2), p: quadros(t, [
    [0, F({ tr: -2, bE: [-150, -120], bD: [45, 85], pE: [-16, 8], pD: [6, 2] })],
    [300, F({ tr: 2, bE: [-45, -85], bD: [150, 120], pE: [-6, -2], pD: [16, -8] })],
    [600, F({ tr: -2, bE: [-150, -120], bD: [45, 85], pE: [-16, 8], pD: [6, 2] })]], true) });
  // a cambalhota (o Klose)
  C.cambalhota = (t) => {
    if (t < 300) return { dx: mix(-34, -14, t / 300), p: F({ ...marcha(t, 160), bE: [-40, -20], bD: [40, 20] }) };
    const f = fase(t, 300, 900);
    if (f < 1) return { dx: mix(-14, 4, f), rot: Math.floor(f * 4) * 90, p: F({ sobe: 9 * Math.sin(Math.PI * f), ag: 2, pE: [-70, 20], pD: [70, -20], bE: [-40, 40], bD: [40, -40] }) };
    return { dx: 4, p: F({ ...EM_V, pE: [-10, -8], pD: [10, 8], sobe: Math.abs(Math.sin(t / 160)) * 1.5 }) };
  };
  // a mão na orelha, como quem fala ao telefone (o Gabriel Jesus)
  C.alo = (t) => ({ p: F({ ...marcha(t, 450), bE: [-15, -5], bD: [118, -160] }) });
  // as mãos nas orelhas, provocando a torcida
  C.orelha = (t) => ({ p: F({ ...marcha(t, 450), tr: Math.sin(t / 300) > 0 ? 1 : -1, bE: [-118, 160], bD: [118, -160] }) });
  // de braços bem abertos, parado (o Bellingham)
  C.abre = (t) => ({ p: F({ pE: [-14, -12], pD: [14, 12], bE: [-95, -100], bD: [95, 100], sobe: Math.sin(t / 380) > 0.75 ? 1 : 0 }) });
  // o coraçãozinho com as mãos (o Neymar)
  C.coracao = (t) => ({ fx: "coracao", p: F({ ...marcha(t, 600), bE: [15, 120], bD: [-15, -120] }) });

  // ---------- as do vestiário ----------
  // a chupeta: o dedo na boca, para o filho
  C.chupeta = (t) => ({ p: F({ ...marcha(t, 600), tr: Math.sin(t / 300), bE: [-15, -5], bD: BOCA }) });
  // beijando o escudo: puxa a camisa até a boca e depois aponta para a torcida
  C.beijaEscudo = (t) => (t < 900 ? { p: F({ escudo: true, pE: [-6, -4], pD: [6, 4], bE: [140, 110], bD: BOCA, sobe: pisca(t, 300) }) }
    : { p: F({ ...marcha(t, 380), dedo: true, bE: [-15, -5], bD: [125, 125] }) });
  // a camisa na cabeça, correndo em roda
  C.camisaCabeca = (t) => ({ dx: 10 * Math.sin(t / 380), p: F({ ...marcha(t, 220), camisaNaCabeca: true, ...EM_V }) });
  // sem camisa, girando a camisa no alto
  C.giraCamisa = (t) => ({ dx: 4 * Math.sin(t / 500), p: F({ ...marcha(t, 260), semCamisa: true, camisaNaMao: true, giro: t * 0.9, bE: [-60, -30], bD: [165, 178] }) });
  // o robô: duro, pulando de pose em pose
  C.robo = (t) => ({ p: quadros(t, [
    [0, F({ bE: [-90, 0], bD: [90, 180], pE: [-6, -6], pD: [6, 6] })],
    [180, F({ bE: [-90, -180], bD: [90, 0], pE: [-6, -6], pD: [20, 20], tr: 1 })],
    [360, F({ bE: [0, 90], bD: [0, -90], pE: [-20, -20], pD: [6, 6], tr: -1 })],
    [540, F({ bE: [-90, -90], bD: [90, 90], pE: [-6, -6], pD: [6, 6] })],
    [720, F({ bE: [-90, 0], bD: [90, 180], pE: [-6, -6], pD: [6, 6] })]], true, true) });
  // samba no pé: os pés ligeiros, o quadril e os braços rodando na frente
  C.samba = (t) => {
    const s = Math.sin(t / 70), c = Math.cos(t / 140);
    return { dx: 1.5 * c, p: F({ ...marcha(t, 150), tr: 2 * c, bE: [-40 + 25 * s, 70 + 30 * s], bD: [40 - 25 * s, -70 + 30 * c] }) };
  };
  // o canguru: pulinhos com as mãos encolhidas na frente
  C.canguru = (t) => {
    const f = (t % 420) / 420;
    return { dx: 10 * Math.sin(t / 900), p: F({ pE: [-4, -8], pD: [4, 8], ag: f > 0.8 ? 2 : 0, bE: [-20, 100], bD: [20, -100], sobe: 7 * Math.sin(Math.PI * Math.min(1, f / 0.8)) }) };
  };
  // as flexões no chão
  C.flexao = (t) => {
    const s = (Math.sin(t / 150) + 1) / 2, braco = [mix(90, 45, s), mix(90, 135, s)];
    return { deitado: 90, p: { pE: [0, 0], pD: [2, 2], bE: braco, bD: braco, ol: 0, sobe: mix(4, 1, s) } };
  };
  // a estrela: dá uma estrela (de lado, braços e pernas abertos) e para de braços para cima
  C.estrela = (t) => {
    const f = fase(t, 150, 850);
    if (f > 0 && f < 1) return { dx: mix(-26, 22, f), rot: Math.floor(f * 4) * 90, p: F({ bE: [-135, -135], bD: [135, 135], pE: [-35, -35], pD: [35, 35], sobe: 4 * Math.sin(Math.PI * f) }) };
    return { dx: f >= 1 ? 22 : -26, p: F({ ...marcha(t, 300), ...EM_V }) };
  };
  // deitado de barriga para cima, abrindo e fechando braços e pernas (o anjo na neve)
  C.anjo = (t) => {
    const s = (Math.sin(t / 160) + 1) / 2, a = mix(60, 170, s), b = mix(5, 35, s);
    return { deitado: -90, p: { pE: [-b, -b], pD: [b, b], bE: [-a, -a - 5], bD: [a, a + 5], ol: 0 } };
  };
  // o peixinho na grama: corre, mergulha de barriga e sai deslizando (o Klinsmann)
  C.peixe = (t) => {
    if (t < 280) return { dx: mix(-40, -24, t / 280), p: F({ ...marcha(t, 140), bE: [-40, -20], bD: [40, 20] }) };
    const f = fase(t, 280, 950);
    return { dx: mix(-24, 18, suave(f)), deitado: 90, fx: f < 0.9 ? "grama" : "", p: { pE: [-4, -2], pD: [4, 2], bE: [-175, -178], bD: [175, 178], ol: 1, sobe: Math.max(0, 6 * Math.sin(Math.PI * fase(t, 280, 480))) } };
  };
  // silêncio: o dedo na boca, calando a torcida do outro time
  C.silencio = (t) => ({ dx: mix(-8, 8, fase(t, 0, 1400)), p: F({ ...marcha(t, 520), dedo: true, ol: pisca(t, 600) ? 1 : -1, bE: [-15, -5], bD: [-100, -170] }) });
  // a continência
  C.continencia = (t) => ({ p: F({ pE: [-3, -2], pD: [3, 2], bE: [-6, -3], bD: [-150, -170], sobe: t < 200 ? 2 * Math.sin((Math.PI * t) / 200) : 0 }) });
  // batendo no peito
  C.batePeito = (t) => { const s = pisca(t, 170); return { p: F({ ...marcha(t, 340), bE: s ? [0, 100] : [-10, 40], bD: s ? [10, -40] : [0, -100] }) }; };
  // de costas, apontando o nome e o número da camisa
  C.costas = (t) => ({ p: F({ costas: true, pE: [-10, -8], pD: [10, 8], bE: [-110, 120], bD: [110, -120], sobe: pisca(t, 400) }) });
  // o beijo na câmera: corre até a câmera, dá um beijo na lente e deixa a marca do batom
  C.beijoCamera = (t) => (t < 380 ? { dx: mix(-14, 0, t / 380), p: F({ ...marcha(t, 160), bE: [-40, -20], bD: [40, 20] }) }
    : { zoom: 3, chao: 118, fx: t > 760 ? "marca" : "", p: F({ beijo: t > 500, bE: [-15, -5], bD: BOCA }) });
  // a dancinha do momento: pulinhos nos calcanhares e os braços balançando
  C.griddy = (t) => {
    const s = Math.sin(t / 95);
    return { p: F({ pE: s > 0 ? [-10, -70] : [-6, -4], pD: s < 0 ? [10, 70] : [6, 4], bE: [-30 + 45 * s, -10 + 70 * s], bD: [30 + 45 * s, 10 + 70 * s], sobe: Math.abs(s) * 2 }) };
  };
  // "calma, calma": as mãos abaixando devagar
  C.calma = (t) => {
    const s = (Math.sin(t / 260) + 1) / 2;
    return { dx: mix(-6, 6, fase(t, 0, 1600)), p: F({ ...marcha(t, 700), bE: [-30 + 10 * s, 75 - 20 * s], bD: [30 - 10 * s, -75 + 20 * s] }) };
  };
  // não acredita: as mãos na cabeça, olhando para os lados
  C.naoAcredita = (t) => ({ dx: 3 * Math.sin(t / 600), p: F({ ...marcha(t, 800), ol: [0, 1, 0, -1][Math.floor(t / 300) % 4], bE: [-165, 150], bD: [165, -150] }) });
  // agradecendo, com as mãos juntas
  C.agradece = (t) => ({ fx: "brilho", p: F({ pE: [-4, -3], pD: [4, 3], bE: [70, 150], bD: [-70, -150], ag: pisca(t, 500) }) });
  // o abraço: o companheiro chega correndo e pula no colo (de costas para a câmera)
  C.abraco = (t) => {
    const f = fase(t, 0, 420), junto = t > 420;
    const p = junto ? F({ bE: [-40, 70], bD: [40, -70], sobe: pisca(t, 220) }) : F({ ...marcha(t, 300), bE: [-110, -120], bD: [110, 120] });
    const parceiro = junto ? F({ costas: true, pE: [-30, -60], pD: [30, 60], bE: [-60, 60], bD: [60, -60], sobe: 4 + pisca(t, 220) }) : corre(t, "alto", 200);
    return { p, extras: [{ b: "parceiro", dx: mix(40, 5, suave(f)), vira: !junto, frente: junto, p: parceiro }] };
  };
  // o montinho: ele cai de costas e os companheiros pulam em cima
  C.montinho = (t) => {
    const cai = fase(t, 0, 300);
    const extras = [["parceiro", 380, 6], ["parceiro2", 620, 12]].map(([b, t0, alto]) => {
      const f = fase(t, t0, t0 + 260);
      return f <= 0 ? null : { b, dx: mix(36, 2, f), frente: true, deitado: 90, p: { pE: [-20, -40], pD: [20, 40], bE: [-120, -150], bD: [120, 150], ol: 0, sobe: mix(14, alto, f) + 2 * Math.sin(Math.PI * f) } };
    }).filter(Boolean);
    return { deitado: cai >= 1 ? -90 : 0, p: cai < 1 ? F({ ...EM_V, ag: Math.round(5 * cai) }) : { ...GOLEIRO.chao, ol: 0 }, extras };
  };
  // socando a bandeirinha de escanteio
  C.bandeirinha = (t) => ({ fx: "bandeira", dx: -6, p: { ...(pisca(t, 160) ? { bE: [-40, -10], bD: [92, 92] } : { bE: [92, 92], bD: [40, 110] }), pE: [-20, -10], pD: [20, 10], tr: 1, ol: 1 } });
  // sentado na cadeira do banco, de braços cruzados
  C.cadeira = (t) => ({ fx: "cadeira", p: F({ ag: 4, pE: [-50, 0], pD: [50, 0], bE: [20, 85], bD: [-25, -80], sobe: Math.sin(t / 500) > 0.8 ? 1 : 0 }) });
  // o golpe do desenho japonês: junta energia nas mãos e solta o raio
  C.energia = (t) => (t < 650 ? { fx: "carga", p: F({ ag: 2, pE: [-25, -15], pD: [25, 15], bE: [40, 100], bD: [60, 120], ol: 1 }) }
    : { fx: "feixe", p: F({ ag: 2, pE: [-30, -25], pD: [20, 10], bE: [85, 90], bD: [95, 92], ol: 1, tr: 1 }) });
  // o raio: um braço apontando para o alto, o outro dobrado, e o raio no céu
  C.raio = (t) => ({ fx: "raio", p: F({ dedo: true, pE: [-28, -20], pD: [8, 4], bE: [70, 110], bD: [130, 130], sobe: t < 220 ? 3 * Math.sin((Math.PI * t) / 220) : 0 }) });
  // os óculos: as mãos em volta dos olhos, procurando a torcida
  C.oculos = (t) => ({ dx: 6 * Math.sin(t / 700), p: F({ ...marcha(t, 600), oculos: true, ol: Math.sin(t / 350) > 0 ? 1 : -1, bE: [-150, 100], bD: [150, -100] }) });
  // tocando guitarra (e balançando a cabeça)
  C.guitarra = (t) => { const s = pisca(t, 110); return { p: F({ guitarra: true, pE: [-22, -18], pD: [22, 18], ag: s, bE: [-110, 30], bD: [10, s ? -60 : -35] }) }; };
  // a barriguinha: a bola debaixo da camisa e o dedo na boca (vem nenê por aí)
  C.barriguinha = (t) => ({ p: F({ barriga: true, pE: [-8, -6], pD: [8, 6], bE: [10, 95], bD: BOCA, tr: Math.sin(t / 400), sobe: pisca(t, 500) }) });
  // mostrando o muque, sem camisa
  C.muque = (t) => { const s = pisca(t, 240); return { p: F({ semCamisa: true, pE: [-16, -12], pD: [16, 12], bE: [-90, s ? -175 : -160], bD: [90, s ? 175 : 160], ag: s }) }; };

  // a comemoração própria de cada craque (sai às vezes)
  Object.assign(Lances.ASSINATURA, {
    "Pelé": "soco", "Cristiano Ronaldo": "siu", "Lionel Messi": "ceu", "Kaká": "ceu", "Bebeto": "nene", "Erling Haaland": "zen",
    "Kylian Mbappé": "cruzado", "Cole Palmer": "frio", "Roger Milla": "danca", "Vinícius Júnior": "danca", "Ronaldinho Gaúcho": "danca",
    "Antoine Griezmann": "danca", "Miroslav Klose": "cambalhota", "Gabriel Jesus": "alo", "Jude Bellingham": "abre", "Neymar": "coracao",
    "Ronaldo Fenômeno": "aviao",
  });
})();
