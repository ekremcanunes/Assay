#!/usr/bin/env bash ---> env'e bak bash nerede kuruluysa o dizinden çağırır.(Alternatif bash deploy.sh demek)
# Prod EC2'de calisir. Kullanim: IMAGE_TAG=<git-sha> ./deploy/scripts/deploy.sh
set -euo pipefail #-e=errexit, -u=nounset, -o pipefail / Amaç: Hatalar aninda yakalansin, tanimsiz degiskenler kullanilmasin, pipe'larda hata olursa script durdurulsun.
# Govde main() icinde: bash fonksiyonu calistirmadan once tamamini okur, boylece
# asagidaki git checkout bu dosyayi degistirse bile calisan kopya etkilenmez.
deploy() { #
  : "${IMAGE_TAG:?IMAGE_TAG tanimli degil (deploy edilecek commit SHA degeri)}"

  local AWS_REGION=eu-central-1
  local ECR_REGISTRY=495890796058.dkr.ecr.eu-central-1.amazonaws.com
  local SECRET_ID=assay/prod/env
  local TLS_SECRET_ID=assay/prod/tls
  local APP_URL=https://assay.com.tr
  local APP_DIR=/opt/assay

  cd "$APP_DIR"

  # Compose ve kratos/ config'i, imajla ayni commit'ten gelsin. Checkout bu dosyanin kendisini
  # de degistirir; bellekteki ESKI surum devam etmesin diye diskteki YENI surumle bastan basla.
  
  if [[ "${RE_DEPLOY:-}" != "$IMAGE_TAG" ]]; then
    git fetch --quiet origin main-prod # Head 
    git checkout --quiet --detach "$IMAGE_TAG" # Problem burada yaşanıyor script çalışırken yeni committen gelen build içinde deploy.sh değişiyor. 
    RE_DEPLOY="$IMAGE_TAG" exec "$APP_DIR/deploy/scripts/deploy.sh" 
  fi

  # umask 077: .env ilk andan itibaren yalnizca sahibi tarafindan okunabilir (600).
  # Degerler tek tirnakla yazilir -> compose icerideki $ karakterini degisken sanmaz.
  (
    umask 077
    aws secretsmanager get-secret-value --region "$AWS_REGION" --secret-id "$SECRET_ID" \
        --query SecretString --output text \
      | python3 -c '
import json, sys
for k, v in json.load(sys.stdin).items():
    if "\x27" in v:
        sys.exit(f"{k} tek tirnak iceriyor, .env icin guvenli yazilamaz")
    print(f"{k}=\x27{v}\x27")
print("LOG_LEVEL=Warning")
' > .env.tmp
    echo "APP_URL=$APP_URL" >> .env.tmp
    mv .env.tmp .env

    # Cloudflare Origin sertifikasi: secret'ta PEM'in base64'u durur (cok satirli PEM tek satira sigsin diye).
    mkdir -p certs
    aws secretsmanager get-secret-value --region "$AWS_REGION" --secret-id "$TLS_SECRET_ID" \
        --query SecretString --output text \
      | python3 -c '
import base64, json, sys
s = json.load(sys.stdin)
open("certs/origin.pem", "wb").write(base64.b64decode(s["ORIGIN_CERT_B64"]))
open("certs/origin.key", "wb").write(base64.b64decode(s["ORIGIN_KEY_B64"]))
'
  )

  aws ecr get-login-password --region "$AWS_REGION" \
    | docker login --username AWS --password-stdin "$ECR_REGISTRY"

  # -f: repo'daki docker-compose.override.yml (dev portlari + build) prod'da OKUNMAZ.
  export ECR_REGISTRY IMAGE_TAG
  docker compose -f docker-compose.yml pull
  docker compose -f docker-compose.yml up -d --remove-orphans
  docker compose -f docker-compose.yml ps
}

deploy "$@"
