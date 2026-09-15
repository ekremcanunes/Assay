/*
  Docker entegrasyon içeriği — stack.jsx'teki loadDetail ile ayrı chunk olarak yüklenir.
  Makineye özel değerler (kullanıcı yolu, volume hash'i, commit, MB) bilerek yok: sayfa public ve bunlar eskir.
*/
import { BuildFigure, RuntimeFigure, InsideFigure } from './dockerFigures'

const detail = {
  tagline: 'Altı servisi tek komutla aynı ağda ayağa kaldıran çalışma ortamı. Kodun image’a nasıl girdiğini ve verinin nerede yaşadığını bilmek, “değişikliğim neden yansımadı” sorusunun cevabı.',
  why: [
    {
      t: 'Tek komut, aynı ortam',
      d: 'docker compose up ile web, iki .NET servisi, Kratos, Postgres ve Redis sabit sürümlerle aynı ağda kalkar. Servisler birbirini IP ile değil, servis adıyla bulur.',
    },
    {
      t: 'Küçük runtime image',
      d: 'Multi-stage build: SDK ve kaynak kod ilk aşamada kalır, son image’a yalnızca derlenmiş çıktı girer. Prod container’ında derleyici bulunmaz.',
    },
    {
      t: 'Veri container’dan ayrı',
      d: 'Container silinip yeniden kurulabilir. Kullanıcı kayıtları named volume’da, Kratos ayarları bind mount’ta durur; ikisi de container’la birlikte gitmez.',
    },
  ],
  blocks: [
    {
      kind: 'diagram',
      title: 'Build: portfolio-service image’ı nasıl oluşuyor',
      body: 'Dockerfile iki aşamalı. Birinci aşama derler, ikinci aşama yalnızca çıktıyı alır. Klasörden gelen her şey düz oklarla, yani kopya olarak girer.',
      figure: <BuildFigure />,
      caption: 'Düz ok: kopya (build anında bir kez) · kesik ok: silinen aşama',
    },
    {
      kind: 'code',
      title: 'portfolio-service/Dockerfile',
      code: `# Stage 1: Build
FROM mcr.microsoft.com/dotnet/sdk:9.0 AS build
WORKDIR /src
# Bağımlılık katmanı: yalnızca .csproj değişince yeniden çalışır
COPY portfolio-service.csproj ./
RUN dotnet restore
COPY . .
RUN dotnet publish -c Release -o /publish --no-restore

# Stage 2: Runtime
FROM mcr.microsoft.com/dotnet/aspnet:9.0
WORKDIR /app
COPY --from=build /publish .
CMD ["dotnet", "portfolio-service.dll"]`,
      note: 'market-service aynı yapıda; web aynı fikri package.json + npm ci ile uyguluyor.',
    },
    {
      kind: 'rule',
      title: 'Katman önbelleği: hangi adım ne zaman yeniden çalışır',
      body: 'Docker her COPY satırında kopyalanan dosyaların parmak izini (checksum) önceki build’le karşılaştırır. Aynıysa o katmanı ve altındakileri önbellekten alır; farklıysa o satırdan itibaren her şeyi baştan çalıştırır. “Sadece yeni paketi indir” diye bir ara yol yoktur.',
      table: {
        head: ['Ne değişti', 'dotnet restore', 'dotnet publish'],
        rows: [
          ['Hiçbir şey', 'cache', 'cache'],
          ['Sadece Program.cs', 'cache · paket inmez', 'yeniden · tüm kod derlenir'],
          ['.csproj’a paket eklendi', 'yeniden · tüm paketler iner', 'yeniden · tüm kod derlenir'],
        ],
      },
      after: '.csproj “paketleri yeniden indirmem gerekiyor mu?” sorusunu, kod “yeniden derlemem gerekiyor mu?” sorusunu cevaplar. Günlük işin çoğu ikinci satır olduğu için çoğu build’de indirme adımı atlanır.',
    },
    {
      kind: 'warn',
      title: 'Tuzak: COPY . . en başta ve .dockerignore yok',
      body: 'Kod en başta kopyalanırsa Program.cs’e eklenen tek satır bile alttaki restore’u baştan çalıştırır ve tüm paketler her build’de yeniden iner. .dockerignore yoksa Windows’ta oluşmuş bin/ ve obj/ ile node_modules da build’e taşınır; obj/ içindeki Windows yolları Linux build’ini bozabilir.',
    },
    {
      kind: 'diagram',
      title: 'Çalışırken: klasör, image, container, volume',
      body: 'Soldaki iki sütun image oluşurken bir kez olur. Sağdaki kesik oklar container çalıştığı sürece canlıdır ve container silinse de diskte kalan şeylere gider.',
      figure: <RuntimeFigure />,
      caption: 'Düz ok: kopya · kesik çift yönlü ok: canlı bağ (mount)',
    },
    {
      kind: 'diagram',
      title: 'Bir container’ın içi: kratos',
      body: 'Container içinden bakınca tek bir Linux dosya sistemi görünür. Ama her dizin gerçekte başka yerde durur: image katmanında, WSL diskinde ya da Docker’ın volume deposunda.',
      figure: <InsideFigure />,
      caption: 'docker inspect (mount’lar) · docker exec ls (dizinler) · docker diff (yazılanlar) · docker history (katmanlar)',
    },
    {
      kind: 'rule',
      title: 'Komut komut: neyi nereden nereye gönderiyor',
      body: 'İlk grup docker compose build sırasında Dockerfile içinde çalışır; sonrakiler terminalde yazılan compose komutlarıdır.',
      table: {
        head: ['Komut', 'Neyi', 'Nereden', 'Nereye'],
        rows: [
          ['docker compose build', 'servis klasörü (.dockerignore hariç)', '~/assay/<servis>/', 'build context'],
          ['COPY *.csproj ./', 'yalnızca proje dosyası', 'build context', '1. aşama · /src'],
          ['RUN dotnet restore', 'NuGet paketleri', 'nuget.org', '1. aşama · paket önbelleği'],
          ['COPY . .', 'tüm kaynak kod', 'build context', '1. aşama · /src'],
          ['RUN dotnet publish', 'derlenmiş DLL’ler', '1. aşama · /src', '1. aşama · /publish'],
          ['COPY --from=build', 'yalnızca derlenmiş çıktı', '1. aşama · /publish', '2. aşama · /app → image'],
          ['docker compose pull', 'hazır image’lar', 'Docker Hub', 'yerel image deposu'],
          ['docker compose up -d', 'çalışan kopya + mount’lar', 'image · volume · ~/assay/kratos', 'container'],
          ['docker compose down', 'container’lar', '—', 'silinir · image ve volume kalır'],
          ['docker compose down -v', 'container’lar + volume’lar', '—', 'silinir · kullanıcı kayıtları dahil'],
        ],
      },
    },
    {
      kind: 'rule',
      title: 'Container silinince ne kalır',
      body: 'docker compose down container’ları siler. Neyin kaybolup neyin kaldığı, dosyanın hangi yoldan girdiğine bağlı.',
      table: {
        head: ['Ne', 'Nasıl girdi', 'down sonrası'],
        rows: [
          ['Uygulama kodu', 'kopya · build', 'image’da durur'],
          ['Redis verisi (/data)', 'container katmanı', 'silinir · volume yok'],
          ['Kratos ayarları', 'bind mount · ~/assay/kratos', 'WSL diskinde kalır'],
          ['Kullanıcı kayıtları', 'named volume', 'kalır · yalnızca down -v siler'],
          ['Kratos çalışma dizinleri', 'anonim volume', 'kalır · isimsiz, sahipsiz birikebilir'],
        ],
      },
    },
    {
      kind: 'warn',
      title: 'Derlenen kod: diskte o an ne varsa',
      body: 'Build, komutun çalıştırıldığı klasördeki dosyaları alır; Docker git’e bakmaz. Stack WSL’deki ~/assay kopyasından çalıştığı için Windows’ta yapılan değişiklik git ile oraya gelmeden derlenmez ve bind mount’a da yansımaz. O klasörde commit’lenmemiş bir değişiklik varsa o da derlenir.',
    },
  ],
  files: ['portfolio-service/Dockerfile', 'market-service/Dockerfile', 'web/Dockerfile', '*/.dockerignore', 'docker-compose.yml'],
  doc: 'docs/40-learning/DOCKER-LEARNING.md',
}

export default detail
