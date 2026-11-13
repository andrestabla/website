"""Arma el kit de logos de Algoritmo T.
Uso: kit.py <Inter.woff2> svg   -> escribe los SVG, las páginas de captura y shots.tsv
     kit.py <Inter.woff2> post  -> JPG, ICO, LEEME y limpieza (después de capturar)
"""
import json, os, shutil, sys
stage = sys.argv.pop()
HERE = os.path.dirname(os.path.abspath(__file__))
KIT = os.path.join(HERE, 'Kit-Logo-AlgoritmoT')
TMP = os.path.join(HERE, 'kit_tmp')
NAVY, PAPER, WHITE, BLACK = '#1a2d5a', '#f7f4ee', '#ffffff', '#000000'
D = {'ce': '01-Logotipo-con-eslogan', 'se': '02-Logotipo-sin-eslogan', 'si': '03-Simbolo', 'fa': '04-Favicon', 'an': '05-Animado', 're': '06-Redes'}

if stage == 'svg':
    keep = {f: open(os.path.join(HERE, 'out', f), 'rb').read() for f in ('algoritmot-logo-animado.gif', 'algoritmot-logo-animado.mp4')}
    import build2 as B                                   # (reescribe out/; por eso se guardan antes el GIF y el MP4)
    for f, data in keep.items():
        open(os.path.join(HERE, 'out', f), 'wb').write(data)
    shutil.rmtree(KIT, ignore_errors=True); shutil.rmtree(TMP, ignore_errors=True)
    for d in D.values():
        os.makedirs(os.path.join(KIT, d))
    os.makedirs(TMP)
    CIRCLE = 'M0 256a256 256 0 1 0 512 0a256 256 0 1 0 -512 0Z'

    def mark_inner(ink):                                  # ink None = símbolo a color; si no, una tinta con la T calada
        if ink is None:
            return B.MARK_INNER
        return f'<path fill-rule="evenodd" d="{CIRCLE}{B.FLAT_T}" fill="{ink}"/>'

    def logo(letter, slogan, ink):
        h = B.H2 if slogan else B.H1
        sl = f'<path d="{B.SL_D}" fill="{slogan}"/>' if slogan else ''
        return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="{B.X0} {-B.NAME_TOP} {B.W} {h:.0f}" role="img" aria-label="Algoritmo T">'
                f'<g transform="scale(1 -1)">{B.letters(letter)}<g transform="{B.MARK_T}">{mark_inner(ink)}</g>{sl}</g></svg>\n')

    def mark(ink):
        return f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" role="img" aria-label="Algoritmo T">{mark_inner(ink)}</svg>\n'

    VAR = [('color-fondo-oscuro', WHITE, '#c9d3ea', None), ('color-fondo-claro', NAVY, '#3b424b', None),
           ('una-tinta-azul', NAVY, NAVY, NAVY), ('una-tinta-blanco', WHITE, WHITE, WHITE), ('una-tinta-negro', BLACK, BLACK, BLACK)]
    R1, R2 = B.H1 / B.W, B.H2 / B.W
    shots = []

    def shot(svg_path, w, h, out, bg=None, pad=0, pdf=False):
        """Página que muestra el SVG a w x h (con fondo y margen opcionales) para capturarla."""
        W, Hh = w + 2 * pad, h + 2 * pad
        name = f's{len(shots):03d}.html'
        page = f'@page{{size:{W}px {Hh}px;margin:0}}' if pdf else ''
        open(os.path.join(TMP, name), 'w').write(
            f'<style>{page}html,body{{margin:0;{"background:" + bg if bg else ""}}}</style>'
            f'<div style="width:{W}px;height:{Hh}px;display:flex;align-items:center;justify-content:center">'
            f'<img src="file://{svg_path}" style="display:block;width:{w}px;height:{h}px"></div>')
        shots.append('\t'.join([name, str(W), str(Hh), out, 'pdf' if pdf else ('opaque' if bg else 'transparent')]))

    for key, ratio in (('ce', R2), ('se', R1)):
        tag = 'con-eslogan' if key == 'ce' else 'sin-eslogan'
        for vname, letter, slogan, ink in VAR:
            base = f'algoritmot-logo-{tag}-{vname}'
            p = os.path.join(KIT, D[key], base + '.svg')
            open(p, 'w').write(logo(letter, slogan if key == 'ce' else None, ink))
            for w in (2400, 1200):
                shot(p, w, round(w * ratio), os.path.join(KIT, D[key], f'{base}-{w}px.png'))
            shot(p, 1600, round(1600 * ratio), os.path.join(KIT, D[key], base + '.pdf'), pdf=True)
            if vname.startswith('color'):                 # versión con fondo y margen, para JPG
                bg = NAVY if 'oscuro' in vname else WHITE
                shot(p, 2000, round(2000 * ratio), os.path.join(TMP, f'{D[key]}__{base}-con-fondo.png'), bg=bg, pad=200)
    for vname, ink in (('color', None), ('una-tinta-azul', NAVY), ('una-tinta-blanco', WHITE), ('una-tinta-negro', BLACK)):
        base = f'algoritmot-simbolo-{vname}'
        p = os.path.join(KIT, D['si'], base + '.svg')
        open(p, 'w').write(mark(ink))
        for n in (1024, 512, 256):
            shot(p, n, n, os.path.join(KIT, D['si'], f'{base}-{n}px.png'))
        shot(p, 512, 512, os.path.join(KIT, D['si'], base + '.pdf'), pdf=True)
    # favicon: solo el símbolo a color
    fav = os.path.join(KIT, D['fa'], 'favicon.svg')
    open(fav, 'w').write(mark(None))
    for n, name in ((16, 'favicon-16x16.png'), (32, 'favicon-32x32.png'), (48, 'favicon-48x48.png'), (180, 'apple-touch-icon.png'),
                    (192, 'android-chrome-192x192.png'), (512, 'android-chrome-512x512.png')):
        shot(fav, n, n, os.path.join(KIT, D['fa'], name))
    # redes: perfil cuadrado y portada
    shot(fav, 660, 660, os.path.join(KIT, D['re'], 'perfil-1080x1080.png'), bg=NAVY, pad=210)
    ce = os.path.join(KIT, D['ce'], 'algoritmot-logo-con-eslogan-color-fondo-oscuro.svg')
    open(os.path.join(TMP, 'portada.html'), 'w').write(
        f'<style>html,body{{margin:0;background:{NAVY}}}</style><div style="width:1200px;height:630px;display:flex;align-items:center;justify-content:center">'
        f'<img src="file://{ce}" style="width:880px;height:{round(880 * R2)}px"></div>')
    shots.append('\t'.join(['portada.html', '1200', '630', os.path.join(KIT, D['re'], 'portada-1200x630.png'), 'opaque']))
    open(os.path.join(TMP, 'shots.tsv'), 'w').write('\n'.join(shots) + '\n')
    for f in keep:
        shutil.copy(os.path.join(HERE, 'out', f), os.path.join(KIT, D['an'], f))
    print(len(shots), 'capturas pendientes')
    sys.exit(0)

