"""Genera el manual de marca de Algoritmo T (HTML) con los SVG reales del kit."""
import html, os, re, sys

KIT = '/Users/andrestabla/Documents/website/public/assets/brand'
HERE = os.path.dirname(os.path.abspath(__file__))
OUT = sys.argv[1]
IMG = sys.argv[2] if len(sys.argv) > 2 else 'img/'      # prefijo de las imágenes


def inner(path):
    s = open(os.path.join(KIT, path)).read()
    vb = re.search(r'viewBox="([^"]+)"', s).group(1)
    return vb, re.sub(r'</svg>\s*$', '', re.sub(r'^<svg[^>]*>', '', s.strip()))


def sym(id_, path, repl):
    vb, body = inner(path)
    for a, b in repl:
        body = body.replace(a, b)
    return f'<symbol id="{id_}" viewBox="{vb}">{body}</symbol>'


L = ('fill="#1a2d5a"', 'style="fill:var(--l,#1a2d5a)"')
CUR = ('fill="#1a2d5a"', 'fill="currentColor"')
SYMBOLS = ''.join([
    sym('lt', '02-Logotipo-sin-eslogan/algoritmot-logo-sin-eslogan-color-fondo-claro.svg', [L]),
    sym('lts', '01-Logotipo-con-eslogan/algoritmot-logo-con-eslogan-color-fondo-claro.svg', [L, ('fill="#3b424b"', 'style="fill:var(--s,#3b424b)"')]),
    sym('ltm', '02-Logotipo-sin-eslogan/algoritmot-logo-sin-eslogan-una-tinta-azul.svg', [CUR]),
    sym('ltsm', '01-Logotipo-con-eslogan/algoritmot-logo-con-eslogan-una-tinta-azul.svg', [CUR]),
    sym('mk', '03-Simbolo/algoritmot-simbolo-color.svg', []),
    sym('mkm', '03-Simbolo/algoritmot-simbolo-una-tinta-azul.svg', [CUR]),
])
RATIO = {'lt': 1200 / 7227, 'lts': 1776 / 7227, 'ltm': 1200 / 7227, 'ltsm': 1776 / 7227, 'mk': 1, 'mkm': 1}


def u(id_, w, style='', label='Algoritmo T'):
    a = f' role="img" aria-label="{label}"' if label else ' aria-hidden="true"'
    h = round(w * RATIO[id_], 2)
    return f'<svg width="{w}" height="{h}" viewBox="0 0 {w} {h}" style="{style}"{a}><use href="#{id_}" width="{w}" height="{h}"/></svg>'


BIN = ' '.join(format(ord(c), '08b') for c in 'ALGORITMO T')
e = html.escape

SWATCHES = [
    ('Azul Algoritmo', '#1A2D5A', '26, 45, 90', '71, 50, 0, 65', '2767 C', 'Fondo principal y texto del logotipo sobre claro.', '#ffffff'),
    ('Dorado T', '#F1BA5B', '241, 186, 91', '0, 23, 62, 5', '142 C', 'Círculo del símbolo. Acento, nunca texto largo.', '#1a2d5a'),
    ('Sombra dorada', '#E9A52F', '233, 165, 47', '0, 29, 80, 9', '7409 C', 'Solo la sombra larga del símbolo.', '#1a2d5a'),
    ('Blanco T', '#F8FFFB', '248, 255, 251', '3, 0, 2, 0', 'Blanco', 'La T y el texto sobre azul.', '#1a2d5a'),
    ('Papel', '#F7F4EE', '247, 244, 238', '0, 1, 4, 3', 'Warm Gray 1 C (aclarado)', 'Fondo claro de documentos y propuestas.', '#1a2d5a'),
    ('Cian binario', '#4FD0EC', '79, 208, 236', '67, 12, 0, 7', '305 C', 'Código binario y animación. Detalle, no base.', '#1a2d5a'),
]


