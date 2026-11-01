// İçerik metni biçimi: `kod` → <code>, *vurgu* → gradyanlı <em> (yalnız başlıkta kullanılır).
export function renderInline(text) {
  return text.split(/(`[^`]+`|\*[^*]+\*)/).map((part, i) => {
    if (part.startsWith('`') && part.endsWith('`')) return <code key={i}>{part.slice(1, -1)}</code>
    if (part.startsWith('*') && part.endsWith('*') && part.length > 2) return <em key={i}>{part.slice(1, -1)}</em>
    return part
  })
}
