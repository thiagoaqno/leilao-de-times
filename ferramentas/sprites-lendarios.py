#!/usr/bin/env python3
# Desenha em 8 bits os ninjas que não têm sprite nos jogos de DS: Primeiro Hokage, Quarto Hokage, Madara, Obito e Shisui.
# Cada um é montado por código (cabeça, cabelo, roupa, braços e pernas, com contorno e três tons por peça), no
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
W, H = 42, 72
DY = 9  # tudo é desenhado DY pixels mais para baixo, para as pontas do cabelo caberem em cima
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


# ---------- o esqueleto que todos têm ----------
# Proporção de luta de anime: a cabeça tem uns 11 pixels, o tronco 17 e as pernas 22. De lado, com a guarda levantada.
def pernas(t, calca, sombra, sapato, b):
    # a perna de trás vai para trás, esticada; a da frente se dobra no joelho e pisa mais à frente
    t.pol([(16, 36), (21, 36), (17, 57), (11, 57)], sombra)
    t.pol([(16, 36), (20, 36), (15, 57), (11, 57)], calca)
    t.pol([(21, 36), (26, 36), (29, 47), (24, 47)], calca); t.pol([(24, 36), (26, 36), (29, 47), (27, 47)], sombra)
    t.pol([(24, 47), (29, 47), (31, 58), (26, 58)], calca); t.pol([(28, 47), (29, 47), (31, 58), (29, 58)], sombra)
    t.ret(8, 57, 17, 60, sapato); t.ret(25, 58, 35, 61, sapato)
    t.ret(8, 60, 17, 60, "#14101c"); t.ret(25, 61, 35, 61, "#14101c")
    # Pregas nos joelhos, luz na coxa e as tiras das sandálias sobre o pé.
    t.linha([(17, 39), (13, 51)], "#586078")
    t.linha([(22, 39), (26, 45)], "#586078")
    t.linha([(13, 48), (16, 50)], sombra)
    t.linha([(25, 48), (28, 50)], sombra)
    t.ret(11, 56, 16, 57, "#aaa4a0"); t.ret(27, 57, 32, 58, "#aaa4a0")
    t.linha([(10, 58), (15, 60)], "#77717a")
    t.linha([(27, 59), (32, 61)], "#77717a")
    t.px(9, 59, "#c8ae96"); t.px(26, 60, "#c8ae96")


def pescoco(t, pele, sombra, b):
    t.ret(19, 16 - b, 22, 20 - b, pele); t.ret(19, 16 - b, 20, 20 - b, sombra)


def cabeca(t, pele, sombra, b, olho="#16121e", brilho=None):
    y = 5 - b
    t.elipse(15, y, 25, y + 11, pele)           # o crânio e o rosto
    t.ret(16, y + 9, 25, y + 12, pele)           # a mandíbula
    t.ret(15, y + 5, 17, y + 11, sombra)         # o lado de trás do rosto, na sombra
    t.ret(22, y + 12, 24, y + 13, sombra)        # a sombra do queixo
    t.px(26, y + 7, sombra); t.px(26, y + 8, sombra)                   # o nariz
    t.ret(23, y + 10, 25, y + 10, "#8a5a50")                           # a boca
    t.ret(21, y + 4, 25, y + 4, "#16121e")                             # a sobrancelha
    t.ret(22, y + 5, 24, y + 6, "#f4f0ec"); t.px(24, y + 5, olho); t.px(24, y + 6, olho)  # o olho
    if brilho:
        t.px(23, y + 5, brilho)
    t.ret(19, y + 7, 20, y + 10, "#f0d2b8")  # luz na maçã do rosto
    t.px(25, y + 9, sombra)  # a lateral do nariz
    t.px(22, y + 11, "#80584e")  # canto da boca
    t.px(23, y + 13, "#f0d2b8")  # queixo


def braco_de_tras(t, manga, sombra, pele, b):
    t.pol([(14, 21 - b), (17, 21 - b), (15, 34 - b), (12, 34 - b)], sombra)
    t.pol([(14, 21 - b), (16, 21 - b), (14, 34 - b), (12, 34 - b)], manga)
    t.ret(11, 34 - b, 15, 37 - b, pele)
    t.linha([(14, 23 - b), (13, 29 - b)], "#606078")
    t.px(12, 36 - b, "#eed0ae"); t.px(13, 37 - b, "#805e4a")


