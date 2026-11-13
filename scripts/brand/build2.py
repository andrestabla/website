"""Logo Algoritmo T: tipografía original + símbolo original dentro de la palabra, eslogan al mismo ancho y GIF con lluvia binaria."""
import json, os, random, re, sys
from fontTools.ttLib import TTFont
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen
from fontTools.pens.boundsPen import BoundsPen

HERE = os.path.dirname(os.path.abspath(__file__))
G = json.load(open(os.path.join(HERE, 'glyphs.json')))['g']
OUT = os.path.join(HERE, 'out')
os.makedirs(OUT, exist_ok=True)
INTER = sys.argv[1]

NAVY, GOLD, PAPER, CYAN, WHITE = '#1a2d5a', '#F1BA5B', '#f7f4ee', '#4fd0ec', '#ffffff'
SLOGAN = 'Soluciones digitales con sentido humano'

# ---- nombre: unidades de fuente (1000 por em, y hacia arriba) ----
POS = {'A': 0, 'L': 760, 'G': 1520, 'O1': 2280, 'R': 3040, 'I': 3800, 'T': 5170, 'M': 5974, 'O2': 6734}
ORDER = ['A', 'L', 'G', 'O1', 'R', 'I', 'T', 'M', 'O2']
X0, X1 = 35, 7262
W = X1 - X0
CY, CR = 365, 600                      # círculo de la T: centro vertical y radio
NAME_TOP, NAME_BOT = CY + CR, CY - CR  # 965, -235

# ---- símbolo original (512 x 512) ----
orig = open(os.path.join(HERE, 'mark-persona.svg')).read()
MARK_INNER = re.search(r'<g>(.*)</g>', orig, re.S).group(1)
K = 2 * CR / 512
MARK_T = f'translate({POS["T"] - CR} {CY + CR}) scale({K:.5f} {-K:.5f})'
FLAT_T = 'M371.625 149.705 371.625 207.705 281.805 207.705 281.805 422.295 223.805 422.295 223.805 207.705 140.375 207.705 140.375 149.705ZM228 106a28 28 0 1 0 56 0a28 28 0 1 0 -56 0Z'


def t_mark(mode='color', ink=NAVY, cut=WHITE):
    if mode == 'color':
        return f'<g transform="{MARK_T}">{MARK_INNER}</g>'
    return f'<g transform="{MARK_T}"><circle cx="256" cy="256" r="256" fill="{ink}"/><path d="{FLAT_T}" fill="{cut}"/></g>'


def letters(fill, keys=None, op=1.0):
    return ''.join(f'<path transform="translate({POS[k]} 0)" d="{G[k[0]]["d"]}" fill="{fill}" fill-opacity="{op:.2f}"/>'
                   for k in (ORDER if keys is None else keys) if k != 'T')


# ---- eslogan: Inter 500 en trazos, estirado con tracking al ancho exacto del nombre ----
SL_SIZE = 285
f = TTFont(INTER)
gs, cmap, upm = f.getGlyphSet(), f.getBestCmap(), f['head'].unitsPerEm
sc = SL_SIZE / upm
names = [cmap[ord(c)] for c in SLOGAN]
advs = [gs[n].width * sc for n in names]
b0 = BoundsPen(gs); gs[names[0]].draw(b0)
b1 = BoundsPen(gs); gs[names[-1]].draw(b1)
lsb = b0.bounds[0] * sc
rsb = advs[-1] - b1.bounds[2] * sc
track = (W - (sum(advs) - lsb - rsb)) / (len(SLOGAN) - 1)
SL_BASE = NAME_BOT - 300 - f['OS/2'].sCapHeight * sc     # línea base del eslogan
SL_BOT = SL_BASE - 0.24 * SL_SIZE
pen = SVGPathPen(gs)
x = X0 - lsb
SL_X = []                                                  # borde derecho de cada letra, para revelar
for n, a in zip(names, advs):
    gs[n].draw(TransformPen(pen, (sc, 0, 0, sc, x, SL_BASE)))
    x += a + track
    SL_X.append(x - track)
SL_D = pen.getCommands()
print(f'eslogan: tracking {track / SL_SIZE:.3f} em, ancho = {W}')

H1 = NAME_TOP - NAME_BOT          # solo nombre
H2 = NAME_TOP - SL_BOT            # nombre + eslogan


def logo(letter, slogan=None, mode='color', cut=WHITE, width=None):
    h = H2 if slogan else H1
    size = f' width="{width}" height="{width * h / W:.1f}"' if width else ''
    sl = f'<path d="{SL_D}" fill="{slogan}"/>' if slogan else ''
    return (f'<svg xmlns="http://www.w3.org/2000/svg"{size} viewBox="{X0} {-NAME_TOP} {W} {h:.0f}" role="img" aria-label="Algoritmo T">'
            f'<g transform="scale(1 -1)">{letters(letter)}{t_mark(mode, letter, cut)}{sl}</g></svg>')


