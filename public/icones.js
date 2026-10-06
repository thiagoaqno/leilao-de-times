// Os ícones do site (SVG desenhados aqui, no lugar dos emojis), usados pelo Leilão e pelo Banco.
// - Icones.ic("bola") devolve o <svg> do ícone (usa o sprite que este arquivo coloca no começo do <body>);
// - Icones.iconizar(html) troca os emojis de um texto (a narração do campeonato, o júri dos pratos) pelos ícones;
// - Icones.peao("🚗") devolve o peão desenhado (o Banco guarda os peões pelo emoji, que é o que o servidor conhece);
// - Icones.observar(raiz) troca sozinho, pelos ícones, todo emoji que aparecer dentro da raiz (o histórico e as
//   notícias que vêm do servidor, os textos montados pelos scripts...).
(function () {
  const P = {
    bola: '<circle cx="12" cy="12" r="9.5"/><path d="m12 7.3 4.2 3-1.6 4.9H9.4L7.8 10.3z"/><path d="M12 7.3V2.6M16.2 10.3l4.4-1.5M14.6 15.2l2.8 3.9M9.4 15.2l-2.8 3.9M7.8 10.3 3.4 8.8"/>',
    martelo: '<path d="m14.5 12.5-8 8a2.1 2.1 0 1 1-3-3l8-8"/><path d="m16 16 6-6M8 8l6-6M9 7l8 8M21 11l-8-8"/>',
    cadeado: '<rect x="4.5" y="11" width="15" height="10" rx="2.5"/><path d="M8 11V7.5a4 4 0 0 1 8 0V11M12 15v2"/>',
    moeda: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5.5"/><path d="M12 9.5v5"/>',
    taca: '<path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0z"/><path d="M17 5h3v2a3 3 0 0 1-3 3M7 5H4v2a3 3 0 0 0 3 3"/>',
    relogio: '<circle cx="12" cy="13" r="8"/><path d="M12 9v4l2.5 2M9.5 2.5h5"/>',
    galera: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0"/><path d="M16 4.6a3.5 3.5 0 0 1 0 6.8M18 14a6 6 0 0 1 3.5 6"/>',
    copiar: '<rect x="9" y="9" width="11" height="11" rx="2.5"/><path d="M5 15V6.5A2.5 2.5 0 0 1 7.5 4H15"/>',
    elo: '<path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1"/><path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/>',
    escudo: '<path d="M12 3 4.5 6v5.5c0 4.6 3.2 8.2 7.5 9.5 4.3-1.3 7.5-4.9 7.5-9.5V6z"/>',
    troca: '<path d="M7 4 3 8l4 4M3 8h14M17 20l4-4-4-4M21 16H7"/>',
    lapis: '<path d="M4 20h4L19 9l-4-4L4 16z"/><path d="m14 6 4 4"/>',
    lista: '<path d="M9 6h11M9 12h11M9 18h11"/><circle cx="4.5" cy="6" r="1"/><circle cx="4.5" cy="12" r="1"/><circle cx="4.5" cy="18" r="1"/>',
    desfazer: '<path d="M9 14 4 9l5-5"/><path d="M4 9h10a6 6 0 0 1 0 12h-3"/>',
    play: '<path d="M7 4.5v15l12.5-7.5z"/>',
    bandeira: '<path d="M5 21V4M5 4h11l-2 4 2 4H5"/>',
    olho: '<path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
    seta: '<path d="m6 9 6 6 6-6"/>',
    esq: '<path d="m15 6-6 6 6 6"/>',
    dir: '<path d="m9 6 6 6-6 6"/>',
    voltar: '<path d="M19 12H5M11 6l-6 6 6 6"/>',
    embaralhar: '<path d="M16 3h5v5M4 20 21 3M21 16v5h-5M15 15l6 6M4 4l5 5"/>',
    estrela: '<path d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1 6.2L12 17.3l-5.5 2.9 1-6.2L3 9.6l6.2-.9z"/>',
    grafico: '<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>',
    microfone: '<rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3"/>',
    luva: '<path d="M8 13V5.5a1.5 1.5 0 0 1 3 0V11M11 10V4.5a1.5 1.5 0 0 1 3 0V11M14 10.5V6a1.5 1.5 0 0 1 3 0v8a7 7 0 0 1-7 7h-.5A6.5 6.5 0 0 1 3 14.5V12a1.5 1.5 0 0 1 3 0v1"/>',
    medalha: '<circle cx="12" cy="15" r="6"/><path d="M8.5 10 6 3h4l2 4 2-4h4l-2.5 7"/>',
    explosao: '<path d="M12 2v4M12 18v4M2 12h4M18 12h4M5 5l3 3M16 16l3 3M5 19l3-3M16 8l3-3"/>',
    alerta: '<path d="M12 3.5 2.5 20h19z"/><path d="M12 10v4.5M12 17.5v.3"/>',
    lua: '<path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z"/>',
    espadas: '<path d="M14.5 17.5 3 6V3h3l11.5 11.5M13 19l6-6M16 16l4 4M19 21l2-2M9.5 6.5 14 2h3v3l-4.5 4.5M5 14l-1 1M7 17l-3 3M3 19l2 2"/>',
    estadio: '<ellipse cx="12" cy="8.5" rx="9" ry="3.5"/><path d="M3 8.5v6.5c0 1.9 4 3.5 9 3.5s9-1.6 9-3.5V8.5M7 11.8v3.5M12 12.3v3.5M17 11.8v3.5"/>',
    chuteira: '<path d="M3.5 6h6l1 5 8 2.5a2 2 0 0 1 1.5 2V17h-16.5z"/><path d="M3.5 20H21M8 17v3M13 17v3M18 17v3"/>',
    cartola: '<path d="M7 16V6.5a1 1 0 0 1 1-1h8a1 1 0 0 1 1 1V16"/><path d="M3 16h18v2.5H3zM7 12h10"/>',
    alvo: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1"/>',
    mira: '<circle cx="12" cy="12" r="7.5"/><path d="M12 2v5M12 17v5M2 12h5M17 12h5"/>',
    burger: '<path d="M4 10.5a8 5.5 0 0 1 16 0z"/><path d="M3 14h18M5 18.5h14a1 1 0 0 0 1-1V16H4v1.5a1 1 0 0 0 1 1z"/>',
    pizza: '<path d="M12 21 3 6.5a14 14 0 0 1 18 0z"/><circle cx="10" cy="10" r="1.2"/><circle cx="14" cy="12.5" r="1.2"/><circle cx="11.5" cy="15.5" r="1"/>',
    drink: '<path d="M5 4h14l-7 8.5zM12 12.5V20M8 20h8M15 7.5l3-5"/>',
    sorvete: '<path d="M7.5 11a4.5 4.5 0 1 1 9 0z"/><path d="m7.5 11 4.5 10 4.5-10"/>',
    coroa: '<path d="m3 8 4.5 4L12 5l4.5 7L21 8l-2 11H5z"/>',
    apito: '<circle cx="8" cy="14" r="5"/><path d="M11 10.5 21 7v4l-8 2.5M6.5 4.5l1 2M11 3.5l-.5 2.2"/>',
    livro: '<path d="M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2z"/><path d="M4 19V5M8 7h7"/>',
    recomecar: '<path d="M20 12a8 8 0 1 1-2.3-5.7L20 8.5M20 3v5.5h-5.5"/>',
    urna: '<rect x="4" y="10" width="16" height="11" rx="2"/><path d="M8 10V4h8v6M10 7h4M4 14h16"/>',
    brilho: '<path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8zM19 16l.8 2.2L22 19l-2.2.8L19 22l-.8-2.2L16 19l2.2-.8z"/>',
    fogo: '<path d="M12 22a7 7 0 0 0 7-7c0-4-3-6-4-9-1 2-2 3-3 3-1-2 0-5 0-6-4 2-7 7-7 12a7 7 0 0 0 7 7z"/>',
    imagem: '<rect x="3" y="4" width="18" height="16" rx="2.5"/><circle cx="9" cy="10" r="2"/><path d="m21 16-5-5-9 9"/>',
    ok: '<path d="M20 6 9 17l-5-5"/>',
    fechar: '<path d="M18 6 6 18M6 6l12 12"/>',
    mais: '<path d="M12 5v14M5 12h14"/>',
    menos: '<path d="M5 12h14"/>',
    pular: '<path d="M5 4.5 15 12 5 19.5zM19 5v14"/>',
    sair: '<path d="M14 4h5v16h-5M10 8l-4 4 4 4M6 12h10"/>',
    pensando: '<circle cx="6" cy="12" r="1.4"/><circle cx="12" cy="12" r="1.4"/><circle cx="18" cy="12" r="1.4"/>',
    campo: '<rect x="2.5" y="5" width="19" height="14" rx="1.5"/><path d="M12 5v14"/><circle cx="12" cy="12" r="2.5"/><path d="M2.5 9h3v6h-3M21.5 9h-3v6h3"/>',
    raio: '<path d="M13 2 4 14h7l-1 8 9-12h-7z"/>',
    sino: '<path d="M6 16V11a6 6 0 0 1 12 0v5l2 2H4zM10 21h4"/>',
    cartas: '<rect x="3" y="6" width="11" height="15" rx="2" transform="rotate(-8 8.5 13.5)"/><rect x="10" y="3" width="11" height="15" rx="2"/>',
    ponto: '<circle cx="12" cy="12" r="5" fill="currentColor" stroke="none"/>',
    // ---- Banco ----
    dado: '<rect x="3.5" y="3.5" width="17" height="17" rx="4"/><circle cx="8.5" cy="8.5" r="1.3" fill="currentColor"/><circle cx="15.5" cy="15.5" r="1.3" fill="currentColor"/><circle cx="12" cy="12" r="1.3" fill="currentColor"/>',
    banco: '<path d="M3 9.5 12 4l9 5.5M4.5 10v8M9 10v8M15 10v8M19.5 10v8M3 20.5h18"/>',
    nota: '<rect x="2.5" y="6" width="19" height="12" rx="2"/><circle cx="12" cy="12" r="2.6"/><path d="M6 9.5v5M18 9.5v5"/>',
    saco: '<path d="M9 4h6l-1.5 3h-3zM10.5 7C6 9 4 13 4.5 16.5 5 19.5 8 21 12 21s7-1.5 7.5-4.5C20 13 18 9 13.5 7"/><path d="M12 11v6M10 12.5c0-1 4-1 4 .5s-4 1-4 2.5 4 1.5 4 .5"/>',
    casa: '<path d="M3.5 11 12 4l8.5 7"/><path d="M5.5 9.5V20h13V9.5M10 20v-5.5h4V20"/>',
    hotel: '<rect x="5" y="3" width="14" height="18" rx="1"/><path d="M9 7h2M13 7h2M9 11h2M13 11h2M9 15h2M13 15h2M10.5 21v-3h3v3"/>',
    viatura: '<path d="M4 16v-4l2-4.5h12L20 12v4z"/><path d="M4 16h16v2H4zM10 4.5h4M12 4.5v3"/><circle cx="8" cy="18.5" r="1.5"/><circle cx="16" cy="18.5" r="1.5"/>',
    policial: '<path d="M5 9.5 12 6l7 3.5-1.5 1.5h-11z"/><path d="M7.5 11c0 4 2 6.5 4.5 6.5s4.5-2.5 4.5-6.5M5 21c1-2 3.5-3 7-3s6 1 7 3"/>',
    guardasol: '<path d="M3 12a9 9 0 0 1 18 0zM12 12v8.5M9 20.5h6"/><path d="M12 3c-2 3-2.5 6-2 9M12 3c2 3 2.5 6 2 9"/>',
    aviao: '<path d="M2.5 13 21 7.5c1 0 1 1.5 0 2L9 15l-2.5 4H5l1-4.5-3.5-1z"/>',
    lampada: '<path d="M9 17.5h6M10 21h4M8 13.5a6 6 0 1 1 8 0c-.8.8-1 1.8-1 4H9c0-2.2-.2-3.2-1-4z"/>',
    torneira: '<path d="M4 9h9a3 3 0 0 1 3 3v2M4 6v6M2.5 6h3M16 17.5c0 1.5-1 2.5-1 2.5s-1-1-1-2.5 1-2.5 1-2.5 1 1 1 2.5z"/>',
    mascara: '<path d="M2.5 9c3-2 6-2 9.5 0 3.5-2 6.5-2 9.5 0 0 4-2.5 6.5-5 6.5-2 0-3-1.5-4.5-1.5S9.5 15.5 7.5 15.5c-2.5 0-5-2.5-5-6.5z"/><circle cx="7.5" cy="10.5" r="1.3" fill="currentColor"/><circle cx="16.5" cy="10.5" r="1.3" fill="currentColor"/>',
    presente: '<rect x="3.5" y="9" width="17" height="11.5" rx="1.5"/><path d="M2.5 9h19M12 9v11.5M12 9C10 5 6 5 7 7.5S12 9 12 9zM12 9c2-4 6-4 5-1.5S12 9 12 9z"/>',
    sacola: '<path d="M5 8h14l-1 12.5H6zM9 10V7a3 3 0 0 1 6 0v3"/>',
    tomada: '<path d="M9 2.5v5M15 2.5v5M6 7.5h12v3a6 6 0 0 1-12 0zM12 16.5v5"/>',
    etiqueta: '<path d="M3 12V4h8l10 10-8 7z"/><circle cx="7.5" cy="8.5" r="1.4"/>',
    recibo: '<path d="M6 3h12v18l-2-1.5-2 1.5-2-1.5-2 1.5-2-1.5L6 21z"/><path d="M9 8h6M9 12h6M9 16h3"/>',
    sobe: '<path d="M3 17 9.5 10.5l4 4L21 7M15 7h6v6"/>',
    interrogacao: '<path d="M9 9a3 3 0 1 1 4.5 2.6c-1 .6-1.5 1.3-1.5 2.4M12 17.5v.3"/><circle cx="12" cy="12" r="9.5"/>',
    camera: '<path d="M3 8h11v9H3zM14 11l7-3v9l-7-3"/>',
    baixo: '<path d="M12 4v16M6 14l6 6 6-6"/>',
    ampulheta: '<path d="M6.5 3h11M6.5 21h11M7.5 3c0 5 4.5 6 4.5 9s-4.5 4-4.5 9M16.5 3c0 5-4.5 6-4.5 9s4.5 4 4.5 9"/>',
    ingresso: '<path d="M3 7h18v3a2 2 0 0 0 0 4v3H3v-3a2 2 0 0 0 0-4z"/><path d="M14 7v10" stroke-dasharray="2 2"/>',
    aperto: '<path d="M2.5 11.5 6.5 7.5l3.5 1.5 3-1.5 5 4 3.5-1M6.5 7.5l-4 4 6 6.5 1.5-1M13 8l-3 3c-.7.7.5 2 1.5 1.3L14 10l3.5 3.5M12 15.5l1.5 1.5M14 13.5l2 2"/>',
    caveira: '<path d="M5 11a7 7 0 1 1 14 0v3.5l-2 1V19H7v-3.5l-2-1z"/><circle cx="9" cy="11.5" r="1.6" fill="currentColor"/><circle cx="15" cy="11.5" r="1.6" fill="currentColor"/><path d="M11 19v-2.5M13 19v-2.5"/>',
    maleta: '<rect x="3" y="7.5" width="18" height="12" rx="2"/><path d="M9 7.5V5h6v2.5M3 12.5h18"/>',
    predios: '<path d="M3 21V9h6v12M9 21V4h7v17M16 21v-9h5v9M2 21h20M12 7v1M12 11v1M12 15v1"/>',
    quadriculada: '<path d="M5 21V4M5 4h14v9H5"/><path d="M5 4h3.5v3H5zM12 4h3.5v3H12zM8.5 7H12v3H8.5zM15.5 7H19v3h-3.5zM5 10h3.5v3H5zM12 10h3.5v3H12z" fill="currentColor" stroke="none"/>',
    carta: '<rect x="5" y="3" width="14" height="18" rx="2"/><path d="M12 9.5 14 12l-2 2.5-2-2.5z"/>',
    guindaste: '<path d="M6 21V4h1.5M4 21h7M6 4l13 0M10 4v4M19 4v6M17.5 10h3v3h-3zM6 8l4-4"/>',
    som: '<path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4zM15.5 9a4 4 0 0 1 0 6M18 6.5a7.5 7.5 0 0 1 0 11"/>',
    mudo: '<path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4zM16 9.5l5 5M21 9.5l-5 5"/>',
    dedo: '<path d="M9.5 13V4.5a1.5 1.5 0 0 1 3 0V11l5 1.2c1 .3 1.6 1.3 1.4 2.3L18 19.5H9.5L6 15.5c-.7-.8.3-2.3 1.5-1.5z"/>',
    riso: '<circle cx="12" cy="12" r="9.5"/><path d="M7 14h10a5 5 0 0 1-10 0zM8 9l2 1.5L8 12M16 9l-2 1.5 2 1.5"/>',
    choro: '<circle cx="12" cy="12" r="9.5"/><path d="M8.5 17c1-1.5 6-1.5 7 0M8 9.5h2M14 9.5h2M8.5 11v4M15.5 11v4"/>',
    palhaco: '<circle cx="12" cy="13" r="7.5"/><circle cx="12" cy="13.5" r="1.8" fill="currentColor"/><path d="M8.5 16.5c1.5 1.5 5.5 1.5 7 0M4.5 9C2 7 2 4.5 4.5 4.5S6 8 6 8M19.5 9c2.5-2 2.5-4.5 0-4.5S18 8 18 8"/><circle cx="9.5" cy="11" r=".8" fill="currentColor"/><circle cx="14.5" cy="11" r=".8" fill="currentColor"/>',
    palmas: '<path d="M7 13 3.5 9.5c-.8-.8.4-2 1.2-1.2l3.5 3.5M8.5 10 5 6.5c-.8-.8.4-2 1.2-1.2l4.3 4.3M10 8l-2-2c-.8-.8.4-2 1.2-1.2l5 5-.5-3c-.2-1.3 1.6-1.6 1.8-.3l.8 4.5a6 6 0 0 1-10 5.5L4.5 14"/><path d="M17 3l.8-1.5M20 5.5l1.5-.6M19 2.5l1-1"/>',
    coxinha: '<path d="M12 3c3 3.5 7 8.5 7 12a7 7 0 0 1-14 0c0-3.5 4-8.5 7-12z"/>',
    pastel: '<path d="M3 15a9 9 0 0 1 18 0z"/><path d="M4.5 15.5h15M6 17.5l1-2M10 17.5l.5-2M14 17.5l-.5-2M18 17.5l-1-2"/>',
    queijo: '<circle cx="12" cy="12" r="8"/><circle cx="9" cy="10" r="1.2"/><circle cx="14.5" cy="14" r="1.4"/><circle cx="14" cy="8.5" r=".8"/>',
    brigadeiro: '<circle cx="12" cy="13" r="7"/><path d="M9 10.5h1M13 9.5h1M15 13h1M10 15h1M12 12.5h1"/>',
    maquininha: '<rect x="6" y="2.5" width="12" height="19" rx="2.5"/><rect x="8.5" y="5" width="7" height="4.5" rx="1"/><path d="M9 12.5h1M12 12.5h1M15 12.5h0M9 15.5h1M12 15.5h1M15 15.5h0M9 18.5h6"/>',
    cartao: '<rect x="2.5" y="5" width="19" height="14" rx="2.5"/><path d="M2.5 9.5h19M6 15h4"/>',
    pix: '<path d="M12 3 21 12l-9 9-9-9z"/><path d="M8.5 12 12 8.5 15.5 12 12 15.5z"/>',
    // os peões: peças cheias (como as de metal do jogo de verdade)
    p_carro: '<path d="M2.5 15.5v-3l2.5-1L7.5 7h9l2.5 4.5 2.5 1v3z" fill="currentColor" stroke="none"/><circle cx="7" cy="16.5" r="2.4" fill="currentColor" stroke="none"/><circle cx="17" cy="16.5" r="2.4" fill="currentColor" stroke="none"/><path d="M9 8.5h2.5V11H8zM13 8.5h2.5L17 11h-4z" fill="#ffffff70" stroke="none"/>',
    p_moto: '<circle cx="5.5" cy="16.5" r="3" fill="currentColor" stroke="none"/><circle cx="18.5" cy="16.5" r="3" fill="currentColor" stroke="none"/><path d="M5.5 16.5 9 11h6l2-5h2.5M9 11l1.5 5.5h6.5l1.5-1.5" stroke-width="2.6"/><path d="M8 9.5h4v2H7.5z" fill="currentColor" stroke="none"/>',
    p_cachorro: '<path d="M6 4.5 9.5 6h5L18 4.5l1 6-2 1.5c0 4-2 8-5 8s-5-4-5-8L5 10.5z" fill="currentColor" stroke="none"/><circle cx="10" cy="11" r="1" fill="#fff" stroke="none"/><circle cx="14" cy="11" r="1" fill="#fff" stroke="none"/><path d="M11 15h2l-1 1.2z" fill="#fff" stroke="none"/>',
    p_gato: '<path d="M5 3.5 9 7.5h6l4-4 .5 8.5c0 4.5-3.5 8-7.5 8s-7.5-3.5-7.5-8z" fill="currentColor" stroke="none"/><path d="M9 12.5c.6-.6 1.4-.6 2 0M13 12.5c.6-.6 1.4-.6 2 0M11.3 15h1.4l-.7.8z" stroke="#fff" stroke-width="1.2"/>',
    p_cartola: '<path d="M7 4h10v11H7z" fill="currentColor" stroke="none"/><path d="M2.5 15.5h19v3h-19z" fill="currentColor" stroke="none"/><path d="M7 12h10v2H7z" fill="#ffffff60" stroke="none"/>',
    p_bola: '<circle cx="12" cy="12" r="9.5" fill="currentColor" stroke="none"/><path d="m12 7.3 4.2 3-1.6 4.9H9.4L7.8 10.3z" fill="#ffffff80" stroke="none"/>',
    p_pizza: '<path d="M12 21.5 3.5 6a15 15 0 0 1 17 0z" fill="currentColor" stroke="none"/><circle cx="10" cy="9.5" r="1.4" fill="#ffffff80" stroke="none"/><circle cx="14" cy="11.5" r="1.4" fill="#ffffff80" stroke="none"/><circle cx="11.5" cy="15" r="1.1" fill="#ffffff80" stroke="none"/>',
    p_guitarra: '<path d="M19.5 2.5 21.5 4.5 15 11l-1.5-1.5z" fill="currentColor" stroke="none"/><path d="M13.5 9.5c-1-1-3-1.2-4.2.2-.8 1-.6 2-1.8 2.3C5 12.5 3 14 3.6 17.4 4 20 6.5 21.5 9 20.8c2.5-.6 2.6-3.2 3.4-4 .6-.6 2-.4 2.5-1.6.6-1.6-.4-4.7-1.4-5.7z" fill="currentColor" stroke="none"/><circle cx="9" cy="15" r="1.4" fill="#ffffff80" stroke="none"/>',
    p_foguete: '<path d="M12 2c4 3 5.5 7.5 4.5 12.5h-9C6.5 9.5 8 5 12 2z" fill="currentColor" stroke="none"/><path d="M7.5 12.5 4.5 15l1 4 3-2.5zM16.5 12.5l3 2.5-1 4-3-2.5zM10 16h4l-1 4.5h-2z" fill="currentColor" stroke="none"/><circle cx="12" cy="8.5" r="1.8" fill="#ffffff80" stroke="none"/>',
    p_dino: '<path d="M3 20.5h4l1-4 2.5-.5 1 4.5h3l.5-5c2.5-1 3.5-3.5 3.5-6h2.5V7l-2-2h-4l-1.5 2v4.5C11 10 7 10.5 5 14z" fill="currentColor" stroke="none"/><circle cx="16.3" cy="6.6" r=".9" fill="#fff" stroke="none"/>',
    p_tenis: '<path d="M2.5 13.5V8.5l3.5-1 2 2.5 3-1.5 6 4 4.5 1v3.5h-19z" fill="currentColor" stroke="none"/><path d="M2.5 18h19v2h-19z" fill="currentColor" stroke="none"/><path d="M9 11l1 1.5M11.5 10l1 1.5" stroke="#fff" stroke-width="1.2"/>',
    p_papagaio: '<path d="M14 2.5c3 0 5 2 5 5v2l-2-.5c0 5-3 8-6 9.5L9 21.5 8.5 18C5.5 16 5 12 6.5 8.5 8 5 11 2.5 14 2.5z" fill="currentColor" stroke="none"/><circle cx="14.5" cy="6.5" r="1" fill="#fff" stroke="none"/><path d="M17 5.5c1.5 0 2.5 1 2.5 2.5L17 9" fill="#ffffff80" stroke="none"/>',
  };
  const sprite = `<svg xmlns="http://www.w3.org/2000/svg" style="position:absolute;width:0;height:0;overflow:hidden" aria-hidden="true">${Object.entries(P).map(([k, v]) =>
    `<symbol id="i-${k}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${v}</symbol>`).join("")}</svg>`;
  document.body.insertAdjacentHTML("afterbegin", sprite);
  const ic = (n, cls = "") => `<svg class="ic${cls ? " " + cls : ""}" aria-hidden="true"><use href="#i-${n}"/></svg>`;

  // cada emoji da narração vira um ícone (com uma cor, às vezes); o que não estiver aqui some
  const EMOJI = {
    "⚽": "bola", "🏆": "taca ouro", "🎙": "microfone", "🎤": "microfone", "🗣": "microfone", "🧤": "luva", "🥇": "medalha ouro",
    "🥈": "medalha prata", "🥉": "medalha bronze", "⭐": "estrela ouro", "💥": "explosao", "🔗": "elo", "⚠": "alerta quente",
    "🚨": "alerta quente", "😴": "lua", "📊": "grafico", "⚔": "espadas", "🏟": "estadio", "👟": "chuteira", "🎩": "cartola",
    "🟢": "ponto verde", "🟡": "ponto amarelo", "🔴": "ponto vermelho", "🧩": "alerta", "🕳": "alerta", "📋": "lista",
    "🔔": "sino", "✨": "brilho", "🗳": "urna", "😈": "fogo quente", "🥰": "estrela", "🙈": "olho", "📉": "grafico",
    "🍔": "burger", "🍕": "pizza", "🍹": "drink", "🍨": "sorvete", "🎯": "alvo", "👑": "coroa ouro", "🔥": "fogo quente",
    // Banco
    "🎲": "dado", "🏦": "banco", "💸": "nota", "💰": "saco ouro", "🏠": "casa", "🏨": "hotel", "🔨": "martelo", "🚔": "viatura",
    "🚓": "viatura", "👮": "policial", "🏖": "guardasol", "✈": "aviao", "💡": "lampada", "🚰": "torneira", "🦹": "mascara",
    "🎁": "presente", "🛡": "escudo", "🛍": "sacola", "📈": "sobe", "💹": "sobe", "🔌": "tomada", "🏷": "etiqueta", "🧾": "recibo",
    "❓": "interrogacao", "❔": "interrogacao", "🎥": "camera", "⬇": "baixo", "⏳": "ampulheta", "⏱": "relogio", "🎫": "ingresso",
    "🎟": "ingresso", "➖": "menos", "➕": "mais", "🤝": "aperto", "💀": "caveira", "💼": "maleta", "🏙": "predios",
    "🏁": "quadriculada", "🃏": "carta", "🏗": "guindaste", "❌": "fechar", "✅": "ok", "🔊": "som", "🔇": "mudo", "👆": "dedo",
    "📜": "lista", "😂": "riso", "😭": "choro", "🤡": "palhaco", "👏": "palmas", "🍗": "coxinha", "🥟": "pastel", "🧀": "queijo",
    "🍫": "brigadeiro", "👋": "palmas", "🚀": "foguete",
  };
  // os peões do Banco: o emoji (que é o que o servidor guarda) e o desenho
  const PEOES = { "🚗": "p_carro", "🛵": "p_moto", "🐶": "p_cachorro", "🐱": "p_gato", "🎩": "p_cartola", "⚽": "p_bola", "🍕": "p_pizza",
    "🎸": "p_guitarra", "🚀": "p_foguete", "🦖": "p_dino", "👟": "p_tenis", "🦜": "p_papagaio" };
  const peao = (e, cls = "") => (PEOES[e] ? ic(PEOES[e], "peao" + (cls ? " " + cls : "")) : "");
  const RE = /(?:\p{Extended_Pictographic}|\p{Regional_Indicator})(?:️|‍(?:\p{Extended_Pictographic})️?)*/gu;
  function iconizar(html) {
    return String(html).replace(RE, (m) => {
      const n = EMOJI[m.replace(/[️‍].*$/u, "")];
      if (!n) return "";
      const [nome, cor] = n.split(" ");
      return ic(nome, "em" + (cor ? " " + cor : ""));
    });
  }
  // o ícone de cada tema
  function deTema(th) {
    const id = th.id || th.skin || "", k = th.prompt || "";
    if (th.mine) return "estrela";
    if (k === "futsal") return "bola";
    if (k === "futebol") return "estadio";
    return { cs: "mira", valorant: "alvo", hamburguer: "burger", pizza: "pizza", drink: "drink", sobremesa: "sorvete", custom: "lapis" }[id] || "estrela";
  }
  // Troca sozinho os emojis que aparecem dentro da raiz: cada texto com emoji vira texto + ícone. Nas listas de
  // opção (<option>) não cabe desenho: o emoji só some. Com peoes: true, os emojis dos peões viram o peão desenhado.
  function observar(raiz, { peoes = false } = {}) {
    const troca = (no) => {
      const pai = no.parentNode; if (!pai || !RE.test(no.data)) return;
      RE.lastIndex = 0;
      if (pai.closest && pai.closest("option,select,textarea,title,svg")) { no.data = no.data.replace(RE, "").replace(/ {2,}/g, " "); return; }
      const html = Comum.h(no.data).replace(RE, (m) => { const b = m.replace(/[️‍].*$/u, ""); return peoes && PEOES[b] ? peao(b) : iconizar(m); });
      const t = document.createElement("template"); t.innerHTML = html; pai.replaceChild(t.content, no);
    };
    const varre = (n) => {
      if (n.nodeType === 3) return troca(n);
      if (n.nodeType !== 1) return;
      const w = document.createTreeWalker(n, NodeFilter.SHOW_TEXT), lista = [];
      while (w.nextNode()) if (RE.test(w.currentNode.data)) { RE.lastIndex = 0; lista.push(w.currentNode); } else RE.lastIndex = 0;
      lista.forEach(troca);
    };
    varre(raiz);
    new MutationObserver((ms) => ms.forEach((m) => { if (m.type === "characterData") troca(m.target); else m.addedNodes.forEach(varre); }))
      .observe(raiz, { childList: true, subtree: true, characterData: true });
  }
  window.Icones = { ic, iconizar, deTema, peao, observar, PEOES };
})();