def swatches():
    out = ''
    for name, hx, rgb, cmyk, pms, use, ink in SWATCHES:
        out += (f'<figure class="panel sw"><button type="button" class="sw-chip" style="background:{hx};color:{ink}" data-hex="{hx}" data-rgb="rgb({rgb})" data-cmyk="cmyk({cmyk})" aria-label="Copiar {name}">'
                f'<span>{hx}</span><small>Copiar</small></button><figcaption><b>{name}</b><dl><dt>RGB</dt><dd>{rgb.replace(",", " ·")}</dd><dt>CMYK</dt><dd>{cmyk.replace(",", " ·")}</dd>'
                f'<dt>Pantone</dt><dd>{pms}</dd></dl><p>{use}</p></figcaption></figure>')
    return out


MISUSE = [
    ('Deformar', u('lt', 150, 'transform:scale(1.35,.7)')),
    ('Cambiar colores', u('lt', 150, 'filter:hue-rotate(150deg)')),
    ('Rotar', u('lt', 150, 'transform:rotate(-12deg)')),
    ('Añadir sombras o efectos', u('lt', 150, 'filter:drop-shadow(4px 5px 0 rgba(0,0,0,.45))')),
    ('Sacar el símbolo de la palabra', '<div class="mis-split"><span class="mono">ALGORITMO</span>' + u('mk', 26) + '</div>'),
    ('Poner sobre fondos sin contraste', '<div class="mis-low">' + u('lt', 150, '--l:#2a3f73') + '</div>'),
]


def misuse():
    return ''.join(f'<figure class="mis"><div class="mis-box">{svg}<span class="mis-x" aria-hidden="true">×</span></div><figcaption>{t}</figcaption></figure>' for t, svg in MISUSE)


# nombre, imagen, etiqueta, descripción, marcación, medidas, archivo, uso
PHYS = [
    ('Camiseta', 'm-camiseta', 'Kit de bienvenida', 'Algodón peinado azul de marca con el símbolo a color en el pecho izquierdo.',
     'Serigrafía a 4 tintas o transfer DTF. En la espalda, opcional, el logotipo a una tinta blanco de 24 cm.', 'Símbolo de 8 cm de diámetro, a 9 cm del cuello.',
     '03-Simbolo / algoritmot-simbolo-color.svg', 'Kit de bienvenida y eventos.'),
    ('Taza', 'm-taza', 'Oficina', 'Cerámica azul oscuro con el símbolo a color al frente.',
     'Sublimación con base blanca en la zona del logo o calcomanía cerámica horneada.', 'Taza de 11 oz; símbolo de 5 cm, centrado frente al asa.',
     '03-Simbolo / algoritmot-simbolo-color.svg', 'Oficina y regalo a clientes.'),
    ('Tote bag', 'm-tote', 'Eventos', 'Lona cruda con el logotipo con eslogan, que conserva el ancho del nombre.',
     'Serigrafía a 4 tintas sobre lona natural de 12 oz.', 'Bolsa de 38 × 42 cm; logotipo de 22 cm de ancho.',
     '01-Logotipo-con-eslogan / …-color-fondo-claro.svg', 'Congresos y ferias educativas.'),
    ('Libreta', 'm-libreta', 'Talleres', 'Tapa dura azul con el símbolo estampado en dorado y el código binario al pie.',
     'Hot stamping dorado para el símbolo; el código en serigrafía cian a una tinta.', 'A5, 96 hojas punteadas; símbolo de 4 cm.',
     '03-Simbolo / algoritmot-simbolo-una-tinta-azul.svg (en dorado)', 'Talleres y sesiones de diagnóstico.'),
    ('Gorra', 'm-gorra', 'Equipo', 'Gabardina azul de seis paneles con el símbolo bordado al frente.',
     'Bordado plano en dorado, blanco y gris; la sombra larga se resuelve con dos tonos de dorado.', 'Símbolo de 5,5 cm de diámetro.',
     '03-Simbolo / algoritmot-simbolo-color.svg', 'Equipo de campo y eventos al aire libre.'),
    ('Termo', 'm-termo', 'Kit de bienvenida', 'Acero inoxidable color crudo con el logotipo a una tinta azul en vertical.',
     'Grabado láser o impresión UV a una tinta.', 'Termo de 500 ml; logotipo de 11 cm de largo, leído de abajo hacia arriba.',
     '02-Logotipo-sin-eslogan / …-una-tinta-azul.svg', 'Kit de bienvenida y regalo a clientes.'),
    ('Escarapela y cinta', 'm-escarapela', 'Eventos', 'Cinta azul de marca y tarjeta blanca con logotipo, nombre y cargo.',
     'Cinta sublimada de 2 cm con el nombre en blanco; tarjeta en PVC impresa a color.', 'Tarjeta de 86 × 54 mm, horizontal.',
     '02-Logotipo-sin-eslogan / …-color-fondo-claro.svg', 'Eventos y visitas a cliente.'),
    ('Stickers', 'm-stickers', 'Regalo', 'Tres troqueles: el símbolo redondo, el logotipo en píldora y el código «01010100 = T».',
     'Vinilo blanco troquelado con laminado mate, resistente al agua.', 'Entre 5 y 8 cm de ancho.',
     '03-Simbolo y 02-Logotipo-sin-eslogan', 'Portátiles y regalos en eventos.'),
    ('Pin', 'm-pines', 'Reconocimiento', 'Pin esmaltado con el símbolo a color y borde dorado.',
     'Esmalte suave sobre metal dorado, con broche de mariposa.', '2,5 cm de diámetro.',
     '03-Simbolo / algoritmot-simbolo-color.svg', 'Reconocimientos internos y aliados.'),
]


