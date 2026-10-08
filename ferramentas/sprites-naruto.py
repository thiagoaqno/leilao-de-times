#!/usr/bin/env python3
# Gera os sprites animados dos ninjas do modo Naruto (public/galeramon/naruto-sprites/).
#
# De onde vêm: as folhas de sprites de Naruto Shippuden: Naruto vs. Sasuke (DS) e de Naruto Shippuden: Ninja Council 4
# (DS), no The Spriters Resource (veja public/galeramon/NARUTO-ASSETS.md). Para cada ninja o script baixa a folha, acha
# os quadros (cada um fica numa caixa separada por linhas ciano), pega os quadros do "parado" (o intervalo está na
# tabela LISTA, escolhido olhando a folha), tira o fundo e corta pela área que o ninja ocupa. Os quadros ficam no
# tamanho original (pixel por pixel): quem amplia é o Ginásio, na altura de cada ninja.
#
# Saída, para cada ninja:
#   <imagem>-idle.png  a tira com os quadros do parado, lado a lado (todos do mesmo tamanho; os pés ficam embaixo);
#   <imagem>-ataque.png, -lance.png e -dano.png: soco/chute, arremesso/selo e reação ao acerto;
#   <imagem>.png       o primeiro quadro, só para os ninjas novos (os 12 primeiros já tinham a imagem parada).
# No fim, imprime as contagens por pose; elas vão para os campos `quadros*` em naruto.js.
#
# Uso (precisa de Pillow, numpy e scipy):  python ferramentas/sprites-naruto.py [slug ...]
# As folhas ficam em cache em NARUTO_FOLHAS (padrão: a pasta temporária do sistema).
import io
import os
import re
import sys
import tempfile
import urllib.request

import numpy as np
from PIL import Image
from scipy import ndimage

RAIZ = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..")
SAIDA = os.path.join(RAIZ, "public", "galeramon", "naruto-sprites")
CACHE = os.environ.get("NARUTO_FOLHAS") or os.path.join(tempfile.gettempdir(), "naruto-folhas")
UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36"
SITE = "https://www.spriters-resource.com"
NVS, NC4 = "ds_dsi/narutoshippudennarutovssasuke", "ds_dsi/narutoshippudenninjacouncil4"
MAX_QUADROS = 8

# slug, nome do arquivo, jogo, folha, o que pegar: (primeiro, último) quadro; ("linha", ...) para o "Parado" de uma folha
# com legendas; ("npc", primeiro, último) para as linhas da folha de figurantes. `novo`: gera também a imagem parada.
LISTA = [
    ("naruto", "98901", NVS, 98901, (41, 46), False),
    ("sasuke", "98908", NVS, 98908, (320, 325), False),
    ("sakura", "98904", NVS, 98904, (44, 49), False),
    ("kakashi", "98897", NVS, 98897, (86, 93), False),
    ("shikamaru", "98906", NVS, 98906, (47, 53), False),
    ("itachi", "98894", NVS, 98894, (42, 45), False),
    ("kisame", "98898", NVS, 98898, (46, 49), False),
    ("deidara", "98893", NVS, 98893, (119, 126), False),
    ("lee", "98902", NVS, 98902, (43, 47), False),
    ("sai", "98903", NVS, 98903, (90, 95), False),
    ("sasori", "98905", NVS, 98905, (0, 7), False),
    ("yamato", "98907", NVS, 98907, (69, 74), False),
    ("jiraiya", "jiraiya", NVS, 98895, (54, 57), True),
    ("kabuto", "kabuto", NVS, 98896, (39, 46), True),
    ("neji", "neji", NVS, 98899, (55, 60), True),
    ("orochimaru", "orochimaru", NVS, 98900, (49, 52), True),
    ("tsunade", "tsunade", NC4, 98873, (35, 40), True),
    ("temari", "temari", NC4, 98871, (34, 41), True),
    ("kankuro", "kankuro", NC4, 98864, (44, 49), True),
    ("guy", "guy", NC4, 98866, (37, 42), True),
    ("tenten", "tenten", NC4, 98872, (45, 50), True),
    ("gaara", "gaara", NC4, 89537, ("linha", 72, 138), True),
    ("ino", "ino", NVS, 98909, ("npc", 17, 24), True),
    ("shino", "shino", NVS, 98909, ("npc", 83, 90), True),
    ("kiba", "kiba", NVS, 98909, ("npc", 48, 54), True),
]

# Intervalos escolhidos nas folhas de contato numeradas (ferramentas/contato-naruto.py).
# Cada trio é ataque de perto, lançamento/selo e dano. As folhas de Gaara e dos figurantes não têm essas poses.
ACOES = {
    "naruto": ((0, 4), (112, 116), (47, 54)),
    "sasuke": ((0, 5), (96, 100), (58, 63)),
    "sakura": ((0, 3), (10, 13), (53, 56)),
    "kakashi": ((0, 4), (96, 99), (101, 108)),
    "shikamaru": ((0, 3), (23, 26), (54, 59)),
    "itachi": ((4, 7), (14, 17), (48, 55)),
    "kisame": ((1, 4), (24, 27), (52, 59)),
    "deidara": ((2, 4), (30, 35), (131, 138)),
    "lee": ((0, 3), (15, 18), (49, 52)),
    "sai": ((0, 3), (30, 33), (102, 108)),
    "sasori": ((16, 21), (42, 44), (10, 15)),
    "yamato": ((0, 4), (71, 75), (50, 57)),
    "jiraiya": ((0, 5), (28, 32), (59, 65)),
    "kabuto": ((0, 3), (19, 23), (49, 53)),
    "neji": ((0, 3), (20, 24), (61, 67)),
    "orochimaru": ((0, 3), (8, 12), (54, 60)),
    "tsunade": ((0, 3), (24, 29), (68, 75)),
    "temari": ((0, 3), (10, 15), (67, 72)),
    "kankuro": ((0, 3), (14, 19), (76, 83)),
    "guy": ((0, 3), (20, 24), (69, 76)),
    "tenten": ((0, 3), (6, 9), (76, 83)),
}


