# Generadores del logo de Algoritmo T

Scripts con los que se construyó el kit de `public/assets/brand`. Se conservan para poder regenerarlo.

- `build2.py` — geometría del logotipo (tipografía original en trazos, símbolo y eslogan al ancho del nombre).
- `kit.py` — arma las carpetas del kit: SVG, PDF, PNG, JPG, favicon y piezas para redes.
- `anim.py` y `anim.sh` — logo animado (texto que se descifra desde binarios) en GIF, MP4, WebM y APNG.
- `mark-persona.svg` — símbolo: círculo con la T en forma de persona.
- `glyphs.json` — contornos de las letras de JetBrains Mono Bold usadas en el nombre.

Necesitan Python 3 con `fonttools`, `Pillow` y `numpy`, además de `ffmpeg`, `gifsicle` y Google Chrome.
Las rutas de trabajo y de las fuentes (`Inter-500` y `JetBrainsMono-700` en `public/cotizaciones/unisinu-2026/assets/fonts`)
están escritas dentro de `anim.sh`; ajústalas antes de ejecutarlo en otra máquina.
