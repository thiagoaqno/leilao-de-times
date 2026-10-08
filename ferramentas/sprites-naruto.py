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
#   <imagem>.png       o primeiro quadro, só para os ninjas novos (os 12 primeiros já tinham a imagem parada).
# No fim, imprime a linha "slug: quadros, largura, altura" de cada um; o número de quadros vai para `quadros` em naruto.js.
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
    # com as cores trocadas (veja `troca`): sprite de verdade ainda não há
    ("minato", "minato", NVS, 98901, (41, 46), True, "minato"),
    ("madara", "madara", NVS, 98908, (320, 325), True, "madara"),
    ("hashirama", "hashirama", NVS, 98907, (69, 74), True, "hashirama"),
    ("obito", "obito", NVS, 98897, (86, 93), True, "obito"),
    ("shisui", "shisui", NVS, 98894, (42, 45), True, "shisui"),
    ("ino", "ino", NVS, 98909, ("npc", 17, 24), True),
    ("shino", "shino", NVS, 98909, ("npc", 83, 90), True),
    ("kiba", "kiba", NVS, 98909, ("npc", 48, 54), True),
]


# ---------- os ninjas sem sprite próprio: o mesmo sprite com outras cores ----------
# Os jogos de DS não têm o Primeiro e o Quarto Hokage, o Madara, o Obito nem o Shisui. Enquanto não há um sprite deles, cada
# um usa o sprite de outro ninja com as cores trocadas (como nos jogos de luta antigos). Para trocar de verdade, ponha o
# sprite no lugar: é só tirar o nome da troca da tabela LISTA.
def para_hsv(rgb):
    r, g, b = rgb[..., 0], rgb[..., 1], rgb[..., 2]
    mx, mn = rgb.max(-1), rgb.min(-1)
    d = mx - mn
    h = np.zeros_like(mx)
    m = d > 1e-6
    h[m & (mx == r)] = ((g - b)[m & (mx == r)] / d[m & (mx == r)]) % 6
    h[m & (mx == g)] = ((b - r)[m & (mx == g)] / d[m & (mx == g)]) + 2
    h[m & (mx == b)] = ((r - g)[m & (mx == b)] / d[m & (mx == b)]) + 4
    return h * 60, np.where(mx > 0, d / np.maximum(mx, 1e-6), 0), mx


def de_hsv(h, s, v):
    h = (h % 360) / 60
    c = v * s
    x = c * (1 - np.abs(h % 2 - 1))
    z = np.zeros_like(h)
    pares = [(c, x, z), (x, c, z), (z, c, x), (z, x, c), (x, z, c), (c, z, x)]
    out = np.zeros(h.shape + (3,))
    for i, (a, b, cc) in enumerate(pares):
        m = (h >= i) & (h < i + 1)
        out[m] = np.stack([a, b, cc], -1)[m]
    return out + (v - c)[..., None]


def troca(quadro, nome):
    a = np.array(quadro).astype(float) / 255
    h, s, v = para_hsv(a[..., :3])
    vivo = a[..., 3] > 0
    H, S, V = h.copy(), s.copy(), v.copy()
    if nome == "minato":      # o casaco branco do Hokage: a parte de cima escura vira branca, e o laranja vira roupa escura
        ys = np.where(vivo.any(1))[0]
        em_cima = np.arange(a.shape[0])[:, None] < ys.min() + (ys.max() - ys.min()) * 0.66
        laranja = vivo & (h >= 5) & (h <= 42) & (s > 0.4) & (v > 0.3)
        escuro = vivo & ~laranja & (v < 0.55) & (s < 0.6) & em_cima & ~((h >= 40) & (h <= 70) & (s > 0.4))
        H[escuro], S[escuro], V[escuro] = 215, 0.06, np.clip(0.72 + v[escuro] * 0.5, 0, 1)
        H[laranja], S[laranja], V[laranja] = 225, 0.45, np.clip(v[laranja] * 0.5, 0, 1)
        barra = np.arange(a.shape[0])[:, None] > ys.min() + (ys.max() - ys.min()) * 0.8
        vermelho = laranja & barra  # a barra do casaco
        H[vermelho], S[vermelho], V[vermelho] = 5, 0.7, np.clip(v[vermelho] * 0.8, 0, 1)
    elif nome == "madara":    # a camisa clara do Sasuke vira a armadura vermelha
        m = vivo & (s < 0.22) & (v > 0.5)
        H[m], S[m], V[m] = 355, 0.78, v[m] * 0.82
        m = vivo & (h >= 200) & (h <= 260) & (s > 0.3)  # a calça azul fica quase preta
        S[m], V[m] = 0.25, v[m] * 0.65
    elif nome == "hashirama": # as cores do Yamato viram a armadura vermelha e o cabelo preto
        m = vivo & (h >= 70) & (h <= 190) & (s > 0.12)
        H[m], S[m] = 2, np.clip(s[m] + 0.35, 0, 0.85)
        m = vivo & (h >= 15) & (h <= 45) & (s > 0.3) & (v < 0.55)
        S[m], V[m] = 0.2, v[m] * 0.5
        m = vivo & (h >= 220) & (h <= 320) & (s > 0.15)
        H[m], S[m] = 218, 0.55
    elif nome == "obito":     # o cabelo prateado do Kakashi fica preto; o resto é o colete de Konoha
        m = vivo & (s < 0.16) & (v > 0.5)
        V[m], S[m] = v[m] * 0.2, 0
    elif nome == "shisui":    # a capa cinza do Itachi vira um uniforme azul-marinho, sem as nuvens vermelhas
        m = vivo & (s < 0.2) & (v > 0.12) & (v < 0.62)
        H[m], S[m], V[m] = 220, 0.6, np.clip(v[m] * 1.1 + 0.05, 0, 1)
        m = vivo & ((h < 22) | (h > 335)) & (s > 0.5)
        H[m], S[m], V[m] = 215, 0.35, np.clip(v[m] * 0.9, 0, 1)
    rgb = de_hsv(H, S, V)
    out = np.concatenate([np.clip(rgb, 0, 1), a[..., 3:]], -1)
    return Image.fromarray((out * 255 + 0.5).astype(np.uint8))


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
    for item in LISTA:
        slug, imagem, jogo, numero, como, novo = item[:6]
        if so and slug not in so:
            continue
        qs = quadros_de(folha(jogo, numero), como)[:MAX_QUADROS]
        if len(item) > 6:
            qs = [troca(q, item[6]) for q in qs]
        faixa, w, h, primeiro = tira(qs)
        faixa.save(os.path.join(SAIDA, f"{imagem}-idle.png"), optimize=True)
        if novo:
            primeiro.save(os.path.join(SAIDA, f"{imagem}.png"), optimize=True)
        print(f"{slug}: {len(qs)} quadros, {w}x{h}")


if __name__ == "__main__":
    main()
