#!/usr/bin/env bash
set -euo pipefail

root_dir="$(cd "$(dirname "$0")/.." && pwd)"
start_page="$root_dir/public/convict-conditioning-pages/page-0090.webp"
low_page="$root_dir/public/convict-conditioning-pages/page-0091.webp"
output_mp4="$root_dir/standard-pushup-preview.mp4"
font_file="/System/Library/Fonts/PingFang.ttc"
tmp_dir="${TMPDIR:-/tmp}/standard-pushup-preview"
mkdir -p "$tmp_dir"

# Crop the two original ebook photos: start position and chest-near-floor position.
magick "$start_page" -crop 610x385+204+386 +repage -resize 560x360! "$tmp_dir/start.png"
magick "$low_page" -crop 610x397+204+119 +repage -resize 560x360! "$tmp_dir/low.png"

magick -size 720x1280 xc:none \
  -font "$font_file" -fill white -pointsize 44 -gravity North -annotate +0+70 '标准俯卧撑' \
  -fill '#9cc7ff' -pointsize 22 -annotate +0+122 'Full Pushups · 原书人物示范' \
  -fill '#9cc7ff' -pointsize 26 -gravity South -annotate +0+125 '下 2 秒  ·  上 1 秒' \
  -fill '#ffd166' -pointsize 25 -annotate +0+75 '核心：身体保持一条直线' \
  "$tmp_dir/title.png"

magick -size 720x1280 xc:none \
  -font "$font_file" -fill '#ffd166' -pointsize 30 -gravity Southwest -annotate +92+405 '↘ 缓慢下降' \
  -fill white -pointsize 34 -gravity South -annotate +0+215 '胸部接近地面' \
  "$tmp_dir/down.png"

magick -size 720x1280 xc:none \
  -font "$font_file" -fill '#8ff0b4' -pointsize 30 -gravity Southeast -annotate +92+405 '↗ 推回起始位' \
  -fill white -pointsize 34 -gravity South -annotate +0+215 '保持身体成一直线' \
  "$tmp_dir/up.png"

ffmpeg -y -loop 1 -i "$tmp_dir/start.png" -loop 1 -i "$tmp_dir/low.png" \
  -loop 1 -i "$tmp_dir/title.png" -loop 1 -i "$tmp_dir/down.png" -loop 1 -i "$tmp_dir/up.png" \
  -t 10 -r 30 -an \
  -filter_complex "
    color=c=0x0b1220:s=720x1280:d=10[bg];
    [0:v]format=rgba,scale=560:-1:flags=lanczos[start];
    [1:v]format=rgba,scale=560:-1:flags=lanczos[low];
    [start][low]blend=all_expr='if(lt(T,5),A*(1-T/5)+B*T/5,B)'[pose];
    [bg][pose]overlay=x=(W-w)/2:y='250+10*sin(2*PI*t/4)':format=auto[scene];
    [scene][2:v]overlay=0:0:format=auto[with_title];
    [with_title][3:v]overlay=0:0:enable='between(t,0,5)':format=auto[with_down];
    [with_down][4:v]overlay=0:0:enable='gte(t,5)':format=auto
  " \
  -c:v libx264 -pix_fmt yuv420p -movflags +faststart "$output_mp4"

echo "$output_mp4"
