"""Portada del capítulo 13: backing y mostrador montados en la foto de un stand de feria."""
import os
import cv2, numpy as np
import montaje as M
from componer_util import frac

KIT = '/Users/andrestabla/Documents/website/public/assets/brand'
b = M.FOTO('stand'); H, W = b.shape[:2]
S = 1500.0
px = lambda pts: np.float32([[x / S * W, y / S * W] for x, y in pts])      # coordenadas leídas sobre la vista de 1500 px

# pared del fondo
wall = px([(252, 83), (935, 166), (935, 622), (252, 665)])
r = M.montar(b, M.ART('backing-300x225cm'), wall, blur=8, feather=1.5, ref=80, lo=0.6, hi=1.08)

# lo que está delante de la pared vuelve a quedar encima: sillas y mostrador
hsv = cv2.cvtColor(b, cv2.COLOR_BGR2HSV).astype(np.float32); g = cv2.cvtColor(b, cv2.COLOR_BGR2GRAY).astype(np.float32)
zona = np.zeros((H, W), np.uint8); cv2.fillPoly(zona, [np.int32(px([(690, 452), (935, 452), (935, 640), (690, 700)]))], 1)
gs = cv2.GaussianBlur(g, (0, 0), 4); ref = np.median(gs[:, int(640 / S * W):int(685 / S * W)], axis=1)[:, None]      # la pared, fila a fila, justo a la izquierda
sat = hsv[..., 1]
occ = (((gs > ref + 10) | (gs < ref - 30) | (sat > 45)) & (zona > 0)).astype(np.uint8)
k = int(9 / S * W) | 1
occ = cv2.morphologyEx(occ, cv2.MORPH_CLOSE, np.ones((k * 3, k * 3), np.uint8)); occ = cv2.morphologyEx(occ, cv2.MORPH_OPEN, np.ones((k, k), np.uint8))
cv2.fillPoly(occ, [np.int32(px([(780, 497), (1110, 488), (1110, 700), (860, 740), (780, 715)]))], 1)       # mostrador
occ = cv2.GaussianBlur(occ.astype(np.float32), (0, 0), 1.5)[..., None]
r = np.clip(r * (1 - occ) + b * occ, 0, 255).astype(np.uint8)

# frente del mostrador: símbolo y logotipo sobre azul
art = np.zeros((860, 1000, 4), np.uint8); art[...] = (90, 45, 26, 255)
def pega(dst, path, w, cx, cy):
    im = cv2.imread(os.path.join(KIT, path), cv2.IMREAD_UNCHANGED); im = cv2.resize(im, (w, int(im.shape[0] * w / im.shape[1])), interpolation=cv2.INTER_AREA)
    x, y = cx - w // 2, cy - im.shape[0] // 2; a = im[..., 3:4] / 255.0
    dst[y:y + im.shape[0], x:x + w, :3] = (dst[y:y + im.shape[0], x:x + w, :3] * (1 - a) + im[..., :3] * a).astype(np.uint8)
pega(art, '03-Simbolo/algoritmot-simbolo-color-1024px.png', 300, 500, 300)
pega(art, '01-Logotipo-con-eslogan/algoritmot-logo-con-eslogan-color-fondo-oscuro-2400px.png', 760, 500, 600)
front = px([(868, 517), (1101, 499), (1101, 688), (866, 730)])
r = M.montar(r, art, front, blur=5, feather=1.5, ref=85, lo=0.6, hi=1.06)
out = cv2.resize(r, (1400, int(H * 1400 / W)), interpolation=cv2.INTER_AREA)
cv2.imwrite(os.path.join(M.HERE, 'img', 'p-stand.jpg'), out, [cv2.IMWRITE_JPEG_QUALITY, 88]); print(out.shape)
