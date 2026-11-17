"""Monta un arte sobre una fotografía real: perspectiva, luz y grano de la foto.
Los soportes de las fotos están en blanco; el arte se deforma al cuadrilátero del soporte y se
multiplica por la luz que la foto tiene en ese sitio (sombras, pliegues, degradados, reflejos).
"""
import os
import cv2
import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
ART = lambda n: cv2.imread(os.path.join(HERE, 'art', n + '.png'), cv2.IMREAD_UNCHANGED)
FOTO = lambda n: cv2.imread(os.path.join(HERE, 'orig', n + '.jpg'), cv2.IMREAD_COLOR)


def rgba(im):
    if im.shape[2] == 3:
        im = np.dstack([im, np.full(im.shape[:2], 255, np.uint8)])
    return im


def luz(base, mask, blur=3, ref=92, lo=0.25, hi=1.12, gain=1.0):
    """Mapa de luz de la foto dentro del soporte, normalizado a su blanco (percentil `ref`)."""
    L = cv2.cvtColor(base, cv2.COLOR_BGR2GRAY).astype(np.float32)
    if blur:
        L = cv2.GaussianBlur(L, (0, 0), blur)
    inside = L[mask > 0.5]
    r = np.percentile(inside, ref) if inside.size else 255.0
    return np.clip(1 + (L / max(r, 1) - 1) * gain, lo, hi), r


def montar(base, art, quad, blur=3, gain=1.0, ref=92, feather=1.0, tint=True, lo=0.25, hi=1.12, mate=0.0, opacity=1.0):
    """quad: 4 puntos (x, y) en píxeles de la foto, en orden sup-izq, sup-der, inf-der, inf-izq."""
    H, W = base.shape[:2]
    art = rgba(art)
    q = np.float32(quad)
    # reducir el arte cerca del tamaño final antes de deformar, para que no haga aliasing
    tw = int(max(np.linalg.norm(q[1] - q[0]), np.linalg.norm(q[2] - q[3])) * 1.6)
    if tw < art.shape[1]:
        art = cv2.resize(art, (tw, int(art.shape[0] * tw / art.shape[1])), interpolation=cv2.INTER_AREA)
    h, w = art.shape[:2]
    M = cv2.getPerspectiveTransform(np.float32([[0, 0], [w, 0], [w, h], [0, h]]), q)
    a = art.astype(np.float32); a[..., :3] *= a[..., 3:4] / 255.0          # premultiplicado
    wp = cv2.warpPerspective(a, M, (W, H), flags=cv2.INTER_LINEAR, borderMode=cv2.BORDER_CONSTANT, borderValue=0)
    m = wp[..., 3] / 255.0
    if feather:
        m = cv2.GaussianBlur(m, (0, 0), feather)
    full = np.zeros((H, W), np.float32); cv2.fillConvexPoly(full, np.int32(q), 1.0)
    s, r = luz(base, full, blur, ref, lo, hi, gain)
    col = wp[..., :3] / np.maximum(wp[..., 3:4] / 255.0, 1e-3)
    if mate:                                                               # tinta mate: los negros no llegan a cero
        col = col * (1 - mate) + 255 * mate * 0.35
    if tint:                                                               # dominante de color de la luz del lugar
        px = base[full > 0.5].astype(np.float32); br = px[px.mean(1) > np.percentile(px.mean(1), 80)]
        if len(br):
            t = br.mean(0); col = col * (t / max(t.max(), 1))[None, None, :]
    out = col * s[..., None]
    m3 = (m * opacity)[..., None]
    res = base.astype(np.float32) * (1 - m3) + out * m3
    return np.clip(res, 0, 255).astype(np.uint8)


def grano(im, amount=2.0, seed=7):
    n = np.random.default_rng(seed).normal(0, amount, im.shape[:2]).astype(np.float32)
    return np.clip(im.astype(np.float32) + n[..., None], 0, 255).astype(np.uint8)


