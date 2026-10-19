# Şifremi Unuttum — Uygulama Planı

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Giriş ekranından "Şifremi unuttum" → e-posta → kod → yeni şifre → çıkış + "Şifren güncellendi" → yeni şifreyle giriş akışını kurmak.

**Architecture:** Kratos v1.2'nin hazır recovery (`use: code`) ve settings akışları açılır; frontend'e mevcut Login/Register deseniyle (elle yazılmış sayfa, `lib/kratosFlow` yardımcıları, `authStyles` iskeleti) iki sayfa eklenir. Backend ve nginx değişmez.

**Tech Stack:** Ory Kratos v1.2.0 (yml + gotmpl şablon), React 19 + react-router, Tailwind (VOLTAJ sınıfları), Docker Compose, Mailpit (dev e-posta).

**Spec:** `docs/superpowers/specs/2026-10-19-sifremi-unuttum-design.md`

## Global Constraints

- Kalıcı otomatik test yazılmaz (faz 2 kullanıcı kararı); doğrulama = `npm run lint` + `npm run build` + dev'de elle uçtan uca + geçici Playwright düzen kontrolü (sonra silinir).
- Commit yalnız kullanıcının açık onayıyla; her görev ayrı commit (CLAUDE.md §7 "bulk changes" yasağı).
- Auth sayfaları faz 2 §6 kuralında: mobilde kartsız, alanlar 52px / `text-[16px]`, buton `authDockCls` ile altta sabit, `md+` kart. Yeni renk, gölge, tip boyutu yok (DESIGN.md).
- Kratos akış hataları sayfada tek tek ele alınmaz; `classifyFlowError` kararı uygulanır (Login'deki `applyDecision` deseni).
- Kullanıcıya görünen tüm metin `LanguageContext` üzerinden (TR + EN).
- Kayıtlı olmayan e-postada davranış kayıtlıyla aynı; `notify_unknown_recipients` eklenmez/değiştirilmez.
- Dev'de Kratos UI URL'leri `http://localhost/...` (port 80, nginx konteyneri). Frontend değişikliği tarayıcıda görmek için `docker compose up -d --build web` gerekir; Vite (5173) Kratos yönlendirmelerinin hedefi değildir.

## Review Focus

1. **Kod adımında sayfa yenilenirse** (`/recovery?flow=…`, akış `state: "sent_email"`): kullanıcı e-posta adımına değil kod adımına dönmeli; maskelenecek adres state'te olmadığı için akışın `email` düğümünden okunmalı — `CodeStep` `address.split` ile çöker. → Task 2 Step 5'te elle test.
2. **Kayıtlı olmayan e-posta:** aynı "kod gönderildi" ekranı, Mailpit'e e-posta düşmez. → Task 2 Step 5.
3. **Kratos'un şifre politikası reddi** (kısa veya sızmış-şifre listesindeki parola, ör. `password123`): kullanıcı neden reddedildiğini anlamalı. Mevcut `kratosErrorText` 4000005'i her durumda "en az 8 karakter" diye çeviriyor; yanlış metin çıkarsa **düzeltme, raporla** (Register'ı da etkileyen mevcut sorun). → Task 3 Step 6.
4. **`/settings` oturumsuz veya eski akışla açılırsa:** beyaz ekran/çökme yok; `classifyFlowError` kararıyla `/login`'e ya da yeni akışa gidilir. → Task 3 Step 6.
5. **Diğer cihaz oturumu:** sıfırlamadan önce ikinci tarayıcıda açık oturum, şifre kaydedilince düşer. → Task 3 Step 6.

---

### Task 1: Kratos recovery akışı, e-posta şablonu, oturum kapatma hook'u

**Files:**
- Modify: `kratos/kratos.yml` (`selfservice.flows` altına `recovery`; `settings` altına `after.password.hooks`; `courier.templates` altına `recovery_code`)
- Create: `kratos/templates/recovery_code/valid/email.subject.gotmpl`
- Create: `kratos/templates/recovery_code/valid/email.body.gotmpl`
- Create: `kratos/templates/recovery_code/valid/email.body.plaintext.gotmpl`
- Modify: `docker-compose.yml` (kratos `environment`, diğer `SELFSERVICE_FLOWS_*_UI_URL` satırlarının yanına)

**Interfaces:**
- Produces: tarayıcı akışı `GET /.ory/self-service/recovery/browser` → `303` → `http://localhost/recovery?flow=<id>`; settings'te şifre kaydı diğer oturumları kapatır.

- [ ] **Step 1: `kratos.yml` değişiklikleri**

```yaml
# selfservice.flows altına (verification'ın yanına)
    recovery:
      enabled: true
      use: code
      ui_url: http://localhost/recovery
      lifespan: 15m                     # verification ile aynı

# mevcut settings bloğuna
    settings:
      ui_url: http://localhost/settings
      privileged_session_max_age: 15m
      after:
        password:
          hooks:
            - hook: revoke_active_sessions   # şifre değişince diğer cihazlar çıkar (spec §8-2)

# courier.templates altına (login_code, verification_code ile aynı biçim)
    recovery_code:
      valid:
        email:
          subject: file:///etc/config/kratos/templates/recovery_code/valid/email.subject.gotmpl
          body:
            html: file:///etc/config/kratos/templates/recovery_code/valid/email.body.gotmpl
            plaintext: file:///etc/config/kratos/templates/recovery_code/valid/email.body.plaintext.gotmpl
```

- [ ] **Step 2: Şablonlar** — mevcut `verification_code` şablonlarının biçimi, değişken `{{ .RecoveryCode }}`:
  - subject: `Assay şifre sıfırlama kodunuz`
  - html: `<p>Şifre sıfırlama kodunuz: <strong>{{ .RecoveryCode }}</strong></p><p>Bu isteği siz yapmadıysanız bu e-postayı yok sayın.</p>`
  - plaintext: aynı iki cümle, etiketsiz.

- [ ] **Step 3: Compose env** — `SELFSERVICE_FLOWS_RECOVERY_UI_URL: ${APP_URL:-http://localhost}/recovery`

- [ ] **Step 4: Kratos'u yeniden başlat ve sağlığını doğrula**

Run: `docker compose up -d kratos && curl -s http://localhost:4433/health/ready`
Expected: `{"status":"ok"}`; `docker compose logs kratos --tail 30` içinde config/şema hatası yok.

- [ ] **Step 5: Akış yönlendirmesini doğrula**

Run: `curl -s -o /dev/null -w "%{http_code} %{redirect_url}\n" http://localhost/.ory/self-service/recovery/browser`
Expected: `303 http://localhost/recovery?flow=<uuid>`

- [ ] **Step 6: E-postanın gittiğini doğrula (API akışı, kayıtlı bir dev hesabıyla)**

```bash
FLOW=$(curl -s http://localhost:4433/self-service/recovery/api | sed -E 's/.*"id":"([^"]+)".*/\1/;q')
curl -s -X POST "http://localhost:4433/self-service/recovery?flow=$FLOW" -H 'Content-Type: application/json' -d '{"method":"code","email":"<kayitli-dev-eposta>"}' >/dev/null
sleep 3; curl -s http://localhost:8025/api/v1/messages | grep -o '"Subject":"[^"]*"' | head -1
```
Expected: `"Subject":"Assay şifre sıfırlama kodunuz"`. Kayıtlı olmayan adresle tekrarlanınca yeni mesaj düşmez.

- [ ] **Step 7: Commit (kullanıcı onayıyla)**

```bash
git add kratos/kratos.yml kratos/templates/recovery_code docker-compose.yml
git commit -m "feat(kratos): sifre sifirlama (recovery code) akisini ac"
```

---

### Task 2: `/recovery` sayfası ve girişteki bağlantı

**Files:**
- Create: `web/src/pages/Recovery.jsx`
- Modify: `web/src/App.jsx` (route `/recovery`, `/register` yanında, korumasız)
- Modify: `web/src/pages/Login.jsx` (şifre alanının altında bağlantı)
- Modify: `web/src/lib/authErrors.js` (`kratosErrorText` switch'ine recovery kodu hatası)
- Modify: `web/src/contexts/LanguageContext.jsx` (TR + EN)

**Interfaces:**
- Consumes: Task 1 akışı; `csrfOf`, `browserFlowUrl('recovery')`, `getFlow('recovery', id)`, `submitFlow('recovery', id, payload)`, `classifyFlowError` (`lib/kratosFlow.js`); `CodeStep` props (Login'deki kullanımla aynı); `isValidEmail`, `kratosErrorText` (`lib/authErrors.js`).
- Produces: doğru kodda tarayıcı `/settings?flow=<id>`'ye gider (Kratos 422 `redirect_browser_to` → `classifyFlowError` `redirect` kararı → `window.location.assign`).

Metin anahtarları (TR / EN):

| Anahtar | TR | EN |
|---|---|---|
| `auth.forgotPassword` | Şifremi unuttum? | Forgot password? |
| `auth.recoveryTitle` | Şifreni sıfırla | Reset your password |
| `auth.recoverySubtitle` | Hesabının e-posta adresini yaz, sıfırlama kodu gönderelim. | Enter your account email and we'll send you a reset code. |
| `auth.recoverySend` | Kod gönder | Send code |
| `auth.recoverySending` | Gönderiliyor… | Sending… |
| `auth.recoveryCodeTitle` | Sıfırlama kodunu gir | Enter the reset code |
| `auth.recoveryOtherEmail` | Farklı e-posta | Use a different email |

Geri bağlantısı için mevcut `auth.errorBack` ("Girişe dön") kullanılır.

- [ ] **Step 1: `Recovery.jsx`** — `export default function Recovery()`. Yapı Login'in şifre adımı + kod adımı ile aynı (`authPageCls`/`authCardCls`/`authDockCls`, logo üst satırı, hata kutusu, `AuthVisual`). Davranış:
  - `?flow=` yoksa `window.location.replace(browserFlowUrl('recovery'))`; varsa `getFlow`. Okunamayan akışta Login'deki `applyDecision` (`use_flow` → yeni akış + `auth.errFlowExpired`, `go_app` → `/overview`, diğerleri → yeniden başlat).
  - Adım seçimi akıştan: `flow.state === 'sent_email'` → kod adımı, aksi halde e-posta adımı. Kod adımı adresi state'ten, yoksa akıştaki `email` düğümünün `attributes.value`'sundan; ikisi de yoksa e-posta adımı (Review Focus 1).
  - E-posta gönder: `{ method: 'code', email, csrf_token }`. Cevap gövdesi `ui` taşıyorsa akış güncellenir; `state === 'sent_email'` ise `sentAt = Date.now()`, kod adımı. Kayıtlı olmayan adres için ayrı dal yok (spec §3.4).
  - Kod gönder: `{ method: 'code', code, csrf_token }`. Başarısızlıkta `classifyFlowError`: `redirect` → `window.location.assign(url)` (beklenen başarı yolu); `show` → sallanma + `kratosErrorText`; diğerleri → `applyDecision`.
  - Tekrar gönder: e-posta gönderimiyle aynı çağrı, mevcut akışla.
  - `CodeStep` `title={t('auth.recoveryCodeTitle')}`, footer'da "← Farklı e-posta" → `browserFlowUrl('recovery')`'ye yeni akış.
  - E-posta adımı altında "← Girişe dön" → `/login` (`reloadDocument`).

- [ ] **Step 2: Route + bağlantı + hata eşlemesi**
  - `App.jsx`: `<Route path="/recovery" element={<Recovery />} />`.
  - `Login.jsx`: şifre alanı hata satırının altında, sağa yaslı `<Link to="/recovery" reloadDocument>` `t('auth.forgotPassword')`, `text-ui text-muted-foreground underline`, mobilde en az 44px dokunma alanı (`py-2.5`).
  - `authErrors.js`: `case 4060006: // recovery code invalid / already used` → `t('auth.errOtpInvalid')`. Kimliği dev'de yanlış kod girerek doğrula; farklıysa gelen kimliği kullan.

- [ ] **Step 3: Lint ve build**

Run: `cd web && npm run lint && npm run build`
Expected: hata ve uyarı yok, build başarılı.

- [ ] **Step 4: Konteyneri yeniden derle**

Run: `docker compose up -d --build web`
Expected: `http://localhost/login`'de "Şifremi unuttum?" görünür.

- [ ] **Step 5: Elle uçtan uca**
  1. Login → "Şifremi unuttum?" → `/recovery?flow=…`, e-posta adımı.
  2. Kayıtlı e-posta → kod adımı, adres maskeli; Mailpit'te kod.
  3. Kod adımındayken sayfayı yenile → kod adımı ve maskeli adres korunur (Review Focus 1).
  4. Yanlış kod → sallanma + "kod geçersiz" metni.
  5. Doğru kod → adres çubuğu `/settings?flow=…` (sayfa Task 3'e kadar boş olabilir).
  6. Kayıtlı olmayan e-posta → aynı kod ekranı, Mailpit'e mesaj yok (Review Focus 2).

- [ ] **Step 6: Commit (kullanıcı onayıyla)**

```bash
git add web/src/pages/Recovery.jsx web/src/App.jsx web/src/pages/Login.jsx web/src/lib/authErrors.js web/src/contexts/LanguageContext.jsx
git commit -m "feat(web): sifremi unuttum sayfasi ve giristeki baglanti"
```

---

### Task 3: `/settings` yeni şifre sayfası ve "Şifren güncellendi" bilgisi

**Files:**
- Create: `web/src/lib/passwordNotice.js`
- Create: `web/src/pages/Settings.jsx`
- Modify: `web/src/App.jsx` (route `/settings`, korumasız)
- Modify: `web/src/pages/Login.jsx` (açılışta bilgi satırı)
- Modify: `web/src/contexts/LanguageContext.jsx`

**Interfaces:**
- Consumes: Task 2'nin yönlendirdiği `/settings?flow=<id>`; `kratosFlow` yardımcıları; `useAuth().logout`; `PasswordToggle`; `auth.passwordRule`.
- Produces: `passwordNotice.js` → `markPasswordUpdated(): void`, `takePasswordUpdated(): boolean` (okur ve siler). `otpPending.js` ile aynı desen: `sessionStorage`, anahtar `'assay.passwordUpdated'`, depo erişilemezse sessizce "yok".

Metin anahtarları (TR / EN):

| Anahtar | TR | EN |
|---|---|---|
| `auth.settingsTitle` | Yeni şifre belirle | Set a new password |
| `auth.newPassword` | Yeni şifre | New password |
| `auth.settingsSave` | Şifreyi kaydet | Save password |
| `auth.settingsSaving` | Kaydediliyor… | Saving… |
| `auth.passwordUpdated` | Şifren güncellendi. Yeni şifrenle giriş yap. | Your password was updated. Sign in with your new password. |

- [ ] **Step 0: Ön kontrol — settings AAL1 recovery oturumunu kabul ediyor mu** (spec §3 açık nokta)

Task 2 Step 5'teki gibi doğru kodla `/settings?flow=<id>`'ye gel, sonra:
Run (tarayıcı konsolu): `fetch('/.ory/self-service/settings/flows?id=<id>',{credentials:'include',headers:{Accept:'application/json'}}).then(r=>r.status)`
Expected: `200`. `403` gelirse **dur ve kullanıcıya bildir** — spec §3'teki ters sıra (önce kod, sonra şifre) devreye girer, plan güncellenir.

- [ ] **Step 1: `passwordNotice.js`** — yukarıdaki iki fonksiyon, `otpPending.js` yorum ve try/catch biçimiyle.

- [ ] **Step 2: `Settings.jsx`** — `export default function Settings()`. Login iskeleti, `AuthVisual` dahil.
  - `?flow=` yoksa `window.location.replace(browserFlowUrl('settings'))`; varsa `getFlow('settings', id)`; okunamayan akışta Login'deki karar uygulaması (`redirect` → git, `go_app` yok sayılır, diğerleri → `/login`'e `reloadDocument`).
  - Başlık `auth.settingsTitle`, alt satırda `flow.identity.traits.email` (mono).
  - Form: gizli `<input type="email" autoComplete="username" value={email} readOnly hidden>`; şifre alanı `autoComplete="new-password"`, `PasswordToggle`, altında Register'daki canlı kural (`passOk = password.length >= 8`, `✓/○ auth.passwordRule`). `passOk` değilse gönderme.
  - Gönder: `{ method: 'password', password, csrf_token }`. `ok` → `markPasswordUpdated()` sonra `logout()`. Başarısız → `classifyFlowError`; `show` ise güncel akış + `kratosErrorText`; diğerleri yukarıdaki karar.

- [ ] **Step 3: Login bilgi satırı** — `const [notice] = useState(takePasswordUpdated)`; `notice` varsa hata kutusunun yerinde (ondan önce) nötr bilgi satırı: `rounded-md border border-border bg-secondary px-3 py-2 text-micro text-foreground`, `role="status"`, metin `auth.passwordUpdated`. Yeni renk yok.

- [ ] **Step 4: Route** — `App.jsx`: `<Route path="/settings" element={<Settings />} />` (`/recovery` yanında).

- [ ] **Step 5: Lint, build, konteyner**

Run: `cd web && npm run lint && npm run build && cd .. && docker compose up -d --build web`
Expected: hata yok, build başarılı.

- [ ] **Step 6: Elle uçtan uca**
  1. Önce B tarayıcısında (ya da gizli pencere) aynı hesapla tam giriş yap.
  2. A tarayıcısında: Şifremi unuttum → e-posta → kod → `/settings`, e-posta görünür.
  3. 7 karakter → kural `○`, buton gönderilmez. `password123` → Kratos reddeder; çıkan metni not et (Review Focus 3).
  4. Geçerli yeni şifre → çıkış → `/login`'de "Şifren güncellendi…" satırı. Sayfayı yenile → satır kaybolur.
  5. Eski şifreyle giriş reddedilir; yenisi + e-posta koduyla `/overview`.
  6. B tarayıcısında sayfayı yenile → `/login`'e düşer (Review Focus 5).
  7. Oturumsuz `/settings` ve uydurma `?flow=abc` → çökme yok, `/login` (Review Focus 4).

- [ ] **Step 7: Geçici Playwright düzen kontrolü**

`web/e2e/audit.spec.js`'in `girişsiz` listesine geçici olarak `'/recovery'` ekle (settings oturum ister; ekran görüntüsü Step 6 sırasında elle alınır).
Run: `cd web/e2e && npx playwright test audit.spec.js -g recovery`
Expected: her cihaz projesinde `scrollW === vw`, `offenders` boş. Ekran görüntülerini kullanıcıya göster, sonra `audit.spec.js` değişikliğini geri al ve `audit-shots/` içeriğini sil.

- [ ] **Step 8: Commit (kullanıcı onayıyla)**

```bash
git add web/src/lib/passwordNotice.js web/src/pages/Settings.jsx web/src/App.jsx web/src/pages/Login.jsx web/src/contexts/LanguageContext.jsx
git commit -m "feat(web): yeni sifre sayfasi ve sifre guncellendi bilgisi"
```