# ---- post: JPG, ICO y LEEME ----
from PIL import Image
for f in sorted(os.listdir(TMP)):
    if f.endswith('-con-fondo.png'):
        folder, name = f.split('__')
        Image.open(os.path.join(TMP, f)).convert('RGB').save(os.path.join(KIT, folder, name.replace('.png', '.jpg')), quality=93)
fa = os.path.join(KIT, D['fa'])
Image.open(os.path.join(fa, 'android-chrome-512x512.png')).save(os.path.join(fa, 'favicon.ico'), sizes=[(16, 16), (32, 32), (48, 48)])
re = os.path.join(KIT, D['re'])
for f in os.listdir(re):
    if f.endswith('.png'):
        Image.open(os.path.join(re, f)).convert('RGB').save(os.path.join(re, f.replace('.png', '.jpg')), quality=93)
open(os.path.join(fa, 'como-usarlo.html.txt'), 'w').write('''<!-- Pegar dentro de <head>. Los archivos van en la raíz del sitio. -->
<link rel="icon" type="image/svg+xml" href="/favicon.svg">
<link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png">
<link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png">
<link rel="shortcut icon" href="/favicon.ico">
<link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png">
''')
open(os.path.join(KIT, 'LEEME.txt'), 'w').write('''KIT DE LOGO · ALGORITMO T
Soluciones digitales con sentido humano

CARPETAS
01-Logotipo-con-eslogan   Nombre + símbolo + eslogan (el eslogan mide lo mismo que el nombre).
02-Logotipo-sin-eslogan   Nombre + símbolo.
03-Simbolo                Solo el círculo con la T-persona.
04-Favicon                Iconos para la pestaña del navegador y accesos directos.
05-Animado                Logo animado en GIF y MP4.
06-Redes                  Foto de perfil cuadrada y portada 1200 x 630.

VERSIONES DE COLOR
color-fondo-oscuro   Letras blancas, símbolo a color. Para fondos oscuros (azul de marca).
color-fondo-claro    Letras azules, símbolo a color. Para fondos claros.
una-tinta-azul       Todo en azul de marca; la T va calada (deja ver el fondo).
una-tinta-blanco     Todo en blanco, para fondos oscuros o fotos.
una-tinta-negro      Todo en negro, para impresión a una tinta, sellos y fax.

FORMATOS
SVG   Vectorial; el preferido para web y para cualquier tamaño.
PDF   Vectorial; para imprenta y documentos.
PNG   Fondo transparente, a 2400 y 1200 px de ancho (símbolo: 1024, 512 y 256 px).
JPG   Con fondo y margen (solo las versiones a color): azul para fondo-oscuro, blanco para fondo-claro.

COLORES
Azul de marca    #1A2D5A
Dorado           #F1BA5B   (sombra del símbolo: #E9A52F)
Blanco de la T   #F8FFFB   (mitad gris: #D8D8D8)
Papel            #F7F4EE
Eslogan sobre azul #C9D3EA · sobre claro #3B424B

TIPOGRAFÍA
Nombre: JetBrains Mono Bold, en mayúsculas. Eslogan: Inter Medium.
En todos los archivos el texto está convertido a trazos: no hace falta instalar las fuentes.

USO
- Deja alrededor del logo un margen libre de al menos la altura de una letra del nombre.
- Por debajo de 24 px usa solo el símbolo; la cabeza de la T deja de distinguirse en tamaños menores.
- No cambies los colores, no deformes el logo ni separes el eslogan a otro ancho.
''')
shutil.rmtree(TMP)
n = sum(len(fs) for _, _, fs in os.walk(KIT))
print('kit listo:', n, 'archivos')
