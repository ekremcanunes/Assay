// Terminal satırı renklendirici: `$ ` prompt, `#` yorum, `$DEGISKEN` / `${{ … }}` / `<yer tutucu>`.
const VAR = /(\$\{\{[^}]*\}\}|\$[A-Z_][A-Z0-9_]*|<[^>\s][^>]*>)/

function tokens(text, keyBase) {
  return text.split(VAR).map((part, i) =>
    VAR.test(part) ? <span key={`${keyBase}-${i}`} className="tk-v">{part}</span> : part,
  )
}

function line(raw, i) {
  if (raw.trimStart().startsWith('#')) return <span className="tk-c">{raw}</span>
  const hash = raw.indexOf(' # ')
  const body = hash >= 0 ? raw.slice(0, hash) : raw
  const comment = hash >= 0 ? <span className="tk-c">{raw.slice(hash)}</span> : null
  if (body.startsWith('$ ')) {
    return <><span className="tk-p">$</span> {tokens(body.slice(2), i)}{comment}</>
  }
  return <>{tokens(body, i)}{comment}</>
}

export function renderCode(code) {
  return code.replace(/\n$/, '').split('\n').map((raw, i) => (
    <span key={i} className="tk-line">{line(raw, i)}{'\n'}</span>
  ))
}
