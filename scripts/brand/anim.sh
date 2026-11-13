#!/bin/bash
# Renderiza las seis variantes del logo animado y exporta GIF, MP4, WebM (transparente) y APNG (transparente).
set -e
cd "$(dirname "$0")"
I="/Users/andrestabla/Documents/website/public/cotizaciones/unisinu-2026/assets/fonts/Inter-500-latin.woff2"
J="/Users/andrestabla/Documents/website/public/cotizaciones/unisinu-2026/assets/fonts/JetBrainsMono-700-latin.woff2"
C="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
export TMPDIR=/Volumes/EAlgoritmoT/Temporales/tmp
DEST="Kit-Logo-AlgoritmoT/05-Animado"
cp -R out out_keep
rm -rf anim && mkdir anim
rm -f "$DEST"/*
for theme in oscuro claro; do for mode in ce se si; do
  S="anim/$theme-$mode"
  python3 anim.py "$I" "$J" $theme $mode "$S" | tail -1
  read N FW FH NP PER < "$S/meta.txt" || true
  for n in $(seq 0 $((NP-1))); do
    "$C" --headless --disable-gpu --hide-scrollbars --default-background-color=00000000 --window-size=$FW,$((PER*FH)) --screenshot="$S/sheet$n.png" "file://$PWD/$S/frames$n.html" >/dev/null 2>&1
  done
  if [ $theme = oscuro ]; then BG="1a2d5a"; BGN="fondo-oscuro"; else BG="ffffff"; BGN="fondo-claro"; fi
  python3 - "$S" $N $FW $FH $NP $PER $BG <<'EOF'
import sys, os
from PIL import Image
S, N, FW, FH, NP, PER, BG = sys.argv[1], *map(int, sys.argv[2:7]), sys.argv[7]
os.makedirs(f'{S}/t', exist_ok=True); os.makedirs(f'{S}/o', exist_ok=True)
i = 0
for n in range(NP):
    im = Image.open(f'{S}/sheet{n}.png').convert('RGBA')
    for k in range(PER):
        if i >= N: break
        fr = im.crop((0, k * FH, FW, k * FH + FH))
        fr.save(f'{S}/t/f{i:03d}.png')
        bg = Image.new('RGBA', fr.size, '#' + BG); bg.alpha_composite(fr); bg.convert('RGB').save(f'{S}/o/f{i:03d}.png')
        i += 1
EOF
  case $mode in ce) NAME="con-eslogan";; se) NAME="sin-eslogan";; si) NAME="simbolo";; esac
  B="$DEST/algoritmot-animado-$NAME"
  HOLD="tpad=stop_mode=clone:stop_duration=2.6"
  ffmpeg -y -loglevel error -framerate 25 -i "$S/o/f%03d.png" -vf "$HOLD,split[a][b];[a]palettegen=max_colors=64:stats_mode=diff[p];[b][p]paletteuse=dither=none:diff_mode=rectangle" -loop 0 "$S/raw.gif"
  gifsicle -O3 "$S/raw.gif" -o "$B-$BGN.gif" 2>/dev/null
  ffmpeg -y -loglevel error -framerate 25 -i "$S/o/f%03d.png" -vf "$HOLD,format=yuv420p" -c:v libx264 -crf 18 -movflags +faststart "$B-$BGN.mp4"
  ffmpeg -y -loglevel error -framerate 25 -i "$S/t/f%03d.png" -vf "$HOLD,format=yuva420p" -c:v libvpx-vp9 -b:v 0 -crf 30 -auto-alt-ref 0 "$B-transparente-para-$BGN.webm"
  ffmpeg -y -loglevel error -framerate 25 -i "$S/t/f%03d.png" -vf "$HOLD" -plays 0 -f apng "$B-transparente-para-$BGN.apng"
done; done
rm -rf out && mv out_keep out
ls -la "$DEST" | awk 'NR>3{print $5, $9}'
