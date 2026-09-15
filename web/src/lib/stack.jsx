/*
  Yığın verisi — landing'deki logo şeridi ve entegrasyon bölümü aynı kaynağı kullanır.

  `detail` dolu olan teknolojinin entegrasyon içeriği açılır; boş olanlar
  "sırada" rozetiyle listelenir. Yeni teknoloji eklerken sadece buraya yazılır,
  iki blok da kendiliğinden güncellenir.

  İşaretler stilize geometrik çizimlerdir, resmi marka varlıkları değildir.
*/

const s = {
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.6,
  viewBox: '0 0 32 32',
  'aria-hidden': true,
}

export const TECH = [
  {
    slug: 'react', name: 'React 19', role: 'ARAYÜZ',
    icon: (
      <svg {...s}><circle cx="16" cy="16" r="2.6" fill="currentColor" stroke="none" />
        <ellipse cx="16" cy="16" rx="13" ry="5.2" />
        <ellipse cx="16" cy="16" rx="13" ry="5.2" transform="rotate(60 16 16)" />
        <ellipse cx="16" cy="16" rx="13" ry="5.2" transform="rotate(120 16 16)" /></svg>),
  },
  {
    slug: 'vite', name: 'Vite', role: 'BUILD',
    icon: (
      <svg {...s}><path d="M16 3 L28 7.5 L24.5 25 L16 29 L7.5 25 L4 7.5 Z" strokeLinejoin="round" />
        <path d="M17.5 8 L13 17.5 h4 L14.5 24 L20 14 h-4 z" fill="currentColor" stroke="none" /></svg>),
  },
  {
    slug: 'tailwind', name: 'Tailwind v4', role: 'STİL',
    icon: (
      <svg {...s}><path d="M4 13 c2.5-5 5-6.5 7.5-4.5 1.7 1.3 2 3 4.5 3 2.5 0 3.5-2 3.5-2 -2.5 5-5 6.5-7.5 4.5 -1.7-1.3-2-3-4.5-3 -2.5 0-3.5 2-3.5 2 z" fill="currentColor" stroke="none" />
        <path d="M12.5 22 c2.5-5 5-6.5 7.5-4.5 1.7 1.3 2 3 4.5 3 2.5 0 3.5-2 3.5-2 -2.5 5-5 6.5-7.5 4.5 -1.7-1.3-2-3-4.5-3 -2.5 0-3.5 2-3.5 2 z" fill="currentColor" stroke="none" /></svg>),
  },
  {
    slug: 'dotnet', name: '.NET 9', role: 'SERVİSLER',
    icon: (
      <svg {...s}><path d="M6 8 h20 v16 a2 2 0 0 1-2 2 H8 a2 2 0 0 1-2-2 Z" strokeLinejoin="round" />
        <path d="M6 13 h20 M6 18 h20" /><path d="M11 5 v3 M21 5 v3" /></svg>),
  },
  {
    slug: 'postgresql', name: 'PostgreSQL', role: 'KALICI VERİ',
    icon: (
      <svg {...s}><ellipse cx="16" cy="8" rx="11" ry="4" />
        <path d="M5 8 v16 c0 2.2 4.9 4 11 4 s11-1.8 11-4 V8" />
        <path d="M5 16 c0 2.2 4.9 4 11 4 s11-1.8 11-4" /></svg>),
  },
  {
    slug: 'redis', name: 'Redis', role: 'CACHE',
    icon: (
      <svg {...s}><path d="M4 10 L16 5 L28 10 L16 15 Z" strokeLinejoin="round" />
        <path d="M4 16 L16 21 L28 16" /><path d="M4 22 L16 27 L28 22" /></svg>),
  },
  {
    slug: 'kratos', name: 'Ory Kratos', role: 'KİMLİK',
    icon: (
      <svg {...s}><path d="M16 3 L27 8 v8 c0 7-5 11.5-11 13 -6-1.5-11-6-11-13 V8 Z" strokeLinejoin="round" />
        <path d="M11.5 16 l3.2 3.2 L21 12.5" /></svg>),
  },
  {
    slug: 'docker', name: 'Docker', role: 'ÇALIŞTIRMA',
    icon: (
      <svg {...s}><rect x="4" y="17" width="5" height="5" /><rect x="10.5" y="17" width="5" height="5" />
        <rect x="17" y="17" width="5" height="5" /><rect x="10.5" y="10.5" width="5" height="5" />
        <rect x="17" y="10.5" width="5" height="5" />
        <path d="M22 19.5 c4 0 6-1.5 6-1.5 0 4.5-3.5 8.5-9 8.5 -7 0-11-4.5-11-4.5" /></svg>),
    // Diyagramlar ağır: içerik yalnızca Docker seçilince ayrı chunk olarak iner.
    loadDetail: () => import('./dockerDetail'),
  },
  {
    slug: 'nginx', name: 'nginx', role: 'KENAR',
    icon: (
      <svg {...s}><path d="M5 26 V9 L16 26 V9" strokeLinejoin="round" />
        <path d="M21 12 h6 M24 9 v6" opacity=".55" /></svg>),
    detail: {
      tagline: 'Uygulamanın tek giriş kapısı. Aynı anda hem statik sunucu hem reverse proxy.',
      why: [
        {
          t: 'Tek origin, sıfır CORS',
          d: 'Frontend, API ve Kratos tek adres üzerinden servis edilince tarayıcı için hepsi aynı origin olur. Ayrı porta gidilseydi her istek CORS izni gerektirecekti; nginx bu problem sınıfını tamamen ortadan kaldırıyor.',
        },
        {
          t: 'Servisler dışarı açılmıyor',
          d: 'Dışarıya yalnızca 80 portu açık. portfolio-service, market-service, Kratos ve Redis host üzerinde hiç yayınlanmıyor — Kratos admin API ve şifresiz Redis böylece dış dünyadan erişilemez kalıyor.',
        },
        {
          t: 'Son imajda Node yok',
          d: 'Multi-stage build ilk aşamada React uygulamasını derliyor, son imaja yalnızca statik çıktı ve nginx giriyor. Çalışma zamanına JavaScript derleyicisi taşınmıyor.',
        },
      ],
      blocks: [
        {
          kind: 'code',
          title: 'web/nginx.conf',
          code: `server {
    listen 80;
    root /usr/share/nginx/html;      # React build çıktısı
    index index.html;

    location /api/ {
        proxy_pass http://portfolio-service:5001;   # önek KORUNUR
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header Cookie $http_cookie;
    }

    location /.ory/ {
        proxy_pass http://kratos:4433/;             # önek ATILIR
    }

    location / {
        try_files $uri $uri/ /index.html;           # SPA fallback
    }
}`,
          note: 'İki proxy bloğu bilerek farklı yazıldı — nedeni hemen altta.',
        },
        {
          kind: 'rule',
          title: 'proxy_pass sonundaki eğik çizgi her şeyi değiştiriyor',
          body: 'Kural şu: proxy_pass adresinde host:port sonrasında herhangi bir yol yazılıysa (tek bir eğik çizgi bile olsa) nginx location önekini keser ve yerine o yolu koyar. Yol yazılmamışsa istek yolu hiç değiştirilmeden iletilir.',
          table: {
            head: ['location', 'proxy_pass', 'Gelen istek', 'Arkaya giden'],
            rows: [
              ['/api/', 'portfolio-service:5001', '/api/assets', '/api/assets'],
              ['/.ory/', 'kratos:4433/', '/.ory/sessions/whoami', '/sessions/whoami'],
            ],
          },
          after: 'portfolio-service endpointleri zaten /api ile başlıyor; önek kesilseydi servis /assets görür ve 404 dönerdi. Kratos ise /.ory diye bir yol tanımıyor; kesilmeseydi bu sefer o 404 dönerdi. /.ory tamamen bizim uydurduğumuz bir yönlendirme etiketi, Kratos’a varmadan atılması gerekiyor.',
        },
        {
          kind: 'warn',
          title: 'Tuzak: location ile proxy_pass uyumsuzluğu',
          body: 'location /.ory (sonda eğik çizgi yok) ile proxy_pass http://kratos:4433/ (sonda var) birlikte yazılırsa, /.ory/sessions isteğinde önek kesilip geriye /sessions kalır, başına bir eğik çizgi daha eklenince //sessions olur. Kural: location ve proxy_pass ya ikisi de eğik çizgiyle bitsin ya da hiçbiri.',
        },
        {
          kind: 'rule',
          title: 'try_files — sayfa yenilemenin 404 vermemesi',
          body: '/assets sayfasındayken F5’e basıldığında diskte "assets" adlı bir dosya yoktur. nginx sırayla dosyaya, sonra klasöre bakar; ikisi de yoksa index.html döner ve React Router adresi okuyup doğru sayfayı çizer. Bu satır olmasaydı her yenileme 404 olurdu.',
        },
        {
          kind: 'rule',
          title: 'Cookie akışı — kimlik doğrulama buradan yürüyor',
          body: 'Cookie’ler host’a bağlıdır, porta değil. Kratos’un bıraktığı ory_kratos_session cookie’si tarayıcı tarafından /api/ isteklerine de kendiliğinden ekleniyor. nginx bunu arkaya iletiyor; portfolio-service kimliği kendisi çözmüyor, cookie’yi Kratos’a gösterip "bu kim" diye soruyor.',
          code: `Tarayıcı ──GET /api/assets  Cookie: ory_kratos_session=abc──▶ nginx
nginx    ──GET /api/assets  Cookie: ory_kratos_session=abc──▶ portfolio-service
portfolio-service ──GET /sessions/whoami  (aynı cookie)──▶ Kratos
Kratos   ──200 { identity: { id: "u-123" } }──▶ portfolio-service`,
        },
        {
          kind: 'rule',
          title: 'ports yerine expose — proxy’nin atlanmasını engellemek',
          body: 'ports ile host’a açılan her servis nginx’e uğramadan erişilebilir hale gelir; o anda proxy’deki bütün kurallar (yönlendirme, başlıklar, ileride rate limit ve TLS) devre dışı kalır. Aynı Docker ağındaki konteynerler expose yazılmasa bile birbirine erişebildiği için, güvenliği sağlayan şey iç servislerde ports bulunmamasıdır.',
          table: {
            head: ['', 'ports: "5001:5001"', 'expose: ["5001"]'],
            rows: [
              ['Host’tan erişim', 'Açık', 'Kapalı'],
              ['Ağ içinden erişim', 'Açık', 'Açık'],
              ['İşlevi', 'Portu host’a yayınlar', 'Belgeleme'],
            ],
          },
          after: 'Kural: dışarıya sadece giriş kapısı olan web servisi ports ile açılır, diğerleri expose ile belgelenir.',
        },
        {
          kind: 'warn',
          title: 'Ayar değiştiğinde restart yetmiyor',
          body: 'Dockerfile’daki COPY nginx.conf satırı build anında çalışır ve o anki içeriği imaja kalıcı olarak yazar; diskteki dosyayla imaj arasında canlı bir bağ kalmaz. docker compose restart web ve docker compose up -d web eski ayarı kullanmaya devam eder. Değişikliğin yansıması için docker compose up -d --build web gerekir.',
        },
      ],
      files: ['web/nginx.conf', 'web/Dockerfile', 'docker-compose.yml', 'kratos/kratos.yml'],
      doc: 'docs/40-learning/NGINX-LEARNING.md',
    },
  },
  {
    slug: 'aws', name: 'AWS', role: 'BULUT — SIRADA',
    icon: (
      <svg {...s}><path d="M6 14 a5 5 0 0 1 4.6-5 6.4 6.4 0 0 1 12 1.6 A4.4 4.4 0 0 1 26 19 H9 a4 4 0 0 1-3-5 z" strokeLinejoin="round" />
        <path d="M6 24 c4 1.8 8 2.6 10 2.6 s6-.8 10-2.6" strokeLinecap="round" />
        <path d="M24 22.6 l2.4 1.4 -1 2.5" strokeLinecap="round" strokeLinejoin="round" /></svg>),
  },
  {
    slug: 'github-actions', name: 'GitHub Actions', role: 'CI/CD',
    icon: (
      <svg {...s}><circle cx="16" cy="16" r="11" /><path d="M16 9 v7 l5 3" />
        <path d="M25 7 l2.5-2.5 M27.5 4.5 v4 M27.5 4.5 h-4" opacity=".55" /></svg>),
  },
  {
    slug: 'tanstack-query', name: 'TanStack Query', role: 'SUNUCU VERİSİ',
    icon: (
      <svg {...s}><rect x="4" y="6" width="24" height="20" rx="2" strokeLinejoin="round" />
        <path d="M4 11 h24" /><path d="M9 17 h6 M9 21 h10" /><circle cx="21.5" cy="17.5" r="2.5" /></svg>),
  },
]

export const STACK_COLUMNS = [
  { h: 'Arka uç', rows: [['portfolio-service', '.NET 9'], ['market-service', '.NET 9'], ['ORM', 'EF Core'],
    ['Veritabanı', 'PostgreSQL · Neon'], ['Cache', 'Redis'], ['Kimlik', 'Ory Kratos 1.2'], ['Log', 'Serilog · JSON']] },
  { h: 'Ön uç', rows: [['Çatı', 'React 19 · Vite'], ['Stil', 'Tailwind v4'], ['Bileşen', 'shadcn/ui'],
    ['Sunucu verisi', 'TanStack Query'], ['Dağılım grafiği', 'Recharts'], ['Fiyat grafiği', 'Lightweight Charts'], ['Dil', 'TR / EN']] },
  { h: 'Altyapı', rows: [['Çalıştırma', 'Docker Compose'], ['Kenar', 'nginx'], ['Ortam', 'WSL2 · Ubuntu'],
    ['Dağıtım', 'GitHub Actions'], ['Bulut', 'AWS — sırada'], ['Kod taraması', 'CodeQL'], ['Sır yönetimi', 'Actions secrets']] },
]

export const DEFAULT_TECH = 'nginx'