def baixar(url):
    req = urllib.request.Request(url, headers={"User-Agent": UA, "Referer": SITE + "/"})
    return urllib.request.urlopen(req, timeout=60).read()


def folha(jogo, numero):
    """A folha de sprites (a imagem inteira), do cache ou do site."""
    os.makedirs(CACHE, exist_ok=True)
    arq = os.path.join(CACHE, f"{numero}.png")
    if not os.path.exists(arq):
        pagina = baixar(f"{SITE}/{jogo}/asset/{numero}/").decode("utf8", "ignore")
        achado = re.search(rf"media/assets/\d+/{numero}\.png", pagina)
        if not achado:
            raise RuntimeError(f"folha {numero} não encontrada em {jogo}")
        open(arq, "wb").write(baixar(f"{SITE}/{achado.group(0)}"))
    return Image.open(arq).convert("RGBA")


def quadros_da_folha(im):
    """Os quadros em caixas (separadas por linhas ciano), na ordem de leitura: por linha e depois por coluna."""
    a = np.array(im)
    ciano = (a[:, :, :3] == [0, 255, 255]).all(2)
    rotulos, _ = ndimage.label(~ciano)
    caixas = []
    for y, x in ndimage.find_objects(rotulos):
        if y.stop - y.start >= 8 and x.stop - x.start >= 8:
            caixas.append((y.start, x.start, y.stop, x.stop))
    caixas.sort(key=lambda b: (b[0] // 6, b[1]))
    return caixas


def sem_fundo(im, caixa):
    """O quadro com o fundo (a cor do canto) transparente."""
    q = np.array(im.crop((caixa[1], caixa[0], caixa[3], caixa[2])))
    q[(q[:, :, :3] == q[0, 0, :3]).all(2), 3] = 0
    return Image.fromarray(q)


def quadros_de(im, como):
    if como[0] == "linha":  # folha com legendas (Gaara): os quadros do "Parado" estão numa faixa de altura
        a = np.array(im)
        miolo = ~(a[:, :, :3] == a[0, 0, :3]).all(2)
        faixa = ndimage.binary_dilation(miolo[como[1]:como[2], :340], iterations=2)
        rotulos, _ = ndimage.label(faixa)
        achados = []
        for y, x in ndimage.find_objects(rotulos):
            if y.stop - y.start >= 40:
                achados.append((y.start + como[1], x.start, y.stop + como[1], x.stop))
        achados.sort(key=lambda b: b[1])
        return [sem_fundo(im, b) for b in achados]
    caixas = quadros_da_folha(im)
    if como[0] == "npc":
        return [sem_fundo(im, caixas[n]) for n in range(como[1], como[2] + 1)]
    return [sem_fundo(im, caixas[n]) for n in range(como[0], como[1] + 1)]


def tira(quadros):
    """Os quadros num pano só, com os pés alinhados embaixo e o meio no meio; devolve (tira, largura, altura, figura)."""
    W, H = max(q.width for q in quadros), max(q.height for q in quadros)
    todos = []
    for q in quadros:
        pano = Image.new("RGBA", (W, H), (0, 0, 0, 0))
        pano.alpha_composite(q, ((W - q.width) // 2, H - q.height))
        todos.append(pano)
    ocupado = np.zeros((H, W), bool)
    for p in todos:
        ocupado |= np.array(p)[:, :, 3] > 0
    ys, xs = np.where(ocupado)
    y0, y1, x0, x1 = ys.min(), ys.max() + 1, xs.min(), xs.max() + 1
    todos = [p.crop((x0, y0, x1, y1)) for p in todos]
    w, h = x1 - x0, y1 - y0
    faixa = Image.new("RGBA", (w * len(todos), h), (0, 0, 0, 0))
    for i, p in enumerate(todos):
        faixa.alpha_composite(p, (i * w, 0))
    return faixa, w, h, todos[0]


def main():
    so = set(sys.argv[1:])
    os.makedirs(SAIDA, exist_ok=True)
    for slug, imagem, jogo, numero, como, novo in LISTA:
        if so and slug not in so:
            continue
        im = folha(jogo, numero)
        qs = quadros_de(im, como)[:MAX_QUADROS]
        faixa, w, h, primeiro = tira(qs)
        faixa.save(os.path.join(SAIDA, f"{imagem}-idle.png"), optimize=True)
        if novo:
            primeiro.save(os.path.join(SAIDA, f"{imagem}.png"), optimize=True)
        resumo = [f"parado {len(qs)}"]
        for tipo, intervalo in zip(("ataque", "lance", "dano"), ACOES.get(slug, ())):
            qs = quadros_de(im, intervalo)[:MAX_QUADROS]
            faixa, _, _, _ = tira(qs)
            faixa.save(os.path.join(SAIDA, f"{imagem}-{tipo}.png"), optimize=True)
            resumo.append(f"{tipo} {len(qs)}")
        print(f"{slug}: {', '.join(resumo)}, parado {w}x{h}")


if __name__ == "__main__":
    main()
