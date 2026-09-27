#!/usr/bin/env bash
# CodePipeline EC2 deploy action'inin PostScript'i. release.zip icinde EC2'ye gelir,
# yanindaki release.env'den SHA'yi okuyup /opt/assay'deki deploy.sh'i calistirir.
set -euo pipefail

cd "$(dirname "$0")"

IMAGE_TAG=$(sed -n 's/^IMAGE_TAG=//p' release.env)
if [[ ! "$IMAGE_TAG" =~ ^[0-9a-f]{40}$ ]]; then
  echo "release.env gecersiz: IMAGE_TAG 40 karakterlik commit SHA olmali, gelen: '$IMAGE_TAG'" >&2
  exit 1
fi

export IMAGE_TAG
exec /opt/assay/deploy/scripts/deploy.sh
