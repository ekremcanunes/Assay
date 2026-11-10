// İçerik doğrulayıcı. `npm run build` öncesi çalışır; hata varsa build düşer.
// Kontroller: zorunlu alanlar, düğüm/şerit/terim atıfları, `file` yollarının repoda varlığı, gizli bilgi kalıpları.
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import yaml from 'js-yaml'

const atlasDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const repoRoot = path.resolve(atlasDir, '..')
const contentDir = path.join(atlasDir, 'content')
const flowsDir = path.join(contentDir, 'flows')

const FLOW_FIELDS = ['id', 'no', 'group', 'eyebrow', 'title', 'lanes', 'nodes', 'edges', 'steps']
const NODE_FIELDS = ['id', 'lane', 'col', 'title', 'sub', 'icon']
const STEP_FIELDS = ['node', 'title', 'what', 'why', 'cost', 'terms', 'file', 'code']
const GROUPS = new Set(['altyapi', 'veri'])
const TONES = new Set(['gh', 'aws', 'ec2', 'client', 'edge', 'app', 'data', 'ext'])
const ICONS = new Set(['git', 'gear', 'box', 'bucket', 'pipe', 'server', 'key', 'browser', 'cloud', 'shield', 'db', 'bolt', 'globe', 'user', 'clock', 'log', 'mail', 'code', 'chart', 'calc'])
const SECRET_PATTERNS = [
  [/\b\d{12}\b/, '12 haneli sayı (AWS hesap ID\'si olabilir)'],
  [/arn:aws/, 'arn:aws'],
  [/\b\d{1,3}(\.\d{1,3}){3}\b/, 'IPv4 adresi'],
]

const errors = []
const err = (where, msg) => errors.push(`${where}: ${msg}`)

function readYaml(file) {
  const text = fs.readFileSync(file, 'utf8')
  text.split(/\r?\n/).forEach((line, i) => {
    for (const [re, label] of SECRET_PATTERNS) {
      if (re.test(line)) err(`${path.relative(atlasDir, file).split(path.sep).join('/')}:${i + 1}`, `gizli kalıp — ${label}`)
    }
  })
  try {
    return yaml.load(text)
  } catch (e) {
    err(`${path.relative(atlasDir, file).split(path.sep).join('/')}:${(e.mark?.line ?? 0) + 1}`, `YAML okunamadı — ${e.reason ?? e.message}`)
    return null
  }
}

const termsFile = path.join(contentDir, 'terms.yaml')
const termList = readYaml(termsFile) ?? []
const termIds = new Set()
for (const t of termList) {
  if (!t?.id || !t.term || !t.def) err('terms.yaml', `eksik alan: ${JSON.stringify(t)}`)
  else if (termIds.has(t.id)) err('terms.yaml', `tekrar eden terim: ${t.id}`)
  else termIds.add(t.id)
}

