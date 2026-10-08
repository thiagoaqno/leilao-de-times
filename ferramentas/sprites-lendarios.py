#!/usr/bin/env python3
# Desenha em 8 bits os ninjas que não têm sprite nos jogos de DS: Primeiro Hokage, Quarto Hokage, Madara, Obito e Shisui.
# Cada um é montado por código (cabeça, cabelo, roupa, braços e pernas, com contorno escuro e duas cores por peça), no
# mesmo tamanho e na mesma pose dos sprites dos jogos de DS: de lado, com a guarda levantada, respirando em 4 quadros.
# As cores e o visual vêm das imagens de referência da Narutopedia (as da Dattebayo API).
#
# Saída: public/galeramon/naruto-sprites/<slug>.png (o primeiro quadro) e <slug>-idle.png (a tira com os 4 quadros).
# Uso (precisa de Pillow):  python ferramentas/sprites-lendarios.py [slug ...]
import os
import sys

from PIL import Image, ImageDraw

RAIZ = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..")
SAIDA = os.path.join(RAIZ, "public", "galeramon", "naruto-sprites")
W, H = 40, 62
DY = 5  # tudo é desenhado DY pixels mais para baixo, para as pontas do cabelo caberem em cima
CONTORNO = (22, 18, 30, 255)


def cor(h, a=255):
    h = h.lstrip("#")
    return (int(h[0:2], 16), int(h[2:4], 16), int(h[4:6], 16), a)


class Tela:
    """Uma tela de pixels: tudo é desenhado sem suavizar."""

    def __init__(self):
        self.im = Image.new("RGBA", (W, H), (0, 0, 0, 0))
        self.d = ImageDraw.Draw(self.im)

    def ret(self, x0, y0, x1, y1, c):  # x1 e y1 também são pintados
        self.d.rectangle([x0, y0 + DY, x1, y1 + DY], fill=cor(c))

    def pol(self, pts, c):
        self.d.polygon([(x, y + DY) for x, y in pts], fill=cor(c))

    def elipse(self, x0, y0, x1, y1, c):
        self.d.ellipse([x0, y0 + DY, x1, y1 + DY], fill=cor(c))

    def px(self, x, y, c):
        y += DY
        if 0 <= x < W and 0 <= y < H:
            self.im.putpixel((x, y), cor(c))

    def linha(self, pts, c, larg=1):
        self.d.line([(x, y + DY) for x, y in pts], fill=cor(c), width=larg)

    def luz(self):
        """O brilho nas bordas de cima e da esquerda e a sombra nas de baixo e da direita (a luz vem de cima, à esquerda)."""
        base = self.im.copy()
        for y in range(H):
            for x in range(W):
                r, g, b, a = base.getpixel((x, y))
                if not a:
                    continue
                vazio = lambda dx, dy: not (0 <= x + dx < W and 0 <= y + dy < H) or not base.getpixel((x + dx, y + dy))[3]
                if vazio(0, -1) or vazio(-1, 0):
                    self.im.putpixel((x, y), (min(255, int(r * 1.25 + 14)), min(255, int(g * 1.25 + 14)), min(255, int(b * 1.25 + 14)), 255))
                elif vazio(0, 1) or vazio(1, 0):
                    self.im.putpixel((x, y), (int(r * 0.78), int(g * 0.78), int(b * 0.78), 255))

    def contorno(self):
        """Um pixel escuro em volta de tudo que foi desenhado."""
        self.luz()
        base = self.im.copy()
        for y in range(H):
            for x in range(W):
                if base.getpixel((x, y))[3]:
                    continue
                for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                    nx, ny = x + dx, y + dy
                    if 0 <= nx < W and 0 <= ny < H and base.getpixel((nx, ny))[3]:
                        self.im.putpixel((x, y), CONTORNO)
                        break
        return self.im


