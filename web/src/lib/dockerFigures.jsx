/*
  Docker rehberinin diyagramları — landing'deki mimari diyagramla aynı SVG dili.
  Makineye özel değerler (kullanıcı yolu, volume hash'i, commit, MB) bilerek yok: sayfa public ve bunlar eskir.
*/

const CARD = 'hsl(var(--card))'
const INPUT = 'hsl(var(--input))'
const INK = 'hsl(var(--foreground))'
const MUTED = 'hsl(var(--muted-foreground))'
const VOLT = 'hsl(var(--voltage))'

const LBL = 'fill-[hsl(var(--muted-foreground))] font-mono text-[9.5px] tracking-wider'
const TTL = 'fill-[hsl(var(--foreground))] text-[12.5px] font-semibold'
const MONO = 'fill-[hsl(var(--foreground))] font-mono text-[11px]'
const MONO_S = 'fill-[hsl(var(--foreground))] font-mono text-[10px]'
const SUB = 'fill-[hsl(var(--muted-foreground))] font-mono text-[9.5px]'
const VLBL = 'fill-[hsl(var(--voltage))] font-mono text-[9.5px]'

function Markers({ id }) {
  const head = (name, color) => (
    <marker id={`${id}-${name}`} viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
      <path d="M0 0 L10 5 L0 10 z" fill={color} />
    </marker>
  )
  return <defs>{head('ink', INK)}{head('volt', VOLT)}{head('muted', MUTED)}</defs>
}

function Box({ x, y, w, h, strong, dashed }) {
  return (
    <rect x={x} y={y} width={w} height={h} rx="6" fill={CARD}
          stroke={strong ? INK : dashed ? MUTED : INPUT} strokeWidth={strong ? 1.4 : 1}
          strokeDasharray={dashed ? '3 3' : undefined} />
  )
}

const copy = (id) => ({ fill: 'none', stroke: INK, strokeWidth: 1.2, markerEnd: `url(#${id}-ink)` })
const mount = (id) => ({ fill: 'none', stroke: VOLT, strokeWidth: 1.5, strokeDasharray: '6 5', markerStart: `url(#${id}-volt)`, markerEnd: `url(#${id}-volt)` })
const gone = (id) => ({ fill: 'none', stroke: MUTED, strokeWidth: 1.1, strokeDasharray: '3 4', markerEnd: `url(#${id}-muted)` })

