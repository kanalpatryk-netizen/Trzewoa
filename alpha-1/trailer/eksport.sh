#!/usr/bin/env bash
# Eksport filmu: klatki montażu (wyjscie/klatki) + muzyka (wyjscie/muzyka.wav) → trzewia-trailer.mp4
# H.264 High (dwa przebiegi, ~2,3 Mb/s, AQ pod ciemne sceny), 1920×1080, 30 kl/s; AAC 192 kb/s, głośność znormalizowana do −14 LUFS (dwa przebiegi loudnorm).
# Na końcu 2 s czerni, żeby pogłos ostatniego uderzenia wybrzmiał.
set -euo pipefail
cd "$(dirname "$0")"
WY=wyjscie
BITRATE="${BITRATE:-2300k}"
OUT="${1:-trzewia-trailer.mp4}"

# 1) mastering: wstęp (karty na czerni) o kilka dB głośniej, jaśniejsza góra pasma (synteza wychodzi ciemna),
#    potem pomiar głośności i normalizacja liniowa (bez pompowania dynamiki)
PRE="volume=volume='1+0.8*(1-min(1\\,max(0\\,(t-8)/3.2)))':eval=frame,equalizer=f=2800:t=q:w=1.2:g=4,highshelf=f=5000:g=2"
POMIAR=$(ffmpeg -hide_banner -nostats -i "$WY/muzyka.wav" -af "$PRE,loudnorm=I=-14:TP=-2.0:LRA=14:print_format=json" -f null - 2>&1 | sed -n '/^{/,/^}/p')
ARG=$(python3 -c '
import json, sys
m = json.loads(sys.stdin.read())
print("loudnorm=I=-14:TP=-2.0:LRA=14:measured_I={}:measured_TP={}:measured_LRA={}:measured_thresh={}:offset={}:linear=true:print_format=summary".format(
  m["input_i"], m["input_tp"], m["input_lra"], m["input_thresh"], m["target_offset"]))
' <<< "$POMIAR")
ffmpeg -hide_banner -loglevel error -y -i "$WY/muzyka.wav" -af "$PRE,$ARG,alimiter=limit=0.84:attack=2:release=60:level=false,afade=t=out:st=154.0:d=1.6" -ar 48000 "$WY/muzyka-14lufs.wav"

# 2) obraz + dźwięk: H.264 dwuprzebiegowo (kreska ryciny i faktura papieru są gęste jak ziarno — stała jakość
#    dawała ok. 8 Mb/s; ~2,3 Mb/s w dwóch przebiegach wygląda prawie tak samo i mieści się poniżej 50 MB)
WIDEO=(-framerate 30 -i "$WY/klatki/%05d.jpg")
FILTR="tpad=stop_mode=add:stop_duration=2:color=black,format=yuv420p"
X264=(-c:v libx264 -preset slow -tune film -x264-params aq-mode=3:aq-strength=0.9 -b:v "$BITRATE" -maxrate 6M -bufsize 12M
      -profile:v high -level 4.1 -pix_fmt yuv420p)
ffmpeg -hide_banner -loglevel error -y "${WIDEO[@]}" -vf "$FILTR" "${X264[@]}" -pass 1 -passlogfile "$WY/x264" -an -f mp4 /dev/null
ffmpeg -hide_banner -loglevel error -y "${WIDEO[@]}" -i "$WY/muzyka-14lufs.wav" -vf "$FILTR" "${X264[@]}" -pass 2 -passlogfile "$WY/x264" \
  -c:a aac -b:a 192k -ar 48000 -shortest -movflags +faststart \
  -metadata title="Trzewia — trailer (Alpha 1)" "$OUT"
ls -la "$OUT"