const flowFiles = fs.readdirSync(flowsDir).filter((f) => f.endsWith('.yaml'))
const flowIds = new Set()
for (const f of flowFiles) {
  const flow = readYaml(path.join(flowsDir, f))
  const where = `flows/${f}`
  const missing = FLOW_FIELDS.filter((k) => flow?.[k] == null)
  if (missing.length) { err(where, `eksik alan: ${missing.join(', ')}`); continue }
  if (flowIds.has(flow.id)) err(where, `tekrar eden akış id: ${flow.id}`)
  flowIds.add(flow.id)

  const laneIds = new Set(flow.lanes.map((l) => l.id))
  const nodeIds = new Set(flow.nodes.map((n) => n.id))
  const checkNode = (id, ctx) => { if (!nodeIds.has(id)) err(where, `${ctx}: bilinmeyen düğüm: ${id}`) }
  const checkEdge = (e, ctx) => { if (!Array.isArray(e) || e.length !== 2) err(where, `${ctx}: bağlantı [a, b] olmalı`); else e.forEach((id) => checkNode(id, ctx)) }
  // Adımın bağlantısı diyagramda aynı yönde çizili olmalı; yoksa paket çizilmemiş bir yolda akar.
  const edgeKeys = new Set(flow.edges.map((e) => `${e[0]}>${e[1]}`))
  const checkDrawn = (e, ctx) => { if (Array.isArray(e) && !edgeKeys.has(`${e[0]}>${e[1]}`)) err(where, `${ctx}: bağlantı edges'te yok: [${e.join(', ')}]`) }
  // Yol repo içinde, boş olmayan, gerçek bir dosya olmalı.
  const checkFile = (p, ctx) => {
    const abs = path.resolve(repoRoot, p)
    if (!p.trim() || !abs.startsWith(repoRoot + path.sep)) return err(where, `${ctx}: dosya yolu repo dışında veya boş: ${p}`)
    if (!fs.existsSync(abs) || !fs.statSync(abs).isFile()) err(where, `${ctx}: dosya yok: ${p}`)
  }

  if (!GROUPS.has(flow.group)) err(where, `bilinmeyen grup: ${flow.group} (altyapi | veri)`)
  for (const l of flow.lanes) if (!TONES.has(l.tone)) err(where, `şerit ${l.id}: bilinmeyen ton: ${l.tone} (${[...TONES].join(' | ')})`)
  for (const n of flow.nodes) if (n?.icon && !ICONS.has(n.icon)) err(where, `düğüm ${n.id}: bilinmeyen ikon: ${n.icon}`)
  for (const n of flow.nodes) {
    const miss = NODE_FIELDS.filter((k) => n?.[k] == null)
    if (miss.length) err(where, `düğüm ${n?.id}: eksik alan: ${miss.join(', ')}`)
    if (!Number.isInteger(n.col) || n.col < 0) err(where, `düğüm ${n.id}: col 0 veya pozitif tam sayı olmalı`)
    if (!laneIds.has(n.lane)) err(where, `düğüm ${n.id}: bilinmeyen şerit: ${n.lane}`)
  }
  flow.edges.forEach((e) => checkEdge(e, 'edges'))

  // Adım `id`'si isteğe bağlı; `next.to` bunlara atıf yapar.
  const stepIds = new Set()
  for (const s of flow.steps) {
    if (s?.id == null) continue
    if (stepIds.has(s.id)) err(where, `tekrar eden adım id: ${s.id}`)
    stepIds.add(s.id)
  }

  flow.steps.forEach((s, i) => {
    const ctx = `adım ${i + 1}`
    for (const n of s?.next ?? []) {
      if (!n?.when || !n.to) err(where, `${ctx}: next öğesi when ve to ister`)
      else if (!stepIds.has(n.to)) err(where, `${ctx}: next: bilinmeyen adım id: ${n.to}`)
    }
    const miss = STEP_FIELDS.filter((k) => s?.[k] == null)
    if (miss.length) { err(where, `${ctx}: eksik alan: ${miss.join(', ')}`); return }
    checkNode(s.node, ctx)
    if (s.edge) { checkEdge(s.edge, ctx); checkDrawn(s.edge, ctx) }
    ;(s.aux ?? []).forEach((id) => checkNode(id, ctx))
    ;(s.auxEdges ?? []).forEach((e) => { checkEdge(e, ctx); checkDrawn(e, ctx) })
    for (const t of s.terms) if (!termIds.has(t)) err(where, `${ctx}: bilinmeyen terim: ${t}`)
    checkFile(String(s.file), ctx)
  })
}

