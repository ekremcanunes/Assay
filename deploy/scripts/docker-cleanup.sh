#!/usr/bin/env bash
# Sunucudaki Docker artiklarini bulur, tablo halinde gosterir, istenirse siler.
# Varsayilan davranis yalnizca listelemek: --delete verilmeden hicbir sey silinmez.
# Kullanim: ./deploy/scripts/docker-cleanup.sh --help
set -euo pipefail

usage() {
  cat <<'EOF'
Kullanim: docker-cleanup.sh [secenekler]

Kategoriler (hicbiri verilmezse ucu de secilir):
  -c, --containers   durmus konteynirlar (exited, created, dead)
  -i, --images       dangling image'lar (etiketi kalmamis, <none> gorunenler)
  -v, --volumes      hicbir konteynira bagli olmayan volume'lar
  -b, --build-cache  --cache-age suredir kullanilmayan build cache kayitlari
                     (varsayilan secime dahil degil, acikca istenmeli)

Secenekler:
      --cache-age SURE  build cache icin yas siniri (varsayilan 336h = 14 gun)
  -u, --unused       image kapsamini genislet: hicbir konteynirin kullanmadigi
                     etiketli image'lar da (ornek: eski deploy surumleri)
  -d, --delete       listelenenleri sil (once onay sorar)
  -y, --yes          onay sorma; zamanlanmis calisma icin, --delete ile birlikte
  -h, --help         bu yardimi goster

Ornekler:
  docker-cleanup.sh                   # her seyi listele, hicbir sey silme
  docker-cleanup.sh -i -u             # kullanilmayan tum image'lari listele
  docker-cleanup.sh --delete          # listele, onay al, sil
  docker-cleanup.sh -c -i -u -d -y    # onaysiz sil (systemd timer / cron)
  docker-cleanup.sh -b --cache-age 72h  # 3 gundur kullanilmayan build cache'i listele

DIKKAT: "docker compose down" ile kaldirilmis bir stack'in named volume'u da
sahipsiz gorunur. Silinen volume'daki veri geri gelmez; -v ile silmeden once listeye bak.
EOF
}

DO_CONTAINERS=false DO_IMAGES=false DO_VOLUMES=false DO_CACHE=false
UNUSED=false DELETE=false YES=false CACHE_AGE=336h

while (( $# )); do
  case "$1" in
    -c|--containers) DO_CONTAINERS=true ;;
    -i|--images)     DO_IMAGES=true ;;
    -v|--volumes)    DO_VOLUMES=true ;;
    -b|--build-cache) DO_CACHE=true ;;
    --cache-age)
      [[ $# -gt 1 ]] || { echo "--cache-age bir sure ister, ornek: 336h" >&2; exit 2; }
      CACHE_AGE=$2; shift ;;
    -u|--unused)     UNUSED=true ;;
    -d|--delete)     DELETE=true ;;
    -y|--yes)        YES=true ;;
    -h|--help)       usage; exit 0 ;;
    *) echo "Bilinmeyen secenek: $1" >&2; usage >&2; exit 2 ;;
  esac
  shift
done

if $YES && ! $DELETE; then
  echo "--yes yalnizca --delete ile birlikte kullanilir." >&2
  exit 2
fi

if [[ ! $CACHE_AGE =~ ^[0-9]+[hm]$ ]]; then
  echo "--cache-age sure ister, saat ya da dakika: ornek 336h, 90m. Gelen: '$CACHE_AGE'" >&2
  exit 2
fi

if ! $DO_CONTAINERS && ! $DO_IMAGES && ! $DO_VOLUMES && ! $DO_CACHE; then
  DO_CONTAINERS=true DO_IMAGES=true DO_VOLUMES=true
fi

if ! docker info >/dev/null 2>&1; then
  echo "Docker'a erisilemiyor: servis calisiyor mu, kullanici docker grubunda mi (ya da sudo)?" >&2
  exit 1
fi