def mark_flat(ink, cut):
    return f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" role="img" aria-label="Algoritmo T"><circle cx="256" cy="256" r="256" fill="{ink}"/><path d="{FLAT_T}" fill="{cut}"/></svg>'


FILES = {
    'algoritmot-logo-fondo-oscuro.svg': logo(WHITE),
    'algoritmot-logo-fondo-claro.svg': logo(NAVY),
    'algoritmot-logo-eslogan-fondo-oscuro.svg': logo(WHITE, '#c9d3ea'),
    'algoritmot-logo-eslogan-fondo-claro.svg': logo(NAVY, '#3b424b'),
    'algoritmot-logo-una-tinta-azul.svg': logo(NAVY, NAVY, 'flat', WHITE),
    'algoritmot-logo-una-tinta-blanco.svg': logo(WHITE, WHITE, 'flat', NAVY),
    'algoritmot-mark.svg': orig,
    'algoritmot-mark-una-tinta-azul.svg': mark_flat(NAVY, WHITE),
    'algoritmot-mark-una-tinta-blanco.svg': mark_flat(WHITE, NAVY),
}
for old in os.listdir(OUT):
    os.remove(os.path.join(OUT, old))
for name, svg in FILES.items():
    open(os.path.join(OUT, name), 'w').write(svg.strip() + '\n')
json.dump({'h1': H1 / W, 'h2': H2 / W}, open(os.path.join(HERE, 'ratios.json'), 'w'))

# ---- maqueta de control ----
def img(name, w, h=None):
    return f'<img src="out/{name}" style="display:block;width:{w}px">'

sizes = ''.join(f'<div style="display:flex;flex-direction:column;align-items:center;gap:10px"><img src="out/algoritmot-mark.svg" style="width:{n}px;height:{n}px"><span style="font:11px monospace;color:#565d67">{n}</span></div>' for n in (96, 48, 24, 16))
mock = f'''<body style="margin:0"><div style="width:1200px;height:720px;display:grid;grid-template-rows:330px 390px;background:{PAPER}">
<div style="background:{NAVY};display:flex;align-items:center;justify-content:center">{img('algoritmot-logo-eslogan-fondo-oscuro.svg', 760)}</div>
<div style="display:grid;grid-template-columns:600px 1fr">
<div style="display:flex;align-items:center;justify-content:center;border-right:1px solid #d3cab6">{img('algoritmot-logo-eslogan-fondo-claro.svg', 460)}</div>
<div style="padding:0 48px;display:flex;flex-direction:column;justify-content:center;gap:34px">
<div style="display:flex;align-items:flex-end;gap:26px">{sizes}</div>
<div style="display:flex;align-items:center;gap:22px">{img('algoritmot-logo-una-tinta-azul.svg', 230)}<div style="background:{NAVY};padding:12px 16px">{img('algoritmot-logo-una-tinta-blanco.svg', 200)}</div></div>
</div></div></div></body>'''
open(os.path.join(HERE, 'mock.html'), 'w').write(mock)

# ---- cuadros del GIF: lluvia binaria en todo el cuadro hasta que se arman nombre y eslogan ----
FW, FH, N, PER = 960, 320, 66, 22
random.seed(7)
CW, RH = 13, 17
NC, NR = FW // CW + 1, FH // RH + 1
cols = [{'h': random.uniform(-NR, NR), 'v': random.uniform(0.7, 1.5), 'len': random.randint(7, 15), 'gap': random.randint(4, 12)} for _ in range(NC)]
rain = [[random.choice('01') for _ in range(NR)] for _ in range(NC)]
DG_ROWS, DG_COLS, DG_FS = 20, 166, 74
dgrid = [[(random.choice('01'), random.random() < 0.14) for _ in range(DG_COLS)] for _ in range(DG_ROWS)]


def ramp(i, a, b):
    return max(0.0, min(1.0, (i - a) / (b - a)))


def ease(t):
    return t * t * (3 - 2 * t)


def rain_html(amount):
    if amount <= 0:
        return ''
    out = ''
    for c, col in enumerate(cols):
        period = col['len'] + col['gap']
        for r in range(NR):
            d = (col['h'] - r) % period          # distancia a la cabeza que baja
            if d >= col['len']:
                continue
            lvl = 5 if d < 1 else 4 if d < 3 else 3 if d < 6 else 2 if d < 10 else 1
            out += f'<i class="l{lvl}" style="left:{c * CW}px;top:{r * RH}px">{rain[c][r]}</i>'
    return f'<div class="rain" style="opacity:{amount:.2f}">{out}</div>'


def name_digits(clip, op, top):
    out = ''
    for r, row in enumerate(dgrid):
        y = top - r * 64
        spans, cur = [], None
        for d, cy in row:
            c = CYAN if cy else WHITE
            if cur is None or cur[0] != c:
                cur = [c, '']
                spans.append(cur)
            cur[1] += d
        ts = ''.join(f'<tspan fill="{c}">{t}</tspan>' for c, t in spans)
        out += f'<text x="{X0}" y="{-y + DG_FS}" style="font-family:\'JetBrains Mono\',monospace;font-weight:700;font-size:{DG_FS}px">{ts}</text>'
    return f'<g clip-path="url(#{clip})" opacity="{op:.2f}">{out}</g>'


