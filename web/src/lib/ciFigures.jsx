/*
  CI/CD rehberinin diyagramı — landing'deki mimari diyagramla aynı SVG dili.
  İstasyon sırası ve kapılar docs/superpowers/specs/2026-09-06-prod-pipeline-design.md kararlarını izler.
*/

const CARD = 'hsl(var(--card))'
const INPUT = 'hsl(var(--input))'
const INK = 'hsl(var(--foreground))'

const LBL = 'fill-[hsl(var(--muted-foreground))] font-mono text-[9.5px] tracking-wider'
const TTL = 'fill-[hsl(var(--foreground))] text-[12.5px] font-semibold'
const MONO_S = 'fill-[hsl(var(--foreground))] font-mono text-[10px]'
const SUB = 'fill-[hsl(var(--muted-foreground))] font-mono text-[9.5px]'
const VLBL = 'fill-[hsl(var(--voltage))] font-mono text-[9.5px]'

const STATIONS = [
  { name: 'Geliştirici makinesi', edge: 'git push', tools: ['gitleaks · pre-commit'] },
  { name: 'GitHub push', gate: 'sır varsa push reddedilir', edge: 'Pull Request açılır', tools: ['Push Protection'] },
  {
    name: 'Pull Request · CI', gate: 'kırmızıysa merge yok', edge: 'merge → image build',
    tools: ['build + test', 'CodeQL · SAST', 'SonarCloud · kalite', 'npm audit · dotnet · SCA', 'gitleaks · geçmiş', 'hadolint · Dockerfile'],
  },
  { name: 'Container image', gate: 'Critical/High → ECR’a gitmez', edge: 'git SHA etiketiyle push', tools: ['Trivy · image', 'Syft · SBOM'] },
  { name: 'AWS ECR', edge: 'bildirim (SNS)', tools: ['scan-on-push', 'immutable tag'] },
  { name: 'CodePipeline · CD', gate: 'onay olmadan prod yok', edge: 'deploy sonrası', tools: ['Manual Approval', 'deploy → EC2'] },
  { name: 'Çalışma zamanı', tools: ['Dependabot alerts', 'düzenli image yenileme'] },
]

const CHIP_X = 290
const CHIP_MAX = 860
const CHIP_H = 24
const CHIP_GAP = 8
const EDGE_GAP = 40

// Çip genişliği metin uzunluğundan; sığmayan çip bir alt satıra iner.
const { rows, height } = (() => {
  let y = 28
  const out = STATIONS.map((st) => {
    let x = CHIP_X
    let line = 0
    const chips = st.tools.map((t) => {
      const w = Math.round(t.length * 6.4 + 20)
      if (x + w > CHIP_MAX) { x = CHIP_X; line += 1 }
      const c = { t, x, line, w }
      x += w + CHIP_GAP
      return c
    })
    const lines = line + 1
    const chipsH = lines * CHIP_H + (lines - 1) * CHIP_GAP
    const h = Math.max(st.gate ? 52 : 40, chipsH + 16)
    const row = { ...st, y, h, chips, chipTop: y + (h - chipsH) / 2 }
    y += h + EDGE_GAP
    return row
  })
  return { rows: out, height: y - EDGE_GAP + 4 }
})()

export function PipelineFigure() {
  return (
    <svg viewBox={`0 0 860 ${height}`} className="block h-auto w-full min-w-[720px]" role="img"
         aria-label="Kodun geçtiği kontrol noktaları: geliştirici makinesinde gitleaks, push anında Push Protection, Pull Request'te build, test, CodeQL, SonarCloud, bağımlılık taraması, gitleaks ve hadolint; image build sonrası Trivy ve Syft; ECR'da scan-on-push; CodePipeline'da manuel onay ve EC2'ye deploy; çalışma zamanında Dependabot ve düzenli image yenileme.">
      <defs>
        <marker id="ci-ink" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
          <path d="M0 0 L10 5 L0 10 z" fill={INK} />
        </marker>
      </defs>
      <text x="0" y="12" className={LBL}>KONTROL NOKTASI</text>
      <text x={CHIP_X} y="12" className={LBL}>ARAÇLAR</text>

      {rows.map((r, i) => (
        <g key={r.name}>
          <rect x="0" y={r.y} width="230" height={r.h} rx="6" fill={CARD} stroke={INK} strokeWidth="1.4" />
          <text x="12" y={r.y + (r.gate ? 22 : r.h / 2 + 4)} className={SUB}>{String(i + 1).padStart(2, '0')}</text>
          <text x="34" y={r.y + (r.gate ? 22 : r.h / 2 + 4)} className={TTL}>{r.name}</text>
          {r.gate && <text x="34" y={r.y + 40} className={VLBL}>kapı · {r.gate}</text>}

          <line x1="232" y1={r.y + r.h / 2} x2={CHIP_X - 4} y2={r.y + r.h / 2} stroke={INPUT} />
          {r.chips.map((c) => (
            <g key={c.t}>
              <rect x={c.x} y={r.chipTop + c.line * (CHIP_H + CHIP_GAP)} width={c.w} height={CHIP_H} rx="4" fill={CARD} stroke={INPUT} />
              <text x={c.x + 10} y={r.chipTop + c.line * (CHIP_H + CHIP_GAP) + 16} className={MONO_S}>{c.t}</text>
            </g>
          ))}

          {r.edge && (
            <>
              <path d={`M115 ${r.y + r.h + 2} V${r.y + r.h + EDGE_GAP - 3}`} fill="none" stroke={INK} strokeWidth="1.2" markerEnd="url(#ci-ink)" />
              <text x="127" y={r.y + r.h + EDGE_GAP / 2 + 3} className={SUB}>{r.edge}</text>
            </>
          )}
        </g>
      ))}
    </svg>
  )
}
