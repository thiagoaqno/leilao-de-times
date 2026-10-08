#!/usr/bin/env python3
"""Folha de contato numerada para escolher as poses nas folhas de sprites."""
import importlib.util
import os
import sys

from PIL import Image, ImageDraw

spec = importlib.util.spec_from_file_location("sprites_naruto", os.path.join(os.path.dirname(__file__), "sprites-naruto.py"))
mod = importlib.util.module_from_spec(spec)
spec.loader.exec_module(mod)
LISTA, folha, quadros_da_folha, sem_fundo = mod.LISTA, mod.folha, mod.quadros_da_folha, mod.sem_fundo


def contato(slug, inicio=0, fim=None):
    item = next((linha for linha in LISTA if linha[0] == slug), None)
    if not item:
        raise ValueError(f"Ninja desconhecido: {slug}")
    im = folha(item[2], item[3])
    caixas = quadros_da_folha(im)
    fim = min(len(caixas), fim or len(caixas))
    colunas, w, h = 10, 100, 100
    painel = Image.new("RGB", (colunas * w, ((fim - inicio + colunas - 1) // colunas) * h), "#363b43")
    d = ImageDraw.Draw(painel)
    for k, i in enumerate(range(inicio, fim)):
        q = sem_fundo(im, caixas[i])
        q.thumbnail((92, 76), Image.Resampling.NEAREST)
        x, y = (k % colunas) * w, (k // colunas) * h
        painel.paste(q, (x + (w - q.width) // 2, y + 20 + (76 - q.height)), q)
        d.text((x + 3, y + 2), str(i), fill="white")
    destino = sys.argv[4] if len(sys.argv) > 4 else f"{slug}-{inicio}-{fim}.png"
    painel.save(destino)
    print(f"{destino}: {len(caixas)} quadros no total")


if __name__ == "__main__":
    contato(sys.argv[1], int(sys.argv[2]) if len(sys.argv) > 2 else 0, int(sys.argv[3]) if len(sys.argv) > 3 else None)
