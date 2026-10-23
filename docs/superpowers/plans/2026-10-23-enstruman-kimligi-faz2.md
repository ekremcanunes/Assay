# Enstrüman Kimliği Faz 2 — Enstrüman Listesi Veritabanında — Uygulama Planı

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** BIST ve ABD (hisse + ETF) enstrüman listesini market-service'in kendi PostgreSQL veritabanında tutmak, günde bir kez Twelve Data'dan senkronlamak ve aramayı bellekteki bu listeden yapmak. Kullanıcı isteği sırasında Twelve Data'ya hiç gidilmez.

**Architecture:** market-service ilk kez bir veritabanına bağlanır (Neon, portfolio'dan ayrı DB). `InstrumentSyncer` 5 Twelve Data listesini çekip filtreler, tabloya yalnızca farkları yazar. `InstrumentSyncJob` (BackgroundService) cron'a göre syncer'ı çağırır; açılışta yalnızca kaçırılmış çalışma varsa çalıştırır. `InstrumentCatalog` (singleton) aktif listeyi bellekte tutar; arama ve piyasa özeti buradan okur. `BistCatalog` ve canlı `symbol_search` kaldırılır.

**Tech Stack:** .NET 9, EF Core 9 + Npgsql, Cronos (cron ifadesi), Neon PostgreSQL, Docker Compose.

**Spec:** `docs/superpowers/specs/2026-10-21-enstruman-kimligi-design.md` — Faz 2: §4.3, §4.4, §4.5; ilgili: §4.7 (`/search`, `/overview`), §4.8 (`bist:stocks` kalkar).

## Global Constraints

- Kalıcı otomatik test yazılmaz (kullanıcı kararı 2026-10-23); doğrulama = `dotnet build` (0 hata, 0 uyarı) + dev'de elle deneme + Neon SQL Editor'de sorgu.
- Commit yalnız kullanıcının açık onayıyla; her görev ayrı commit (CLAUDE.md §7).
- Klasör/namespace düzeni: istemciler `Clients/` (`market_service.Clients`), servisler `Services/`, entity'ler `Models/`, DbContext `Data/` (`market_service.Data`). Bir dosyada tek tip; arayüz varsa ayrı dosyada, sınıfın yanında. Yeni sınıflara arayüz eklenmez (`CacheStore` gibi).
- `Market` değerleri: `BIST`, `US`. `Type` değerleri: `stock`, `etf`. Sembol standart yazımı `YahooSymbol.Normalize` (ör. `BRK.B`).
- Biçim filtresi yalnızca `YahooSymbol.IsSupportedSymbol(market, symbol)`; ikinci bir regex yazılmaz.
- Kabul edilen `/stocks` tipleri (tam metin): `Common Stock`, `REIT`, `American Depositary Receipt`, `Depositary Receipt`.
- Zaman: cron Türkiye saatiyle yorumlanır; Türkiye UTC+3 sabit (`MarketClock` ile aynı varsayım). Veritabanındaki zamanlar UTC.
- Loglama `docs/10-standards/LOGGING.md`: yapılandırılmış log, kaynak atlama/çakışma `Warning`, beklenmeyen hata `Error`, senkron özeti `Information`. Dünden bugüne kaybolan semboller spec §4.4 kural 8'e göre `Warning` ile **listelenir** (prod'da görünsün diye).
- Tek kopya varsayımı (spec §4.4 "Bilinen sınırlama"): advisory lock ve kopyalar arası bildirim **eklenmez**.

## Review Focus