# ---------- as peças que todos têm ----------
def pernas(t, calca, sombra, sapato, b, afasta=0):
    # a perna de trás e a da frente (a da frente vai um pouco mais para a frente)
    # a guarda: a perna de trás vai para trás e a da frente se abre para a frente
    t.pol([(14, 37), (20, 37), (17, 53), (11, 53)], sombra); t.pol([(14, 37), (19, 37), (15, 53), (11, 53)], calca)
    t.pol([(21, 37), (27, 37), (31, 53), (25, 53)], calca); t.pol([(25, 37), (27, 37), (31, 53), (29, 53)], sombra)
    t.ret(24, 45, 29, 46, sombra)  # o joelho
    t.ret(8, 54, 17, 57, sapato); t.ret(24, 54, 34, 57, sapato)
    t.ret(8, 57, 17, 57, sombra); t.ret(24, 57, 34, 57, sombra)


def cabeca(t, pele, sombra, b, olho="#16121e", y0=7):
    y = y0 - b
    t.elipse(15, y, 26, y + 12, pele)
    t.ret(16, y + 9, 25, y + 12, pele)
    t.ret(15, y + 8, 17, y + 12, sombra)  # o lado de trás do rosto
    t.ret(19, y + 12, 24, y + 14, pele)   # o queixo e o pescoço
    t.ret(20, y + 12, 21, y + 15, sombra)
    t.px(22, y + 6, "#f4f0ec"); t.px(23, y + 6, "#f4f0ec"); t.px(24, y + 6, olho); t.px(24, y + 7, olho); t.px(23, y + 7, "#f4f0ec")  # o olho (de lado)
    t.ret(22, y + 4, 25, y + 4, "#16121e")  # a sobrancelha
    t.px(26, y + 8, sombra); t.px(26, y + 9, sombra)  # o nariz
    t.px(24, y + 10, "#8a5a50"); t.px(25, y + 10, "#8a5a50")  # a boca


def braco_de_tras(t, manga, sombra, mao, b):
    t.ret(10, 23 - b, 13, 35 - b, sombra)
    t.ret(10, 34 - b, 13, 36 - b, mao)


def braco_da_frente(t, manga, sombra, mao, b):
    # o braço dobrado com o punho levantado, como na guarda dos sprites de DS
    t.ret(24, 22 - b, 28, 29 - b, manga); t.ret(27, 22 - b, 28, 29 - b, sombra)
    t.ret(25, 28 - b, 32, 32 - b, manga); t.ret(25, 31 - b, 32, 32 - b, sombra)
    t.ret(31, 27 - b, 34, 31 - b, mao)
    t.px(34, 27 - b, mao)


def tronco(t, base, sombra, b, topo=20):
    y = topo - b
    t.ret(13, y + 1, 27, 37, base)
    t.ret(12, y, 28, y + 3, base)
    t.ret(24, y + 3, 27, 37, sombra)
    t.ret(13, 35, 27, 37, sombra)


def cinto(t, c, fivela, b=0):
    t.ret(13, 34, 27, 35, c)
    t.px(20, 34, fivela); t.px(21, 34, fivela)


# ---------- cada ninja ----------
def hashirama(t, b):
    pele, sp = "#c89a74", "#9c7250"
    cabelo, cb = "#16121e", "#2c2a3c"
    # o cabelo comprido, caindo pelas costas
    t.pol([(11, 8 - b), (16, 5 - b), (25, 6 - b), (27, 12 - b), (28, 30), (25, 42), (13, 41), (10, 30), (10, 14 - b)], cabelo)
    t.ret(12, 22, 14, 41, cb)
    pernas(t, "#3c3c58", "#2a2a40", "#1c1824", b)
    braco_de_tras(t, "#16121e", "#16121e", pele, b)
    tronco(t, "#1c1824", "#120e18", b)
    # a armadura vermelha: o peitoral, as ombreiras e a faixa
    t.ret(13, 22 - b, 27, 33, "#b02c2c"); t.ret(24, 24 - b, 27, 33, "#7a1c24"); t.ret(13, 31, 27, 33, "#7a1c24")
    t.ret(11, 20 - b, 16, 25 - b, "#c43838"); t.ret(11, 24 - b, 16, 25 - b, "#7a1c24")
    t.ret(24, 20 - b, 29, 25 - b, "#c43838"); t.ret(24, 24 - b, 29, 25 - b, "#7a1c24")
    t.ret(19, 22 - b, 21, 32, "#d8c8a0")  # o detalhe branco do meio
    t.ret(13, 34, 27, 36, "#d8c8a0"); t.ret(13, 36, 27, 36, "#a89878")  # o cinto
    braco_da_frente(t, "#1c1824", "#120e18", pele, b)
    cabeca(t, pele, sp, b)
    # a franja e as mechas na frente do rosto
    t.pol([(14, 8 - b), (18, 5 - b), (26, 6 - b), (27, 9 - b), (23, 8 - b), (19, 10 - b), (15, 14 - b)], cabelo)
    t.ret(14, 9 - b, 15, 26, cabelo); t.ret(26, 9 - b, 27, 23, cabelo)
    t.px(22, 8 - b, cb); t.px(21, 7 - b, cb)


