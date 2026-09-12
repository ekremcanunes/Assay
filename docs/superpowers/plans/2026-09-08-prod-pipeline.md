# Prod Pipeline — Uygulama Planı

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `main-prod` dalındaki kodu, insan onayından geçerek AWS EC2'ye deploy eden bir hat kurmak.

**Architecture:** GitHub Actions imajları build edip ECR'a yazar (kimlik OIDC ile, statik anahtar yok). AWS CodePipeline ECR'ı dinler, Manual Approval aşamasında bekler, onay sonrası EC2'ye deploy eder. Tek EC2, Docker Compose, nginx tek giriş noktası.

**Tech Stack:** GitHub Actions · AWS (IAM, ECR, EC2, CodePipeline, SNS) · Docker Compose · nginx

**Spec:** [`docs/superpowers/specs/2026-09-06-prod-pipeline-design.md`](../specs/2026-09-06-prod-pipeline-design.md)

## Global Constraints

- **Test yok.** Projede test altyapısı bulunmuyor (spec Aşama 3'ün konusu). Bu planda TDD adımları yerine **her görevin sonunda çalıştırılabilir doğrulama** var; doğrulama adımı atlanamaz.
- **Dockerfile'lara dokunulmaz.** Kullanıcı kendisi inceleyip düzeltecek (spec Aşama 2 madde 5).
- **Statik AWS anahtarı oluşturulmaz.** Kimlik yalnızca OIDC ile alınır.
- **Third-party action'lar 40 karakterlik commit SHA ile pinlenir**, yanına `# vX` yorumu yazılır.
- **Her workflow'da `permissions:` bloğu açıkça yazılır**, varsayılan geniş `GITHUB_TOKEN` yetkisi kullanılmaz.
- **İmajlar git SHA ile etiketlenir**, `latest` kullanılmaz.
- **Prod compose'da yalnızca `web` yayınlanır**; diğer servisler `expose` ile compose ağında kalır.
- **Commit'ler kullanıcı onayıyla atılır** — plan komutu verir, çalıştırma kararı kullanıcınındır.

**Ortam notları:**
- `docker` Git Bash'te yok, WSL2'de: `wsl -d Ubuntu -- bash -lc '...'`
- Runner workspace: `/home/ekrem/actions-runner/_work/investment-tracker/investment-tracker`
- AWS CLI ve `gh` CLI **kurulu değil** — Task 4 kurar
- Repo: `ekremcanunes/investment-tracker` (public)

---

## Dosya Haritası

| Dosya | Sorumluluk |
|---|---|
| `.github/workflows/build-push.yml` *(yeni)* | `main-prod` push → imaj build → ECR push |
| `.github/workflows/codeql.yml` | `main-prod` dalı eklenir |
| `docker-compose.yml` | `ports` → `expose` (yalnızca `web` yayınlanır) |
| `docker-compose.override.yml` *(yeni)* | Dev'de portları geri açar; prod'a gitmez |
| `deploy/appspec.yml` *(yeni)* | CodeDeploy yerleşim tanımı |
| `deploy/scripts/deploy.sh` *(yeni)* | EC2'de imajı çekip compose'u yeniden başlatır |

---

## BÖLÜM 1 — P0 Hijyen

## Task 1: Dal temizliği ve varsayılan dal

**Files:** Yok — GitHub ayarları ve git komutları.

**Interfaces:**
- Produces: `test` varsayılan dal; `main-uat` silinmiş

- [ ] **Step 1: Mevcut durumu kaydet**

```bash
cd /c/Users/acer/Desktop/investment-tracker
git fetch --prune origin
git branch -r | grep -v dependabot
git log -1 --format="%h %ci %s" origin/main-uat
git log -1 --format="%h %ci %s" origin/main-prod
```

Beklenen: `main-uat` ve `main-prod` **aynı commit'i** gösterir. Farklıysa dur — `main-uat`'ta benzersiz içerik var demektir, silmeden önce incelenmeli.

- [ ] **Step 2: Varsayılan dalı `test` yap**

GitHub → repo → **Settings → General → Default branch** → kalem ikonu → `test` seç → Update.

Bu adım Step 3'ten **önce** yapılmalı: GitHub varsayılan dalın silinmesine izin vermez, ve varsayılan şu an tanımsız.

- [ ] **Step 3: `main-uat` dalını sil**

```bash
git push origin --delete main-uat
git fetch --prune origin
git branch -r | grep -v dependabot
```

Beklenen: yalnızca `origin/main-prod` ve `origin/test` kalır.

- [ ] **Step 4: Doğrula**

```bash
git symbolic-ref refs/remotes/origin/HEAD 2>/dev/null || git remote set-head origin -a
git symbolic-ref refs/remotes/origin/HEAD
```

Beklenen: `refs/remotes/origin/test`

---

## Task 2: Git geçmişinde sır taraması

**Files:** Yok — tarama; bulgu çıkarsa müdahale gerekir.

**Interfaces:**
- Produces: Geçmişin temiz olduğuna dair kanıt (ya da iptal edilmesi gereken sırların listesi)

- [ ] **Step 1: gitleaks ile tüm geçmişi tara**

```bash
wsl -d Ubuntu -- bash -lc 'cd /mnt/c/Users/acer/Desktop/investment-tracker && docker run --rm -v "$(pwd):/repo" zricethezav/gitleaks:latest detect --source /repo --redact --verbose'
```

`--redact` bulguların değerini gizler, yalnızca yerini gösterir — konsola sır basılmaz.

`detect` komutu varsayılan olarak **tüm git geçmişini** tarar, yalnızca çalışma ağacını değil.

- [ ] **Step 2: Sonucu değerlendir**

Çıkış kodu `0` → bulgu yok, Task 3'e geç.

Çıkış kodu `1` → bulgu var. **Sıra önemli:**
1. Bulunan anahtarı/şifreyi **derhal iptal et ve yenile** (sağlayıcının panelinden)
2. Ancak ondan sonra geçmişi temizlemeyi düşün

Commit'i silmek sırrı geçerli olmaktan çıkarmaz. Repo public olduğu için sır zaten okunmuş varsayılır.

- [ ] **Step 3: Bilinen dev varsayılanlarını doğrula**

```bash
cd /c/Users/acer/Desktop/investment-tracker
grep -rn "kratospassword" docker-compose.yml .env.example 2>/dev/null
```

Beklenen: `docker-compose.yml` ve `.env.example` içinde bulunur. Bunlar **bilinçli dev varsayılanı** (spec `PIPELINE-SECURITY.md` §2), gitleaks bulgusu olarak çıkarsa kabul edilir — ama prod'a taşınmamalı.

---

## Task 3: `main-prod` branch koruması

**Files:** Yok — GitHub ayarları.

**Interfaces:**
- Consumes: Task 1'den `test` varsayılan dal
- Produces: `main-prod` korumalı; doğrudan push kapalı

- [ ] **Step 1: Kural oluştur**

GitHub → **Settings → Branches → Add branch protection rule**

- Branch name pattern: `main-prod`
- ☑ **Require a pull request before merging**
  - Required approvals: **0** — tek kişilik projede kendi PR'ını onaylayamazsın, 1 seçilirse merge kilitlenir
- ☐ Require status checks — **şimdilik boş bırak**, Task 7'de doldurulacak
- ☑ **Do not allow bypassing the above settings**
- Force push ve deletion: **kapalı** (varsayılan)

- [ ] **Step 2: Korumanın çalıştığını doğrula**

```bash
cd /c/Users/acer/Desktop/investment-tracker
git checkout main-prod 2>/dev/null || git checkout -b main-prod origin/main-prod
git commit --allow-empty -m "test: koruma denemesi"
git push origin main-prod
```

Beklenen: **push REDDEDİLİR** — `protected branch hook declined` benzeri hata.

- [ ] **Step 3: Deneme commit'ini temizle**

```bash
git reset --hard origin/main-prod
git checkout test
```

---

## Task 4: `test` → `main-prod` ilk birleştirme

**Files:** Yok — PR.

**Interfaces:**
- Consumes: Task 3'ten branch koruması
- Produces: `main-prod` = `test` içeriği; prod dalı gerçeği yansıtır

- [ ] **Step 1: Fark büyüklüğünü gör**

```bash
cd /c/Users/acer/Desktop/investment-tracker
git rev-list --count origin/main-prod..origin/test
git diff --stat origin/main-prod..origin/test | tail -5
```

- [ ] **Step 2: PR aç**

GitHub → **Pull requests → New pull request**
- base: `main-prod` ← compare: `test`
- Başlık: `main-prod dalini test ile esitle`
- Açıklama: `main-prod 7 Haziran'dan beri geride. Prod pipeline kurulmadan once prod dali gercek kodu yansitmali.`

- [ ] **Step 3: CodeQL'in koştuğunu gözlemle**

PR sayfasında Checks sekmesi. `codeql.yml` şu an yalnızca `test` dalını dinliyor, bu yüzden **bu PR'da koşmayabilir** — normal, Task 7'de `main-prod` eklenecek.

- [ ] **Step 4: Merge et ve doğrula**

Merge sonrası:

```bash
git fetch --prune origin
git rev-list --count origin/main-prod..origin/test
```

Beklenen: `0` — iki dal eşit.

---

## BÖLÜM 2 — İskelet CI/CD

## Task 5: AWS CLI kurulumu ve OIDC güven ilişkisi

**Files:** Yok — AWS kaynakları.

**Interfaces:**
- Produces: IAM OIDC provider; `GitHubActionsDeployRole` (ARN Task 6 ve 7'de kullanılacak)

- [ ] **Step 1: AWS CLI kur**

```bash
wsl -d Ubuntu -- bash -lc 'cd /tmp && curl -sS "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o awscliv2.zip && unzip -q -o awscliv2.zip && sudo ./aws/install --update && aws --version'
```

Beklenen: `aws-cli/2.x.x ...`

- [ ] **Step 2: Kimlik yapılandır**

```bash
wsl -d Ubuntu -- bash -lc 'aws configure'
```

Access key, secret key, bölge (`eu-central-1` önerilir — Frankfurt, Türkiye'ye en yakın), çıktı formatı `json`.

Bu anahtar **senin yönetim kimliğin**, pipeline'ın değil. Pipeline OIDC kullanacak.

```bash
wsl -d Ubuntu -- bash -lc 'aws sts get-caller-identity'
```

Beklenen: `Account`, `Arn` alanları dolu. **Account numarasını not al** — sonraki adımlarda gerekli.

- [ ] **Step 3: OIDC provider oluştur**

```bash
wsl -d Ubuntu -- bash -lc 'aws iam create-open-id-connect-provider \
  --url https://token.actions.githubusercontent.com \
  --client-id-list sts.amazonaws.com'
```

Hata alırsan (`InvalidInput`), thumbprint ekle:
```bash
--thumbprint-list 6938fd4d98bab03faadb97b34396831e3780aea1
```

Bu adım GitHub'ı AWS'e "kimlik sağlayıcı" olarak tanıtır. Bir kez yapılır, tüm repolar için geçerlidir.

- [ ] **Step 4: Güven politikasını yaz**

`ACCOUNT_ID`'yi Step 2'deki numarayla değiştir:

```bash
wsl -d Ubuntu -- bash -lc 'cat > /tmp/trust-policy.json <<EOF
{
  "Version": "2012-10-17",
  "Statement": [{
    "Effect": "Allow",
    "Principal": {
      "Federated": "arn:aws:iam::ACCOUNT_ID:oidc-provider/token.actions.githubusercontent.com"
    },
    "Action": "sts:AssumeRoleWithWebIdentity",
    "Condition": {
      "StringEquals": {
        "token.actions.githubusercontent.com:aud": "sts.amazonaws.com"
      },
      "StringLike": {
        "token.actions.githubusercontent.com:sub": "repo:ekremcanunes/investment-tracker:ref:refs/heads/main-prod"
      }
    }
  }]
}
EOF
echo yazildi'
```

`sub` koşulu kritik: **yalnızca bu repo, yalnızca `main-prod` dalı** bu rolü üstlenebilir. Bu satır olmazsa dünyadaki herhangi bir GitHub reposu rolü alabilir.

- [ ] **Step 5: Rolü oluştur ve ECR yetkisi ver**

```bash
wsl -d Ubuntu -- bash -lc 'aws iam create-role \
  --role-name GitHubActionsDeployRole \
  --assume-role-policy-document file:///tmp/trust-policy.json \
  --description "GitHub Actions OIDC - ECR push"'

wsl -d Ubuntu -- bash -lc 'aws iam attach-role-policy \
  --role-name GitHubActionsDeployRole \
  --policy-arn arn:aws:iam::aws:policy/AmazonEC2ContainerRegistryPowerUser'
```

`PowerUser` ECR'a push/pull verir ama repository silme yetkisi vermez. İleride daha dar bir özel politikaya indirilebilir.

- [ ] **Step 6: Doğrula**

```bash
wsl -d Ubuntu -- bash -lc 'aws iam get-role --role-name GitHubActionsDeployRole --query "Role.Arn" --output text'
```

Beklenen: `arn:aws:iam::ACCOUNT_ID:role/GitHubActionsDeployRole` — **bu ARN'i not al**, Task 7'de workflow'a yazılacak.

---

## Task 6: ECR repository'leri

**Files:** Yok — AWS kaynakları.

**Interfaces:**
- Consumes: Task 5'ten AWS CLI kimliği
- Produces: Üç ECR repository; registry URI (`ACCOUNT_ID.dkr.ecr.BOLGE.amazonaws.com`)

- [ ] **Step 1: Üç repository oluştur**

```bash
wsl -d Ubuntu -- bash -lc 'for r in assay/web assay/portfolio-service assay/market-service; do
  aws ecr create-repository \
    --repository-name "$r" \
    --image-tag-mutability IMMUTABLE \
    --image-scanning-configuration scanOnPush=true \
    --query "repository.repositoryUri" --output text
done'
```

`IMMUTABLE`: aynı etiket ikinci kez yazılamaz. Bu, "taranan imaj ile deploy edilen imaj farklı olabilir" kazasını imkânsız kılar.

`scanOnPush`: push anında ücretsiz temel zafiyet taraması.

- [ ] **Step 2: Lifecycle policy ekle**

```bash
wsl -d Ubuntu -- bash -lc 'cat > /tmp/lifecycle.json <<EOF
{
  "rules": [{
    "rulePriority": 1,
    "description": "Son 10 imaji tut",
    "selection": {
      "tagStatus": "any",
      "countType": "imageCountMoreThan",
      "countNumber": 10
    },
    "action": { "type": "expire" }
  }]
}
EOF
for r in assay/web assay/portfolio-service assay/market-service; do
  aws ecr put-lifecycle-policy --repository-name "$r" --lifecycle-policy-text file:///tmp/lifecycle.json --query "repositoryName" --output text
done'
```

Her commit yeni imaj ürettiği için bu kural olmadan depolama maliyeti sürekli büyür.

- [ ] **Step 3: Doğrula**

```bash
wsl -d Ubuntu -- bash -lc 'aws ecr describe-repositories --query "repositories[].[repositoryName,imageTagMutability,imageScanningConfiguration.scanOnPush]" --output table'
```

Beklenen: üç satır, hepsinde `IMMUTABLE` ve `True`.

---

## Task 7: Build workflow — imaj üretimi ve ECR push

**Files:**
- Create: `.github/workflows/build-push.yml`
- Modify: `.github/workflows/codeql.yml` (dal listesi)

**Interfaces:**
- Consumes: Task 5'ten rol ARN'i, Task 6'dan ECR URI'ları
- Produces: Her `main-prod` push'unda ECR'da git SHA ile etiketlenmiş üç imaj

- [ ] **Step 1: Workflow'u oluştur**

`ACCOUNT_ID` ve bölgeyi kendi değerlerinle değiştir:

```yaml
name: Build and Push to ECR

on:
  push:
    branches: [ main-prod ]

env:
  AWS_REGION: eu-central-1
  ECR_REGISTRY: ACCOUNT_ID.dkr.ecr.eu-central-1.amazonaws.com

permissions:
  id-token: write      # OIDC jetonu istemek icin ZORUNLU
  contents: read

jobs:
  build:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        include:
          - name: web
            context: ./web
          - name: portfolio-service
            context: ./portfolio-service
          - name: market-service
            context: ./market-service

    steps:
      - name: Checkout
        uses: actions/checkout@3d3c42e5aac5ba805825da76410c181273ba90b1 # v7

      - name: Configure AWS credentials (OIDC)
        uses: aws-actions/configure-aws-credentials@61815dcd50bd041e203e49132bacad1fd04d2708 # v5
        with:
          role-to-assume: arn:aws:iam::ACCOUNT_ID:role/GitHubActionsDeployRole
          aws-region: ${{ env.AWS_REGION }}

      - name: Login to ECR
        run: |
          aws ecr get-login-password --region "$AWS_REGION" \
            | docker login --username AWS --password-stdin "$ECR_REGISTRY"

      - name: Build and push
        run: |
          IMAGE="$ECR_REGISTRY/assay/${{ matrix.name }}:${GITHUB_SHA}"
          docker build -t "$IMAGE" "${{ matrix.context }}"
          docker push "$IMAGE"
          echo "Pushed: $IMAGE"
```

`id-token: write` olmadan OIDC çalışmaz — en sık yapılan hata budur.

Etiket `${GITHUB_SHA}`: hangi imajın hangi commit'ten geldiği kesindir, `latest` belirsizliği yoktur.

- [ ] **Step 2: CodeQL'e `main-prod` ekle**

`.github/workflows/codeql.yml` içinde:

```yaml
on:
  push:
    branches: [ "test", "main-prod" ]
  pull_request:
    branches: [ "test", "main-prod" ]
```

- [ ] **Step 3: Commit ve push**

```bash
cd /c/Users/acer/Desktop/investment-tracker
git add .github/workflows/
git commit -m "ci: ECR build-push workflow ve codeql main-prod dali"
git push origin test
```

- [ ] **Step 4: `main-prod`'a taşı ve tetikle**

PR aç (`test` → `main-prod`), merge et. Workflow yalnızca `main-prod` push'unda koşar.

- [ ] **Step 5: Doğrula**

GitHub → Actions → koşum yeşil olmalı. Sonra:

```bash
wsl -d Ubuntu -- bash -lc 'for r in assay/web assay/portfolio-service assay/market-service; do
  echo "=== $r ==="
  aws ecr describe-images --repository-name "$r" --query "imageDetails[].imageTags" --output text
done'
```

Beklenen: her repository'de bir etiket, değeri merge commit'inin SHA'sı.

**Hata durumunda:** `Not authorized to perform sts:AssumeRoleWithWebIdentity` → güven politikasındaki `sub` koşulu dal adıyla uyuşmuyor. `repo:ekremcanunes/investment-tracker:ref:refs/heads/main-prod` satırını kontrol et.

---

## Task 8: EC2 hazırlığı ve prod compose

**Files:**
- Modify: `docker-compose.yml`
- Create: `docker-compose.override.yml`

**Interfaces:**
- Consumes: Task 6'dan ECR URI'ları
- Produces: Docker kurulu, ECR'dan çekebilen EC2; ağ yüzeyi daraltılmış compose

- [ ] **Step 1: EC2 başlat**

AWS Console → EC2 → Launch instance:
- AMI: Ubuntu Server 24.04 LTS
- Tip: `t3.small`
- Key pair: yeni oluştur, `.pem` dosyasını sakla
- **Security Group:** SSH (22) yalnızca kendi IP'nden · HTTP (80) herkese · HTTPS (443) herkese
- **5001, 5002, 6379, 4433 AÇILMAZ**

- [ ] **Step 2: Docker kur**

```bash
ssh -i /path/to/key.pem ubuntu@EC2_IP
```

```bash
sudo apt-get update && sudo apt-get install -y ca-certificates curl
sudo install -m 0755 -d /etc/apt/keyrings
sudo curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
sudo chmod a+r /etc/apt/keyrings/docker.asc
echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo $VERSION_CODENAME) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
sudo apt-get update && sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin
sudo usermod -aG docker ubuntu
newgrp docker
docker --version && docker compose version
```

- [ ] **Step 3: EC2'ye ECR okuma yetkisi ver**

AWS Console → IAM → Roles → Create role → AWS service → EC2 → `AmazonEC2ContainerRegistryReadOnly` politikasını ekle → ad: `EC2ECRPullRole`.

Sonra EC2 → instance seç → Actions → Security → Modify IAM role → `EC2ECRPullRole`.

EC2 üzerinde doğrula:

```bash
aws ecr get-login-password --region eu-central-1 | docker login --username AWS --password-stdin ACCOUNT_ID.dkr.ecr.eu-central-1.amazonaws.com
```

Beklenen: `Login Succeeded`. AWS CLI yoksa önce kur: `sudo snap install aws-cli --classic`

- [ ] **Step 4: Compose'da ağ yüzeyini daralt**

`docker-compose.yml` içinde şu servislerin `ports:` bloğunu `expose:` ile değiştir:

```yaml
  market-service:
    expose:
      - "5002"

  portfolio-service:
    expose:
      - "5001"

  redis:
    expose:
      - "6379"

  kratos:
    expose:
      - "4433"
      - "4434"
```

`web` servisinin `ports: - "80:80"` satırı **değişmez** — tek giriş noktası odur.

Servis-servis iletişimi etkilenmez; Docker DNS (`http://portfolio-service:5001`) yayınlanan porta ihtiyaç duymaz.

- [ ] **Step 5: Dev için override dosyası oluştur**

`docker-compose.override.yml`:

```yaml
# Dev ortami icin port yayinlama. Compose bu dosyayi OTOMATIK okur.
# Prod sunucusuna kopyalanmaz -> orada portlar kapali kalir.
services:
  market-service:
    ports:
      - "5002:5002"
  portfolio-service:
    ports:
      - "5001:5001"
  redis:
    ports:
      - "6379:6379"
  kratos:
    ports:
      - "4433:4433"
      - "4434:4434"
```

- [ ] **Step 6: Yerelde doğrula — dev erişimi korunuyor**

```bash
wsl -d Ubuntu -- bash -lc 'cd /mnt/c/Users/acer/Desktop/investment-tracker && docker compose up -d && sleep 5'
curl -s -o /dev/null -w "5001 (override ile acik): %{http_code}\n" http://localhost:5001/api/market/overview
```

Beklenen: `401` — servise ulaşıldı (override çalışıyor).

- [ ] **Step 7: Doğrula — override olmadan port kapalı**

```bash
wsl -d Ubuntu -- bash -lc 'cd /mnt/c/Users/acer/Desktop/investment-tracker && docker compose -f docker-compose.yml down && docker compose -f docker-compose.yml up -d && sleep 5'
curl -s -o /dev/null -w "5001 (override olmadan): %{http_code}\n" --max-time 5 http://localhost:5001/api/market/overview
curl -s -o /dev/null -w "80 (nginx): %{http_code}\n" http://localhost/
```

Beklenen: 5001 **bağlantı hatası** (000 ya da timeout), 80 **200 veya 302**.

`-f docker-compose.yml` override'ı devre dışı bırakır — prod davranışını simüle eder.

- [ ] **Step 8: Commit**

```bash
cd /c/Users/acer/Desktop/investment-tracker
git add docker-compose.yml docker-compose.override.yml
git commit -m "ci: prod compose'da yalnizca web yayinlanir, dev portlari override'a tasindi"
git push origin test
```

---

## Task 9: CodePipeline — onay ve deploy

**Files:**
- Create: `deploy/scripts/deploy.sh`

**Interfaces:**
- Consumes: Task 6'dan ECR, Task 8'den EC2
- Produces: Uçtan uca hat — merge → onay e-postası → deploy

- [ ] **Step 1: SNS konusu ve abonelik**

```bash
wsl -d Ubuntu -- bash -lc 'aws sns create-topic --name assay-deploy-approval --query "TopicArn" --output text'
```

Dönen ARN ile:

```bash
wsl -d Ubuntu -- bash -lc 'aws sns subscribe \
  --topic-arn TOPIC_ARN \
  --protocol email \
  --notification-endpoint SENIN_EPOSTAN'
```

E-postana gelen **Confirm subscription** bağlantısına tıkla. Onaylamazsan bildirim gelmez.

- [ ] **Step 2: Deploy betiği**

`deploy/scripts/deploy.sh`:

```bash
#!/usr/bin/env bash
set -euo pipefail

# CodePipeline tarafindan EC2'de calistirilir.
# IMAGE_TAG: deploy edilecek git SHA'si
: "${IMAGE_TAG:?IMAGE_TAG tanimli degil}"
: "${ECR_REGISTRY:?ECR_REGISTRY tanimli degil}"

cd /opt/assay

aws ecr get-login-password --region eu-central-1 \
  | docker login --username AWS --password-stdin "$ECR_REGISTRY"

for s in web portfolio-service market-service; do
  docker pull "$ECR_REGISTRY/assay/$s:$IMAGE_TAG"
done

# Override YOK -> portlar kapali kalir
IMAGE_TAG="$IMAGE_TAG" docker compose -f docker-compose.yml up -d --remove-orphans
docker compose -f docker-compose.yml ps
```

`-f docker-compose.yml` kritik: override dosyası prod'a kopyalanmasa bile açıkça belirtmek kazayı önler.

- [ ] **Step 3: Pipeline'ı konsoldan oluştur**

AWS Console → CodePipeline → Create pipeline:

| Aşama | Ayar |
|---|---|
| **Source** | ECR · repository `assay/web` · image tag: herhangi |
| **Approval** | Action provider: Manual approval · SNS topic: `assay-deploy-approval` |
| **Deploy** | CodeDeploy (EC2/On-premises) ya da SSM Run Command |

`web` imajını tetikleyici seçmenin sebebi: üç imaj aynı workflow'da üretiliyor, biri gelince diğerleri de gelmiş demektir.

- [ ] **Step 4: Uçtan uca doğrula**

`test` dalında küçük bir değişiklik yap (örn. README'ye bir satır), `main-prod`'a PR aç ve merge et. Sonra sırayla gözlemle:

1. GitHub Actions → `Build and Push to ECR` yeşil
2. ECR'da yeni SHA etiketi
3. **E-postaya onay bildirimi geldi**
4. CodePipeline → Approve
5. EC2'de:

```bash
ssh -i key.pem ubuntu@EC2_IP 'cd /opt/assay && docker compose -f docker-compose.yml ps'
```

6. Tarayıcıdan `http://EC2_IP` → uygulama açılıyor

- [ ] **Step 5: Ağ yüzeyini prod'da doğrula**

```bash
curl -s -o /dev/null -w "80:   %{http_code}\n" --max-time 5 http://EC2_IP/
curl -s -o /dev/null -w "5001: %{http_code}\n" --max-time 5 http://EC2_IP:5001/api/market/overview
curl -s -o /dev/null -w "5002: %{http_code}\n" --max-time 5 http://EC2_IP:5002/api/market/overview
```

Beklenen: 80 çalışır; 5001 ve 5002 **timeout** (Security Group + `expose` birlikte kapatıyor).

Bu adım spec'in temel mimari iddiasının kanıtıdır: nginx tek giriş noktası, arkadaki servisler dışarıdan erişilemez.

- [ ] **Step 6: Status check'i zorunlu yap**

Artık `main-prod`'a giden PR'larda CodeQL koşuyor. GitHub → Settings → Branches → `main-prod` kuralı → **Require status checks to pass** → `CodeQL` seç.

Task 3'te boş bırakılan kutu burada dolar.

---

## Self-Review

**Spec kapsamı:** §3 (P0 hijyen) → Task 1-4. §4.1 OIDC → Task 5. §4.2 ECR → Task 6. §4.3 build workflow → Task 7. §4.4 CodePipeline → Task 9. §4.5 EC2+nginx+ağ yüzeyi → Task 8 ve Task 9 Step 5. §5 Aşama 2+ → bu planın kapsamı dışında (spec'te belirtildiği gibi).

**Kapsanmayan spec maddeleri (bilinçli):** TLS/certbot ve nginx yapılandırması Aşama 2'ye ait; Dockerfile düzenlemeleri kullanıcıya bırakıldı.

**Tip/isim tutarlılığı:** `GitHubActionsDeployRole` Task 5'te oluşturulup Task 7'de kullanılıyor. ECR yolları (`assay/web`, `assay/portfolio-service`, `assay/market-service`) Task 6, 7, 9'da aynı. `ECR_REGISTRY` ve `IMAGE_TAG` değişken adları Task 7 ve Task 9'da tutarlı. `assay-deploy-approval` SNS konusu Task 9 Step 1 ve 3'te aynı.

**Bilinen kabuller:**
- Task 9 Step 3 konsol üzerinden yapılıyor — CodePipeline'ın CLI ile kurulumu uzun JSON tanımları gerektirir ve öğrenme açısından konsol daha açıklayıcı.
- `ACCOUNT_ID`, `EC2_IP`, `TOPIC_ARN`, `SENIN_EPOSTAN` yer tutucuları kasıtlı — bunlar kullanıcıya özel değerler, önceki adımların çıktısından alınır.