def phys():
    out = ''
    for name, img, tag, what, how, size, file, use in PHYS:
        src = f'{IMG}{img}.jpg'
        out += (f'<button type="button" class="panel merch" data-img="{src}" data-name="{e(name)}" data-tag="{e(tag)}" data-what="{e(what)}" data-how="{e(how)}" data-size="{e(size)}" data-file="{e(file)}" data-use="{e(use)}">'
                f'<span class="merch-img{" tall" if img in ("m-libreta", "m-termo") else ""}"><img src="{src}" alt="{e(name)}: {e(what)}" width="900" height="675" loading="lazy"></span>'
                f'<span class="merch-txt"><span class="tag">{tag}</span><h4>{name}</h4><p>{what}</p></span></button>')
    return out


F11 = '11-Pendones-avisos-POP / '
POP = {
    'PEND': [
        ('Pendón enrollable', 'p-rollup', 'Eventos', 'Tres pendones: Empresas, institucional y Educación. El logotipo va arriba, a la altura de los ojos, y el contacto termina antes del casete.',
         'Lona banner mate o polipropileno de 280 g en estructura de aluminio con maletín.', '85 × 200 cm. Los 15 cm inferiores quedan dentro del casete: allí no va texto.',
         F11 + '01-Pendones / pendon-roll-up-…-85x200cm.pdf', 'Ferias, auditorios y recepciones de eventos.'),
        ('Backing', 'p-backing', 'Eventos', 'Fondo para fotos y entrevistas con el logotipo y el símbolo en patrón alterno: la marca aparece en cualquier encuadre.',
         'Lona banner mate tensada en estructura tubular, o tela sublimada. Mate, para que el flash no la queme.', '300 × 225 cm. Logotipo de 52 cm, repetido cada 76 cm.',
         F11 + '01-Pendones / backing-300x225cm.pdf', 'Lanzamientos, grados, entrevistas y fotos de grupo.'),
    ],
    'AVI': [
        ('Aviso de fachada', 'p-fachada', 'Sede', 'Panel azul de marca con el logotipo sin eslogan: letras blancas y el símbolo a color.',
         'Panel de aluminio compuesto azul, letras de acrílico blanco en relieve e iluminación LED frontal cálida.', '300 × 70 cm; logotipo de 230 cm. Se escala conservando la proporción y 35 cm de aire a cada lado.',
         F11 + '02-Avisos / aviso-fachada-300x70cm.pdf', 'Entrada principal de la sede.'),
        ('Aviso de recepción', 'p-recepcion', 'Sede', 'Logotipo con eslogan en letras corpóreas sobre pared clara, detrás del mostrador.',
         'Letras en PVC espumado de 10 mm pintado en azul de marca y símbolo en acrílico impreso, separadas 1 cm de la pared para que proyecten sombra.', '180 cm de ancho por 44 cm de alto, centrado a 160 cm del piso.',
         F11 + '02-Avisos / aviso-recepcion-plano-180cm.pdf', 'Recepción y salas de reuniones.'),
        ('Aviso bandera', 'p-bandera', 'Sede', 'El símbolo solo, en un aviso redondo de doble cara, perpendicular a la fachada.',
         'Caja de luz redonda de doble cara en acrílico, con aro y brazo en azul oscuro.', '60 cm de diámetro, a la altura que permita la norma local de publicidad exterior.',
         F11 + '02-Avisos / aviso-bandera-60cm.pdf', 'Ubicar la sede desde la calle.'),
        ('Señalética', 'p-placas', 'Interiores', 'Placa azul con filete dorado, el símbolo, el nombre del espacio y su inicial en binario, fijada con separadores metálicos.',
         'Acrílico de 5 mm con impresión UV por el reverso, fijado con cuatro separadores de acero.', '30 × 12 cm, a 150 cm del piso, del lado de la manija.',
         F11 + '02-Avisos / senaletica-placas-30x12cm.pdf', 'Puertas de salas, oficinas y aulas.'),
    ],
    'MAT': [
        ('Afiche', 'p-afiche', 'Convocatoria', 'Plantilla para charlas y talleres: rótulo, título, fecha y lugar, con el símbolo grande en la esquina.',
         'Propalcote de 150 g a cuatro tintas, acabado mate.', '50 × 70 cm.',
         F11 + '03-Material-POP / afiche-50x70cm.pdf', 'Carteleras de universidades, empresas y eventos.'),
        ('Volante', 'p-volante', 'Mano a mano', 'Media carta a dos caras: la idea de marca al frente; al respaldo, las dos líneas de servicio y el contacto.',
         'Propalcote de 150 g, cuatro tintas por ambas caras.', '14 × 21,6 cm.',
         F11 + '03-Material-POP / volante-media-carta-14x21-6cm.pdf', 'Ferias, visitas comerciales y kits de evento.'),
        ('Hablador de mesa', 'p-hablador', 'Punto de contacto', 'Una invitación a conversar y un código QR que lleva al sitio.',
         'Propalcote de 200 g inserto en un exhibidor de acrílico vertical.', '10 × 21 cm.',
         F11 + '03-Material-POP / hablador-de-mesa-10x21cm.pdf', 'Mesas de reunión, mostradores y stands.'),
        ('Mostrador', 'p-mostrador', 'Stand', 'Frente del mostrador de feria con el símbolo y el logotipo con eslogan sobre azul de marca.',
         'Vinilo adhesivo con laminado mate sobre el frente del mostrador, o panel impreso encajado en el marco.', '200 × 90 cm; se ajusta al ancho del mueble conservando la proporción del logotipo.',
         F11 + '03-Material-POP / mostrador-frente-200x90cm.pdf', 'Stands de feria y puntos de registro.'),
    ],
}