CSS = ('<style>body{margin:0}.f{position:relative;width:%dpx;height:%dpx;background:%s;overflow:hidden}'
       '.rain{position:absolute;inset:0;font:700 14px "JetBrains Mono",monospace;line-height:%dpx}.rain i{position:absolute;font-style:normal}'
       '.l5{color:#eaf6ff}.l4{color:#4fd0ec;opacity:.85}.l3{color:#4fd0ec;opacity:.5}.l2{color:#7f93c9;opacity:.38}.l1{color:#7f93c9;opacity:.2}'
       '.logo{position:absolute;left:50%%;top:50%%;transform:translate(-50%%,-50%%)}</style>') % (FW, FH, NAVY, RH)
FONTS = '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@700&display=swap">'
LW = 760
pages = []
frames = ''
for i in range(N):
    for col in cols:
        col['h'] += col['v']
    for c in range(NC):
        for r in range(NR):
            if random.random() < 0.08:
                rain[c][r] = random.choice('01')
    for row in dgrid:
        for c in range(DG_COLS):
            if random.random() < 0.16:
                row[c] = (random.choice('01'), random.random() < 0.14)
    shown = [k for n, k in enumerate(ORDER) if i >= 10 + 3 * n]        # el nombre entra letra por letra (termina en 34)
    t_fill = ease(ramp(i, 37, 43))                                      # la T se rellena con el símbolo original
    solid = ease(ramp(i, 40, 48))                                       # las letras pasan de binario a sólido
    typed = ramp(i, 42, 56)                                             # el eslogan se escribe de izquierda a derecha
    amount = ease(ramp(i, 0, 4)) * (1 - ease(ramp(i, 54, 63)))          # la lluvia cesa cuando todo está armado
    clip_l = ''.join(f'<path transform="scale(1 -1) translate({POS[k]} 0)" d="{G[k[0]]["d"]}"/>' for k in shown if k != 'T')
    clip_t = f'<circle cx="{POS["T"]}" cy="{-CY}" r="{CR}"/>' if 'T' in shown else ''
    n_typed = int(typed * len(SLOGAN) + 0.001)
    sl_w = (SL_X[n_typed - 1] - X0 + 14) if n_typed else 0
    defs = (f'<defs><clipPath id="lt{i}">{clip_l}</clipPath><clipPath id="tt{i}">{clip_t}</clipPath>'
            f'<clipPath id="sl{i}"><rect x="{X0}" y="{-NAME_BOT}" width="{sl_w:.0f}" height="{NAME_BOT - SL_BOT:.0f}"/></clipPath></defs>')
    plate = ''.join(f'<path transform="scale(1 -1) translate({POS[k]} 0)" d="{G[k[0]]["d"]}" fill="{NAVY}" stroke="{NAVY}" stroke-width="60" stroke-linejoin="round"/>' for k in shown if k != 'T')
    if 'T' in shown:
        plate += f'<circle cx="{POS["T"]}" cy="{-CY}" r="{CR + 30}" fill="{NAVY}"/>'
    body = plate
    body += f'<g transform="scale(1 -1)">{letters(WHITE, shown, 0.14 + 0.86 * solid)}</g>'
    if solid < 1:
        body += name_digits(f'lt{i}', 1 - solid, 734)
    if 'T' in shown and t_fill < 1:
        body += f'<circle cx="{POS["T"]}" cy="{-CY}" r="{CR}" fill="{WHITE}" fill-opacity="0.12"/>' + name_digits(f'tt{i}', 1 - t_fill, 958)
    if t_fill > 0:
        body += f'<g transform="scale(1 -1)" opacity="{t_fill:.2f}">{t_mark()}</g>'
    if n_typed:
        body += f'<g clip-path="url(#sl{i})"><rect x="{X0 - 40}" y="{-NAME_BOT + 120}" width="{W + 80}" height="{NAME_BOT - SL_BOT - 100:.0f}" fill="{NAVY}" opacity="0.9"/><g transform="scale(1 -1)"><path d="{SL_D}" fill="#c9d3ea"/></g></g>'
    svg = f'<svg class="logo" xmlns="http://www.w3.org/2000/svg" width="{LW}" height="{LW * H2 / W:.1f}" viewBox="{X0} {-NAME_TOP} {W} {H2:.0f}">{defs}{body}</svg>'
    frames += f'<div class="f">{rain_html(amount)}{svg}</div>'
    if (i + 1) % PER == 0 or i == N - 1:
        pages.append(frames)
        frames = ''
for n, pg in enumerate(pages):
    open(os.path.join(HERE, f'frames{n}.html'), 'w').write(f'{FONTS}{CSS}<body>{pg}</body>')
print('ok', N, 'cuadros en', len(pages), 'hojas de', PER, '·', FW, 'x', FH)
