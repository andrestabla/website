"""Maquetas fotográficas del capítulo 13: cada arte montado sobre la foto real de su soporte."""
import json, os
import cv2, numpy as np
import montaje as M

KIT = '/Users/andrestabla/Documents/website/public/assets/brand'
Q = {k: np.float32(v) for k, v in json.load(open(os.path.join(M.HERE, 'work', 'q.json')))['Q'].items()}
EL = json.load(open(os.path.join(M.HERE, 'work', 'q.json')))['el']
A = M.ART


def frac(b, pts):
    H, W = b.shape[:2]; return np.float32([[x * W, y * H] for x, y in pts])


def panel(im, cx, w_frac, out=(400, 900)):
    """Recorte vertical centrado en cx (fracción), a toda la altura."""
    H, W = im.shape[:2]; w = int(H * out[0] / out[1]); x = int(np.clip(cx * W - w / 2, 0, W - w))
    return cv2.resize(im[:, x:x + w], out, interpolation=cv2.INTER_AREA)


def salvar(im, name, q=88):
    cv2.imwrite(os.path.join(M.HERE, 'img', name + '.jpg'), im, [cv2.IMWRITE_JPEG_QUALITY, q]); print(name, im.shape[1], im.shape[0])


os.makedirs(os.path.join(M.HERE, 'img'), exist_ok=True)

# ── pendones: tres fotos en tríptico ──
f = M.FOTO('rollup-feria'); l = M.FOTO('rollup-lobby')
p1 = M.montar(f, A('pendon-roll-up-empresas-85x200cm'), Q['rollup-feria'], blur=4, feather=1.2)
p2 = M.montar(l, A('pendon-roll-up-institucional-85x200cm'), Q['rollup-lobby'], blur=5, feather=1.5)
ff = cv2.flip(f, 1); W = f.shape[1]; qf = Q['rollup-feria'].copy(); qf[:, 0] = W - qf[:, 0]; qf = M.ordenar(qf)
p3 = M.montar(ff, A('pendon-roll-up-educacion-85x200cm'), qf, blur=4, feather=1.2)
sep = np.full((900, 6, 3), 255, np.uint8)
tri = np.hstack([panel(p1, .5, 0, (396, 900)), sep, panel(p2, .505, 0, (396, 900)), sep, panel(p3, .5, 0, (396, 900))])
salvar(tri, 'p-rollup')

# ── backing ──
b = M.FOTO('backing'); r = M.montar(b, A('backing-300x225cm'), Q['backing'], blur=6, feather=1.5, hi=1.05)
M.guardar(r, 'p-backing', (0.06, 0, 0.94, 1)); print('p-backing')

# ── fachada ──
b = M.FOTO('fachada'); r = M.montar(b, A('aviso-fachada-300x70cm'), Q['fachada'], blur=4, feather=1.5, hi=1.06)
M.guardar(r, 'p-fachada', (0.05, 0.02, 0.95, 0.92)); print('p-fachada')

# ── recepción: letras corpóreas con su sombra sobre la pared ──
b = M.FOTO('recepcion'); H, W = b.shape[:2]
lg = cv2.imread(os.path.join(KIT, '01-Logotipo-con-eslogan/algoritmot-logo-con-eslogan-color-fondo-claro-2400px.png'), cv2.IMREAD_UNCHANGED)
w = int(W * 0.40); lg = cv2.resize(lg, (w, int(lg.shape[0] * w / lg.shape[1])), interpolation=cv2.INTER_CUBIC); h = lg.shape[0]
x, y = (W - w) // 2, int(H * 0.235)
sh = np.zeros((H, W), np.float32); sh[y + 34:y + 34 + h, x + 10:x + 10 + w] = lg[..., 3] / 255.0
sh = cv2.GaussianBlur(sh, (0, 0), 16) * 0.42
r = b.astype(np.float32) * (1 - sh[..., None] * 0.9)
quad = np.float32([[x, y], [x + w, y], [x + w, y + h], [x, y + h]])
r = M.montar(np.clip(r, 0, 255).astype(np.uint8), lg, quad, blur=30, feather=1.0, ref=60, lo=0.8, hi=1.1, tint=False)
M.guardar(r, 'p-recepcion', (0.08, 0.03, 0.92, 0.97)); print('p-recepcion')

