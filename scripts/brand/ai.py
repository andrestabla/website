"""Versiones editables del logo en .ai (PDF compatible: Illustrator las abre con los trazados vectoriales).
Cada variante va en su propio archivo, con la mesa de trabajo ajustada al logo más un margen; además hay un
archivo maestro con todas las variantes rotuladas."""
import os, re, subprocess
KIT = '/Users/andrestabla/Documents/website/public/assets/brand'
DEST = os.path.join(KIT, '10-Editables-AI'); TMP = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'ai_tmp')
CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
os.makedirs(DEST, exist_ok=True)
GRUPOS = [('01-Logotipo-con-eslogan', 'Logotipo con eslogan', 180), ('02-Logotipo-sin-eslogan', 'Logotipo sin eslogan', 180), ('03-Simbolo', 'Símbolo', 60)]

def leer(path):
    s = open(path).read().strip()
    vb = [float(x) for x in re.search(r'viewBox="([^"]+)"', s).group(1).split()]
    body = re.sub(r'</svg>\s*$', '', re.sub(r'^<svg[^>]*>', '', s))
    return vb, body

def pdf(html, out, w_mm, h_mm):
    f = os.path.join(TMP, os.path.basename(out) + '.html')
    open(f, 'w').write(f'<!doctype html><meta charset="utf-8"><style>@page{{size:{w_mm:.2f}mm {h_mm:.2f}mm;margin:0}}'
                       f'html,body{{margin:0;padding:0}}*{{-webkit-print-color-adjust:exact;print-color-adjust:exact}}</style>{html}')
    subprocess.run([CHROME, '--headless=new', '--disable-gpu', '--no-pdf-header-footer', f'--print-to-pdf={out}', 'file://' + f],
                   check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)

def svg(vb, body, w_mm, x=0, y=0, ident=''):
    h_mm = w_mm * vb[3] / vb[2]
    return (f'<svg id="{ident}" xmlns="http://www.w3.org/2000/svg" viewBox="{vb[0]} {vb[1]} {vb[2]} {vb[3]}" '
            f'style="position:absolute;left:{x:.2f}mm;top:{y:.2f}mm;width:{w_mm:.2f}mm;height:{h_mm:.2f}mm">{body}</svg>'), h_mm

lista = []
for carpeta, titulo, ancho in GRUPOS:
    for n in sorted(os.listdir(os.path.join(KIT, carpeta))):
        if not n.endswith('.svg'): continue
        vb, body = leer(os.path.join(KIT, carpeta, n)); m = ancho * 0.12
        s, h = svg(vb, body, ancho, m, m, n[:-4])
        out = os.path.join(DEST, n[:-4] + '.ai')
        pdf(f'<div style="position:relative;width:{ancho + 2 * m:.2f}mm;height:{h + 2 * m:.2f}mm">{s}</div>', out, ancho + 2 * m, h + 2 * m)
        lista.append((titulo, n[:-4], vb, body, ancho)); print(os.path.basename(out), os.path.getsize(out) // 1024, 'KB')

# maestro: todas las variantes en una mesa A3 apaisada, las blancas y de fondo oscuro sobre azul
W, H = 420, 297; html = f'<div style="position:relative;width:{W}mm;height:{H}mm;font:500 3.2mm Helvetica,Arial,sans-serif;color:#1a2d5a">'
html += '<div style="position:absolute;left:14mm;top:10mm;font-size:5mm;font-weight:700">Algoritmo T · logotipos editables</div>'
y = 24
for carpeta, titulo, ancho in GRUPOS:
    items = [i for i in lista if i[0] == titulo]; cw = (W - 28) / 5; aw = min(cw - 12, 66 if ancho > 100 else 26)
    html += f'<div style="position:absolute;left:14mm;top:{y}mm;font-weight:700;letter-spacing:.08em;text-transform:uppercase;font-size:2.8mm">{titulo}</div>'
    y += 6; hmax = 0
    for k, (_, nombre, vb, body, _) in enumerate(items):
        oscuro = 'blanco' in nombre or 'oscuro' in nombre
        ah = aw * vb[3] / vb[2]; ch = ah + 16; x = 14 + k * cw
        html += f'<div style="position:absolute;left:{x:.2f}mm;top:{y}mm;width:{cw - 4:.2f}mm;height:{ch:.2f}mm;background:{"#1a2d5a" if oscuro else "#f4f1ea"}"></div>'
        s, _ = svg(vb, body, aw, x + (cw - 4 - aw) / 2, y + 8, nombre); html += s
        html += f'<div style="position:absolute;left:{x:.2f}mm;top:{y + ch + 1.5:.2f}mm;width:{cw - 4:.2f}mm;font-size:2.3mm;color:#5a6479">{nombre.replace("algoritmot-", "")}</div>'
        hmax = max(hmax, ch)
    y += hmax + 14
html += (f'<div style="position:absolute;left:14mm;top:{y}mm;font-size:2.8mm;line-height:1.6;color:#3b424b">Azul #1A2D5A · Dorado #F1BA5B · Dorado sombra #E9A52F · Cian #4FD0EC · Gris texto #3B424B<br>'
         'Nombre: JetBrains Mono Bold · Eslogan: Inter Medium (ambos convertidos a trazados)</div></div>')
pdf(html, os.path.join(DEST, 'algoritmot-logos-maestro.ai'), W, H)
print('maestro', os.path.getsize(os.path.join(DEST, 'algoritmot-logos-maestro.ai')) // 1024, 'KB')
