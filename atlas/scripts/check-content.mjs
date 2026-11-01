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

const FLOW_FIELDS = ['id', 'no', 'title', 'lanes', 'nodes', 'edges', 'steps']
const STEP_FIELDS = ['node', 'title', 'what', 'why', 'cost', 'terms', 'file', 'code']
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
      if (re.test(line)) err(`${path.relative(atlasDir, file)}:${i + 1}`, `gizli kalıp — ${label}`)
    }
  })
  return yaml.load(text)
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

  for (const n of flow.nodes) if (!laneIds.has(n.lane)) err(where, `düğüm ${n.id}: bilinmeyen şerit: ${n.lane}`)
  flow.edges.forEach((e) => checkEdge(e, 'edges'))

  flow.steps.forEach((s, i) => {
    const ctx = `adım ${i + 1}`
    const miss = STEP_FIELDS.filter((k) => s?.[k] == null)
    if (miss.length) { err(where, `${ctx}: eksik alan: ${miss.join(', ')}`); return }
    checkNode(s.node, ctx)
    if (s.edge) checkEdge(s.edge, ctx)
    ;(s.aux ?? []).forEach((id) => checkNode(id, ctx))
    ;(s.auxEdges ?? []).forEach((e) => checkEdge(e, ctx))
    for (const t of s.terms) if (!termIds.has(t)) err(where, `${ctx}: bilinmeyen terim: ${t}`)
    if (!fs.existsSync(path.join(repoRoot, s.file))) err(where, `${ctx}: dosya yok: ${s.file}`)
  })
}

if (errors.length) {
  console.error(`İçerik hatalı (${errors.length}):`)
  for (const e of errors) console.error(`  - ${e}`)
  process.exit(1)
}
console.log(`İçerik geçerli: ${flowIds.size} akış, ${termIds.size} terim`)