// Akış 10 · Ekran → veri
const SCREEN_SOURCES = new Set(['db', 'server', 'client', 'external'])
const BLOCK_FIELDS = ['id', 'label', 'h', 'source', 'hook', 'endpoint', 'chain', 'calc', 'why', 'file']
const screensFile = path.join(contentDir, 'screens.yaml')
let screenPageId
if (fs.existsSync(screensFile)) {
  const where = 'screens.yaml'
  const doc = readYaml(screensFile)
  screenPageId = doc?.id
  const missing = ['no', 'id', 'title', 'screens'].filter((k) => doc?.[k] == null)
  if (missing.length) err(where, `eksik alan: ${missing.join(', ')}`)
  else {
    if (flowIds.has(doc.id)) err(where, `id bir akışla çakışıyor: ${doc.id}`)
    const blockIds = new Set()
    for (const s of doc.screens) {
      if (!s?.id || !s.title || !Array.isArray(s.blocks)) { err(where, `ekran eksik: ${JSON.stringify(s?.id)}`); continue }
      for (const b of s.blocks) {
        const ctx = `${s.id}/${b?.id}`
        const miss = BLOCK_FIELDS.filter((k) => b?.[k] == null)
        if (miss.length) { err(where, `${ctx}: eksik alan: ${miss.join(', ')}`); continue }
        if (blockIds.has(b.id)) err(where, `${ctx}: tekrar eden öğe id`)
        blockIds.add(b.id)
        if (!SCREEN_SOURCES.has(b.source)) err(where, `${ctx}: bilinmeyen kaynak: ${b.source} (${[...SCREEN_SOURCES].join(' | ')})`)
        if (![1, 2, 3].includes(b.h)) err(where, `${ctx}: h 1, 2 veya 3 olmalı`)
        for (const c of b.chain) {
          if (!c?.label || !c.icon) err(where, `${ctx}: zincir öğesi label ve icon ister`)
          else if (!ICONS.has(c.icon)) err(where, `${ctx}: bilinmeyen ikon: ${c.icon}`)
        }
        const abs = path.resolve(repoRoot, String(b.file))
        if (!abs.startsWith(repoRoot + path.sep) || !fs.existsSync(abs) || !fs.statSync(abs).isFile()) err(where, `${ctx}: dosya yok: ${b.file}`)
      }
    }
  }
}

// Akış 11 · Veri envanteri
const DATA_SECTIONS = ['in', 'store', 'out']
const CARD_FIELDS = ['id', 'group', 'title', 'via', 'file', 'why', ...DATA_SECTIONS]
const dataFile = path.join(contentDir, 'data.yaml')
if (fs.existsSync(dataFile)) {
  const where = 'data.yaml'
  const doc = readYaml(dataFile)
  const missing = ['no', 'id', 'eyebrow', 'title', 'lede', 'groups', 'cards'].filter((k) => doc?.[k] == null)
  if (missing.length) err(where, `eksik alan: ${missing.join(', ')}`)
  else {
    if (flowIds.has(doc.id) || doc.id === screenPageId) err(where, `id bir akışla veya ekran → veri sayfasıyla çakışıyor: ${doc.id}`)
    const groupIds = new Set(doc.groups.map((g) => g?.id))
    const cardIds = new Set()
    for (const c of doc.cards) {
      const ctx = `kart ${c?.id}`
      const miss = CARD_FIELDS.filter((k) => c?.[k] == null)
      if (miss.length) { err(where, `${ctx}: eksik alan: ${miss.join(', ')}`); continue }
      if (cardIds.has(c.id)) err(where, `${ctx}: tekrar eden kart id`)
      cardIds.add(c.id)
      if (!groupIds.has(c.group)) err(where, `${ctx}: bilinmeyen grup: ${c.group} (${[...groupIds].join(' | ')})`)
      if (c.flow != null && !flowIds.has(c.flow)) err(where, `${ctx}: bilinmeyen akış: ${c.flow}`)
      if (!Array.isArray(c.why) || c.why.length === 0) err(where, `${ctx}: why en az bir madde ister`)
      for (const k of DATA_SECTIONS) {
        if (!c[k].text) err(where, `${ctx}/${k}: text eksik`)
        for (const s of c[k].samples ?? []) if (!s?.label || !s.code) err(where, `${ctx}/${k}: örnek label ve code ister`)
      }
      const abs = path.resolve(repoRoot, String(c.file))
      if (!abs.startsWith(repoRoot + path.sep) || !fs.existsSync(abs) || !fs.statSync(abs).isFile()) err(where, `${ctx}: dosya yok: ${c.file}`)
    }
  }
}

