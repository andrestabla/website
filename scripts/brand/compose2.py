"""Revisión QA: camiseta, stickers y pin con el logo integrado a la foto (luz, textura y forma reales)."""
import os
import numpy as np
from PIL import Image, ImageDraw, ImageFont, ImageFilter, ImageChops

HERE = os.path.dirname(os.path.abspath(__file__))
KIT = '/Users/andrestabla/Documents/website/public/assets/brand'
OUT = os.path.join(HERE, 'final')
FONT = os.path.join(HERE, '..', 'jbmono-700.ttf')
asset = lambda rel: Image.open(os.path.join(KIT, rel)).convert('RGBA')
MARK = asset('03-Simbolo/algoritmot-simbolo-color-1024px.png')
LOGO = asset('02-Logotipo-sin-eslogan/algoritmot-logo-sin-eslogan-color-fondo-claro-2400px.png')
src = lambda n: Image.open(os.path.join(HERE, 'orig', n + '.jpg')).convert('RGB')


def fit(im, width):
    return im.resize((int(width), int(width * im.size[1] / im.size[0])), Image.LANCZOS)


def shade_map(base, box, blur, gain=1.0, lo=0.55, hi=1.25):
    """Luz local de la foto bajo la pieza, normalizada a 1: lleva pliegues, trama y degradado a la tinta."""
    reg = np.asarray(base.crop(box).convert('L')).astype(np.float32)
    if blur:
        reg = np.asarray(Image.fromarray(reg.astype('uint8')).filter(ImageFilter.GaussianBlur(blur))).astype(np.float32)
    m = reg / max(np.median(reg), 1)
    return np.clip(1 + (m - 1) * gain, lo, hi)


def lay(base, art, cx, cy, shade=None, opacity=1.0, soften=0.0):
    """Pega `art` centrado en (cx, cy) —fracciones de la foto— multiplicado por la luz local."""
    W, H = base.size
    x, y = int(cx * W - art.size[0] / 2), int(cy * H - art.size[1] / 2)
    box = (x, y, x + art.size[0], y + art.size[1])
    a = np.asarray(art).astype(np.float32)
    if shade is not None:
        a[..., :3] *= shade_map(base, box, *shade)[..., None]
    a[..., 3] *= opacity
    art2 = Image.fromarray(np.clip(a, 0, 255).astype('uint8'), 'RGBA')
    if soften:
        art2 = art2.filter(ImageFilter.GaussianBlur(soften))
    base.paste(art2, (x, y), art2)


def save(im, name, box, width=1400):
    W, H = im.size
    im = im.crop((int(box[0] * W), int(box[1] * H), int(box[2] * W), int(box[3] * H)))
    im = im.resize((width, int(width * im.size[1] / im.size[0])), Image.LANCZOS)
    im.save(os.path.join(OUT, name + '.jpg'), quality=86, optimize=True)


def grain(size, amount, seed):
    n = np.random.default_rng(seed).normal(0, amount, (size[1], size[0])).astype(np.float32)
    return n


# ── camiseta: estampado pequeño en el pecho, con la trama y los pliegues de la tela ──
b = src('camiseta'); W = b.size[0]
art = fit(MARK, W * 0.062)
a = np.asarray(art).astype(np.float32)
g = a[..., :3].mean(2, keepdims=True)                        # tinta algo menos saturada que en pantalla
a[..., :3] = a[..., :3] * 0.9 + g * 0.1
a[..., :3] *= 0.93
a[..., :3] += grain(art.size, 5.5, 3)[..., None]             # grano de serigrafía
art = Image.fromarray(np.clip(a, 0, 255).astype('uint8'), 'RGBA')
lay(b, art, 0.592, 0.372, shade=(1.2, 2.2, 0.7, 1.2), opacity=0.93, soften=1.4)
save(b, 'camiseta', (0.14, 0.17, 0.86, 0.89))


# ── stickers: troqueles de vinilo con la luz de la tapa, canto y sombra de contacto ──
b = src('stickers'); W, H = b.size