1. **Senkron ortasında istisna** (Neon kopması, beklenmeyen JSON): BackgroundService'teki işlenmemiş istisna .NET'te host'u durdurur. Job her çalışmayı `try/catch` ile sarmalı, `Error` loglamalı, son senkron zamanını güncellememeli ve bir sonraki planlı zamanı beklemeye devam etmeli. → Task 4 Step 5'te elle test.
2. **Twelve Data dakika limiti (8/dk) veya geçersiz anahtar:** kaynaklar hata/boş döner → o kaynakların satırlarına dokunulmaz, arama dünkü listeyle çalışır. → Task 4 Step 5 (anahtarı boşaltarak).
3. **Açılışta `MARKET_DB_CONNECTION_STRING` eksik veya Neon'a ulaşılamıyor:** portfolio ile aynı davranış — `Migrate()` istisna fırlatır, servis açılmaz, hata logda görünür. Sessizce boş arama ile açılmamalı. → Task 1 Step 6.
4. **Arama sırasında bellek yenilenmesi:** yeni liste ayrı hazırlanıp tek atamayla değiştirilir; aramalar ya eski ya yeni listeyi görür. → Task 3 (tasarım), Task 5 Step 4.
5. **Sembol yazımı aramada:** `brk-b`, `BRK.B`, `brk.b` aynı sonucu bulmalı (sorgu sembol karşılaştırmasında `YahooSymbol.Normalize`'dan geçer). → Task 5 Step 4.

---

### Task 1: market-service veritabanı temeli

**Ön koşul (kullanıcı yapar):** Neon konsolunda mevcut projede, portfolio ile aynı branch'te yeni bir veritabanı oluştur: `market-service` (oluşturuldu 2026-10-23). Bağlantı dizesini .NET/Npgsql biçiminde (`Host=...;Database=market-service;Username=...;Password=...;SSL Mode=Require;Trust Server Certificate=true`) yerel `.env`'e `MARKET_DB_CONNECTION_STRING` olarak ekle. Prod için aynı anahtar deploy'dan **önce** AWS Secrets Manager `assay/prod/env` secret'ına ve WSL'deki `~/secrets/.env`'e eklenir.

**Files:**
- Modify: `market-service/market-service.csproj` (paketler)
- Create: `market-service/Models/Instrument.cs`, `market-service/Models/InstrumentSyncState.cs`
- Create: `market-service/Data/MarketDbContext.cs`
- Create: `market-service/Migrations/*_AddInstruments.cs` (+ Designer, Snapshot — `dotnet ef` üretir)
- Modify: `market-service/Program.cs` (DbContext kaydı; `app.Run()` öncesi `Migrate()`)
- Modify: `market-service/appsettings.json` (`ConnectionStrings:MarketDb` boş; `Serilog:MinimumLevel:Override:Microsoft.EntityFrameworkCore = Warning`)
- Modify: `docker-compose.yml` (market-service `environment`: `ConnectionStrings__MarketDb=${MARKET_DB_CONNECTION_STRING}`, `Serilog__MinimumLevel__Override__Microsoft.EntityFrameworkCore=${LOG_LEVEL_EFCORE:-Warning}`)
- Modify: `.env.example` (`MARKET_DB_CONNECTION_STRING` — `DB_CONNECTION_STRING` bloğunun altına, aynı yorum biçiminde; Twelve Data yorumunu "enstrüman listesi senkronu için" yap)
- Modify: `docs/10-standards/LOGGING.md` (`LOG_LEVEL_EFCORE` satırındaki "(portfolio-service)" → "(portfolio-service, market-service)"; §3 Override listesinde aynı düzeltme)
- Modify: `docs/30-operations/COMMANDS.md` (EF Core bölümüne `cd market-service` için aynı komutlar; `dotnet tool install --global dotnet-ef --version 9.*` satırı)

**Interfaces:**
- Produces:
  - `Instrument` (namespace `market_service.Models`): `string Market`, `string Symbol`, `string Exchange`, `string Name`, `string Currency`, `string Type`, `string Category`, `bool IsActive`, `DateTime UpdatedAt` (UTC). Birincil anahtar `(Market, Symbol)`. `Category`: Twelve Data türü olduğu gibi (`Common Stock` / `REIT` / `American Depositary Receipt` / `Depositary Receipt`), ETF'lerde `ETF`.
  - `InstrumentSyncState`: `int Id` (her zaman 1), `DateTime LastCompletedAt` (UTC).
  - `MarketDbContext` (namespace `market_service.Data`): `DbSet<Instrument> Instruments`, `DbSet<InstrumentSyncState> InstrumentSyncStates`. Tablo/kolon adları EF varsayılanı (portfolio ile aynı: `"Instruments"`, `"IsActive"`).

- [ ] **Step 1: Paketleri ekle** — portfolio ile aynı sürüm deseni: `Npgsql.EntityFrameworkCore.PostgreSQL` `9.0.*`, `Microsoft.EntityFrameworkCore.Design` `9.0.*` (`PrivateAssets=all`, portfolio csproj'daki blokla aynı), `Cronos` (`dotnet add package Cronos` — en güncel kararlı sürüm; eklenen sürümü csproj'da sabit yaz).
- [ ] **Step 2: Entity'leri ve `MarketDbContext`'i yaz** — `OnModelCreating`'de `Instrument` için `HasKey(i => new { i.Market, i.Symbol })`; `InstrumentSyncState` için `Id` anahtar, `ValueGeneratedNever()`.
- [ ] **Step 3: `Program.cs`** — `AddDbContext<MarketDbContext>(o => o.UseNpgsql(builder.Configuration.GetConnectionString("MarketDb")))`; `var app = builder.Build();` sonrası portfolio'daki gibi scope açıp `db.Database.Migrate()`.
- [ ] **Step 4: Migration üret** — `dotnet tool install --global dotnet-ef --version 9.*` (kurulu değilse), sonra `cd market-service && dotnet ef migrations add AddInstruments`. Üretilen `Up()`'ta yalnızca iki `CreateTable` olduğunu oku.
- [ ] **Step 5: Build** — `cd market-service && dotnet build` → `0 Warning(s) 0 Error(s)`.
- [ ] **Step 6: Elle doğrula** — `docker compose up -d --build market-service`; logda migration hatası yok. Neon SQL Editor'de `market-service` DB seçiliyken `SELECT * FROM "__EFMigrationsHistory";` → `AddInstruments` satırı; `SELECT count(*) FROM "Instruments";` → 0. Sonra `.env`'de `MARKET_DB_CONNECTION_STRING`'i geçici boşalt, servisi yeniden başlat → servis açılmaz, logda bağlantı hatası (Review Focus 3); değeri geri koy.
- [ ] **Step 7: Commit** (kullanıcı onayıyla) — `feat(market-service): enstruman tablosu ve veritabani baglantisi`

---

### Task 2: Twelve Data liste istemcisi

**Files:**
- Create: `market-service/Clients/TwelveDataListing.cs`
- Modify: `market-service/Clients/ITwelveDataClient.cs`, `market-service/Clients/TwelveDataClient.cs`

**Interfaces:**
- Produces:
  - `record TwelveDataListing(string Symbol, string Name, string Currency, string Exchange, string? Type)` — `Type`: `/stocks` cevabındaki `type`; `/etfs` cevabında alan yoktur → `null`.
  - `ITwelveDataClient.GetListingsAsync(string kind, string exchange, CancellationToken ct) → Task<List<TwelveDataListing>>` — `kind` ∈ `"stocks"`, `"etfs"`; URL `https://api.twelvedata.com/{kind}?exchange={exchange}&apikey={key}`.
  - Hata davranışı mevcut `GetBistStocksAsync` ile aynı: `Error` loglar, boş liste döner (spec §4.4 kural 2 hata ve boşu aynı ele alır). Log satırında `kind` ve `exchange` yapılandırılmış alan; API anahtarı ve URL loglanmaz.
- `GetBistStocksAsync` ve `SearchSymbolsAsync` bu görevde **kalır** (Task 5'te silinir).

- [ ] **Step 1: `TwelveDataListing` ve `GetListingsAsync`'i yaz** — JSON: `data` dizisi; alanlar `symbol`, `name`, `currency`, `exchange`, `type` (`TryGetProperty` ile; yoksa `null`).
- [ ] **Step 2: Build** — `0 Warning(s) 0 Error(s)`.
- [ ] **Step 3: Commit** (kullanıcı onayıyla) — `feat(market-service): Twelve Data liste istemcisi`

---

### Task 3: Bellekteki enstrüman kataloğu ve açılışta yükleme

**Files:**
- Create: `market-service/Services/InstrumentCatalog.cs`
- Modify: `market-service/Program.cs` (singleton kaydı; `Migrate()`'ten hemen sonra aynı scope'ta `ReloadAsync`)

**Interfaces:**
- Consumes: `MarketDbContext`, `Instrument` (Task 1).
- Produces: `InstrumentCatalog` (singleton, arayüzsüz):
  - `IReadOnlyList<Instrument> All { get; }` — yalnızca aktif kayıtlar.
  - `string? FindName(string market, string symbol)` — büyük/küçük harf duyarsız.
  - `Task ReloadAsync(MarketDbContext db, CancellationToken ct)` — `AsNoTracking`, `IsActive` olanlar; yeni liste ve isim sözlüğü önce hazırlanır, sonra tek bir referans atamasıyla eskisinin yerine konur (yarım liste görünmez). Sonunda `Information`: yüklenen kayıt sayısı.

- [ ] **Step 1: `InstrumentCatalog`'u yaz** — liste ve sözlük tek bir değişmez (immutable) nesnede tutulur; `volatile` alan ya da `Volatile.Write` ile değiştirilir.
- [ ] **Step 2: `Program.cs`** — `AddSingleton<InstrumentCatalog>()`; açılış scope'unda `Migrate()` sonrası `await catalog.ReloadAsync(db, CancellationToken.None)`.
- [ ] **Step 3: Build** — `0 Warning(s) 0 Error(s)`.
- [ ] **Step 4: Elle doğrula** — servis açılış logunda "0" kayıt yüklendi satırı.
- [ ] **Step 5: Commit** (kullanıcı onayıyla) — `feat(market-service): bellekteki enstruman katalogu`

---

### Task 4: Senkron (InstrumentSyncer) ve zamanlayıcı (InstrumentSyncJob)

**Files:**
- Create: `market-service/Services/InstrumentSyncer.cs`
- Create: `market-service/Services/InstrumentSyncJob.cs`
- Modify: `market-service/Common/MarketClock.cs` (`public static TimeZoneInfo Istanbul` — mevcut `IstanbulOffset` ile sabit ofsetli özel zaman dilimi, `TimeZoneInfo.CreateCustomTimeZone`)
- Modify: `market-service/Program.cs` (`AddScoped<InstrumentSyncer>()`, `AddHostedService<InstrumentSyncJob>()`)
- Modify: `market-service/appsettings.json` (`"InstrumentSync": { "Cron": "0 6 * * *" }`)

**Interfaces:**
- Consumes: `ITwelveDataClient.GetListingsAsync` (Task 2), `InstrumentCatalog.ReloadAsync` (Task 3), `MarketDbContext` (Task 1), `YahooSymbol.Normalize` / `IsSupportedSymbol`.
- Produces:
  - `InstrumentSyncer` (scoped): `Task SyncAsync(CancellationToken ct)`. Başarıyla biterse `InstrumentSyncState` (Id=1) `LastCompletedAt = UtcNow` yazar (yoksa ekler) ve `InstrumentCatalog.ReloadAsync` çağırır. Kaynak bazlı atlamalar "başarılı bitiş" sayılır; istisna fırlarsa durum güncellenmez.
  - `InstrumentSyncJob : BackgroundService` — `IServiceScopeFactory`, `IConfiguration`, `ILogger`.

**Kaynaklar (sabit sıra; aynı ABD sembolünde ilk gelen kaynağın `exchange`'i yazılır):**

| # | kind | exchange | Market | Type |
|---|---|---|---|---|
| 1 | stocks | BIST | BIST | stock |
| 2 | stocks | NASDAQ | US | stock |
| 3 | stocks | NYSE | US | stock |
| 4 | etfs | NASDAQ | US | etf |
| 5 | etfs | NYSE | US | etf |

**`SyncAsync` algoritması (spec §4.4 kuralları 1–7):**
1. Her kaynak için `GetListingsAsync`. Her kayıtta: sembol `YahooSymbol.Normalize`; `stocks` ise `Type` kabul listesinde değilse at; `IsSupportedSymbol(market, symbol)` değilse at; aynı kaynak içinde aynı sembol → ilki kalır.
2. Kaynak boşsa (hata dahil) → **başarısız**; `Warning` (kaynak, sebep). Aksi halde tablodaki aktif `(Exchange, Type)` sayısı `n` ise ve `gelen < n * 0.8` → **atlandı**; tek `Warning`: kaynak, gelen, `n`, bugün gelmeyen aktif sembollerin toplam sayısı ve ilk 50'si (ordinal sırada). Diğerleri **başarılı**.
3. Başarılı kaynakları birleştir: anahtar `(Market, Symbol)`. Aynı anahtar hem `stock` hem `etf` kaynağından geldiyse → **çakışma**: anahtar tamamen çıkarılır, sembol başına bir `Warning` (yalnızca o sembol, liste değil). Aynı anahtar aynı tipte iki kaynaktan geldiyse (NASDAQ+NYSE ETF) → tabloya göre sıradaki ilk kaynak kalır.
4. Mevcut tüm satırlar (aktif+pasif) tek sorguyla okunur. Birleşik listedeki her kayıt için: satır yoksa ekle; varsa `Exchange`, `Name`, `Currency`, `Type`, `Category`, `IsActive` alanlarından biri farklıysa güncelle (`IsActive = true`); aynıysa dokunma. Yazılan her satırda `UpdatedAt = UtcNow`. `Category` = `/stocks` için gelen `Type` metni, `/etfs` için `"ETF"`.
5. Kaynağı (`Exchange` + `Type`) **başarılı** kaynaklardan biri olan, aktif ama birleşik listede olmayan satırlar → `IsActive = false`, `UpdatedAt = UtcNow`. Atlanan/başarısız kaynakların satırlarına dokunulmaz. Çakışma yüzünden çıkarılan semboller de bu kurala girer (pasife çekilir). Pasife çekilen varsa kaynak başına tek `Warning`: kaynak, sayı, sembollerin tamamı (ordinal sırada).
6. Tek `SaveChangesAsync`. Ardından durum + `ReloadAsync`. Özet `Information`: eklenen, güncellenen, pasife çekilen, kaynak bazında başarılı/atlandı/başarısız.

**`InstrumentSyncJob.ExecuteAsync`:**
1. Cron'u `CronExpression.Parse(config["InstrumentSync:Cron"])` ile çöz; geçersizse `Error` loglayıp job'dan çık (servis çalışmaya devam eder).
2. Açılış kontrolü (yeni scope): durum satırı yoksa **veya** `Instruments` boşsa **veya** `cron.GetNextOccurrence(LastCompletedAt (UTC), MarketClock.Istanbul) <= UtcNow` → senkron çalıştır; değilse `Information` "atlandı, sonraki: …".
3. Döngü: `next = cron.GetNextOccurrence(UtcNow, MarketClock.Istanbul)`; `Task.Delay(next - UtcNow, ct)`; yeni scope'ta `SyncAsync`.
4. Her senkron çağrısı `try/catch`: `OperationCanceledException` (kapanış) hariç istisna → `Error`, döngü devam eder (Review Focus 1).

- [ ] **Step 1: `MarketClock.Istanbul`'u ekle.**
- [ ] **Step 2: `InstrumentSyncer`'ı yaz** (yukarıdaki algoritma).
- [ ] **Step 3: `InstrumentSyncJob`'u ve kayıtları yaz; cron'u appsettings'e ekle.**
- [ ] **Step 4: Build** — `0 Warning(s) 0 Error(s)`.
- [ ] **Step 5: Elle doğrula (dev, gerçek anahtar):**
  - İlk açılış (tablo boş) → senkron çalışır; özet logunda eklenen ≈ 15–17 bin.
  - Neon: `SELECT "Exchange","Type",count(*) FROM "Instruments" WHERE "IsActive" GROUP BY 1,2;` → 5 grup; `SELECT * FROM "Instruments" WHERE "Symbol" IN ('BRK.B','WCCB','GRIN','LINK','EKGYO','THYAO');` → `BRK.B` ve `WCCB` tek satır, `GRIN` yok, `LINK` iki satır (BIST ve US), `EKGYO` (REIT) var. Varant örneği: `SELECT count(*) FROM "Instruments" WHERE "Symbol" ~ 'W$' AND "Exchange"='NASDAQ';` sonucu gerekirse birkaç sembol Twelve Data'da kontrol edilir (W ile biten normal hisse olabilir).
  - `SELECT "Category",count(*) FROM "Instruments" GROUP BY 1;` → beş değer (`Common Stock`, `REIT`, `American Depositary Receipt`, `Depositary Receipt`, `ETF`).
  - Kaybolanlar logu: Neon'da birkaç aktif satırın sembolünü elle değiştir (ör. `UPDATE "Instruments" SET "Symbol"='ZZTEST1' WHERE "Market"='BIST' AND "Symbol"='THYAO';`), kısa cron ile senkronu çalıştır → `Warning` satırında `ZZTEST1` pasife çekilenler arasında, `THYAO` yeniden eklendi. Test satırını sil: `DELETE FROM "Instruments" WHERE "Symbol"='ZZTEST1';`.
  - Servisi yeniden başlat → senkron **çalışmaz** ("atlandı, sonraki: …" logu).
  - `InstrumentSync__Cron`'u env ile 2 dk sonrasına ayarla (ör. `*/2 * * * *`), bekle → senkron çalışır, özet logunda eklenen 0, güncellenen ~0. Sonra env'i kaldır.
  - `TWELVEDATA_API_KEY`'i geçici boşalt, cron'u yine kısa ayarla → 5 kaynak başarısız `Warning`, `Instruments` satır sayısı ve `IsActive` dağılımı değişmez, servis ayakta (Review Focus 2). Geri al.
  - Senkron sırasında Neon bağlantı dizesini bozmak pratik değilse: `SyncAsync` başına geçici `throw new InvalidOperationException("test")` koyup kısa cron ile çalıştır → `Error` logu, servis ayakta, `LastCompletedAt` değişmedi; satırı sil (Review Focus 1).
- [ ] **Step 6: Commit** (kullanıcı onayıyla) — `feat(market-service): gunluk enstruman senkronu`

---

### Task 5: Aramayı ve piyasa özetini kataloğa bağla, eski yolu kaldır

**Files:**
- Modify: `market-service/Services/SymbolSearchService.cs`
- Modify: `market-service/Services/MarketOverviewService.cs` (isim haritası)
- Modify: `market-service/Program.cs` (`IBistCatalog` kaydını sil)
- Delete: `market-service/Services/BistCatalog.cs`, `market-service/Services/IBistCatalog.cs`
- Modify: `market-service/Clients/ITwelveDataClient.cs`, `TwelveDataClient.cs` (`GetBistStocksAsync`, `SearchSymbolsAsync` sil)
- Modify: `market-service/Caching/CacheTtl.cs` (`Catalog` satırını sil)
- Modify: `market-service/Models/SymbolSearchResult.cs` (`InstrumentType` ve kullanılmayan `using` sil)

**Interfaces:**
- Consumes: `InstrumentCatalog.All`, `InstrumentCatalog.FindName` (Task 3).
- `ISymbolSearchService.SearchAsync(string query)` imzası ve `/search` cevabı (`symbol, market, exchange, name, currency`) **değişmez**; web ve portfolio-service'e dokunulmaz.

**Arama (spec §4.5):**
- Sembol karşılaştırması `YahooSymbol.Normalize(query)` ile; isim ve Türkçe takma ad karşılaştırması mevcut diakritik-duyarsız `Normalize` ile (`TurkishAliases` korunur).
- Gruplar: (1) sembol tam eşit, (2) sembol sorguyla başlıyor, (3) isim veya takma ad sorguyu içeriyor. Bir kayıt yalnızca ilk eşleştiği grupta yer alır.
- Grup içi sıra (plan kararı; deterministik olsun diye): `stock` önce `etf`, sonra kısa sembol önce, sonra sembol ordinal sırası.
- En fazla 15 sonuç; tekillik `(Market, Symbol)` (katalog zaten tekil).

**Piyasa özeti:** `nameMap` yerine `catalog.FindName("BIST", t) ?? t`.

- [ ] **Step 1: `SymbolSearchService`'i kataloğa geçir** — `ITwelveDataClient` ve `IBistCatalog` bağımlılıkları kalkar; senkron hale gelirse bile imza `Task` kalır (`Task.FromResult`).
- [ ] **Step 2: `MarketOverviewService` isim haritasını kataloğa geçir.**
- [ ] **Step 3: Eski kodu sil** (dosya listesi yukarıda); `grep -rn "BistCatalog\|SearchSymbolsAsync\|GetBistStocksAsync\|CacheTtl.Catalog\|InstrumentType" market-service --include=*.cs` → sonuç yok.
- [ ] **Step 4: Build + elle doğrula** — `0 Warning(s) 0 Error(s)`. Uygulamada (AddAsset arama kutusu) spec §2 başarı ölçütleri:
  - "apple" → yalnızca `AAPL · US` (Apple Inc.) ve isminde Apple geçen ABD kayıtları; Xetra/Meksika yok.
  - "link" → `LINK · BIST` ve `LINK · US`.
  - "brk.b", "BRK-B", "BRK.B" → `BRK.B · US`.
  - "thy" / "türk hava" / "turk hava" → `THYAO · BIST`.
  - "grin" → sembolü tam `GRIN` olan sonuç yok.
  - Piyasa özeti BIST 30 isimleri dolu.
  - `TWELVEDATA_API_KEY` boşken servisi yeniden başlat → arama aynı sonuçları verir (spec: "Twelve Data kapalıyken arama dünkü listeyle çalışır").
- [ ] **Step 5: Commit** (kullanıcı onayıyla) — `refactor(market-service): aramayi enstruman katalogundan yap, BistCatalog ve symbol_search kaldir`

---

## Deploy notu

Faz 2 tek deploy ile çıkar. Deploy'dan önce: `MARKET_DB_CONNECTION_STRING` AWS Secrets Manager `assay/prod/env`'e eklenir ve Neon'da `market-service` DB vardır. İlk açılışta tablo boş olduğundan senkron hemen çalışır; senkron bitene kadar (birkaç saniye) arama boş dönebilir; yalnızca ilk kurulumda olur.