def braco_da_frente(t, manga, sombra, pele, b, luva=None):
    # o braço dobrado: o ombro, o cotovelo para baixo e o punho levantado na guarda
    t.pol([(23, 21 - b), (27, 21 - b), (30, 30 - b), (26, 31 - b)], manga); t.pol([(26, 22 - b), (27, 21 - b), (30, 30 - b), (28, 31 - b)], sombra)
    t.pol([(26, 29 - b), (30, 29 - b), (34, 22 - b), (30, 21 - b)], manga); t.pol([(29, 28 - b), (30, 29 - b), (34, 22 - b), (33, 21 - b)], sombra)
    t.ret(31, 17 - b, 36, 22 - b, luva or pele); t.ret(31, 17 - b, 36, 17 - b, sombra if luva is None else "#2a2a34")
    t.linha([(24, 23 - b), (27, 27 - b)], "#72728a")
    t.linha([(30, 27 - b), (32, 23 - b)], sombra)
    # Quatro dedos separados no punho fechado.
    dedos = "#aca2a0" if luva else "#b88c70"
    for x in (32, 33, 34, 35):
        t.px(x, 20 - b, dedos)
    t.linha([(32, 18 - b), (35, 18 - b)], "#f2d0b2" if not luva else "#d2d0d0")
    t.px(31, 21 - b, dedos)


def tronco(t, base, sombra, b):
    t.pol([(15, 20 - b), (27, 20 - b), (26, 36), (15, 36)], base)
    t.pol([(23, 21 - b), (27, 20 - b), (26, 36), (22, 36)], sombra)
    t.ret(15, 33, 26, 36, sombra)
    t.linha([(17, 26 - b), (16, 31)], "#777084")
    t.linha([(19, 30), (22, 32)], sombra)


def cinto(t, c, fivela, b=0):
    t.ret(15, 33, 26, 35, c)
    t.ret(19, 33, 21, 35, fivela)


# ---------- cada ninja ----------
def hashirama(t, b):
    pele, sp = "#c89a74", "#9c7250"
    cabelo, cb, cc = "#14101c", "#2a2a3c", "#3c3c52"
    # o cabelo comprido e liso, caindo pelas costas até a cintura
    t.pol([(12, 7 - b), (16, 2 - b), (26, 3 - b), (28, 9 - b), (29, 30), (27, 46), (17, 47), (11, 40), (11, 26), (11, 12 - b)], cabelo)
    t.pol([(11, 18), (13, 18), (14, 44), (11, 44)], cb)
    pernas(t, "#2c3050", "#1c2038", "#1c1824", b)
    braco_de_tras(t, "#1c1824", "#12101a", pele, b)
    tronco(t, "#1c1824", "#12101a", b)
    # a armadura vermelha: o peitoral, as ombreiras e as tiras
    t.pol([(15, 22 - b), (26, 22 - b), (25, 33), (16, 33)], "#b02c2c"); t.pol([(23, 23 - b), (26, 22 - b), (25, 33), (22, 33)], "#7a1c24")
    t.ret(15, 22 - b, 26, 23 - b, "#d84a4a")
    t.ret(19, 24 - b, 21, 32, "#d8c8a0")
    t.ret(13, 19 - b, 19, 25 - b, "#c43838"); t.ret(13, 24 - b, 19, 25 - b, "#7a1c24")
    t.ret(23, 19 - b, 29, 25 - b, "#c43838"); t.ret(23, 24 - b, 29, 25 - b, "#7a1c24")
    cinto(t, "#d8c8a0", "#a89878")
    braco_da_frente(t, "#1c1824", "#12101a", pele, b, luva=pele)
    t.ret(26, 28 - b, 30, 30 - b, "#6a6a7a")  # a munhequeira de metal
    pescoco(t, pele, sp, b)
    cabeca(t, pele, sp, b)
    # a franja e as mechas lisas na frente dos ombros
    t.pol([(14, 8 - b), (17, 3 - b), (26, 4 - b), (27, 8 - b), (23, 7 - b), (18, 9 - b), (15, 15 - b)], cabelo)
    t.ret(13, 8 - b, 15, 30, cabelo); t.ret(26, 8 - b, 28, 27, cabelo)
    t.px(22, 5 - b, cc); t.px(20, 4 - b, cc); t.ret(13, 20, 13, 28, cc)