# ── bandera: el símbolo sobre la cara elíptica del aviso ──
b = M.FOTO('bandera'); H, W = b.shape[:2]
(cx, cy), (d1, d2), ang = EL; a_, b_ = d1 / 2 * 0.985, d2 / 2 * 0.985; t = np.deg2rad(ang)
R = np.array([[np.cos(t), -np.sin(t)], [np.sin(t), np.cos(t)]]); D = np.diag([a_, b_])
up = np.array([-0.04, 1.0]); up /= np.linalg.norm(up)                    # vertical del aviso en la foto
v = np.diag([1 / a_, 1 / b_]) @ R.T @ up; v /= np.linalg.norm(v)
Qr = np.array([[v[1], v[0]], [-v[0], v[1]]])                            # rotación que lleva (0,1) a v
T = R @ D @ Qr
mk = A('aviso-bandera-60cm'); s = mk.shape[0] / 2
Aff = np.hstack([T / s, (np.array([cx, cy]) - T @ np.array([1, 1]))[:, None]]).astype(np.float32)
mkp = mk.astype(np.float32); mkp[..., :3] *= mkp[..., 3:4] / 255
wp = cv2.warpAffine(mkp, Aff, (W, H), flags=cv2.INTER_AREA)
m = cv2.GaussianBlur(wp[..., 3] / 255, (0, 0), 2.0)
full = (m > 0.5).astype(np.float32); sl, _ = M.luz(b, full, 8, 90, 0.6, 1.08)
col = wp[..., :3] / np.maximum(wp[..., 3:4] / 255, 1e-3) * sl[..., None]
r = np.clip(b * (1 - m[..., None]) + col * m[..., None], 0, 255).astype(np.uint8)
M.guardar(r, 'p-bandera', (0.04, 0.02, 0.92, 0.98)); print('p-bandera')

# ── placa: acrílico azul con los separadores metálicos de la foto ──
b = M.FOTO('placa'); H, W = b.shape[:2]
quad = frac(b, [(0.198, 0.312), (0.789, 0.312), (0.789, 0.688), (0.198, 0.688)])
r = M.montar(b, A('senaletica-placas-30x12cm-1'), quad, blur=10, feather=1.5, ref=70, lo=0.85, hi=1.12, tint=False)
g = cv2.cvtColor(b, cv2.COLOR_BGR2GRAY); tor = np.zeros((H, W), np.float32)
for fx, fy in [(0.217, 0.341), (0.771, 0.341), (0.214, 0.662), (0.772, 0.662)]:
    cv2.circle(tor, (int(fx * W), int(fy * H)), 78, 1.0, -1)
tor = cv2.GaussianBlur(tor * (g < 150), (0, 0), 3)[..., None]
r = np.clip(r * (1 - tor) + b * tor, 0, 255).astype(np.uint8)
M.guardar(r, 'p-placas', (0.06, 0.04, 0.94, 0.96)); print('p-placas')

# ── afiche: dentro del marco, bajo el vidrio ──
b = M.FOTO('afiche'); r = M.montar(b, A('afiche-50x70cm'), Q['afiche'], blur=12, feather=1.2, ref=60, lo=0.75, hi=1.2, tint=False)
M.guardar(r, 'p-afiche', (0.24, 0, 1, 1)); print('p-afiche')

# ── volante: en la mano, con el pulgar por delante ──
b = M.FOTO('volante'); q = Q['volante'].copy(); q[3] = [q[0][0] + 6, q[2][1]]
art = A('volante-media-carta-14x21-6cm-1'); ah, aw = art.shape[:2]
qw = np.linalg.norm(q[1] - q[0]); qh = np.linalg.norm(q[3] - q[0]); keep = int(aw * qh / qw); y0 = (ah - keep) // 2
if keep < ah: art = art[y0:y0 + keep]
r = M.montar(b, art, q, blur=2, feather=1.5, ref=90, lo=0.6, hi=1.08)
hsv = cv2.cvtColor(b, cv2.COLOR_BGR2HSV); H, W = b.shape[:2]
piel = ((hsv[..., 1] > 38) | (hsv[..., 2] < 150)).astype(np.uint8)
zona = np.zeros((H, W), np.uint8); zona[int(0.56 * H):int(0.78 * H), int(0.38 * W):int(0.475 * W)] = 1
piel = cv2.morphologyEx(piel * zona, cv2.MORPH_CLOSE, np.ones((41, 41), np.uint8)).astype(np.float32)
piel = cv2.GaussianBlur(piel, (0, 0), 3)[..., None]
r = np.clip(r * (1 - piel) + b * piel, 0, 255).astype(np.uint8)
M.guardar(r, 'p-volante', (0.10, 0, 0.93, 0.93)); print('p-volante')

# ── hablador: en su exhibidor de acrílico ──
b = M.FOTO('hablador'); q = frac(b, [(0.244, 0.142), (0.441, 0.138), (0.445, 0.716), (0.252, 0.736)])
r = M.montar(b, A('hablador-de-mesa-10x21cm'), q, blur=6, feather=2.0, ref=85, lo=0.6, hi=1.06)
M.guardar(r, 'p-hablador', (0, 0, 0.86, 1)); print('p-hablador', (q / [b.shape[1], b.shape[0]]).round(3).tolist())

# ── mostrador: tarjeta y portada del capítulo ──
b = M.FOTO('mostrador'); r = M.montar(b, A('mostrador-frente-200x90cm'), Q['mostrador'], blur=6, feather=2.0, ref=85, lo=0.55, hi=1.08)
M.guardar(r, 'p-mostrador', (0.14, 0.22, 0.96, 1)); print('p-mostrador')
H, W = r.shape[:2]; hero = r[int(0.10 * H):int(0.10 * H) + int(W * 9 / 16)]
salvar(cv2.resize(hero, (1400, 788), interpolation=cv2.INTER_AREA), 'p-stand')