def minato(t, b):
    pele, sp = "#f0c4a8", "#c89a80"
    ouro, ob = "#f0d048", "#c89c28"
    pernas(t, "#242c4c", "#181e38", "#14121c", b)
    braco_de_tras(t, "#6a8a58", "#4a6a3c", pele, b)
    tronco(t, "#242c4c", "#181e38", b)
    # o colete verde de Konoha
    t.ret(13, 22 - b, 27, 35, "#6a8a58"); t.ret(24, 24 - b, 27, 35, "#4a6a3c"); t.ret(13, 33, 27, 35, "#4a6a3c")
    t.ret(19, 21 - b, 21, 35, "#3a5230")  # o zíper
    t.ret(12, 20 - b, 28, 22 - b, "#3a5230")
    t.ret(17, 19 - b, 24, 21 - b, "#1c3a78")  # a gola azul
    t.ret(17, 20, 17, 20, "#1c3a78")
    t.ret(13, 36, 27, 37, "#c43838"); t.ret(13, 37, 27, 37, "#8a2020")  # a barra vermelha do casaco
    braco_da_frente(t, "#6a8a58", "#4a6a3c", pele, b)
    # o casaco branco de Hokage nas costas
    t.pol([(11, 22 - b), (13, 20 - b), (13, 44), (8, 50), (9, 36)], "#f4f4f0"); t.ret(8, 47, 12, 50, "#c43838"); t.ret(10, 30, 11, 46, "#d8d8d0")
    cabeca(t, pele, sp, b, olho="#3a78d0")
    # a testa: a bandana azul com a placa prateada
    t.ret(15, 8 - b, 26, 10 - b, "#1c3a78"); t.ret(19, 7 - b, 24, 10 - b, "#d8dce8"); t.ret(21, 8 - b, 22, 9 - b, "#7a8098")
    # o cabelo amarelo espetado, com as duas mechas na frente do rosto
    t.pol([(14, 8 - b), (11, 2 - b), (16, 5 - b), (16, -1 - b), (20, 4 - b), (22, -2 - b), (24, 4 - b), (29, 0 - b), (27, 8 - b), (14, 8 - b)], ouro)
    t.pol([(13, 6 - b), (8, 4 - b), (14, 9 - b)], ouro)
    t.ret(14, 9 - b, 15, 19 - b, ouro); t.ret(14, 17 - b, 15, 19 - b, ob)
    t.ret(26, 9 - b, 27, 18 - b, ouro); t.ret(27, 15 - b, 27, 18 - b, ob)
    t.px(18, 3 - b, ob); t.px(22, 1 - b, ob); t.px(26, 4 - b, ob)


