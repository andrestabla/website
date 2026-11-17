import numpy as np
def frac(b, pts):
    H, W = b.shape[:2]; return np.float32([[x * W, y * H] for x, y in pts])
