"""Pendones, avisos y material POP de Algoritmo T.
Genera cada arte en PDF vectorial a tamaño real (carpeta 11 del kit) y las maquetas en JPG para el manual.
Uso: TMPDIR=/Volumes/EAlgoritmoT/Temporales/tmp python3 pop.py <carpeta_kit_11> <carpeta_img_manual>
"""
import os, re, subprocess, sys
import qrcode
from PIL import Image

KIT = '/Users/andrestabla/Documents/website/public/assets/brand'
HERE = os.path.dirname(os.path.abspath(__file__))
OUT, IMG = sys.argv[1], sys.argv[2]
CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
BIN = ' '.join(format(ord(c), '08b') for c in 'ALGORITMO T')
NAVY, GOLD, CYAN, PAPER = '#1a2d5a', '#F1BA5B', '#4fd0ec', '#f7f4ee'


def logo(path, w, style=''):
    s = open(os.path.join(KIT, path)).read().strip()
    vb = re.search(r'viewBox="([^"]+)"', s).group(1)
    _, _, vw, vh = map(float, vb.split())
    body = re.sub(r'</svg>\s*$', '', re.sub(r'^<svg[^>]*>', '', s))
    return f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="{vb}" width="{w}" height="{w * vh / vw:.1f}" style="display:block;flex:none;{style}">{body}</svg>'


LSO = lambda w, s='': logo('01-Logotipo-con-eslogan/algoritmot-logo-con-eslogan-color-fondo-oscuro.svg', w, s)
LSC = lambda w, s='': logo('01-Logotipo-con-eslogan/algoritmot-logo-con-eslogan-color-fondo-claro.svg', w, s)
LO = lambda w, s='': logo('02-Logotipo-sin-eslogan/algoritmot-logo-sin-eslogan-color-fondo-oscuro.svg', w, s)
LC = lambda w, s='': logo('02-Logotipo-sin-eslogan/algoritmot-logo-sin-eslogan-color-fondo-claro.svg', w, s)
MK = lambda w, s='': logo('03-Simbolo/algoritmot-simbolo-color.svg', w, s)


def qr(url, size, fg=NAVY, pad=True):
    q = qrcode.QRCode(border=0, error_correction=qrcode.constants.ERROR_CORRECT_M); q.add_data(url); q.make()
    m = q.get_matrix(); n = len(m)
    d = ''.join(f'M{x} {y}h1v1h-1z' for y, row in enumerate(m) for x, v in enumerate(row) if v)
    p = size * 0.09 if pad else 0
    return (f'<div style="width:{size}px;height:{size}px;background:#fff;padding:{p}px;box-sizing:border-box;flex:none">'
            f'<svg viewBox="0 0 {n} {n}" width="{size - 2 * p}" height="{size - 2 * p}" style="display:block" shape-rendering="crispEdges"><path d="{d}" fill="{fg}"/></svg></div>')


def tex(fs, op=.1):
    return f'<div style="position:absolute;inset:0;font:500 {fs}px/2.1 \'JetBrains Mono\';color:{CYAN};opacity:{op};word-break:break-all;letter-spacing:.14em;padding:{fs}px;overflow:hidden">{(BIN + " ") * 60}</div>'


def art(w, h, body, bg=NAVY, color='#fff'):
    return f'<div class="art" style="width:{w}px;height:{h}px;background:{bg};color:{color}">{body}</div>'


def bullets(items, fs, num, ink, gap):
    return ''.join(f'<div style="display:grid;grid-template-columns:{fs * 1.9}px 1fr;gap:{fs * .5}px;align-items:baseline;padding:{gap}px 0;border-top:{max(1, fs / 18):.1f}px solid {num}55">'
                   f'<span class="m" style="font-size:{fs * .62}px;color:{num}">{i + 1:02d}</span><span style="font:500 {fs}px/1.25 Inter;color:{ink}">{t}</span></div>' for i, t in enumerate(items))