// Akış 12 · Pipeline haritası
const PIPE_STATUS = new Set(['present', 'missing'])
const PIPE_GATES = new Set(['blocks', 'warns', 'none'])
const PIPE_PRIORITY = new Set(['P0', 'P1', 'P2'])
const MATRIX_VALUES = new Set(['yes', 'no', 'partial'])
const STATION_FIELDS = ['id', 'line', 'phase', 'label', 'status', 'does', 'checks', 'ifFails', 'file']
const pipelineFile = path.join(contentDir, 'pipeline.yaml')
const isRepoFile = (p) => {
  const abs = path.resolve(repoRoot, String(p))
  return abs.startsWith(repoRoot + path.sep) && fs.existsSync(abs) && fs.statSync(abs).isFile()
}
if (fs.existsSync(pipelineFile)) {
  const where = 'pipeline.yaml'
  const doc = readYaml(pipelineFile)
  const missing = ['no', 'id', 'eyebrow', 'title', 'lede', 'phases', 'lines', 'stations', 'matrix', 'files'].filter((k) => doc?.[k] == null)
  if (missing.length) err(where, `eksik alan: ${missing.join(', ')}`)
  else {
    const phaseIds = new Set(doc.phases.map((p) => p?.id))
    const lineIds = new Set(doc.lines.map((l) => l?.id))
    for (const l of doc.lines) if (!TONES.has(l.tone)) err(where, `hat ${l.id}: bilinmeyen ton: ${l.tone}`)
    const stationIds = new Set()
    for (const s of doc.stations) {
      const ctx = `durak ${s?.id}`
      const miss = STATION_FIELDS.filter((k) => s?.[k] == null)
      if (miss.length) { err(where, `${ctx}: eksik alan: ${miss.join(', ')}`); continue }
      if (stationIds.has(s.id)) err(where, `${ctx}: tekrar eden id`)
      stationIds.add(s.id)
      if (!lineIds.has(s.line)) err(where, `${ctx}: bilinmeyen hat: ${s.line}`)
      if (!phaseIds.has(s.phase)) err(where, `${ctx}: bilinmeyen aşama: ${s.phase}`)
      if (!PIPE_STATUS.has(s.status)) err(where, `${ctx}: status present | missing olmalı`)
      // Çalışan durak durdurup durdurmadığını söyler; eksik durak önceliğini ve kaynağını söyler.
      if (s.status === 'present' && !PIPE_GATES.has(s.gate)) err(where, `${ctx}: gate blocks | warns | none olmalı`)
      if (s.status === 'missing' && (!PIPE_PRIORITY.has(s.priority) || !s.ref)) err(where, `${ctx}: eksik durak priority (P0-P2) ve ref ister`)
      if (!isRepoFile(s.file)) err(where, `${ctx}: dosya yok: ${s.file}`)
    }
    for (const r of doc.matrix.rows ?? []) {
      for (const c of doc.matrix.columns ?? []) if (!MATRIX_VALUES.has(r?.[c])) err(where, `matris "${r?.label}": ${c} yes | no | partial olmalı`)
    }
    const fileIds = new Set()
    for (const f of doc.files) {
      const ctx = `dosya ${f?.id}`
      if (!f?.id || !f.path || !f.title || !Array.isArray(f.blocks) || f.blocks.length === 0) { err(where, `${ctx}: id, path, title, blocks ister`); continue }
      if (fileIds.has(f.id)) err(where, `${ctx}: tekrar eden id`)
      fileIds.add(f.id)
      if (!isRepoFile(f.path)) err(where, `${ctx}: dosya yok: ${f.path}`)
      for (const b of f.blocks) if (!b?.lines || !b.code || !b.note) err(where, `${ctx}: blok lines, code, note ister`)
    }
  }
}

if (errors.length) {
  console.error(`İçerik hatalı (${errors.length}):`)
  for (const e of errors) console.error(`  - ${e}`)
  process.exit(1)
}
console.log(`İçerik geçerli: ${flowIds.size} akış, ${termIds.size} terim${fs.existsSync(screensFile) ? ', ekran → veri sayfası' : ''}${fs.existsSync(dataFile) ? ', veri envanteri' : ''}${fs.existsSync(pipelineFile) ? ', pipeline haritası' : ''}`)
