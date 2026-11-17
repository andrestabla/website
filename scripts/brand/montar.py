"""Monta los dos videos de presentación de Algoritmo T (1920 x 1080, 25 fps).
Uso: montar.py empresas|educacion [--solo-rotulos]
Entradas: audio/<E|D>n.mp3, audio/musica.mp3, clips/<id>.mp4 + clips/manifest.json, cortinilla/f%03d.png
"""
import json, os, re, subprocess, sys
from PIL import Image, ImageDraw, ImageFont

W = os.path.dirname(os.path.abspath(__file__))
KIT = '/Users/andrestabla/Documents/website/public/assets/brand'
os.environ['TMPDIR'] = '/Volumes/EAlgoritmoT/Temporales/tmp'
VW, VH, FPS = 1920, 1080, 25
NAVY, GOLD, CYAN, WHITE = (26, 45, 90), (241, 186, 91), (79, 208, 236), (255, 255, 255)
F = lambda n, s: ImageFont.truetype(os.path.join(W, 'fonts', n + '-latin.ttf'), s)
BIN = ' '.join(format(ord(c), '08b') for c in 'ALGORITMO T')

# ───────── guiones aprobados ─────────
GUION = {
    'empresas': dict(pref='E', linea='EMPRESAS', cierre='Hablemos de tu empresa', escenas=[
        dict(t='En toda empresa hay una historia que se repite: llega una tecnología nueva… y la gente sigue trabajando igual que antes.', clips=['E1']),
        dict(t='No es falta de herramientas. Es que nadie se detuvo a pensar en las personas que iban a usarlas.', clips=['E2a', 'E2b']),
        dict(t='Somos Algoritmo T. Hacemos soluciones digitales con sentido humano.', tipo='cortinilla'),
        dict(t='Empezamos por entender tu empresa: su ADN digital, sus procesos, lo que de verdad le quita tiempo a tu equipo. Y antes de construir, decidimos contigo qué debe hacer la tecnología y qué debe seguir en manos de las personas.',
             clips=['E4a', 'E4b'], reparto=[0.42, 0.58], rotulos=[('1', 'Diagnóstico', 0.0, 0.30), ('2', 'Procesos', 0.30, 0.58), ('3', 'Humano o tecnología', 0.58, 1.0)]),
        dict(t='Después diseñamos y desarrollamos. En cuatro semanas tienes un prototipo funcional: algo que tu equipo puede probar, criticar y mejorar.',
             clips=['E5'], rotulos=[('4', 'Prototipo en 4 semanas', 0.22, 1.0)]),
        dict(t='Lo implementamos contigo, acompañamos el cambio y seguimos midiendo mes a mes. Porque la transformación digital no es un proyecto: es una forma de trabajar.',
             clips=['E6a', 'E6b'], rotulos=[('5', 'Implementación', 0.0, 0.48), ('6', 'Mejora continua', 0.48, 1.0)]),
        dict(t='Automatización, inteligencia artificial, tableros de datos. Sí. Pero siempre al servicio de quien hace el trabajo.', clips=['E7']),
        dict(t='Algoritmo T. Hablemos de tu empresa.', tipo='cierre'),
    ]),
    'educacion': dict(pref='D', linea='EDUCACIÓN', cierre='Hablemos de tu próximo programa', escenas=[
        dict(t='Un curso virtual no es un PDF colgado en una plataforma. Detrás de cada pantalla hay alguien que quiere aprender… y un docente que quiere enseñar bien.', clips=['D1a', 'D1b'], reparto=[0.56, 0.44]),
        dict(t='Cuando la tecnología olvida eso, el estudiante se va.', clips=['D2'], cola=0.9),
        dict(t='Somos Algoritmo T. Hacemos soluciones digitales con sentido humano.', tipo='cortinilla'),
        dict(t='Acompañamos a universidades, colegios y organizaciones que forman personas. Ponemos a punto su plataforma de aprendizaje y virtualizamos sus programas con diseño instruccional: guiones, recursos interactivos, video y evaluación, pensados para que el estudiante participe y no solo mire.',
             clips=['D4a', 'D4b'], rotulos=[('1', 'Plataformas de aprendizaje', 0.26, 0.46), ('2', 'Virtualización de programas', 0.46, 1.0)]),
        dict(t='Auditamos los programas que ya tienes, con estándares internacionales de calidad, y te decimos con claridad qué mejorar.',
             clips=['D5'], rotulos=[('3', 'Auditoría de programas virtuales', 0.0, 1.0)]),
        dict(t='Y formamos a tus docentes. Porque ninguna plataforma reemplaza a un buen profesor: lo potencia.',
             clips=['D6'], rotulos=[('4', 'Formación docente', 0.0, 1.0)]),
        dict(t='Más de quinientos docentes formados, más de cien programas y más de mil quinientos cursos nos han enseñado una cosa: la educación virtual funciona cuando se siente cercana.',
             clips=['D7'], cifras=[('500+', 'docentes formados', 0.02), ('100+', 'programas', 0.26), ('1500+', 'cursos', 0.42)], cifras_fin=0.66),
        dict(t='Algoritmo T. Hablemos de tu próximo programa.', tipo='cierre'),
    ]),
}
RECORTE = {'E4a': 0.80}
DESDE = {'E4a': 4.2}
ENTRADA, COLA = 0.35, 0.45          # aire antes y después de la voz en cada escena