export function BuildFigure() {
  const id = 'dk-build'
  const rows = [
    { y: 68, t: 'COPY portfolio-service.csproj ./', tag: 'cache', hot: true },
    { y: 114, t: 'RUN dotnet restore', tag: 'cache · paket inmez', hot: true },
    { y: 160, t: 'COPY . .', tag: 'kod değişince yeniden' },
    { y: 206, t: 'RUN dotnet publish -o /publish', tag: 'derler' },
  ]
  return (
    <svg viewBox="0 0 860 350" className="block h-auto w-full min-w-[720px]" role="img"
         aria-label="portfolio-service klasöründen csproj ve kod birinci aşamaya kopyalanır; restore ve publish çalışır; ikinci aşama yalnızca /publish klasörünü alır; SDK ve kaynak kod image'a girmez.">
      <Markers id={id} />
      <text x="0" y="14" className={LBL}>~/ASSAY</text>
      <text x="230" y="14" className={LBL}>1. AŞAMA · BUILD</text>
      <text x="640" y="14" className={LBL}>2. AŞAMA · RUNTIME</text>

      <Box x={0} y={30} w={170} h={250} />
      <text x="12" y="52" className={TTL}>portfolio-service/</text>
      <line x1="12" y1="62" x2="158" y2="62" stroke={INPUT} />
      <text x="12" y="89" className={MONO_S}>portfolio-service.csproj</text>
      <text x="12" y="134" className={MONO_S}>Program.cs</text>
      <text x="12" y="152" className={MONO_S}>Controllers/  Services/</text>
      <text x="12" y="170" className={MONO_S}>Data/  Models/  …</text>
      <text x="12" y="222" className={SUB}>bin/  obj/</text>
      <line x1="10" y1="219" x2="70" y2="219" stroke={MUTED} />
      <text x="12" y="240" className={SUB}>.dockerignore → gönderilmez</text>

      <Box x={230} y={30} w={340} h={270} />
      <text x="244" y="52" className={TTL}>build</text>
      <text x="284" y="52" className={SUB}>dotnet/sdk:9.0</text>
      {rows.map((r) => (
        <g key={r.t}>
          <rect x="244" y={r.y} width="312" height="38" rx="5" fill={CARD} stroke={INPUT} />
          <text x="256" y={r.y + 23} className={MONO}>{r.t}</text>
          <text x="546" y={r.y + 23} textAnchor="end" className={r.hot ? VLBL : SUB}>{r.tag}</text>
        </g>
      ))}
      <text x="244" y="284" className={SUB}>bu aşamada: SDK · kaynak kod · NuGet önbelleği</text>

      <path d="M172 86 H242" {...copy(id)} />
      <text x="207" y="79" textAnchor="middle" className={SUB}>COPY</text>
      <path d="M172 150 H204 V179 H242" {...copy(id)} />
      <text x="222" y="172" textAnchor="middle" className={SUB}>COPY</text>

      <Box x={640} y={110} w={220} h={130} strong />
      <text x="654" y="132" className={TTL}>runtime</text>
      <text x="710" y="132" className={SUB}>dotnet/aspnet:9.0</text>
      <line x1="654" y1="142" x2="846" y2="142" stroke={INPUT} />
      <text x="654" y="164" className={MONO}>/app ← /publish</text>
      <text x="654" y="184" className={MONO}>CMD dotnet</text>
      <text x="654" y="200" className={MONO}>  portfolio-service.dll</text>
      <text x="654" y="226" className={SUB}>derleyici yok · kaynak kod yok</text>
      <text x="750" y="264" textAnchor="middle" className={TTL}>= assay-portfolio-service</text>

      <path d="M558 225 H598 V175 H638" {...copy(id)} />
      <text x="598" y="165" textAnchor="middle" className={SUB}>--from=build</text>
      <text x="598" y="244" textAnchor="middle" className={SUB}>yalnızca /publish</text>

      <path d="M400 302 V334 H424" {...gone(id)} />
      <text x="430" y="338" className={SUB}>1. aşama atılır: SDK ve kaynak kod image’a girmez</text>
    </svg>
  )
}