# Satirlar tab ile ayrilir; ilk sutun silme komutuna verilen kimliktir.
find_containers() {
  $DO_CONTAINERS || return 0
  docker ps -a --filter status=exited --filter status=created --filter status=dead \
    --format '{{.ID}}\t{{.Names}}\t{{.Image}}\t{{.Status}}'
}

find_volumes() {
  $DO_VOLUMES || return 0
  docker volume ls --filter dangling=true --format '{{.Name}}\t{{.Driver}}'
}

# Herhangi bir konteynirin (calisan ya da durmus) kullandigi image listeye girmez.
find_images() {
  $DO_IMAGES || return 0
  local filter=() rows used
  $UNUSED || filter=(--filter dangling=true)
  rows=$(docker images "${filter[@]}" --format '{{.ID}}\t{{.Repository}}:{{.Tag}}\t{{.Size}}\t{{.CreatedSince}}')
  [[ -n $rows ]] || return 0
  # inspect tam kimlik verir ("sha256:" + 64 hane); docker images'in kisa 12 hanesine indir.
  used=$(docker ps -aq | xargs -r docker inspect --format '{{.Image}}' | cut -c8-19 | tr '\n' ' ')
  awk -F'\t' -v used="$used" '
    BEGIN { split(used, ids, " "); for (i in ids) inuse[ids[i]] = 1 }
    !($1 in inuse)' <<< "$rows"
}

# Build cache: --cache-age suredir kullanilmayan kayitlar. Secim silmeden once burada yapilir ve
# kayitlar ID ile silinir. "prune --filter until" kullanilmaz: denendi, eski zincirlerin cogunu birakti.
# Korunanlar: yakinda kullanilan, kullanimdaki, paylasilan ya da regular olmayan kayitlar ve bunlarin atalari.
# Cikti silme sirasindadir (once cocuk, sonra ebeveyn; cocugu duran ebeveyni prune sessizce atlar):
#   ID <tab> son kullanim (YYYY-MM-DD) <tab> boyut (byte)
find_cache() {
  $DO_CACHE || return 0
  local max_age=${CACHE_AGE%[hm]}
  if [[ $CACHE_AGE == *h ]]; then max_age=$(( max_age * 3600 )); else max_age=$(( max_age * 60 )); fi
  docker system df -v --format '{{json .BuildCache}}' | python3 -c '
import json, sys, time
from datetime import datetime

def ts(s):  # ornek: "2026-08-26 16:59:03.185179423 +0000 UTC"
    d, t, off = s.split()[:3]
    return datetime.strptime(f"{d} {t[:8]} {off}", "%Y-%m-%d %H:%M:%S %z").timestamp()

def size(s):  # ornek: "72.9MB"
    for unit, mult in (("kB", 1e3), ("MB", 1e6), ("GB", 1e9), ("B", 1)):
        if s.endswith(unit):
            return int(float(s[:-len(unit)]) * mult)
    return 0

records = {r["ID"]: r for r in json.load(sys.stdin)}
cutoff = time.time() - int(sys.argv[1])
last = {i: ts(r["LastUsedAt"] or r["CreatedAt"]) for i, r in records.items()}

def protected(r):
    return (last[r["ID"]] >= cutoff or r["InUse"] == "true"
            or r["Shared"] == "true" or r["CacheType"] != "regular")

keep = set()
for i, r in records.items():
    if protected(r):
        while i and i not in keep:
            keep.add(i)
            i = records.get(i, {}).get("Parent")

def depth(i):
    n = 0
    while records.get(i, {}).get("Parent"):
        i = records[i]["Parent"]
        n += 1
    return n

for i in sorted((i for i in records if i not in keep), key=depth, reverse=True):
    print(i, time.strftime("%Y-%m-%d", time.localtime(last[i])), size(records[i]["Size"]), sep="\t")
' "$max_age"
}

