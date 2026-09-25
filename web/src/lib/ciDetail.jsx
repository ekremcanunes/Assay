/*
  GitHub Actions · CI/CD entegrasyon içeriği — stack.jsx'teki loadDetail ile ayrı chunk olarak yüklenir.
  Kararlar docs/superpowers/specs/2026-09-06-prod-pipeline-design.md'den (SonarCloud, Inspector kapalı, main-prod);
  araç gerekçeleri docs/10-standards/PIPELINE-SECURITY.md'den.
*/
import { PipelineFigure } from './ciFigures'

const detail = {
  tagline: 'Kodun push’tan prod’a kadar geçtiği kontrol noktaları. Her araç bir öncekinin göremediği yere bakar; hiçbiri diğerinin yerine geçmez.',
  why: [
    {
      t: 'Tarama solda kalır',
      d: 'Hata ne kadar erken yakalanırsa o kadar ucuz. Sır commit’lenmeden, açık merge’den, zafiyetli image ECR’a gitmeden durdurulur.',
    },
    {
      t: 'Taranan image = deploy edilen image',
      d: 'CodePipeline kaynak koddan yeniden build etmez. Git SHA ile etiketlenmiş, değiştirilemez (immutable) tag’li image aynen EC2’ye gider.',
    },
    {
      t: 'İnsan kapısı AWS’de',
      d: 'main-prod’a merge otomatik prod demek değil. CodePipeline’daki Manual Approval onaylanmadan hiçbir kod prod’a çıkmaz.',
    },
  ],
  blocks: [
    {
      kind: 'diagram',
      title: 'Kod hangi kontrol noktalarından geçiyor',
      body: 'Akış yukarıdan aşağı. Her nokta bir öncekinin kaçırdığını yakalar; voltaj renkli etiket o noktada akışı durdurabilen bir kapı olduğunu gösterir.',
      figure: <PipelineFigure />,
      caption: 'kapı: bulgu varsa bir sonraki noktaya geçilmez',
    },
    {
      kind: 'rule',
      title: 'Kim neye bakıyor',
      body: 'Araçlar iki soruya ayrılır: bizim yazdığımız kod mu, yoksa başkasının yazıp bizim kullandığımız parçalar mı? SAST ilkine, SCA ve container taraması ikincisine bakar.',
      table: {
        head: ['Araç', 'Neye bakar', 'Tür', 'Nerede'],
        rows: [
          ['CodeQL', 'bizim kodumuzdaki güvenlik açığı: SQL injection, XSS', 'SAST', 'PR · Actions'],
          ['SonarCloud', 'bizim kodumuzun kalitesi: tekrar, karmaşıklık, test kapsamı', 'kod kalitesi', 'PR · Actions'],
          ['npm audit · dotnet list --vulnerable', 'kullandığımız kütüphanelerdeki bilinen açıklar', 'SCA', 'PR · Actions'],
          ['Dependabot', 'yeni CVE açıklanınca bağımlılık uyarısı ve güncelleme PR’ı', 'SCA · sürekli', 'GitHub'],
          ['gitleaks', 'koda ya da git geçmişine sızmış anahtar, token, şifre', 'sır taraması', 'commit öncesi · Actions'],
          ['Push Protection', 'sır içeren push’u reddeder', 'sır taraması', 'GitHub push anı'],
          ['hadolint', 'Dockerfile yazımı: root kullanıcı, sabitlenmemiş sürüm', 'Dockerfile denetimi', 'PR · Actions'],
          ['Trivy', 'image içindeki OS paketleri (Debian, Alpine) ve kütüphaneler', 'container taraması', 'image build sonrası'],
          ['ECR scan-on-push', 'ECR’a gelen image için ikinci tarama', 'container taraması', 'AWS'],
          ['Syft', 'hangi image’da hangi kütüphane var envanteri', 'SBOM', 'image build sonrası'],
        ],
      },
      after: 'SAST bizim yazdığımız kodu, SCA başkasının yazıp bizim kullandığımız kodu inceler. Gerçek hayatta zafiyetlerin çoğu ikinci kategoriden çıkar.',
    },
    {
      kind: 'rule',
      title: 'SonarCloud ile Trivy aynı işi mi yapıyor?',
      body: 'Hayır. Biri kaynak kodu, diğeri build edilmiş image’ı okur; birbirinin göremediği yere bakar. Birini kaldırmak, o boşluğu kimsenin görmemesi demek.',
      table: {
        head: ['', 'SonarCloud', 'Trivy'],
        rows: [
          ['Neye bakar', 'kaynak kod (.cs, .jsx)', 'build edilmiş Docker image'],
          ['Ne bulur', 'tekrar eden mantık, karmaşıklık, test kapsamı', 'OS paketlerindeki ve kütüphanelerdeki bilinen CVE’ler'],
          ['Örnek bulgu', 'test edilmemiş bir servis metodu', 'aspnet:9.0 tabanındaki Debian’da eski bir openssl'],
          ['Kod değişmezse', 'sonuç aynı kalır', 'sonuç değişebilir: yeni CVE açıklanınca dünkü temiz image bugün açıklı çıkar'],
        ],
      },
      after: 'Web image’ının son hâlinde node_modules yok, yalnızca derlenmiş statik dosyalar var. Bu yüzden React tarafındaki npm açıklarını Trivy göremez; o boşluğu npm audit kapatır.',
    },
    {
      kind: 'rule',
      title: 'Kapı politikası',
      body: 'Aynı bulgu her ortamda aynı sertlikte ele alınmaz. Geri alınamayan her yerde kesilir; gürültülü olan önce veri toplar.',
      table: {
        head: ['Bulgu', 'test', 'main-prod'],
        rows: [
          ['Sır tespit edildi', 'durdurur', 'durdurur'],
          ['Critical zafiyet', 'uyarır', 'durdurur'],
          ['High zafiyet', 'uyarır', 'durdurur'],
          ['Medium / Low', 'raporlar', 'raporlar'],
        ],
      },
      after: 'Sır sızıntısı geri alınamaz; repo public olduğu için push edildiği anda yanmış sayılır. Critical/High prod’da katı, test’te esnek: geliştirme kilitlenmeden risk prod’un dışında kalır.',
    },
    {
      kind: 'warn',
      title: 'Tuzak: kapıyı ilk gün açmak',
      body: 'Her araç önce rapor modunda koşar ve gürültü seviyesi görülür; eşik sonra açılır. İlk gün açılan kapı yanlış pozitiflerle pipeline’ı kilitler ve sonunda devre dışı bırakılır. Kabul edilen bir bulgu sözlü kararla değil, süreli ve gerekçeli olarak .trivyignore ya da baseline dosyasına yazılır.',
    },
    {
      kind: 'code',
      title: 'Örnek: Trivy adımı (rapor modu)',
      code: `- name: Build image
  run: docker build -t assay/web:\${{ github.sha }} ./web

- name: Trivy image scan
  uses: aquasecurity/trivy-action@<commit-SHA>   # action'lar SHA ile sabitlenir
  with:
    image-ref: assay/web:\${{ github.sha }}
    severity: CRITICAL,HIGH
    exit-code: '0'   # rapor modu; gürültü görülünce '1' → bulgu varsa ECR'a push yok`,
      note: 'Trivy’yi kimse elle çağırmaz: image build edilince bir sonraki adım olarak kendiliğinden koşar.',
    },
    {
      kind: 'rule',
      title: 'Pipeline’ın kendi güvenliği',
      body: 'Pipeline kodu tarar ama kendisi korunmasızsa bütün taramalar atlanabilir. Kurumsal denetimlerin çoğu buradan takılır.',
      table: {
        head: ['Kural', 'Neden'],
        rows: [
          ['OIDC · statik AWS anahtarı yok', 'Actions her koşumda dakikalar ömürlü geçici kimlik alır; sızsa bile kısa sürede geçersiz'],
          ['Action’lar commit SHA ile sabit', 'etiket başka bir koda taşınabilir, SHA taşınamaz (tedarik zinciri saldırısı)'],
          ['permissions: daraltılmış', 'varsayılan geniş GITHUB_TOKEN yetkisi kullanılmaz'],
          ['main-prod korumalı', 'doğrudan push ve force push kapalı; PR ve status check zorunlu'],
          ['Sırlar Secrets Manager / SSM’de', 'prod sırrı repo’da ya da runner diskinde tutulmaz'],
        ],
      },
    },
  ],
  files: ['.github/workflows/codeql.yml', '.github/workflows/wsl-deploy.yml', 'docs/10-standards/PIPELINE-SECURITY.md'],
  doc: 'docs/superpowers/specs/2026-09-06-prod-pipeline-design.md',
}

export default detail