def madara(t, b):
    pele, sp = "#d8b496", "#a88468"
    cabelo, cb = "#1c2430", "#2c3848"
    # o cabelo enorme: muitas pontas pelas costas
    t.pol([(10, 10 - b), (6, 2 - b), (13, 6 - b), (13, -1 - b), (19, 5 - b), (24, -2 - b), (25, 5 - b), (31, 1 - b), (28, 12 - b), (30, 24), (26, 40), (20, 46), (14, 42), (7, 36), (9, 22)], cabelo)
    t.pol([(8, 24), (4, 34), (10, 38)], cabelo); t.pol([(28, 26), (33, 34), (27, 38)], cabelo)
    t.ret(10, 14, 13, 40, cb)
    pernas(t, "#2a2a3c", "#1a1a28", "#14121c", b)
    braco_de_tras(t, "#4a2c44", "#34202e", pele, b)
    tronco(t, "#4a2c44", "#34202e", b)
    # a armadura vermelha e a gola alta
    t.ret(13, 24 - b, 27, 34, "#b02828"); t.ret(24, 26 - b, 27, 34, "#7a1818"); t.ret(13, 31, 27, 34, "#7a1818")
    t.ret(13, 24 - b, 27, 25 - b, "#d84040"); t.ret(14, 26, 26, 27, "#7a1818")
    t.ret(11, 19 - b, 17, 24 - b, "#4a2c44"); t.ret(15, 17 - b, 28, 21 - b, "#4a2c44"); t.ret(24, 18 - b, 28, 24 - b, "#34202e")
    t.ret(13, 35, 27, 37, "#16121e")
    braco_da_frente(t, "#4a2c44", "#34202e", pele, b)
    cabeca(t, pele, sp, b, olho="#d02020")
    # o cabelo na frente: cobre o olho de trás
    t.pol([(14, 7 - b), (18, 3 - b), (27, 5 - b), (28, 12 - b), (24, 11 - b), (21, 17 - b), (19, 11 - b), (15, 14 - b)], cabelo)
    t.ret(14, 9 - b, 16, 24 - b, cabelo); t.ret(22, 9 - b, 24, 19 - b, cabelo)
    t.px(18, 6 - b, cb); t.px(23, 5 - b, cb)
    # o leque de guerra nas costas
    t.ret(5, 27, 9, 29, "#7a7a8a"); t.elipse(1, 20, 9, 28, "#9a2a2a"); t.px(4, 24, "#16121e")


def obito(t, b):
    pele, sp = "#d8c4b4", "#a89484"
    cabelo, cb = "#1c1c28", "#34344a"
    pernas(t, "#1c1c28", "#12121c", "#14121c", b)
    braco_de_tras(t, "#4a4a58", "#32323e", pele, b)
    tronco(t, "#3a3a48", "#26262e", b)
    # a capa cinza com a gola alta
    t.ret(12, 20 - b, 28, 37, "#4a4a58"); t.ret(24, 22 - b, 28, 37, "#32323e"); t.ret(12, 34, 28, 37, "#32323e")
    t.ret(13, 18 - b, 28, 22 - b, "#6a6a7c"); t.ret(24, 19 - b, 28, 22 - b, "#4a4a58")
    t.ret(19, 22 - b, 20, 36, "#32323e")
    t.ret(13, 36, 28, 37, "#1c1c28")
    braco_da_frente(t, "#4a4a58", "#32323e", pele, b)
    cabeca(t, pele, sp, b, olho="#d02020")
    # as cicatrizes do lado do rosto
    t.ret(22, 9 - b, 25, 9 - b, "#a89484"); t.px(23, 11 - b, "#a89484"); t.px(25, 12 - b, "#a89484"); t.ret(21, 8 - b, 21, 11 - b, "#b8a494")
    t.px(23, 7 - b, "#e8e0d8")  # o olho de trás, claro
    # o cabelo curto e espetado
    t.pol([(14, 8 - b), (13, 3 - b), (17, 5 - b), (18, 0 - b), (21, 4 - b), (24, 0 - b), (26, 5 - b), (29, 3 - b), (27, 9 - b), (24, 8 - b), (20, 6 - b), (15, 11 - b)], cabelo)
    t.px(18, 3 - b, cb); t.px(23, 2 - b, cb)