def die(art, pad, radius, bg=(255, 255, 255, 255)):
    w, h = art.size[0] + 2 * pad, art.size[1] + 2 * pad
    s = Image.new('RGBA', (w, h), (0, 0, 0, 0))
    ImageDraw.Draw(s).rounded_rectangle((0, 0, w - 1, h - 1), radius=min(radius, h // 2), fill=bg)
    s.alpha_composite(art, (pad, pad)); return s


def vinyl(st, angle, seed):
    """Acabado mate: brillo suave arriba, canto oscurecido y grano de impresión."""
    w, h = st.size
    a = np.asarray(st).astype(np.float32)
    ramp = np.linspace(1.035, 0.955, h, dtype=np.float32)[:, None]
    a[..., :3] = a[..., :3] * ramp[..., None] * 0.965 + grain((w, h), 2.2, seed)[..., None]
    alpha = Image.fromarray(a[..., 3].astype('uint8'))
    inner = np.asarray(alpha.filter(ImageFilter.MinFilter(9)).filter(ImageFilter.GaussianBlur(3))).astype(np.float32) / 255
    a[..., :3] *= (0.86 + 0.14 * inner)[..., None]            # canto del troquel
    st = Image.fromarray(np.clip(a, 0, 255).astype('uint8'), 'RGBA')
    return st.rotate(angle, expand=True, resample=Image.BICUBIC)


def stick(base, st, cx, cy):
    W, H = base.size
    al = st.getchannel('A')
    for blur, dx, dy, k in ((26, 0.0016, 0.0042, 0.20), (5, 0.0004, 0.0012, 0.34)):   # sombra ambiente + de contacto
        sh = Image.new('RGBA', st.size, (20, 24, 34, 0)); sh.putalpha(al.point(lambda v: int(v * k)))
        pad = blur * 3
        big = Image.new('RGBA', (st.size[0] + 2 * pad, st.size[1] + 2 * pad), (20, 24, 34, 0)); big.paste(sh, (pad, pad))
        big = big.filter(ImageFilter.GaussianBlur(blur))
        x, y = int((cx + dx) * W - big.size[0] / 2), int((cy + dy) * H - big.size[1] / 2)
        base.paste(big, (x, y), big)
    lay(base, st, cx, cy, shade=(60, 1.0, 0.8, 1.12), soften=1.1)


m = fit(MARK, W * 0.064)
stick(b, vinyl(die(m, int(W * 0.0045), 99999), -7, 1), 0.405, 0.495)
lg = fit(LOGO, W * 0.118)
stick(b, vinyl(die(lg, int(W * 0.0085), 99999), 4, 2), 0.587, 0.487)
t = Image.new('RGBA', (int(W * 0.094), int(W * 0.046)), (0, 0, 0, 0)); dt = ImageDraw.Draw(t)
fb = ImageFont.truetype(FONT, int(W * 0.0162)); fs = ImageFont.truetype(FONT, int(W * 0.0115))
dt.text((t.size[0] / 2, t.size[1] * 0.33), '01010100', font=fb, fill=(79, 208, 236, 255), anchor='mm')
dt.text((t.size[0] / 2, t.size[1] * 0.74), '= T', font=fs, fill=(241, 186, 91, 255), anchor='mm')
inner = die(t, int(W * 0.004), int(W * 0.007), (26, 45, 90, 255))
stick(b, vinyl(die(inner, int(W * 0.0035), int(W * 0.0105)), -3, 3), 0.492, 0.648)
save(b, 'stickers', (0.1, 0.12, 0.9, 0.92))


# ── pin: el símbolo llena la cara esmaltada, centrado en su elipse y con su brillo real ──
b = src('pin'); W, H = b.size
small = b.resize((W // 4, H // 4), Image.LANCZOS); a = np.asarray(small).astype(np.float32)
mx, mn = a.max(2), a.min(2)
white = (mx > 165) & ((mx - mn) / (mx + 1) < 0.13)
from collections import deque
h, w = white.shape; seen = np.zeros_like(white); q = deque([(int(h * 0.5), int(w * 0.494))]); seen[q[0]] = True
while q:
    y, x = q.popleft()
    for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
        Y, X = y + dy, x + dx
        if 0 <= Y < h and 0 <= X < w and white[Y, X] and not seen[Y, X]:
            seen[Y, X] = True; q.append((Y, X))
ys, xs = np.nonzero(seen)
x0, x1, y0, y1 = xs.min() * 4, (xs.max() + 1) * 4, ys.min() * 4, (ys.max() + 1) * 4
print('cara del pin', (x0 / W, x1 / W, y0 / H, y1 / H), 'centro', ((x0 + x1) / 2 / W, (y0 + y1) / 2 / H))
mask = Image.fromarray((seen * 255).astype('uint8')).filter(ImageFilter.MaxFilter(5)).resize((W, H), Image.LANCZOS).filter(ImageFilter.GaussianBlur(3))
grow = 1.035                                                   # el esmalte llega hasta el borde metálico
fw, fh = int((x1 - x0) * grow), int((y1 - y0) * grow)
face = MARK.resize((fw, fh), Image.LANCZOS)                    # se deforma a la elipse de la cara: misma perspectiva
layer = Image.new('RGBA', (W, H), (0, 0, 0, 0))
layer.paste(face, (int((x0 + x1) / 2 - fw / 2), int((y0 + y1) / 2 - fh / 2)), face)
gold = Image.new('RGBA', (W, H), (241, 186, 91, 255)); gold.alpha_composite(layer)   # sin huecos blancos en el canto
lum = np.asarray(b.convert('L').filter(ImageFilter.GaussianBlur(2))).astype(np.float32)
ref = np.percentile(lum[np.asarray(mask) > 200], 70)
shade = np.clip(lum / ref, 0.6, 1.08)                          # sombra y reflejo propios del esmalte
g = np.asarray(gold).astype(np.float32); g[..., :3] *= shade[..., None]
yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)
cxp, cyp, rx, ry = (x0 + x1) / 2, (y0 + y1) / 2, (x1 - x0) / 2, (y1 - y0) / 2
r = np.sqrt(((xx - cxp) / rx) ** 2 + ((yy - cyp) / ry) ** 2)
g[..., :3] *= (1 - 0.16 * np.clip((r - 0.86) / 0.14, 0, 1) ** 2)[..., None]             # canto hundido junto al aro
gl = np.exp(-(((xx - (cxp - rx * 0.36)) / (rx * 0.55)) ** 2 + ((yy - (cyp - ry * 0.48)) / (ry * 0.30)) ** 2))
g[..., :3] += (gl * 34)[..., None]                                                      # brillo del esmalte
gold = Image.fromarray(np.clip(g, 0, 255).astype('uint8'), 'RGBA').filter(ImageFilter.GaussianBlur(1.6))
b.paste(gold, (0, 0), mask)
save(b, 'pines', (0.12, 0.02, 0.88, 0.98))
print('ok')