def dur(path):
    return float(subprocess.check_output(['ffprobe', '-v', '0', '-show_entries', 'format=duration', '-of', 'csv=p=0', path]).decode().strip())


def run(cmd):
    r = subprocess.run(cmd, capture_output=True, text=True)
    if r.returncode:
        print(r.stderr[-1800:]); sys.exit(1)


# ───────── rótulos (PNG a cuadro completo) ─────────
def lienzo():
    return Image.new('RGBA', (VW, VH), (0, 0, 0, 0))


def caja(d, box, radius, fill):
    d.rounded_rectangle(box, radius=radius, fill=fill)


def marca_esquina():
    im = lienzo()
    m = Image.open(os.path.join(KIT, '03-Simbolo/algoritmot-simbolo-color-1024px.png')).convert('RGBA').resize((92, 92), Image.LANCZOS)
    im.alpha_composite(m, (VW - 92 - 64, 56))
    return im


def degradado():
    im = lienzo(); px = im.load()
    for y in range(VH):
        a = 0
        if y > VH * 0.52:
            a = int(175 * ((y - VH * 0.52) / (VH * 0.48)) ** 1.5)
        if y < 190:
            a = max(a, int(70 * (1 - y / 190)))
        for x in range(VW):
            px[x, y] = (14, 24, 50, a)
    return im


def tercio(num, texto, linea):
    im = lienzo(); d = ImageDraw.Draw(im)
    f1, f2, fn = F('Inter-700', 50), F('JetBrainsMono-500', 21), F('JetBrainsMono-700', 44)
    tw = d.textlength(texto, font=f1)
    x, y, h = 96, 742, 118
    w = int(118 + tw + 46)
    caja(d, (x, y, x + w, y + h), 10, NAVY + (236,))
    d.rectangle((x, y, x + 8, y + h), fill=GOLD + (255,))
    d.text((x + 34, y + h / 2 + 2), num, font=fn, fill=GOLD + (255,), anchor='lm')
    d.text((x + 100, y + 30), f'ALGORITMO T · {linea}', font=f2, fill=CYAN + (255,), anchor='lm')
    d.text((x + 100, y + 76), texto, font=f1, fill=WHITE + (255,), anchor='lm')
    return im


def partir(texto, ancho, font, d):
    lineas, cur = [], ''
    for p in texto.split():
        t = (cur + ' ' + p).strip()
        if d.textlength(t, font=font) <= ancho: cur = t
        else: lineas.append(cur); cur = p
    if cur: lineas.append(cur)
    return lineas


def subtitulo(texto):
    im = lienzo(); d = ImageDraw.Draw(im); f = F('Inter-600', 42)
    ls = partir(texto, 1240, f, d); ancho = 1240
    while len(ls) > 1 and ancho > 420:              # dos líneas parejas, sin palabras sueltas
        alt = partir(texto, ancho - 30, f, d)
        if len(alt) > len(ls): break
        ls, ancho = alt, ancho - 30
    lh = 56; h = lh * len(ls) + 30; w = int(max(d.textlength(l, font=f) for l in ls)) + 64
    x0, y1 = (VW - w) // 2, VH - 62
    caja(d, (x0, y1 - h, x0 + w, y1), 10, (14, 24, 50, 214))
    for i, l in enumerate(ls):
        d.text((VW / 2, y1 - h + 15 + lh * i + lh / 2), l, font=f, fill=WHITE + (255,), anchor='mm')
    return im