def shisui(t, b):
    pele, sp = "#f0c8a8", "#c89c80"
    cabelo, cb = "#1c2030", "#343c58"
    pernas(t, "#1c2438", "#12182a", "#14121c", b)
    braco_de_tras(t, "#2c344c", "#1c2438", pele, b)
    tronco(t, "#2c344c", "#1c2438", b)
    # o casaco azul-escuro com o acabamento marrom e o cachecol cinza
    t.ret(12, 20 - b, 28, 37, "#2c344c"); t.ret(24, 22 - b, 28, 37, "#1c2438"); t.ret(12, 35, 28, 37, "#1c2438")
    t.ret(12, 20 - b, 14, 37, "#6a4a38"); t.ret(26, 20 - b, 28, 37, "#4a3228")
    t.ret(14, 18 - b, 27, 21 - b, "#8a90a0"); t.ret(14, 18 - b, 27, 18 - b, "#b8bcc8"); t.ret(24, 20 - b, 27, 21 - b, "#6a7080")
    t.ret(19, 22 - b, 21, 36, "#1c2438")
    t.ret(13, 34, 27, 35, "#16121e"); t.ret(19, 34, 21, 35, "#c8b878")
    braco_da_frente(t, "#2c344c", "#1c2438", pele, b)
    cabeca(t, pele, sp, b, olho="#e02828")
    t.px(25, 7 - b, "#e02828")  # o sharingan (o brilho)
    # a bandana preta com a placa de Konoha
    t.ret(14, 6 - b, 26, 9 - b, "#16121e"); t.ret(18, 5 - b, 24, 9 - b, "#c8ccd8"); t.ret(18, 5 - b, 24, 5 - b, "#e8ecf4"); t.ret(18, 9 - b, 24, 9 - b, "#7a8098")
    t.px(21, 7 - b, "#4a5068"); t.px(22, 7 - b, "#4a5068"); t.px(22, 6 - b, "#4a5068")
    # o cabelo bagunçado
    t.pol([(14, 6 - b), (12, 0 - b), (17, 3 - b), (20, -2 - b), (22, 3 - b), (26, -1 - b), (27, 5 - b), (29, 4 - b), (27, 8 - b), (14, 8 - b)], cabelo)
    t.pol([(13, 8 - b), (9, 11 - b), (14, 14 - b)], cabelo); t.ret(14, 9 - b, 15, 14 - b, cabelo)
    t.px(18, 1 - b, cb); t.px(23, 0 - b, cb); t.px(26, 3 - b, cb)


DESENHOS = {"hashirama": hashirama, "minato": minato, "madara": madara, "obito": obito, "shisui": shisui}
# o balanço de cada quadro (a cabeça e o tronco sobem 1 pixel na respiração)
RESPIRA = [0, 0, 1, 1]


def recorta(imgs):
    """A área que todos os quadros ocupam, para a tira ficar com os pés no mesmo lugar."""
    x0 = y0 = 10 ** 6
    x1 = y1 = -1
    for im in imgs:
        b = im.getbbox()
        if b:
            x0, y0, x1, y1 = min(x0, b[0]), min(y0, b[1]), max(x1, b[2]), max(y1, b[3])
    return x0, y0, x1, y1


def main():
    so = set(sys.argv[1:])
    os.makedirs(SAIDA, exist_ok=True)
    for slug, desenha in DESENHOS.items():
        if so and slug not in so:
            continue
        quadros = []
        for b in RESPIRA:
            t = Tela()
            desenha(t, b)
            quadros.append(t.contorno())
        x0, y0, x1, y1 = recorta(quadros)
        w, h = x1 - x0, y1 - y0
        faixa = Image.new("RGBA", (w * len(quadros), h), (0, 0, 0, 0))
        for i, q in enumerate(quadros):
            faixa.alpha_composite(q.crop((x0, y0, x1, y1)), (i * w, 0))
        faixa.save(os.path.join(SAIDA, f"{slug}-idle.png"), optimize=True)
        quadros[0].crop((x0, y0, x1, y1)).save(os.path.join(SAIDA, f"{slug}.png"), optimize=True)
        print(f"{slug}: {len(quadros)} quadros, {w}x{h}")


if __name__ == "__main__":
    main()