export function RuntimeFigure() {
  const id = 'dk-run'
  const containers = [
    { y: 36, t: 'web' },
    { y: 88, t: 'market-service' },
    { y: 140, t: 'portfolio-service' },
    { y: 192, t: 'kratos-migrate', s: '/etc/config/kratos' },
    { y: 244, t: 'kratos', s: '/etc/config/kratos' },
    { y: 296, t: 'postgres', s: '/var/lib/postgresql/data' },
    { y: 348, t: 'redis', s: '/data' },
  ]
  const images = [
    { y: 36, h: 40, t: 'assay-web', s: 'nginx + dist' },
    { y: 88, h: 40, t: 'assay-market-service', s: 'aspnet:9.0' },
    { y: 140, h: 40, t: 'assay-portfolio-service', s: 'aspnet:9.0' },
    { y: 192, h: 92, t: 'oryd/kratos:v1.2.0', s: 'tek image · iki container' },
    { y: 296, h: 40, t: 'postgres:16-alpine' },
    { y: 348, h: 40, t: 'redis:alpine' },
  ]
  return (
    <svg viewBox="0 0 860 400" className="block h-auto w-full min-w-[720px]" role="img"
         aria-label="Proje klasörleri build ile, registry image'ları pull ile image olur; image'lar up ile container olur. ~/assay/kratos iki kratos container'ına bind mount, kratos_postgres_data postgres'e named volume olarak bağlanır; redis'in volume'u yoktur.">
      <Markers id={id} />
      <text x="0" y="14" className={LBL}>KAYNAK</text>
      <text x="200" y="14" className={LBL}>IMAGE</text>
      <text x="430" y="14" className={LBL}>CONTAINER</text>
      <text x="680" y="14" className={LBL}>KALICI DEPOLAMA</text>

      {['web/', 'market-service/', 'portfolio-service/'].map((t, i) => (
        <g key={t}>
          <Box x={0} y={36 + i * 52} w={150} h={40} />
          <text x="12" y={60 + i * 52} className={MONO}>{t}</text>
          <path d={`M152 ${56 + i * 52} H198`} {...copy(id)} />
          <text x="175" y={50 + i * 52} textAnchor="middle" className={SUB}>build</text>
        </g>
      ))}
      <rect x="0" y="192" width="150" height="196" rx="6" fill="hsl(var(--background))" stroke={INPUT} />
      <text x="12" y="214" className={TTL}>Registry</text>
      <text x="12" y="230" className={SUB}>Docker Hub</text>
      <text x="12" y="244" className={SUB}>hazır image’lar</text>
      {[238, 316, 368].map((y) => (
        <g key={y}>
          <path d={`M152 ${y} H198`} {...copy(id)} />
          <text x="175" y={y - 6} textAnchor="middle" className={SUB}>pull</text>
        </g>
      ))}

      {images.map((m) => (
        <g key={m.t}>
          <Box x={200} y={m.y} w={180} h={m.h} />
          <text x="212" y={m.y + (m.h > 40 ? 42 : m.s ? 17 : 24)} className={MONO}>{m.t}</text>
          {m.s && <text x="212" y={m.y + (m.h > 40 ? 58 : 31)} className={SUB}>{m.s}</text>}
        </g>
      ))}

      {containers.map((c) => (
        <g key={c.t}>
          <Box x={430} y={c.y} w={170} h={40} strong />
          <text x="442" y={c.y + (c.s ? 17 : 24)} className={TTL}>{c.t}</text>
          {c.s && <text x="442" y={c.y + 31} className={SUB}>{c.s}</text>}
        </g>
      ))}

      {[56, 108, 160, 316, 368].map((y) => (
        <g key={y}>
          <path d={`M382 ${y} H428`} {...copy(id)} />
          <text x="405" y={y - 6} textAnchor="middle" className={SUB}>up</text>
        </g>
      ))}
      <path d="M382 238 H404 V212 H428" {...copy(id)} />
      <path d="M404 238 V264 H428" {...copy(id)} />
      <text x="392" y="232" textAnchor="middle" className={SUB}>up</text>

      <text x="680" y="50" className={SUB}>web ve iki .NET servisinin</text>
      <text x="680" y="64" className={SUB}>kalıcı depolaması yok;</text>
      <text x="680" y="78" className={SUB}>veriyi Postgres’e ve</text>
      <text x="680" y="92" className={SUB}>Redis’e yazarlar.</text>

      <Box x={680} y={192} w={180} h={92} />
      <text x="692" y="212" className={MONO}>~/assay/kratos</text>
      <text x="692" y="226" className={SUB}>WSL’deki proje kopyası</text>
      <text x="692" y="254" className={SUB}>kratos.yml</text>
      <text x="692" y="268" className={SUB}>identity.schema.json</text>

      <Box x={680} y={296} w={180} h={40} />
      <text x="692" y="313" className={SUB}>kratos_postgres_data</text>
      <text x="692" y="327" className={SUB}>named · Docker yönetir</text>

      <Box x={680} y={348} w={180} h={40} dashed />
      <text x="692" y="365" className={TTL}>volume yok</text>
      <text x="692" y="379" className={SUB}>veri container katmanında</text>

      {[
        { y: 212, l: 'bind mount' },
        { y: 264, l: 'bind mount' },
        { y: 316, l: 'named volume' },
      ].map((m) => (
        <g key={m.y}>
          <path d={`M678 ${m.y} H602`} {...mount(id)} />
          <text x="640" y={m.y - 6} textAnchor="middle" className={VLBL}>{m.l}</text>
        </g>
      ))}
    </svg>
  )
}