def cifra(n, etiqueta, i, total):
    im = lienzo(); d = ImageDraw.Draw(im)
    fn, fe = F('JetBrainsMono-700', 104), F('Inter-600', 34)
    cw = 430; x0 = (VW - cw * total - 36 * (total - 1)) // 2 + i * (cw + 36); y0 = 300
    caja(d, (x0, y0, x0 + cw, y0 + 250), 14, NAVY + (232,))
    d.rectangle((x0, y0, x0 + cw, y0 + 8), fill=GOLD + (255,))
    d.text((x0 + cw / 2, y0 + 112), n, font=fn, fill=GOLD + (255,), anchor='mm')
    d.text((x0 + cw / 2, y0 + 198), etiqueta, font=fe, fill=WHITE + (255,), anchor='mm')
    return im


def fondo_marca():
    im = Image.new('RGB', (VW, VH), NAVY); d = ImageDraw.Draw(im); f = F('JetBrainsMono-500', 22)
    linea = (BIN + ' ') * 12; n = 0
    for y in range(18, VH, 52):
        d.text((24 - (n * 97) % 300, y), linea, font=f, fill=(34, 62, 108)); n += 1
    from PIL import ImageFilter                    # el código se despeja detrás del logotipo
    m = Image.new('L', (VW, VH), 0); ImageDraw.Draw(m).rounded_rectangle((230, 170, VW - 230, VH - 150), radius=160, fill=255)
    im.paste(Image.new('RGB', (VW, VH), NAVY), (0, 0), m.filter(ImageFilter.GaussianBlur(70)))
    return im