# ------------------------------------------------------------------ artes (1 px = 1 mm salvo que se indique)
def rollup_inst():
    def linea(k, t):
        return f'<div><div class="k" style="font-size:25px;color:{GOLD}">{k}</div><div style="font:500 30px/1.3 Inter;color:#c9d3ea;margin-top:14px">{t}</div></div>'
    return art(850, 2000, tex(15) + f'''<div style="position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;padding:130px 80px 0;text-align:center">
      {MK(260)}<div style="height:70px"></div>{LSO(640)}
      <div style="width:90px;height:7px;background:{GOLD};margin:110px 0 70px"></div>
      <div class="h" style="font-size:80px">La tecnología solo transforma cuando las personas la adoptan.</div>
      <div style="margin-top:100px;display:grid;gap:44px;width:100%">{linea('Empresas', 'Transformación digital con enfoque humano')}{linea('Educación', 'Virtualización y plataformas de aprendizaje')}</div>
      <div class="m" style="margin-top:90px;font-size:42px;font-weight:700;letter-spacing:.06em">algoritmot.com</div></div>''')


def rollup_emp():
    items = ['Diagnóstico de madurez digital y de IA', 'Mapeo y rediseño de procesos', 'Prototipo funcional en cuatro semanas', 'Implementación y gestión del cambio']
    return art(850, 2000, tex(15) + f'''<div style="position:absolute;inset:0;padding:130px 80px 0">
      {LO(600)}
      <div class="k" style="font-size:28px;color:{GOLD};margin-top:130px">Algoritmo T · Empresas</div>
      <div class="h" style="font-size:98px;margin-top:36px">Transformación digital que las personas sí adoptan</div>
      <div style="width:90px;height:7px;background:{GOLD};margin:70px 0 50px"></div>
      {bullets(items, 34, GOLD, '#e6ecf8', 22)}
      <div style="position:absolute;left:80px;right:80px;top:1545px;display:flex;gap:40px;align-items:center">{qr('https://www.algoritmot.com/empresas', 200)}
        <div><div class="m" style="font-size:36px;font-weight:700">algoritmot.com/empresas</div><div class="m" style="font-size:27px;color:#c9d3ea;margin-top:16px">hola@algoritmot.com</div><div class="m" style="font-size:27px;color:#c9d3ea;margin-top:8px">+57 300 659 0161</div></div></div></div>''')


def rollup_edu():
    items = ['Plataformas de aprendizaje a la medida de la institución', 'Virtualización de programas con diseño instruccional', 'Auditoría de programas virtuales', 'Formación digital para docentes']
    return art(850, 2000, f'''<div style="position:absolute;left:0;right:0;top:0;height:22px;background:{GOLD}"></div>
      <div style="position:absolute;inset:0;padding:120px 80px 0">
      {LC(600)}
      <div class="k" style="font-size:28px;color:#94620c;margin-top:110px">Algoritmo T · Educación</div>
      <div class="h" style="font-size:98px;margin-top:36px;color:{NAVY}">Educación virtual con sentido humano</div>
      <div style="width:90px;height:7px;background:{GOLD};margin:70px 0 50px"></div>
      {bullets(items, 33, '#94620c', '#26324c', 20)}
      <div style="display:flex;gap:44px;margin-top:56px;color:{NAVY}">{''.join(f'<div><div class="h" style="font-size:64px">{a}</div><div class="k" style="font-size:19px;color:#5a6479;margin-top:8px">{b}</div></div>' for a, b in (('500+', 'docentes'), ('100+', 'programas'), ('1500+', 'cursos')))}</div></div>
      <div style="position:absolute;left:0;right:0;top:1590px;bottom:0;background:{NAVY}">{tex(15)}<div style="position:absolute;left:80px;right:80px;top:44px;display:flex;gap:40px;align-items:center">{qr('https://www.algoritmot.com/educacion', 180)}
        <div><div class="m" style="font-size:36px;font-weight:700">algoritmot.com/educacion</div><div class="m" style="font-size:27px;color:#c9d3ea;margin-top:16px">hola@algoritmot.com</div><div class="m" style="font-size:27px;color:#c9d3ea;margin-top:8px">+57 300 659 0161</div></div></div></div>''', PAPER, NAVY)


