import yaml from 'js-yaml'
import termsRaw from '../content/terms.yaml?raw'
import screensRaw from '../content/screens.yaml?raw'
import dataRaw from '../content/data.yaml?raw'
import pipelineRaw from '../content/pipeline.yaml?raw'

// İçerik build sırasında dosyaya gömülür; doğrulamayı scripts/check-content.mjs yapar.
const flowFiles = import.meta.glob('../content/flows/*.yaml', { query: '?raw', import: 'default', eager: true })

export const flows = Object.values(flowFiles)
  .map((raw) => yaml.load(raw))
  .sort((a, b) => a.no.localeCompare(b.no))

export function getFlow(id) {
  return flows.find((f) => f.id === id)
}

export const terms = new Map(yaml.load(termsRaw).map((t) => [t.id, { term: t.term, def: t.def }]))

// Akış 10 · Ekran → veri (ayrı sayfa tipi)
export const screenMap = yaml.load(screensRaw)

// Akış 11 · Veri envanteri (ayrı sayfa tipi)
export const dataMap = yaml.load(dataRaw)

// Akış 12 · Pipeline haritası (ayrı sayfa tipi)
export const pipelineMap = yaml.load(pipelineRaw)

export function flowsUsingTerm(id) {
  return flows.filter((f) => f.steps.some((s) => s.terms.includes(id)))
}