def cierre_png(frase):
    im = lienzo(); d = ImageDraw.Draw(im)
    lg = Image.open(os.path.join(KIT, '01-Logotipo-con-eslogan/algoritmot-logo-con-eslogan-color-fondo-oscuro-2400px.png')).convert('RGBA')
    lw = 1180; lg = lg.resize((lw, round(lw * lg.size[1] / lg.size[0])), Image.LANCZOS)
    y = 300; im.alpha_composite(lg, ((VW - lw) // 2, y))
    y2 = y + lg.size[1] + 78
    d.rectangle((VW / 2 - 60, y2, VW / 2 + 60, y2 + 5), fill=GOLD + (255,))
    d.text((VW / 2, y2 + 78), frase, font=F('Inter-700', 58), fill=WHITE + (255,), anchor='mm')
    d.text((VW / 2, y2 + 164), 'algoritmot.com   ·   hola@algoritmot.com', font=F('JetBrainsMono-500', 32), fill=CYAN + (255,), anchor='mm')
    return im


def trozos(texto, maxc=74):
    """Parte la locución en subtítulos de hasta dos líneas, cortando en la puntuación."""
    partes = [p.strip() for p in re.split(r'(?<=[.:…,;])\s+', texto) if p.strip()]
    out, cur = [], ''
    for p in partes:
        if len(cur) + len(p) + 1 <= maxc and not cur.endswith(':'): cur = (cur + ' ' + p).strip()
        else:
            if cur: out.append(cur)
            if len(p) > maxc:                     # frase larga: partes parejas, sin dejar colas de dos palabras
                n = -(-len(p) // maxc); ws = p.split(); meta = len(p) / n; cur = ''
                for w in ws:
                    if cur and len(cur) + len(w) + 1 > meta + 6 and n > 1:
                        out.append(cur); cur = w; n -= 1
                    else: cur = (cur + ' ' + w).strip()
            else: cur = p
    if cur: out.append(cur)
    return out


# ───────── montaje ─────────
def montar(clave, solo_rotulos=False):
    g = GUION[clave]; pref = g['pref']
    mp = os.path.join(W, 'clips', 'manifest.json')
    man = {m['id']: m for m in json.load(open(mp))} if os.path.exists(mp) else {}
    tmp = os.path.join(W, 'tmp_' + clave); os.makedirs(tmp, exist_ok=True)
    ov = os.path.join(tmp, 'ov'); os.makedirs(ov, exist_ok=True)
    marca_esquina().save(os.path.join(ov, 'marca.png')); degradado().save(os.path.join(ov, 'grad.png'))
    fondo_marca().save(os.path.join(ov, 'fondo.png'))
    partes, voces, t0, vtt = [], [], 0.0, ['WEBVTT', '']
    for i, e in enumerate(g['escenas'], 1):
        a = os.path.join(W, 'audio', f'{pref}{i}.mp3'); va = dur(a)
        tipo = e.get('tipo', 'clip')
        entrada = ENTRADA if tipo != 'cortinilla' else 0.9
        cola = e.get('cola', COLA)
        if tipo == 'cortinilla': D = max(entrada + va + 0.5, 6.4)
        elif tipo == 'cierre': D = 0.6 + va + 3.6; entrada = 0.6
        else: D = entrada + va + cola
        D = round(D * FPS) / FPS
        voces.append((a, t0 + entrada))
        # capas con tiempos locales
        capas = []
        if tipo == 'clip':
            capas.append(('grad.png', 0, D, 0)); capas.append(('marca.png', 0, D, 0))
            for k, (num, txt, f0, f1) in enumerate(e.get('rotulos', [])):
                n = f'r{i}_{k}.png'; tercio(num, txt, g['linea']).save(os.path.join(ov, n))
                capas.append((n, entrada + va * f0, min(D - 0.1, entrada + va * f1 + (0.35 if f1 >= 1 else -0.12)), 0.3))
            cf = e.get('cifras', [])
            for k, (num, et, f0) in enumerate(cf):
                n = f'c{i}_{k}.png'; cifra(num, et, k, len(cf)).save(os.path.join(ov, n))
                capas.append((n, entrada + va * f0, entrada + va * e['cifras_fin'], 0.3))
        if tipo == 'cierre':
            import cierre; cierre.cuadros(os.path.join(tmp, 'cierre'), g['cierre'], D)
        if tipo != 'cierre':
            tz = trozos(e['t']); tot = sum(len(x) for x in tz); acc = 0
            for k, x in enumerate(tz):
                s0 = entrada + va * acc / tot; acc += len(x); s1 = entrada + va * acc / tot
                n = f's{i}_{k}.png'; subtitulo(x).save(os.path.join(ov, n))
                capas.append((n, s0, min(D, s1 + (0.25 if k == len(tz) - 1 else 0)), 0))
                vtt += [f'{ts(t0 + s0)} --> {ts(t0 + s1)}', x, '']
        if not solo_rotulos:
            partes.append(escena(tmp, ov, i, tipo, e, D, capas, man))
        t0 += D
    total = t0
    open(os.path.join(W, 'salida', f'algoritmot-presentacion-{clave}.vtt'), 'w').write('\n'.join(vtt))
    if solo_rotulos:
        print('rótulos listos · duración', round(total, 2)); return
    lista = os.path.join(tmp, 'lista.txt'); open(lista, 'w').write(''.join(f"file '{p}'\n" for p in partes))
    mudo = os.path.join(tmp, 'mudo.mp4')
    run(['ffmpeg', '-y', '-loglevel', 'error', '-f', 'concat', '-safe', '0', '-i', lista, '-c', 'copy', mudo])
    # audio: voz + música con atenuación bajo la voz
    cmd = ['ffmpeg', '-y', '-loglevel', 'error']
    for a, _ in voces: cmd += ['-i', a]
    cmd += ['-i', os.path.join(W, 'audio', 'musica.mp3')]
    fc = ''.join(f'[{k}:a]aresample=48000,adelay={int(t * 1000)}:all=1[v{k}];' for k, (_, t) in enumerate(voces))
    fc += ''.join(f'[v{k}]' for k in range(len(voces))) + f'amix=inputs={len(voces)}:normalize=0:dropout_transition=0,apad=whole_dur={total:.2f},asplit=2[voz][llave];'
    m = len(voces)
    fc += (f'[{m}:a]aresample=48000,atrim=0:{total:.2f},afade=t=in:d=1.2,afade=t=out:st={total - 2.6:.2f}:d=2.6,volume=0.42[mus];'
           '[mus][llave]sidechaincompress=threshold=0.02:ratio=9:attack=25:release=420:makeup=1[musd];'
           '[voz][musd]amix=inputs=2:normalize=0,loudnorm=I=-16:TP=-1.5:LRA=11[a]')
    aud = os.path.join(tmp, 'mezcla.m4a')
    run(cmd + ['-filter_complex', fc, '-map', '[a]', '-t', f'{total:.2f}', '-c:a', 'aac', '-b:a', '192k', '-ar', '48000', aud])
    out = os.path.join(W, 'salida', f'algoritmot-presentacion-{clave}.mp4')
    run(['ffmpeg', '-y', '-loglevel', 'error', '-i', mudo, '-i', aud, '-c', 'copy', '-movflags', '+faststart', '-shortest', out])
    print(clave, 'listo ·', round(dur(out), 2), 's ·', os.path.getsize(out) // 1024 // 1024, 'MB')


def ts(t):
    return f'{int(t // 3600):02d}:{int(t % 3600 // 60):02d}:{t % 60:06.3f}'


def escena(tmp, ov, i, tipo, e, D, capas, man):
    out = os.path.join(tmp, f'esc{i}.mp4')
    cmd = ['ffmpeg', '-y', '-loglevel', 'error']; fc = ''; n = 0
    if tipo == 'clip':
        ids = e['clips']; rep = e.get('reparto', [1 / len(ids)] * len(ids))
        for k, cid in enumerate(ids):
            m = man[cid]; d = D * rep[k]
            ini = min(float(DESDE.get(cid, m.get('desde_s', 0))), max(0, float(m['duracion_s']) - d - 0.1))
            cmd += ['-ss', f'{ini:.2f}', '-t', f'{d + 0.2:.2f}', '-i', os.path.join(W, 'clips', m['archivo'])]
            keep = RECORTE.get(cid, 1.0)             # fracción del ancho que se conserva, desde la izquierda
            sw = int(VW / keep / 2) * 2
            fc += (f'[{n}:v]fps={FPS},scale={sw}:{VH * sw // VW}:force_original_aspect_ratio=increase,crop={VW}:{VH}:0:(ih-{VH})/2,setsar=1,'
                   f'eq=saturation=0.93:contrast=1.03,trim=0:{d:.3f},setpts=PTS-STARTPTS[c{k}];'); n += 1
        fc += ''.join(f'[c{k}]' for k in range(len(ids))) + f'concat=n={len(ids)}:v=1:a=0[base];'
    elif tipo == 'cortinilla':
        cmd += ['-loop', '1', '-t', f'{D:.2f}', '-i', os.path.join(ov, 'fondo.png'),
                '-framerate', str(FPS), '-i', os.path.join(W, 'cortinilla', 'f%03d.png')]
        fc += (f'[0:v]fps={FPS},format=yuv420p[bg];[1:v]scale=1560:-1:flags=lanczos,tpad=stop_mode=clone:stop_duration=6,'
               f'trim=0:{D:.3f},setpts=PTS+0.35/TB[lg];[bg][lg]overlay=(W-w)/2:(H-h)/2-40:eof_action=pass,'
               f'fade=t=in:d=0.35,trim=0:{D:.3f}[base];'); n = 2
    else:
        cmd += ['-framerate', str(FPS), '-i', os.path.join(tmp, 'cierre', 'f%03d.png')]
        fc += f'[0:v]fps={FPS},format=yuv420p,fade=t=in:d=0.3,trim=0:{D:.3f}[base];'; n = 1
    prev = 'base'
    for k, (png, a, b, f) in enumerate(capas):
        cmd += ['-loop', '1', '-t', f'{D:.2f}', '-i', os.path.join(ov, png)]
        fx = 'format=rgba'
        if f: fx += f',fade=t=in:st={a:.2f}:d={f}:alpha=1,fade=t=out:st={max(a, b - f):.2f}:d={f}:alpha=1'
        fc += f"[{n}:v]{fx}[o{k}];[{prev}][o{k}]overlay=0:0:enable='between(t,{a:.3f},{b:.3f})'[x{k}];"; prev = f'x{k}'; n += 1
    if tipo == 'cierre':
        fc += f'[{prev}]fade=t=out:st={D - 0.7:.2f}:d=0.7[fin]'; prev = 'fin'
    else:
        fc = fc.rstrip(';')
    run(cmd + ['-filter_complex', fc, '-map', f'[{prev}]', '-t', f'{D:.3f}', '-r', str(FPS), '-c:v', 'libx264', '-crf', '18',
               '-preset', 'medium', '-pix_fmt', 'yuv420p', '-video_track_timescale', '12800', out])
    return out


if __name__ == '__main__':
    os.makedirs(os.path.join(W, 'salida'), exist_ok=True)
    montar(sys.argv[1], '--solo-rotulos' in sys.argv)