def backing():
    cells = ''
    for r in range(9):
        for c in range(-1, 5):
            x = c * 760 + (380 if r % 2 else 0) + 60; y = r * 250 + 62
            cells += f'<div style="position:absolute;left:{x}px;top:{y}px;display:flex;align-items:center;gap:70px">{LO(520)}{MK(126)}</div>'
    return art(3000, 2250, cells)


def fachada():
    return art(3000, 700, f'<div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center">{LO(2300)}</div>')


def recepcion():
    c = 'position:absolute;border-color:#94620c;border-style:solid;border-width:0'
    return art(2200, 820, f'''<div style="position:absolute;left:200px;top:150px">{LSC(1800)}</div>
      <div style="{c};left:200px;width:1800px;top:660px;height:28px;border-left-width:3px;border-right-width:3px;border-bottom-width:3px"></div>
      <div class="m" style="position:absolute;left:0;right:0;top:712px;text-align:center;font-size:40px;font-weight:700;color:#94620c">180 cm</div>
      <div style="{c};left:2040px;top:150px;height:442px;width:28px;border-top-width:3px;border-bottom-width:3px;border-right-width:3px"></div>
      <div class="m" style="position:absolute;left:2082px;top:350px;font-size:40px;font-weight:700;color:#94620c">44</div>
      <div class="m" style="position:absolute;left:200px;top:62px;font-size:30px;font-weight:700;color:#5a6479;letter-spacing:.12em">AVISO DE RECEPCIÓN · LETRAS CORPÓREAS · MEDIDAS EN CENTÍMETROS</div>''', '#ffffff', NAVY)


def bandera():
    return art(600, 600, MK(600), 'transparent')


def placa(nombre):
    ini = nombre[0].upper()
    return art(1200, 480, f'''<div style="position:absolute;left:0;top:0;bottom:0;width:26px;background:{GOLD}"></div>
      <div style="position:absolute;inset:0;padding:0 80px 0 110px;display:flex;align-items:center;gap:64px">{MK(190)}
      <div><div class="h" style="font-size:112px;letter-spacing:-.02em">{nombre}</div><div class="m" style="font-size:38px;font-weight:700;color:{CYAN};margin-top:26px;letter-spacing:.12em">{format(ord(ini), '08b')} = {ini}</div></div></div>''')


def afiche():
    return art(1000, 1400, tex(17) + f'''<div style="position:absolute;right:-170px;bottom:-170px">{MK(620)}</div>
      <div style="position:absolute;inset:0;padding:96px 90px">
      <div class="k" style="font-size:27px;color:{GOLD}">Charla abierta · Educación</div>
      <div class="h" style="font-size:112px;margin-top:44px;max-width:780px">Cómo virtualizar un programa sin perder al docente</div>
      <div style="width:100px;height:8px;background:{GOLD};margin:64px 0 44px"></div>
      <div class="m" style="font-size:33px;font-weight:700;line-height:1.7">Jueves 00 de mes · 0:00 p. m.<br><span style="color:#c9d3ea;font-weight:500">Auditorio · Ciudad</span></div>
      <div style="position:absolute;left:90px;bottom:96px">{LO(400)}<div class="m" style="font-size:25px;color:#c9d3ea;margin-top:26px">algoritmot.com</div></div></div>''')


def volante_a():      # 140 x 216 mm a 4 px/mm
    return art(560, 864, tex(10) + f'''<div style="position:absolute;inset:0;padding:56px 48px;display:flex;flex-direction:column">
      {MK(104)}
      <div class="h" style="font-size:57px;margin-top:64px">La tecnología solo transforma cuando las personas la adoptan.</div>
      <div style="width:56px;height:5px;background:{GOLD};margin:44px 0 0"></div>
      <div style="margin-top:auto">{LSO(380)}</div></div>''')


