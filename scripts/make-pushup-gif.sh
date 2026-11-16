#!/usr/bin/env bash
set -euo pipefail

# Slice an AI-generated 4x4 chronological pose sheet and play down/up.
sheet_path="${1:?Pass the generated 4x4 pose sheet path}"
output_path="${2:?Pass the GIF output path}"
frames_dir="$(mktemp -d /tmp/pushup-gif-XXXXXX)"
read -r sheet_width sheet_height <<< "$(magick identify -format '%w %h' "$sheet_path")"
cell_width=$((sheet_width / 4))
cell_height=$((sheet_height / 4))
for ((frame=0; frame<16; frame++)); do
  column=$((frame % 4))
  row=$((frame / 4))
  magick "$sheet_path" -crop "${cell_width}x${cell_height}+$((column * cell_width))+$((row * cell_height))" \
    +repage -resize 512x512 "${frames_dir}/frame-${frame}.png"
done

gif_args=()
for ((frame=0; frame<16; frame++)); do
  frame_delay=13
  if ((frame == 0 || frame == 15)); then frame_delay=35; fi
  gif_args+=(-delay "$frame_delay" "${frames_dir}/frame-${frame}.png")
done
for ((frame=14; frame>0; frame--)); do
  gif_args+=(-delay 7 "${frames_dir}/frame-${frame}.png")
done
magick "${gif_args[@]}" -loop 0 -layers Optimize "$output_path"
printf 'Saved GIF: %s\nFrames: %s\n' "$output_path" "$frames_dir"
