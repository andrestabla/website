"""Cuadros del logo animado (texto que se descifra desde binarios), sobre fondo transparente.
Uso: anim.py <Inter.woff2> <JetBrainsMono.woff2> <oscuro|claro> <ce|se|si> <carpeta de salida>
  oscuro = letras blancas (para fondos oscuros) · claro = letras azules (para fondos claros)
  ce = con eslogan · se = sin eslogan · si = solo símbolo
"""
import os, random, sys
OUTDIR = sys.argv.pop(); MODE = sys.argv.pop(); THEME = sys.argv.pop(); JB = sys.argv.pop()
import build2 as B
from fontTools.ttLib import TTFont
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen

PER = 22
if THEME == 'oscuro':
    DIGIT, LETTER, SLOG = (79, 208, 236), (255, 255, 255), (201, 211, 234)
else:
    DIGIT, LETTER, SLOG = (14, 147, 180), (26, 45, 90), (59, 66, 75)

if MODE == 'si':                                   # solo símbolo: cuadro cuadrado centrado en el círculo
    FW = FH = 480
    PAD = 90
    VX, VY, VW, VH = B.POS['T'] - B.CR - PAD, -(B.CY + B.CR + PAD), 2 * (B.CR + PAD), 2 * (B.CR + PAD)
    LX = LY = 0; LW = FW; LH = FH
else:
    FW, LW = 960, 860
    H = B.H2 if MODE == 'ce' else B.H1
    LH = LW * H / B.W
    FH = 340 if MODE == 'ce' else 240
    LX, LY = (FW - LW) / 2, (FH - LH) / 2
    VX, VY, VW, VH = B.X0, -B.NAME_TOP, B.W, H


def glyph_d(font, ch, sc=1.0, dx=0.0, dy=0.0):
    gs = font.getGlyphSet()
    pen = SVGPathPen(gs)
    gs[font.getBestCmap()[ord(ch)]].draw(TransformPen(pen, (sc, 0, 0, sc, dx, dy)))
    return pen.getCommands()


jb, inter = TTFont(JB), TTFont(B.INTER)
NAME_BIT = {b: glyph_d(jb, b) for b in '01'}
T_LETTER = B.G['T']['d']
isc = B.SL_SIZE / inter['head'].unitsPerEm
igs = inter.getGlyphSet()
DIG = 0.82
adv01 = {b: igs[inter.getBestCmap()[ord(b)]].width * isc * DIG for b in '01'}

random.seed(21)
STEP = 2
name = []
for n, k in enumerate(B.ORDER):
    it = {'k': k, 'x': B.POS[k] - (300 if k == 'T' else 0), 'appear': 2 * n, 'resolve': 30 + 5 * n,
          'code': format(ord(k[0]), '08b'), 'noise': [random.choice('01') for _ in range(64)]}
    name.append(it)
sl = []
for ch, a, right in zip(B.SLOGAN, B.advs, B.SL_X):
    if ch == ' ':
        continue
    left = right - a
    j = len(sl)
    sl.append({'d': glyph_d(inter, ch, isc, left, B.SL_BASE), 'code': format(ord(ch), '08b'), 'appear': 40 + j * 0.8, 'resolve': 62 + j * 1.3,
               'bits': {b: glyph_d(inter, b, isc * DIG, left + a / 2 - adv01[b] / 2, B.SL_BASE) for b in '01'},
               'noise': [random.choice('01') for _ in range(64)]})
if MODE == 'si':
    name = [dict(name[6], appear=0, resolve=26)]
    sl = []
elif MODE == 'se':
    sl = []
FILL0 = name[-1]['resolve'] + 6
FILL1 = FILL0 + 12
N = int(max(sl[-1]['resolve'] if sl else 0, FILL1)) + 8


def ramp(x, a, b):
    return max(0.0, min(1.0, (x - a) / (b - a)))


def ease(t):
    return t * t * (3 - 2 * t)


def mix(a, b, t):
    return '#%02x%02x%02x' % tuple(round(a[i] + (b[i] - a[i]) * t) for i in range(3))


def current_bit(item, f):
    steps_left = int((item['resolve'] - f - 1e-6) // STEP) + 1
    if steps_left <= 8:
        return item['code'][8 - steps_left]          # los últimos 8 dígitos son el código ASCII de la letra
    return item['noise'][int(f // STEP) % 64]


SVG_OPEN = (f'<svg style="position:absolute;left:{LX:.2f}px;top:{LY:.2f}px" xmlns="http://www.w3.org/2000/svg" width="{LW}" height="{LH:.2f}" '
            f'viewBox="{VX} {VY} {VW} {VH:.0f}"><g transform="scale(1 -1)">')
DC = mix(DIGIT, DIGIT, 0)
pages, frames = [], ''
for f in range(N):
    body = ''
    for it in name:
        if f < it['appear']:
            continue
        tr = f'transform="translate({it["x"]} 0)"'
        if f < it['resolve']:
            op = ease(ramp(f, it['appear'] - 1, it['appear'] + 3))
            body += f'<path {tr} d="{NAME_BIT[current_bit(it, f)]}" fill="{DC}" fill-opacity="{op:.2f}"/>'
        else:
            col = mix(DIGIT, LETTER, ease(ramp(f, it['resolve'], it['resolve'] + 5)))
            if it['k'] == 'T':
                t_fill = ease(ramp(f, FILL0, FILL1))
                if t_fill < 1:
                    body += f'<path {tr} d="{T_LETTER}" fill="{col}" fill-opacity="{1 - t_fill:.2f}"/>'
                if t_fill > 0:
                    k, cx, cy = 0.8 + 0.2 * t_fill, B.POS['T'], B.CY
                    body += f'<g transform="translate({cx} {cy}) scale({k:.3f}) translate({-cx} {-cy})" opacity="{t_fill:.2f}">{B.t_mark()}</g>'
            else:
                body += f'<path {tr} d="{B.G[it["k"][0]]["d"]}" fill="{col}"/>'
    for c in sl:
        if f < c['appear']:
            continue
        if f < c['resolve']:
            op = ease(ramp(f, c['appear'] - 1, c['appear'] + 3)) * 0.9
            body += f'<path d="{c["bits"][current_bit(c, f)]}" fill="{DC}" fill-opacity="{op:.2f}"/>'
        else:
            body += f'<path d="{c["d"]}" fill="{mix(DIGIT, SLOG, ease(ramp(f, c["resolve"], c["resolve"] + 5)))}"/>'
    frames += f'<div style="position:relative;width:{FW}px;height:{FH}px;overflow:hidden">{SVG_OPEN}{body}</g></svg></div>'
    if (f + 1) % PER == 0 or f == N - 1:
        pages.append(frames)
        frames = ''
os.makedirs(OUTDIR, exist_ok=True)
for n, pg in enumerate(pages):
    open(os.path.join(OUTDIR, f'frames{n}.html'), 'w').write(f'<body style="margin:0">{pg}</body>')
open(os.path.join(OUTDIR, 'meta.txt'), 'w').write(f'{N} {FW} {FH} {len(pages)} {PER}')
print(THEME, MODE, N, 'cuadros', FW, 'x', FH)