def volante_b():
    def col(t, items):
        return f'<div><div class="k" style="font-size:14px;color:#94620c">{t}</div>' + bullets(items, 17.5, '#94620c', '#26324c', 9) + '</div>'
    return art(560, 864, f'''<div style="position:absolute;inset:0;padding:56px 48px;display:flex;flex-direction:column;gap:30px">
      {LC(250)}
      <div class="h" style="font-size:33px;color:{NAVY}">Dos líneas de trabajo, un mismo método: primero las personas.</div>
      {col('Empresas', ['Diagnóstico MD-IA de madurez digital', 'Mapeo y rediseño de procesos', 'Prototipo funcional en cuatro semanas'])}
      {col('Educación', ['Plataformas de aprendizaje', 'Virtualización de programas', 'Formación digital para docentes'])}
      <div style="margin-top:auto;display:flex;gap:22px;align-items:center;border-top:2px solid {NAVY};padding-top:22px">{qr('https://www.algoritmot.com', 104, pad=False)}
        <div class="m" style="font-size:15px;line-height:1.7;color:#26324c"><b style="font-size:19px;color:{NAVY}">algoritmot.com</b><br>hola@algoritmot.com<br>+57 300 659 0161</div></div></div>''', PAPER, NAVY)


def hablador():       # 10 x 21 cm a 4 px/mm: el formato del exhibidor de acrílico vertical
    return art(400, 840, f'''<div style="position:absolute;inset:0 0 132px;padding:54px 34px 0;display:flex;flex-direction:column;align-items:center;text-align:center">
      {MK(96)}
      <div class="k" style="font-size:13px;color:#94620c;margin-top:40px">Conversemos</div>
      <div class="h" style="font-size:44px;color:{NAVY};margin-top:16px">Cuéntanos qué quieres transformar</div>
      <div style="width:44px;height:4px;background:{GOLD};margin:34px 0"></div>
      <div style="border:2px solid {NAVY}">{qr('https://www.algoritmot.com', 190)}</div>
      <div class="m" style="font-size:16px;font-weight:700;color:{NAVY};margin-top:22px">algoritmot.com</div></div>
      <div style="position:absolute;left:0;right:0;bottom:0;height:132px;background:{NAVY};display:flex;align-items:center;justify-content:center">{LO(270)}</div>''', PAPER, NAVY)


def mostrador():      # frente de 200 x 90 cm
    return art(2000, 900, tex(15) + f'<div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;gap:120px">{MK(380)}{LSO(1050)}</div>')


CSS = f'''<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@500;700&family=Space+Grotesk:wght@500;700&display=swap">
<style>*{{box-sizing:border-box}}html,body{{margin:0}}.art{{position:relative;overflow:hidden;font-family:Inter,sans-serif;flex:none}}
.h{{font-family:'Space Grotesk',sans-serif;font-weight:700;letter-spacing:-.02em;line-height:1.04;text-wrap:balance}}
.k{{font-family:'JetBrains Mono',monospace;font-weight:700;letter-spacing:.14em;text-transform:uppercase}}.m{{font-family:'JetBrains Mono',monospace;font-weight:500}}</style>'''