def pop(key):
    out = ''
    for name, img, tag, what, how, size, file, use in POP[key]:
        src = f'{IMG}{img}.jpg'
        out += (f'<button type="button" class="panel merch" data-img="{src}" data-name="{e(name)}" data-tag="{e(tag)}" data-what="{e(what)}" data-howk="Producción" data-how="{e(how)}" data-size="{e(size)}" data-file="{e(file)}" data-use="{e(use)}">'
                f'<span class="merch-img"><img src="{src}" alt="{e(name)}: {e(what)}" width="900" height="675" loading="lazy"></span>'
                f'<span class="merch-txt"><span class="tag">{tag}</span><h4>{name}</h4><p>{what}</p></span></button>')
    return out


EMO = ''.join(f'<figure><img src="{IMG}e-{k}.png" alt="" width="128" height="128">:{k}:</figure>' for k in ('algoritmo-t', 'listo', 'sentido-humano', 'en-binario'))
DIGI = [
    ('Fondo de videollamada', f'<span class="merch-img"><img src="{IMG}d-videollamada.jpg" alt="Fondo azul con textura de código y el logotipo arriba a la derecha" width="900" height="506" loading="lazy"></span>', '1920 × 1080',
     'Oscuro y claro. El logotipo va a la derecha y el centro queda libre para la persona.'),
    ('LinkedIn', f'<span class="merch-img fit"><img src="{IMG}d-linkedin.jpg" alt="Portada de la página de empresa en LinkedIn" width="1128" height="191" loading="lazy"></span>', '4512 × 764 · 3168 × 792 · 1200 × 1200',
     'Portada de página de empresa, portada de perfil personal y logo, en alta resolución para que LinkedIn no los pixele.'),
    ('Publicaciones', f'<span class="merch-img"><img src="{IMG}d-post.jpg" alt="Post de ejemplo" width="700" height="700" loading="lazy"></span>', '1080 × 1080 · 1080 × 1920',
     'Bases sin texto para post e historia, con un ejemplo de cada una.'),
    ('Fondo de pantalla móvil', f'<span class="merch-img tall"><img src="{IMG}d-movil.jpg" alt="Fondo de pantalla con el símbolo y el eslogan" width="420" height="910" loading="lazy"></span>', '1290 × 2796',
     'Símbolo al centro; el tercio superior queda libre para el reloj.'),
    ('Emojis', f'<span class="merch-img"><span class="emo-row">{EMO}</span></span>', '128 × 128',
     'Cuatro emojis con fondo transparente para Slack y Teams.'),
    ('Avatar animado', f'<span class="merch-img fit"><img src="{IMG}algoritmot-animado-simbolo-fondo-oscuro.gif" alt="El símbolo se descifra desde ceros y unos" width="480" height="480" loading="lazy" style="border-radius:50%;padding:0;width:auto;height:86%"></span>', 'GIF · MP4 · WebM',
     'El símbolo se descifra desde binarios. Sirve de avatar, loader y cierre corto de video.'),
    ('Firma de correo', '<span class="merch-img"><span style="background:#fff;border-radius:8px;padding:16px;display:flex;gap:12px;align-items:flex-start;box-shadow:0 12px 24px -16px rgba(10,20,45,.6);color:#5a6479;font-size:11px;line-height:1.5">'
     + u('mk', 40, label='') + '<span><b style="display:block;font:700 13px/1.2 var(--f-display);color:#1a2d5a">Nombre Apellido</b>Cargo · Algoritmo T<br><span class="mono" style="font-size:10px;color:#0b7a96">hola@algoritmot.com</span><br><em style="color:#94620c;font-size:10px">Soluciones digitales con sentido humano</em></span></span></span>',
     'HTML', 'Para copiar y pegar en Gmail, Outlook y Apple Mail.'),
    ('Plantilla de presentación', '<span class="merch-img"><span class="sld" style="width:76%"><span class="k">Propuesta · 2026</span><b>Transformación digital con enfoque humano</b><span class="f">'
     + u('lt', 54, '--l:#ffffff', label='') + '<span>01</span></span></span></span>', 'PPTX 16:9', 'Cinco láminas base: portada, sección, contenido, cifra y cierre.'),
]


def digi():
    return ''.join(f'<article class="panel merch">{mock}<span class="merch-txt"><span class="tag">{tag}</span><h4>{name}</h4><p>{what}</p></span></article>' for name, mock, tag, what in DIGI)


T = open(os.path.join(HERE, 'template.html')).read()
T = (T.replace('{{SYMBOLS}}', SYMBOLS).replace('{{BIN8}}', (BIN + ' ') * 9).replace('{{BIN}}', BIN)
     .replace('{{SWATCHES}}', swatches()).replace('{{MISUSE}}', misuse()).replace('{{PHYS}}', phys()).replace('{{DIGI}}', digi())
     .replace('{{POP_PEND}}', pop('PEND')).replace('{{POP_AVI}}', pop('AVI')).replace('{{POP_MAT}}', pop('MAT')))
T = re.sub(r'\{\{u:([a-z]+):(\d+):?([^}]*)\}\}', lambda m: u(m.group(1), int(m.group(2)), m.group(3)), T)
if IMG != 'img/':
    T = T.replace('src="img/', f'src="{IMG}')
open(OUT, 'w').write(T)
print('ok', len(T) // 1024, 'KB · pendientes:', re.findall(r'\{\{[^}]+\}\}', T)[:5])