export function InsideFigure() {
  const id = 'dk-in'
  const rows = [
    { y: 64, h: 34, t: '/usr/bin/kratos', r: 'çalışan program' },
    { y: 106, h: 34, t: '/bin  /lib  /etc  /usr …', r: 'Alpine dosyaları' },
    { y: 148, h: 58, t: '/etc/config/kratos/', r: 'ayarlar', kids: ['├ kratos.yml', '└ identity.schema.json'] },
    { y: 214, h: 34, t: '/home/ory', r: 'WORKDIR' },
    { y: 256, h: 34, t: '/var/lib/sqlite', r: 'image’ın veri dizini' },
  ]
  return (
    <svg viewBox="0 0 860 380" className="block h-auto w-full min-w-[720px]" role="img"
         aria-label="kratos container'ının dizinleri ve gerçek yerleri: program ve Alpine dosyaları image katmanlarında; /etc/config/kratos WSL'deki ~/assay/kratos klasörüne bind mount; /home/ory ve /var/lib/sqlite isimsiz volume'larda; container'ın kendi yazdıkları yazılabilir katmanda.">
      <Markers id={id} />
      <text x="0" y="14" className={LBL}>CONTAINER’IN GÖRDÜĞÜ</text>
      <text x="520" y="14" className={LBL}>GERÇEKTE DURDUĞU YER</text>

      <Box x={0} y={28} w={380} h={344} strong />
      <text x="14" y="50" className={TTL}>kratos</text>
      <text x="366" y="50" textAnchor="end" className={SUB}>kratos serve · kullanıcı 10000</text>
      {rows.map((r) => (
        <g key={r.t}>
          <rect x="14" y={r.y} width="352" height={r.h} rx="5" fill={CARD} stroke={INPUT} />
          <text x="26" y={r.y + 21} className={MONO}>{r.t}</text>
          <text x="354" y={r.y + 21} textAnchor="end" className={SUB}>{r.r}</text>
          {r.kids?.map((k, i) => (
            <text key={k} x="26" y={r.y + 37 + i * 14} className={SUB}>{k}</text>
          ))}
        </g>
      ))}
      <rect x="14" y="298" width="352" height="58" rx="5" fill={CARD} stroke={MUTED} strokeDasharray="3 3" />
      <text x="26" y="320" className={TTL}>Container’ın yazdıkları</text>
      <text x="26" y="338" className={SUB}>A /etc/config/kratos  (mount noktası)</text>

      <Box x={520} y={64} w={340} h={76} />
      <text x="534" y="84" className={TTL}>Image katmanları</text>
      <text x="846" y="84" textAnchor="end" className={SUB}>oryd/kratos · salt okunur</text>
      <text x="534" y="108" className={MONO_S}>COPY kratos /usr/bin/kratos</text>
      <text x="534" y="126" className={MONO_S}>alpine taban dosyaları</text>

      <Box x={520} y={148} w={340} h={58} />
      <text x="534" y="168" className={TTL}>WSL diski</text>
      <text x="846" y="168" textAnchor="end" className={SUB}>proje kopyası</text>
      <text x="534" y="190" className={MONO}>~/assay/kratos</text>

      <Box x={520} y={214} w={340} h={76} />
      <text x="534" y="234" className={TTL}>Docker volume deposu</text>
      <text x="846" y="234" textAnchor="end" className={SUB}>Docker yönetir</text>
      <text x="534" y="256" className={MONO_S}>isimsiz volume · /home/ory</text>
      <text x="534" y="276" className={MONO_S}>isimsiz volume · /var/lib/sqlite</text>

      <Box x={520} y={298} w={340} h={58} dashed />
      <text x="534" y="318" className={TTL}>Yazılabilir katman</text>
      <text x="534" y="336" className={SUB}>container’a ait · docker compose down ile silinir</text>

      <path d="M368 81 H440 V102 H518" {...copy(id)} />
      <path d="M368 123 H518" {...copy(id)} />
      <text x="442" y="75" textAnchor="middle" className={SUB}>image katmanı</text>

      <path d="M368 177 H518" {...mount(id)} />
      <text x="442" y="171" textAnchor="middle" className={VLBL}>bind mount</text>

      <path d="M368 231 H440 V252 H518" {...mount(id)} />
      <path d="M368 273 H518" {...mount(id)} />
      <text x="442" y="225" textAnchor="middle" className={VLBL}>anonim volume</text>

      <path d="M368 327 H518" {...gone(id)} />
      <text x="442" y="321" textAnchor="middle" className={SUB}>docker diff</text>
    </svg>
  )
}