# nombre de archivo, carpeta, mm ancho, mm alto, [páginas (px ancho, px alto, html)]
ARTES = [
    ('pendon-roll-up-institucional-85x200cm', '01-Pendones', 850, 2000, [(850, 2000, rollup_inst())]),
    ('pendon-roll-up-empresas-85x200cm', '01-Pendones', 850, 2000, [(850, 2000, rollup_emp())]),
    ('pendon-roll-up-educacion-85x200cm', '01-Pendones', 850, 2000, [(850, 2000, rollup_edu())]),
    ('backing-300x225cm', '01-Pendones', 3000, 2250, [(3000, 2250, backing())]),
    ('aviso-fachada-300x70cm', '02-Avisos', 3000, 700, [(3000, 700, fachada())]),
    ('aviso-recepcion-plano-180cm', '02-Avisos', 2200, 820, [(2200, 820, recepcion())]),
    ('aviso-bandera-60cm', '02-Avisos', 600, 600, [(600, 600, bandera())]),
    ('senaletica-placas-30x12cm', '02-Avisos', 300, 120, [(1200, 480, placa(n)) for n in ('Sala de reuniones', 'Dirección', 'Aula 1')]),
    ('afiche-50x70cm', '03-Material-POP', 500, 700, [(1000, 1400, afiche())]),
    ('volante-media-carta-14x21-6cm', '03-Material-POP', 140, 216, [(560, 864, volante_a()), (560, 864, volante_b())]),
    ('hablador-de-mesa-10x21cm', '03-Material-POP', 100, 210, [(400, 840, hablador())]),
    ('mostrador-frente-200x90cm', '03-Material-POP', 2000, 900, [(2000, 900, mostrador())]),
]


def chrome(args):
    env = dict(os.environ, TMPDIR='/Volumes/EAlgoritmoT/Temporales/tmp')
    subprocess.run([CHROME, '--headless=new', '--disable-gpu', '--hide-scrollbars', '--no-first-run', '--virtual-time-budget=9000',
                    '--user-data-dir=/Volumes/EAlgoritmoT/Temporales/tmp/chrome-pop'] + args, env=env, check=True, capture_output=True)


