// Lazy içerik promise'i teknoloji başına bir kez oluşur; use() aynı promise'i görmeli.
const detailPromises = new Map()
export function loadDetail(tech) {
  if (!detailPromises.has(tech.slug)) {
    detailPromises.set(tech.slug, tech.loadDetail().then((m) => m.default))
  }
  return detailPromises.get(tech.slug)
}

