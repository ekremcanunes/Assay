#!/bin/sh
# Vercel "Ignored Build Step": çıkış 0 → build atlanır, 1 → build yapılır.
# Root Directory atlas/ olduğu için betik atlas/ içinde çalışır.
# Build şu durumda yapılır: son başarılı deploy'dan beri atlas/ değiştiyse
# veya akışların `file` alanında gösterdiği repo dosyalarından biri değiştiyse (taşındı/silindi dahil).

# Önceki deploy bilinmiyorsa (ilk deploy) her zaman build et.
[ -n "$VERCEL_GIT_PREVIOUS_SHA" ] || exit 1

files=$(grep -hE '^ *(file|path):' content/flows/*.yaml content/*.yaml | sed -E 's/^ *(file|path): *//; s/["'"'"']//g; s#^#../#')

# Değişiklik yoksa 0 (atla). Değişiklik varsa veya önceki SHA sığ klonda yoksa (git hatası) 1 (build et).
if git diff --quiet "$VERCEL_GIT_PREVIOUS_SHA" HEAD -- . $files; then exit 0; else exit 1; fi