def pdfs():
    for name, folder, mw, mh, pages in ARTES:
        pw, ph = mw * 96 / 25.4, mh * 96 / 25.4
        body = ''.join(f'<div style="width:{pw}px;height:{ph}px;overflow:hidden;page-break-after:always"><div style="transform:scale({pw / w});transform-origin:0 0;width:{w}px;height:{h}px">{h_}</div></div>'
                       for w, h, h_ in pages)
        src = os.path.join(HERE, 'work', name + '.html')
        open(src, 'w').write(f'<!doctype html><meta charset="utf-8">{CSS}<style>@page{{size:{mw}mm {mh}mm;margin:0}}</style>{body}')
        dst = os.path.join(OUT, folder, name + '.pdf'); os.makedirs(os.path.dirname(dst), exist_ok=True)
        chrome(['--no-pdf-header-footer', f'--print-to-pdf={dst}', 'file://' + src])
        print('pdf', name, os.path.getsize(dst) // 1024, 'KB')


# ------------------------------------------------------------------ maquetas para el manual (1200 x 900)
def put(a, s, x, y, extra=''):
    w, h, html = a
    return (f'<div style="position:absolute;left:{x}px;top:{y}px;width:{w * s}px;height:{h * s}px;{extra}">'
            f'<div style="transform:scale({s});transform-origin:0 0;width:{w}px;height:{h}px">{html}</div></div>')


def room(floor=760, wall='linear-gradient(180deg,#f1ece1,#e7e0d1)', ground='linear-gradient(180deg,#cdc4b1,#d9d1c0)'):
    return f'<div style="position:absolute;inset:0;background:{wall}"></div><div style="position:absolute;left:0;right:0;top:{floor}px;bottom:0;background:{ground}"></div>'


def shadow(x, y, w, h=26, o=.28):
    return f'<div style="position:absolute;left:{x}px;top:{y - h / 2}px;width:{w}px;height:{h}px;border-radius:50%;background:radial-gradient(closest-side,rgba(20,26,40,{o}),transparent)"></div>'


def stand(a, s, x, bottom):
    """Pendón roll-up de pie: lona, riel superior, casete y sombra."""
    w, h = a[0] * s, a[1] * s
    return (shadow(x - 30, bottom + 6, w + 60) + put(a, s, x, bottom - h - 10 * s * 3, 'box-shadow:0 10px 30px -18px rgba(10,20,45,.7)')
            + f'<div style="position:absolute;left:{x - 3}px;top:{bottom - h - 10 * s * 3 - 5}px;width:{w + 6}px;height:6px;background:#8b9099;border-radius:3px"></div>'
            + f'<div style="position:absolute;left:{x - 8}px;top:{bottom - 10 * s * 3}px;width:{w + 16}px;height:{max(9, 30 * s)}px;background:linear-gradient(180deg,#b9bdc4,#7d828b);border-radius:5px"></div>')


def person(x, bottom, hpx, c='#6b7690'):
    hd, bw = hpx * .13, hpx * .27
    return (shadow(x - 24, bottom + 4, bw + 48, 20, .22)
            + f'<div style="position:absolute;left:{x + bw / 2 - hd / 2}px;top:{bottom - hpx}px;width:{hd}px;height:{hd}px;border-radius:50%;background:{c}"></div>'
            + f'<div style="position:absolute;left:{x}px;top:{bottom - hpx + hd * 1.15}px;width:{bw}px;height:{hpx * .5}px;border-radius:{bw * .42}px {bw * .42}px 4px 4px;background:{c}"></div>'
            + f'<div style="position:absolute;left:{x + bw * .14}px;top:{bottom - hpx * .42}px;width:{bw * .72}px;height:{hpx * .42}px;border-radius:0 0 4px 4px;background:{c}"></div>')


A = {n: (p[0][0], p[0][1], p[0][2]) for n, _, _, _, p in ARTES}
RI, RE, RD = A['pendon-roll-up-institucional-85x200cm'], A['pendon-roll-up-empresas-85x200cm'], A['pendon-roll-up-educacion-85x200cm']
BK, FA, MO, AF, HA = A['backing-300x225cm'], A['aviso-fachada-300x70cm'], A['mostrador-frente-200x90cm'], A['afiche-50x70cm'], A['hablador-de-mesa-10x21cm']
PL = ARTES[7][4]; VO = ARTES[9][4]


def counter(s, x, bottom):
    w, h = 900 * s, 1000 * s
    return (shadow(x - 30, bottom + 6, w + 60) + put(MO, s, x, bottom - h, 'box-shadow:0 10px 30px -18px rgba(10,20,45,.7)')
            + f'<div style="position:absolute;left:{x - 14 * s * 3}px;top:{bottom - h - 26 * s * 1.6}px;width:{w + 28 * s * 3}px;height:{26 * s * 1.6}px;background:linear-gradient(180deg,#fbf8f1,#ddd5c4);border-radius:3px"></div>')


SCENES = {
    'p-stand': (1200, 675, room(540) + shadow(170, 548, 700, 34) + put(BK, .2, 215, 86, 'box-shadow:0 14px 34px -20px rgba(10,20,45,.7)')
                + f'<div style="position:absolute;left:209px;top:80px;width:612px;height:462px;border:6px solid #9a9fa8;border-radius:3px"></div>'
                + person(455, 600, 345) + counter(.21, 610, 618) + stand(RE, .21, 880, 610) + stand(RD, .21, 30, 610)),
    'p-rollup': (1200, 900, room(770) + stand(RI, .31, 130, 815) + stand(RE, .31, 468, 815) + stand(RD, .31, 806, 815)),
    'p-backing': (1200, 900, room(760) + shadow(150, 772, 900, 40) + put(BK, .27, 160, 150, 'box-shadow:0 14px 34px -20px rgba(10,20,45,.7)')
                  + '<div style="position:absolute;left:153px;top:143px;width:824px;height:622px;border:7px solid #9a9fa8;border-radius:3px"></div>' + person(1010, 812, 459)),
    'p-fachada': (1200, 900, '<div style="position:absolute;inset:0;background:linear-gradient(180deg,#e9e3d6,#ddd5c5)"></div><div style="position:absolute;left:0;right:0;top:830px;bottom:0;background:#b9b3a6"></div>'
                  + put(FA, .3, 150, 150, 'box-shadow:0 16px 30px -14px rgba(10,20,45,.6);border-radius:4px;overflow:hidden')
                  + '<div style="position:absolute;left:150px;top:430px;width:380px;height:400px;background:linear-gradient(135deg,#9fb4c4,#d2dde4 55%,#8fa5b6);border:10px solid #2b3550"></div>'
                  + '<div style="position:absolute;left:600px;top:430px;width:230px;height:400px;background:linear-gradient(135deg,#8fa5b6,#cfdbe2 60%,#9fb4c4);border:10px solid #2b3550"></div><div style="position:absolute;left:790px;top:620px;width:8px;height:54px;background:#F1BA5B;border-radius:4px"></div>'
                  + '<div style="position:absolute;left:900px;top:430px;width:150px;height:400px;background:linear-gradient(135deg,#9fb4c4,#d2dde4 55%,#8fa5b6);border:10px solid #2b3550"></div>'),
    'p-recepcion': (1200, 900, room(780, 'linear-gradient(180deg,#fbf9f4,#efeadf)') + f'<div style="position:absolute;left:220px;top:170px;filter:drop-shadow(0 9px 5px rgba(20,26,40,.28))">{LSC(760)}</div>'
                    + shadow(200, 842, 800, 40) + '<div style="position:absolute;left:230px;top:560px;width:740px;height:280px;background:#1a2d5a;border-radius:4px"></div>'
                    + f'<div style="position:absolute;left:210px;top:540px;width:780px;height:26px;background:linear-gradient(180deg,#c9a577,#a98456);border-radius:3px"></div><div style="position:absolute;left:560px;top:650px">{MK(80)}</div>'),
    'p-bandera': (1200, 900, '<div style="position:absolute;inset:0;background:linear-gradient(180deg,#cfe0ea,#eef3f2)"></div><div style="position:absolute;left:0;top:0;bottom:0;width:430px;background:linear-gradient(90deg,#d8d0bf,#e9e3d6)"></div>'
                  + '<div style="position:absolute;left:60px;top:560px;width:250px;height:340px;background:linear-gradient(135deg,#8fa5b6,#cfdbe2 60%,#9fb4c4);border:10px solid #2b3550"></div>'
                  + '<div style="position:absolute;left:430px;top:226px;width:120px;height:12px;background:#2b3550"></div><div style="position:absolute;left:430px;top:196px;width:16px;height:72px;background:#2b3550;border-radius:2px"></div>'
                  + f'<div style="position:absolute;left:520px;top:230px;width:400px;height:400px;border-radius:50%;box-shadow:0 0 0 10px #2b3550,0 30px 40px -20px rgba(10,20,45,.55)">{MK(400)}</div><div style="position:absolute;left:714px;top:218px;width:12px;height:16px;background:#2b3550"></div><div style="position:absolute;left:540px;top:218px;width:186px;height:8px;background:#2b3550"></div>'),
    'p-placas': (1200, 900, room(800, 'linear-gradient(180deg,#fbf9f4,#efeadf)')
                 + ''.join(put(p, .42, 110, 110 + i * 236, 'box-shadow:0 12px 22px -12px rgba(10,20,45,.6);border-radius:5px;overflow:hidden') for i, p in enumerate(PL))
                 + '<div style="position:absolute;left:760px;top:120px;width:320px;height:680px;background:linear-gradient(180deg,#c9a577,#b48f61);border:14px solid #8a6c45;border-bottom:0"></div><div style="position:absolute;left:800px;top:470px;width:44px;height:12px;background:#2b3550;border-radius:6px"></div>'),
    'p-afiche': (1200, 900, room(840, 'linear-gradient(180deg,#f1ece1,#e7e0d1)') + put(AF, .5, 350, 80, 'box-shadow:0 26px 40px -22px rgba(10,20,45,.75),0 0 0 10px #fffdf8,0 0 0 13px #cfc6b4')),
    'p-volante': (1200, 900, '<div style="position:absolute;inset:0;background:linear-gradient(160deg,#d9cfbb,#c7bca6)"></div>'
                  + put(VO[0], .86, 150, 90, 'transform:rotate(-5deg);box-shadow:0 22px 34px -18px rgba(10,20,45,.7)') + put(VO[1], .86, 600, 110, 'transform:rotate(4deg);box-shadow:0 22px 34px -18px rgba(10,20,45,.7)')),
    'p-hablador': (1200, 900, '<div style="position:absolute;inset:0;background:linear-gradient(180deg,#efe9dc,#e4dccb)"></div><div style="position:absolute;left:0;right:0;top:650px;bottom:0;background:linear-gradient(180deg,#b9966a,#a07d52)"></div>'
                   + shadow(300, 742, 640, 46, .4) + '<div style="position:absolute;left:770px;top:136px;width:104px;height:600px;background:linear-gradient(90deg,#d7cdb9,#bdb29b);transform:skewY(-9deg);transform-origin:0 100%"></div>'
                   + put(HA, 1, 370, 136, 'box-shadow:0 10px 26px -16px rgba(10,20,45,.6)')),
    'p-mostrador': (1200, 900, room(760) + put(BK, .3, 150, 60, 'opacity:.5;filter:blur(2px)') + counter(.56, 348, 836) + person(965, 850, 500)),
}


def scenes():
    for name, (w, h, html) in SCENES.items():
        src = os.path.join(HERE, 'work', name + '.html'); png = os.path.join(HERE, 'work', name + '.png')
        open(src, 'w').write(f'<!doctype html><meta charset="utf-8">{CSS}<body style="width:{w}px;height:{h}px;position:relative;overflow:hidden">{html}')
        chrome([f'--window-size={w},{h + 200}', '--force-device-scale-factor=1.5', f'--screenshot={png}', 'file://' + src])
        im = Image.open(png).convert('RGB').crop((0, 0, int(w * 1.5), int(h * 1.5))); im = im.resize((w if name == 'p-stand' else 900, round((w if name == 'p-stand' else 900) * h / w)), Image.LANCZOS)
        im.save(os.path.join(IMG, name + '.jpg'), quality=86, optimize=True)
        print('img', name, im.size, os.path.getsize(os.path.join(IMG, name + '.jpg')) // 1024, 'KB')


def pngs():
    """Cada arte (y cada página) en PNG, para montarlo sobre fotografías."""
    os.makedirs(os.path.join(HERE, 'art'), exist_ok=True)
    for name, folder, mw, mh, pages in ARTES:
        for i, (w, h, html) in enumerate(pages):
            k = min(3.0, 2400 / max(w, h)); tag = name + (f'-{i + 1}' if len(pages) > 1 else '')
            src = os.path.join(HERE, 'work', tag + '.html'); png = os.path.join(HERE, 'art', tag + '.png')
            bg = 'transparent' if 'bandera' in name else '#fff'
            open(src, 'w').write(f'<!doctype html><meta charset="utf-8">{CSS}<body style="background:{bg};width:{w}px;height:{h}px;overflow:hidden">{html}')
            chrome([f'--window-size={w},{h + 200}', f'--force-device-scale-factor={k}', '--default-background-color=00000000', f'--screenshot={png}', 'file://' + src])
            im = Image.open(png).crop((0, 0, int(w * k), int(h * k))); im.save(png); print('png', tag, im.size)


if __name__ == '__main__':
    os.makedirs(os.path.join(HERE, 'work'), exist_ok=True); os.makedirs(IMG, exist_ok=True)
    if 'pngs' in sys.argv: pngs(); sys.exit()
    pdfs()