report_cache() {
  local title="Build cache, $CACHE_AGE ve daha uzun suredir kullanilmayan"
  if [[ -z $cache ]]; then
    echo "== $title: 0"
  else
    awk -F'\t' -v title="$title" '
      { n++; b += $3; if (min == "" || $2 < min) min = $2; if ($2 > max) max = $2 }
      END { printf "== %s: %d kayit, %.2f GB (son kullanim %s .. %s)\n", title, n, b / 1e9, min, max }' <<< "$cache"
  fi
  echo
}

# report <baslik> <sutun basliklari, tab ile> <satirlar>
report() {
  local count=0
  [[ -n $3 ]] && count=$(wc -l <<< "$3")
  echo "== $1: $count"
  if (( count > 0 )); then
    { printf '%s\n' "$2" "$3"; } | column -t -s $'\t'
  fi
  echo
}

echo "== Disk kullanimi"
docker system df
echo

containers=$(find_containers)
images=$(find_images)
volumes=$(find_volumes)
cache=$(find_cache)

$DO_CONTAINERS && report "Durmus konteynirlar" $'ID\tAD\tIMAGE\tDURUM' "$containers"
$DO_IMAGES && report "Image'lar$($UNUSED && echo ' (kullanilmayan tumu)' || echo ' (dangling)')" \
  $'ID\tAD:ETIKET\tBOYUT\tOLUSTURULMA' "$images"
$DO_VOLUMES && report "Sahipsiz volume'lar" $'AD\tDRIVER' "$volumes"
$DO_CACHE && report_cache

if [[ -z $containers && -z $images && -z $volumes && -z $cache ]]; then
  echo "Temizlenecek bir sey yok."
  exit 0
fi

if ! $DELETE; then
  echo "Yalnizca listelendi. Silmek icin ayni seceneklere --delete ekle."
  exit 0
fi

if ! $YES; then
  # Terminal yoksa (systemd, cron) read bos doner ve islem iptal olur; script asili kalmaz.
  read -r -p "Listelenenler silinsin mi? [e/H] " answer || answer=""
  if [[ $answer != [eE] ]]; then
    echo "Iptal edildi, hicbir sey silinmedi."
    exit 0
  fi
fi

# Sira onemli: once konteynirlar, sonra image'lar, en son volume'lar.
# Bir silme hatasi digerlerini durdurmaz; hata Docker'in mesajiyla gorunur, cikis kodu 1 olur.
# Not: bu calismada silinen konteynirin volume'u ve image'i ancak bir sonraki calismada sahipsiz gorunur.
failed=false

if [[ -n $containers ]]; then
  echo "-- Konteynirlar siliniyor"
  cut -f1 <<< "$containers" | xargs docker rm || failed=true
fi

if [[ -n $images ]]; then
  echo "-- Image'lar siliniyor"
  # Etiketli image etiketiyle silinir (son etiket gidince image da gider); <none> olan kimligiyle.
  awk -F'\t' '{ print ($2 ~ /<none>/) ? $1 : $2 }' <<< "$images" | sort -u | xargs docker rmi || failed=true
fi

if [[ -n $volumes ]]; then
  echo "-- Volume'lar siliniyor"
  cut -f1 <<< "$volumes" | xargs docker volume rm || failed=true
fi

if [[ -n $cache ]]; then
  echo "-- Build cache siliniyor ($(wc -l <<< "$cache") kayit)"
  # id filtresi tek deger kabul eder: kayitlar tek tek, find_cache'in verdigi sirayla silinir.
  # prune her cagrida tablo basar; kayit basina gurultu olmasin diye cikti gizlenir, hatalar gorunur.
  while read -r id; do
    docker builder prune -f --filter "id=$id" >/dev/null || failed=true
  done <<< "$(cut -f1 <<< "$cache")"
fi

echo
echo "== Silme sonrasi disk kullanimi"
docker system df

if $failed; then
  echo "Bazi ogeler silinemedi; yukaridaki Docker hatalarina bak." >&2
  exit 1
fi
