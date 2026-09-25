/*
  Giriş ekranı görselinin entegrasyon içeriği — stack.jsx'teki loadDetail ile ayrı chunk olarak yüklenir.
  Rakamlar son build'den: AuthVisualScene ~4.4 KB, gzip ~2.1 KB.
*/

const detail = {
  tagline: 'Login ve kayıt ekranının sağındaki boşluk: mouse’a bükülen ızgara ve üzerinde temsili bir Assay mum grafiği. Hazır bir 3D kütüphane yerine tarayıcının kendi araçlarıyla, birkaç KB’lık tek bir bileşen olarak yazıldı.',
  why: [
    {
      t: 'Kütüphane yok',
      d: 'Spline ya da Three.js, login’in ilk yüklemesine yüzlerce KB ile 1 MB arası ekler. Izgara 2D Canvas’a, mumlar inline SVG’ye çiziliyor; sahnenin tamamı gzip ile yaklaşık 2 KB.',
    },
    {
      t: 'VOLTAJ dilinde',
      d: 'Renkler token’dan okunuyor: çizgiler --border, yükselen ve düşen mumlar --up / --down, voltaj rengi yalnızca hareketli ortalama hattında. Gölge, gradyan ya da dördüncü renk yok.',
    },
    {
      t: 'Veri uydurmuyor',
      d: 'Mumlar sabit tohumlu bir diziden üretiliyor; her açılışta aynı grafik. Fiyat, yüzde ya da eksen rakamı yok (DESIGN.md §6): görsel süs, piyasa verisi gibi davranmıyor.',
    },
  ],
  blocks: [
    {
      kind: 'rule',
      title: 'Nasıl çiziliyor',
      body: 'Sahne üç katmandan oluşuyor ve her katman işine en uygun tarayıcı aracıyla çiziliyor. Sık değişen ve çok sayıda nokta içeren ızgara Canvas’ta; tek tek etkileşim gereken mumlar SVG’de.',
      table: {
        head: ['Katman', 'Teknik', 'Neden'],
        rows: [
          ['Izgara', 'Canvas 2D · requestAnimationFrame', 'mouse’a göre her karede yeniden hesaplanan ~2 bin nokta; DOM’a eleman eklemez'],
          ['Mumlar', 'inline SVG · 36 mum', 'her mum ayrı eleman; hover’da tek tek kaldırılabilir, rengi token’dan gelir'],
          ['Hareketli ortalama', 'SVG path · @keyframes flow', 'landing’deki mimari diyagramda akan hatla aynı animasyon'],
          ['Okuma çizgisi', '1px çizgi · translate3d', 'yalnızca transform değişir, sayfa yerleşimi yeniden hesaplanmaz'],
        ],
      },
      after: 'Izgara, auth zeminindeki .paper sınıfının 34px ızgarasıyla aynı orijine hizalanıyor; kartın arkasındaki çizgilerle kesintisiz devam ediyor.',
    },
    {
      kind: 'code',
      title: 'web/src/components/AuthVisual.jsx',
      code: `const AuthVisualScene = lazy(() => import('./AuthVisualScene'))

const wide = window.matchMedia('(min-width: 64rem)')
const subscribe = (cb) => {
  wide.addEventListener('change', cb)
  return () => wide.removeEventListener('change', cb)
}

export default function AuthVisual() {
  const isWide = useSyncExternalStore(subscribe, () => wide.matches)
  if (!isWide) return null
  return (
    <Suspense fallback={null}>
      <AuthVisualScene />
    </Suspense>
  )
}`,
      note: 'Geniş ekran değilse bileşen null döner ve sahne chunk’ı hiç istenmez.',
    },
    {
      kind: 'rule',
      title: 'Performans: neye dikkat edildi',
      body: 'Login, uygulamanın ilk açılan sayfası. Görsel ne kadar hoş olursa olsun formun görünmesini geciktirmemeli ve boşta beklerken pil tüketmemeli.',
      table: {
        head: ['Önlem', 'Kod', 'Etkisi'],
        rows: [
          ['Ayrı chunk', 'lazy(() => import(…))', 'login’in ana paketine eklenmez · ~4.4 KB, gzip ~2.1 KB'],
          ['Yalnızca geniş ekran', 'matchMedia(min-width: 64rem)', 'mobilde indirilmez, çizilmez'],
          ['Boşta döngü yok', 'mercek oturunca raf = 0', 'mouse durunca çizim döngüsü durur, CPU harcamaz'],
          ['Hover’da render yok', 'style.transform DOM’a yazılır', 'mouse hareketinde React yeniden render etmez'],
          ['Retina sınırı', 'Math.min(devicePixelRatio, 2)', '3x ekranlarda canvas piksel sayısı büyümez'],
          ['Pasif dinleyici', '{ passive: true }', 'pointermove sayfa kaydırmayı bloklamaz'],
          ['Temizlik', 'disconnect · removeEventListener', 'sayfadan çıkınca dinleyici ve döngü kalmaz'],
        ],
      },
    },
    {
      kind: 'warn',
      title: 'Tuzak: hover’ı React state ile yapmak',
      body: 'Mouse her hareket ettiğinde setState çağrılsaydı 36 mumluk SVG saniyede onlarca kez yeniden render olurdu. Bunun yerine en yakın mumun sırası hesaplanıyor ve yalnızca değiştiğinde üç mumun transform değeri doğrudan yazılıyor; kalkma animasyonunu CSS geçişi yapıyor.',
    },
    {
      kind: 'rule',
      title: 'Güvenlik ve erişilebilirlik',
      body: 'Giriş sayfası parolanın yazıldığı yer. Buraya eklenen süs, formun güvenliğine ve kullanılabilirliğine hiçbir şey eklememeli, hiçbir şey de götürmemeli.',
      table: {
        head: ['Konu', 'Karar'],
        rows: [
          ['Dış kaynak', 'CDN, iframe ya da üçüncü taraf script yok; login sayfasına dışarıdan kod girmez, ileride CSP sıkılaştırıldığında izin listesine bir şey eklemek gerekmez'],
          ['Ağ isteği', 'sahne hiçbir istek atmaz; mum serisi paketin içinde sabit'],
          ['Kullanıcı verisi', 'form alanlarına, oturuma ya da çerezlere dokunmaz'],
          ['Tıklama', 'pointer-events: none · form ve butonların önüne geçmez'],
          ['Ekran okuyucu', 'aria-hidden · süs olduğu için okunmaz'],
          ['Hareket hassasiyeti', 'prefers-reduced-motion · ızgara bükülmez, akış durur, mumlar kıpırdamaz'],
        ],
      },
    },
  ],
  files: ['web/src/components/AuthVisual.jsx', 'web/src/components/AuthVisualScene.jsx', 'web/src/pages/Login.jsx', 'web/src/pages/Register.jsx'],
  doc: 'docs/10-standards/DESIGN.md §5.4',
}

export default detail
