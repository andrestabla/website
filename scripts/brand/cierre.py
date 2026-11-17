"""Cortinilla de cierre animada: primero la persona (la T en su círculo), y la palabra se arma a su alrededor.
Uso: cierre.py <carpeta_salida> "<frase>" <duracion_s>   -> escribe f%03d.png (1920 x 1080, 25 fps)
"""
import os, random, sys
import numpy as np
from PIL import Image, ImageDraw
import montar as M

VW, VH, FPS = M.VW, M.VH, M.FPS
LW, LY = 1180, 292                                   # ancho del logotipo y su borde superior


def runs(mask):
    out, ini = [], None
    for i, v in enumerate(mask):
        if v and ini is None: ini = i
        if not v and ini is not None: out.append((ini, i)); ini = None
    if ini is not None: out.append((ini, len(mask)))
    return out


def ease(x):
    x = min(1, max(0, x)); return 1 - (1 - x) ** 3


def ramp(t, a, b):
    return min(1, max(0, (t - a) / (b - a)))


def preparar():
    lg = Image.open(os.path.join(M.KIT, '01-Logotipo-con-eslogan/algoritmot-logo-con-eslogan-color-fondo-oscuro-2400px.png')).convert('RGBA')
    lg = lg.resize((LW, round(LW * lg.size[1] / lg.size[0])), Image.LANCZOS)
    a = np.asarray(lg)[..., 3] > 40
    filas = runs(a.any(1))
    nombre, eslogan = (filas[0][0], filas[-2][1]) if len(filas) > 2 else filas[0], filas[-1]
    if len(filas) > 2: nombre = (filas[0][0], filas[-2][1])
    cols = runs(a[nombre[0]:nombre[1]].any(0))
    k = max(range(len(cols)), key=lambda i: cols[i][1] - cols[i][0])      # el círculo es el tramo más ancho
    return lg, nombre, eslogan, cols, k


def cuadros(out, frase, dur):
    os.makedirs(out, exist_ok=True)
    lg, nombre, eslogan, cols, k = preparar()
    x0 = (VW - LW) // 2
    fondo = M.fondo_marca().convert('RGBA')
    letras = [(i, c) for i, c in enumerate(cols) if i != k]
    orden = {i: abs(i - k) for i, _ in letras}                           # la palabra crece desde la T hacia afuera
    mx0, mx1 = cols[k]; mh = nombre[1] - nombre[0]
    marca = lg.crop((mx0, nombre[0], mx1, nombre[1]))
    mcx, mcy = x0 + (mx0 + mx1) / 2, LY + (nombre[0] + nombre[1]) / 2
    hl = min(c[1] - c[0] for _, c in letras); alto = None
    fd = M.F('JetBrainsMono-700', 165)
    es = lg.crop((0, eslogan[0], LW, eslogan[1])); eh = eslogan[1] - eslogan[0]
    y2 = LY + lg.size[1] + 78
    f_frase, f_cont = M.F('Inter-700', 58), M.F('JetBrainsMono-500', 32)
    contacto = 'algoritmot.com   ·   hola@algoritmot.com'
    n = int(round(dur * FPS))
    for f in range(n):
        t = f / FPS
        im = fondo.copy(); d = ImageDraw.Draw(im)
        capa = Image.new('RGBA', (VW, VH), (0, 0, 0, 0)); dc = ImageDraw.Draw(capa)
        # letras: dígitos que parpadean y se resuelven, de la T hacia afuera
        for i, (c0, c1) in letras:
            tr = 0.62 + 0.11 * orden[i]
            bx = (x0 + c0, LY + nombre[0], x0 + c1, LY + nombre[1])
            if t >= tr:
                g = lg.crop((c0, nombre[0], c1, nombre[1]))
                al = ramp(t, tr, tr + 0.10)
                if al < 1: g.putalpha(g.getchannel('A').point(lambda v: int(v * al)))
                capa.alpha_composite(g, (bx[0], bx[1]))
            elif t >= tr - 0.42:
                random.seed(i * 977 + f // 2)
                ch = random.choice('01'); al = int(255 * ramp(t, tr - 0.42, tr - 0.30))
                # centro vertical de las mayúsculas: caja del círculo menos su aire
                cy = LY + (nombre[0] + nombre[1]) / 2
                dc.text(((bx[0] + bx[2]) / 2, cy), ch, font=fd, fill=M.CYAN + (al,), anchor='mm')
        # eslogan: se abre desde el centro
        p = ease(ramp(t, 1.35, 2.15))
        if p > 0:
            half = int(LW / 2 * p)
            mk = Image.new('L', (LW, eh), 0); ImageDraw.Draw(mk).rectangle((LW // 2 - half, 0, LW // 2 + half, eh), fill=255)
            e2 = es.copy(); e2.putalpha(Image.composite(es.getchannel('A'), Image.new('L', (LW, eh), 0), mk))
            capa.alpha_composite(e2, (x0, LY + eslogan[0]))
        # línea dorada
        p = ease(ramp(t, 1.95, 2.35))
        if p > 0: dc.rectangle((VW / 2 - 60 * p, y2, VW / 2 + 60 * p, y2 + 5), fill=M.GOLD + (255,))
        # frase de llamada: sube y aparece
        p = ease(ramp(t, 2.05, 2.65))
        if p > 0: dc.text((VW / 2, y2 + 78 + 16 * (1 - p)), frase, font=f_frase, fill=M.WHITE + (int(255 * p),), anchor='mm')
        # contacto: se escribe con cursor
        p = ramp(t, 2.7, 3.7)
        if p > 0:
            k2 = int(len(contacto) * p); txt = contacto[:k2]
            tw = dc.textlength(contacto, font=f_cont); xl = VW / 2 - tw / 2
            dc.text((xl, y2 + 164), txt, font=f_cont, fill=M.CYAN + (255,), anchor='lm')
            if p < 1 or (t - 3.7) % 0.9 < 0.45 and t < 5.6:
                cx = xl + dc.textlength(txt, font=f_cont) + 4
                dc.rectangle((cx, y2 + 146, cx + 16, y2 + 182), fill=M.GOLD + (255,))
        # la persona: entra grande al centro y ocupa su lugar en la palabra
        p = ease(ramp(t, 0.0, 0.85)); s = 2.5 - 1.5 * p
        cx = VW / 2 + (mcx - VW / 2) * ease(ramp(t, 0.30, 0.85)); cy = 470 + (mcy - 470) * ease(ramp(t, 0.30, 0.85))
        w = max(2, int(marca.size[0] * s)); h = max(2, int(marca.size[1] * s))
        m2 = marca.resize((w, h), Image.LANCZOS); al = ramp(t, 0.0, 0.22)
        if al < 1: m2.putalpha(m2.getchannel('A').point(lambda v: int(v * al)))
        # latido: un anillo dorado que se abre una vez cuando todo está en su sitio
        q = ramp(t, 3.9, 4.9)
        if 0 < q < 1:
            r = mh / 2 * (1 + 1.3 * ease(q)); a2 = int(150 * (1 - q))
            dc.ellipse((mcx - r, mcy - r, mcx + r, mcy + r), outline=M.GOLD + (a2,), width=5)
        im.alpha_composite(capa); im.alpha_composite(m2, (int(cx - w / 2), int(cy - h / 2)))
        im.convert('RGB').save(os.path.join(out, f'f{f:03d}.png'))
    return n


if __name__ == '__main__':
    print(cuadros(sys.argv[1], sys.argv[2], float(sys.argv[3])), 'cuadros')