def minato(t, b):
    pele, sp = "#f0c4a8", "#c89a80"
    ouro, ob = "#f0d048", "#c89c28"
    # o casaco branco de Hokage nas costas, com a barra de chamas vermelhas
    t.pol([(14, 22 - b), (16, 20 - b), (15, 48), (6, 55), (9, 38)], "#f4f4f0"); t.pol([(6, 55), (15, 48), (15, 52), (8, 58)], "#f4f4f0")
    t.pol([(9, 38), (15, 38), (15, 48), (7, 54)], "#dcdcd4")
    for i, (x0, x1) in enumerate([(6, 8), (9, 11), (12, 14)]):
        t.pol([(x0, 58), (x1, 58), ((x0 + x1) // 2, 52 - (i % 2) * 2)], "#d03a2a")
    pernas(t, "#242c4c", "#181e38", "#14121c", b)
    braco_de_tras(t, "#242c4c", "#181e38", pele, b)
    tronco(t, "#242c4c", "#181e38", b)
    # o colete verde de Konoha com a gola azul
    t.pol([(15, 22 - b), (26, 22 - b), (26, 36), (15, 36)], "#6a8a58"); t.pol([(23, 23 - b), (26, 22 - b), (26, 36), (22, 36)], "#4a6a3c")
    t.ret(15, 33, 26, 36, "#4a6a3c"); t.ret(20, 22 - b, 21, 36, "#3a5230")
    t.ret(15, 22 - b, 26, 23 - b, "#8aaa72")
    t.ret(15, 19 - b, 26, 22 - b, "#1c3a78"); t.ret(23, 20 - b, 26, 22 - b, "#142a58")
    t.ret(15, 36, 26, 36, "#d03a2a")
    braco_da_frente(t, "#242c4c", "#181e38", pele, b, luva=pele)
    t.ret(27, 29 - b, 30, 31 - b, "#c8ccd8")  # o protetor de braço
    pescoco(t, pele, sp, b)
    cabeca(t, pele, sp, b, olho="#3a78d0", brilho="#ffffff")
    # a bandana azul com a placa prateada
    t.ret(15, 6 - b, 25, 8 - b, "#1c3a78"); t.ret(19, 5 - b, 24, 8 - b, "#d8dce8"); t.ret(19, 5 - b, 24, 5 - b, "#f4f6fc"); t.ret(21, 6 - b, 22, 7 - b, "#7a8098")
    # o cabelo amarelo espetado, com as duas mechas compridas na frente do rosto
    t.pol([(15, 6 - b), (12, 0 - b), (17, 3 - b), (17, -4 - b), (21, 2 - b), (23, -5 - b), (25, 2 - b), (30, -2 - b), (27, 6 - b)], ouro)
    t.pol([(15, 5 - b), (9, 3 - b), (14, 8 - b)], ouro); t.pol([(16, 3 - b), (11, -2 - b), (18, 1 - b)], ouro)
    t.ret(14, 8 - b, 16, 18 - b, ouro); t.ret(14, 15 - b, 16, 18 - b, ob)
    t.ret(26, 8 - b, 27, 16 - b, ouro); t.ret(27, 13 - b, 27, 16 - b, ob)
    t.px(19, 1 - b, ob); t.px(23, -1 - b, ob); t.px(27, 1 - b, ob)


def madara(t, b):
    pele, sp = "#d8b496", "#a88468"
    cabelo, cb, cc = "#1c2430", "#2c3848", "#3c4c60"
    # o cabelo enorme e espetado, para todos os lados, até a cintura
    t.pol([(11, 10 - b), (4, 3 - b), (13, 6 - b), (12, -3 - b), (19, 4 - b), (24, -5 - b), (26, 3 - b), (33, -1 - b), (29, 11 - b), (33, 24), (28, 42), (21, 50), (14, 46), (6, 40), (9, 22)], cabelo)
    t.pol([(8, 26), (2, 38), (10, 40)], cabelo); t.pol([(29, 28), (35, 38), (28, 42)], cabelo)
    t.pol([(11, 18), (14, 18), (13, 44), (9, 40)], cb)
    # o leque de guerra preso às costas
    t.elipse(2, 22, 11, 32, "#9a2a2a"); t.elipse(4, 24, 9, 30, "#c43838"); t.px(6, 27, "#16121e"); t.ret(10, 30, 15, 31, "#6a6a7a")
    pernas(t, "#2a2a3c", "#1a1a28", "#14121c", b)
    braco_de_tras(t, "#4a2c44", "#34202e", pele, b)
    tronco(t, "#4a2c44", "#34202e", b)
    # a armadura vermelha e a gola alta roxa
    t.pol([(15, 24 - b), (26, 24 - b), (25, 34), (16, 34)], "#b02828"); t.pol([(23, 25 - b), (26, 24 - b), (25, 34), (22, 34)], "#7a1818")
    t.ret(15, 24 - b, 26, 25 - b, "#e04848"); t.ret(16, 28, 25, 29, "#7a1818"); t.ret(16, 31, 25, 32, "#7a1818")
    t.ret(13, 19 - b, 19, 25 - b, "#c43838"); t.ret(13, 24 - b, 19, 25 - b, "#7a1818")
    t.ret(15, 17 - b, 27, 22 - b, "#4a2c44"); t.ret(23, 18 - b, 27, 23 - b, "#34202e"); t.ret(15, 17 - b, 27, 17 - b, "#6a4262")
    cinto(t, "#16121e", "#c8b878")
    braco_da_frente(t, "#4a2c44", "#34202e", pele, b, luva=pele)
    t.ret(26, 28 - b, 30, 30 - b, "#6a6a7a")
    pescoco(t, pele, sp, b)
    cabeca(t, pele, sp, b, olho="#d02020")
    # o cabelo na frente cobre o olho de trás e parte do rosto
    t.pol([(14, 8 - b), (18, 2 - b), (28, 4 - b), (29, 12 - b), (24, 10 - b), (21, 17 - b), (19, 11 - b), (15, 15 - b)], cabelo)
    t.ret(13, 8 - b, 16, 26 - b, cabelo); t.ret(22, 8 - b, 24, 19 - b, cabelo)
    t.px(19, 4 - b, cc); t.px(24, 3 - b, cc); t.ret(14, 14, 14, 24, cc)


def obito(t, b):
    pele, sp = "#d8c4b4", "#a89484"
    cabelo, cb = "#1c1c28", "#3c3c52"
    pernas(t, "#22222e", "#14141c", "#14121c", b)
    braco_de_tras(t, "#4a4a58", "#32323e", pele, b)
    tronco(t, "#3a3a48", "#26262e", b)
    # a capa cinza de gola alta, comprida até os joelhos
    t.pol([(14, 21 - b), (27, 21 - b), (28, 44), (13, 44)], "#4a4a58"); t.pol([(24, 22 - b), (27, 21 - b), (28, 44), (24, 44)], "#32323e")
    t.ret(13, 40, 28, 44, "#32323e"); t.ret(19, 24 - b, 20, 43, "#32323e")
    t.ret(15, 16 - b, 27, 22 - b, "#8a8a9c"); t.ret(24, 17 - b, 27, 23 - b, "#6a6a7c"); t.ret(15, 16 - b, 27, 16 - b, "#aaaabc")
    t.ret(14, 34, 27, 35, "#1c1c28")
    braco_da_frente(t, "#4a4a58", "#32323e", pele, b, luva="#2a2a34")
    pescoco(t, pele, sp, b)
    cabeca(t, pele, sp, b, olho="#d02020")
    # a pele do lado direito do rosto, branca, com as cicatrizes
    t.pol([(20, 6 - b), (25, 6 - b), (26, 12 - b), (21, 16 - b)], "#e4dcd4")
    t.ret(21, 8 - b, 25, 8 - b, "#a89484"); t.ret(22, 11 - b, 25, 11 - b, "#a89484"); t.px(23, 9 - b, "#a89484"); t.px(24, 13 - b, "#a89484"); t.ret(21, 6 - b, 21, 10 - b, "#b8a494")
    t.ret(22, 5 - b, 24, 6 - b, "#f4f0ec"); t.px(24, 5 - b, "#d02020"); t.px(24, 6 - b, "#d02020")
    # o cabelo curto e espetado
    t.pol([(15, 8 - b), (13, 2 - b), (17, 4 - b), (18, -2 - b), (21, 3 - b), (24, -3 - b), (26, 3 - b), (30, 1 - b), (27, 8 - b), (24, 7 - b), (20, 5 - b), (16, 12 - b)], cabelo)
    t.px(18, 2 - b, cb); t.px(23, 0 - b, cb); t.px(27, 3 - b, cb)


def shisui(t, b):
    pele, sp = "#f0c8a8", "#c89c80"
    cabelo, cb = "#1c2030", "#343c58"
    pernas(t, "#1c2438", "#12182a", "#14121c", b)
    braco_de_tras(t, "#2c344c", "#1c2438", pele, b)
    tronco(t, "#2c344c", "#1c2438", b)
    # o casaco azul-marinho com o acabamento marrom, o cachecol cinza e o leque Uchiha nas costas
    t.pol([(14, 21 - b), (27, 21 - b), (27, 40), (14, 40)], "#2c344c"); t.pol([(24, 22 - b), (27, 21 - b), (27, 40), (24, 40)], "#1c2438")
    t.ret(14, 21 - b, 16, 40, "#6a4a38"); t.ret(25, 21 - b, 27, 40, "#4a3228"); t.ret(14, 38, 27, 40, "#1c2438")
    t.ret(14, 17 - b, 27, 21 - b, "#8a90a0"); t.ret(14, 17 - b, 27, 17 - b, "#c0c4d0"); t.ret(24, 19 - b, 27, 21 - b, "#6a7080")
    t.ret(20, 22 - b, 21, 38, "#1c2438"); t.ret(14, 34, 27, 35, "#16121e"); t.ret(19, 34, 21, 35, "#c8b878")
    braco_da_frente(t, "#2c344c", "#1c2438", pele, b, luva="#e0d8c8")
    pescoco(t, pele, sp, b)
    cabeca(t, pele, sp, b, olho="#e02828", brilho="#ffd0d0")
    t.px(24, 7 - b, "#a01818")
    # a bandana preta com a placa de Konoha
    t.ret(14, 4 - b, 26, 7 - b, "#16121e"); t.ret(18, 3 - b, 24, 7 - b, "#c8ccd8"); t.ret(18, 3 - b, 24, 3 - b, "#f0f4fc"); t.ret(18, 7 - b, 24, 7 - b, "#7a8098")
    t.px(21, 5 - b, "#4a5068"); t.px(22, 5 - b, "#4a5068"); t.px(22, 4 - b, "#4a5068"); t.px(21, 6 - b, "#4a5068")
    # o cabelo bagunçado: pontas para cima e para trás, e mechas na nuca
    t.pol([(14, 4 - b), (12, -2 - b), (17, 1 - b), (20, -4 - b), (22, 1 - b), (26, -3 - b), (27, 3 - b), (31, 2 - b), (27, 6 - b), (14, 6 - b)], cabelo)
    t.pol([(12, 8 - b), (7, 12 - b), (13, 16 - b)], cabelo); t.pol([(13, 14 - b), (9, 22 - b), (15, 18 - b)], cabelo); t.ret(14, 7 - b, 15, 14 - b, cabelo)
    t.px(18, -1 - b, cb); t.px(24, -2 - b, cb); t.px(28, 3 - b, cb)


def acabamento(t, slug, b):
    """Mechas, dobras e reflexos internos, aplicados depois das peças de cada personagem."""
    if slug == "hashirama":
        # Três valores no cabelo preto e nas placas vermelhas; juntas da armadura à vista.
        t.linha([(17, 3 - b), (15, 12 - b), (14, 22)], "#555064")
        t.linha([(22, 3 - b), (19, 12 - b), (17, 29)], "#39394e")
        t.linha([(26, 9 - b), (27, 23), (24, 38)], "#514a60")
        t.linha([(12, 31), (13, 39)], "#474354")
        t.linha([(16, 24 - b), (17, 30)], "#ec6660")
        t.linha([(24, 25 - b), (24, 31)], "#923034")
        t.ret(16, 27, 25, 27, "#782028")
        t.px(18, 27, "#eabca0"); t.px(23, 27, "#eabca0")
        t.px(16, 21 - b, "#ff8174"); t.px(25, 21 - b, "#ff8174")
        t.linha([(16, 32), (18, 33)], "#e46355")
    elif slug == "minato":
        # O manto claro ganha sombra de tecido e borda iluminada; as pontas do cabelo se separam.
        t.linha([(11, 25), (10, 43), (8, 51)], "#ffffff")
        t.linha([(14, 25), (13, 42), (10, 50)], "#b8bec8")
        t.linha([(11, 47), (13, 50)], "#d4d8dc")
        t.px(9, 53, "#f57356"); t.px(12, 54, "#a82c2c")
        t.linha([(17, 26 - b), (18, 31)], "#a8bc84")
        t.linha([(23, 25 - b), (23, 31)], "#385636")
        t.ret(16, 30, 19, 31, "#506e44")
        t.linha([(17, 0 - b), (19, 4 - b)], "#fff384")
        t.linha([(23, -2 - b), (23, 3 - b)], "#ffe968")
        t.linha([(28, 0 - b), (25, 6 - b)], "#a87820")
        t.px(25, 12 - b, "#fff384")
    elif slug == "madara":
        t.linha([(12, 4 - b), (14, 17), (10, 31)], "#4b5868")
        t.linha([(19, 2 - b), (17, 12 - b), (17, 26)], "#566578")
        t.linha([(25, 1 - b), (27, 12 - b), (29, 27)], "#3c4858")
        t.linha([(28, 29), (24, 43)], "#526070")
        t.linha([(17, 26), (18, 32)], "#ed5a52")
        t.linha([(23, 27), (23, 33)], "#8c2428")
        t.px(16, 21 - b, "#f46c60"); t.px(26, 21 - b, "#f46c60")
        t.ret(17, 28, 24, 28, "#771e28")
        t.px(17, 31, "#f09078"); t.px(24, 31, "#f09078")
        t.linha([(17, 18 - b), (23, 18 - b)], "#775274")
    elif slug == "obito":
        t.linha([(16, 24 - b), (16, 38)], "#747484")
        t.linha([(24, 24 - b), (25, 39)], "#292b38")
        t.linha([(17, 30), (20, 33)], "#777786")
        t.linha([(23, 36), (26, 39)], "#252633")
        t.linha([(16, 18 - b), (23, 18 - b)], "#c8c8d0")
        t.linha([(24, 20 - b), (26, 23 - b)], "#515363")
        t.linha([(18, 0 - b), (19, 4 - b)], "#666477")
        t.linha([(24, -1 - b), (24, 4 - b)], "#4b4c60")
        t.px(22, 9 - b, "#fff8f0"); t.px(25, 13 - b, "#846e68")
    else:  # Shisui
        t.linha([(16, 25 - b), (16, 36)], "#53607a")
        t.linha([(23, 25 - b), (24, 36)], "#151c30")
        t.linha([(17, 28), (19, 30)], "#70809a")
        t.linha([(15, 18 - b), (22, 18 - b)], "#e0e4ea")
        t.linha([(25, 20 - b), (26, 22 - b)], "#525a70")
        t.linha([(15, 1 - b), (17, 4 - b)], "#58647e")
        t.linha([(21, -2 - b), (21, 4 - b)], "#69738a")
        t.linha([(27, 0 - b), (25, 5 - b)], "#414b68")
        t.px(24, 10 - b, "#d38576")


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
            acabamento(t, slug, b)
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