def guardar(im, name, box=None, width=1200, ratio=4 / 3, q=88):
    """Recorta (box en fracciones x0, y0, x1, y1) a 4:3 centrado y guarda en img/."""
    H, W = im.shape[:2]
    if box:
        im = im[int(box[1] * H):int(box[3] * H), int(box[0] * W):int(box[2] * W)]
        H, W = im.shape[:2]
    if W / H > ratio:
        nw = int(H * ratio); x = (W - nw) // 2; im = im[:, x:x + nw]
    else:
        nh = int(W / ratio); y = (H - nh) // 2; im = im[y:y + nh]
    im = cv2.resize(im, (width, int(round(width / ratio))), interpolation=cv2.INTER_AREA)
    os.makedirs(os.path.join(HERE, 'img'), exist_ok=True)
    cv2.imwrite(os.path.join(HERE, 'img', name + '.jpg'), im, [cv2.IMWRITE_JPEG_QUALITY, q])
    return im.shape


def blanco(base, thr=235, sat=28, minarea=0.01):
    """Ayuda para ubicar el soporte: devuelve los cuadriláteros de las zonas blancas grandes."""
    hsv = cv2.cvtColor(base, cv2.COLOR_BGR2HSV)
    m = ((hsv[..., 2] >= thr) & (hsv[..., 1] <= sat)).astype(np.uint8) * 255
    m = cv2.morphologyEx(m, cv2.MORPH_OPEN, np.ones((5, 5), np.uint8))
    cs, _ = cv2.findContours(m, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    out = []
    for c in sorted(cs, key=cv2.contourArea, reverse=True)[:6]:
        if cv2.contourArea(c) < minarea * base.shape[0] * base.shape[1]:
            break
        ap = cv2.approxPolyDP(c, 0.02 * cv2.arcLength(c, True), True).reshape(-1, 2)
        out.append((int(cv2.contourArea(c)), ap.tolist()))
    return out


def ordenar(p):
    p = np.float32(p); c = p.mean(0)
    ang = np.arctan2(p[:, 1] - c[1], p[:, 0] - c[0])
    p = p[np.argsort(ang)]                                  # sentido horario desde arriba-izquierda
    i = np.argmin(p.sum(1)); return np.roll(p, -i, axis=0)


def componente(base, roi, modo='blanco'):
    H, W = base.shape[:2]
    x0, y0, x1, y1 = int(roi[0] * W), int(roi[1] * H), int(roi[2] * W), int(roi[3] * H)
    reg = base[y0:y1, x0:x1]
    if modo == 'azul':
        hsv = cv2.cvtColor(reg, cv2.COLOR_BGR2HSV)
        m = ((hsv[..., 0] > 90) & (hsv[..., 0] < 125) & (hsv[..., 1] > 90)).astype(np.uint8) * 255
    else:
        g = cv2.GaussianBlur(cv2.cvtColor(reg, cv2.COLOR_BGR2GRAY), (0, 0), 3)
        _, m = cv2.threshold(g, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
    k = max(5, int(min(reg.shape[:2]) * 0.012)) | 1
    m = cv2.morphologyEx(m, cv2.MORPH_OPEN, np.ones((k, k), np.uint8))
    n, lab, st, _ = cv2.connectedComponentsWithStats(m)
    cy, cx = reg.shape[0] // 2, reg.shape[1] // 2
    i = lab[cy, cx] if lab[cy, cx] else 1 + int(np.argmax(st[1:, cv2.CC_STAT_AREA]))
    c = max(cv2.findContours((lab == i).astype(np.uint8), cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_NONE)[0], key=cv2.contourArea)
    return c + np.array([[x0, y0]]), (lab == i), (x0, y0)


def cuad(base, roi, modo='blanco'):
    c, _, _ = componente(base, roi, modo)
    hull = cv2.convexHull(c); e = 0.005
    while True:
        ap = cv2.approxPolyDP(hull, e * cv2.arcLength(hull, True), True)
        if len(ap) <= 4: break
        e *= 1.3
    return ordenar(ap.reshape(-1, 2)) if len(ap) == 4 else ordenar(cv2.boxPoints(cv2.minAreaRect(hull)))


def elipse(base, roi):
    c, _, _ = componente(base, roi)
    return cv2.fitEllipse(c)
