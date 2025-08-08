#!/bin/bash
# normalize_all_mp3.sh
# Normalizes all MP3 files in the current directory using ffmpeg's loudnorm filter.

TARGET_LUFS=-16
TP_CEIL=-1.5
LRA=11

for f in *.mp3; do
    [ -e "$f" ] || continue  # skip if no .mp3 files
    base="${f%.mp3}"
    echo "Processing: $f"

    # Convert to WAV, normalize, then back to MP3
    ffmpeg -y -i "$f" -af loudnorm=I=$TARGET_LUFS:TP=$TP_CEIL:LRA=$LRA "${base}_norm.wav"
    ffmpeg -y -i "${base}_norm.wav" -codec:a libmp3lame -qscale:a 2 "${base}_norm.mp3"

    # Remove temp WAV
    rm -f "${base}_norm.wav"
done

echo "All MP3 files processed and saved as *_norm.mp3"
