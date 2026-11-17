"""Piezas de LinkedIn en alta resolución (la plataforma recomprime: se sube a 3x–4x y en PNG)."""
import os, re, sys, subprocess
from PIL import Image
HERE = os.path.dirname(os.path.abspath(__file__))
KIT = '/Users/andrestabla/Documents/website/public/assets/brand'
DEST = os.path.join(KIT, '07-Merchandising-digital', '02-LinkedIn')
TMP = os.path.join(HERE, 'li_tmp')
CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
BIN = ' '.join(format(ord(c), '08b') for c in 'ALGORITMO T')

def inner(path):
    s = open(os.path.join(KIT, path)).read()
    return re.search(r'viewBox="([^"]+)"', s).group(1), re.sub(r'</svg>\s*$', '', re.sub(r'^<svg[^>]*>', '', s.strip()))

def svg(path, w, repl=()):
    vb, body = inner(path)
    for a, b in repl: body = body.replace(a, b)
    return f'<svg viewBox="{vb}" width="{w}" style="display:block;height:auto">{body}</svg>'

DARK = [('fill="#1a2d5a"', 'fill="#ffffff"'), ('fill="#3b424b"', 'fill="#c9d3ea"')]
LTS = svg('01-Logotipo-con-eslogan/algoritmot-logo-con-eslogan-color-fondo-claro.svg', '100%', DARK)
MK = svg('03-Simbolo/algoritmot-simbolo-color.svg', '100%')
FONT = '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@500&display=swap">'

def texture(size, lh, op, clear=50):
    m = f'linear-gradient(to right,#000 0,#000 {clear}%,transparent {clear + 9}%)'
    return (f'<div style="position:absolute;inset:0;-webkit-mask-image:{m};mask-image:{m};font:500 {size}px/{lh} \'JetBrains Mono\',monospace;color:#4fd0ec;opacity:{op};'
            f'word-break:break-all;letter-spacing:.16em;padding:0 {size}px;overflow:hidden">{(BIN + " ") * 40}</div>')

def shot(name, w, h, scale, body, bg):
    f = os.path.join(TMP, name + '.html')
    open(f, 'w').write(f'{FONT}<style>html,body{{margin:0;background:{bg}}}*{{box-sizing:border-box}}</style>'
                       f'<div style="position:relative;width:{w}px;height:{h}px;overflow:hidden;background:{bg}">{body}</div>')
    raw = os.path.join(TMP, name + '.png'); H = max(h, 600)
    subprocess.run([CHROME, '--headless=new', '--disable-gpu', '--hide-scrollbars', f'--force-device-scale-factor={scale}',
                    f'--window-size={max(w,500)},{H}', '--virtual-time-budget=6000', f'--screenshot={raw}', 'file://' + f],
                   check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    im = Image.open(raw).convert('RGB').crop((0, 0, w * scale, h * scale))
    out = os.path.join(DEST, f'{name}-{w*scale}x{h*scale}.png'); im.save(out, optimize=True)
    print(os.path.basename(out), im.size, os.path.getsize(out) // 1024, 'KB')

# Página de empresa: 1128 x 191. El logo de la página tapa la izquierda; el logotipo va a la derecha.
empresa = texture(11, 2.25, .10, 46) + f'<div style="position:absolute;right:64px;top:50%;transform:translateY(-50%);width:440px">{LTS}</div>'
shot('linkedin-empresa-portada', 1128, 191, 4, empresa, '#1a2d5a')
# Perfil personal: 1584 x 396
perfil = texture(15, 2.3, .10, 44) + f'<div style="position:absolute;right:110px;top:50%;transform:translateY(-50%);width:640px">{LTS}</div>'
shot('linkedin-perfil-portada', 1584, 396, 2, perfil, '#1a2d5a')
# Logo de la página y avatar: cuadrado con aire, fondo blanco
shot('linkedin-logo', 400, 400, 3, f'<div style="position:absolute;left:22px;top:22px;width:356px">{MK}</div>', '#ffffff')
