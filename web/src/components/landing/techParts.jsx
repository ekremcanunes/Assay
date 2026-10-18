// Teknoloji detay parçaları — Landing (masaüstü yerinde detay) ve LandingTech (mobil sayfa) ortak kullanır.

export function CodeBlock({ code, title, note }) {
  return (
    <div>
      {title && (
        <div className="mb-2 flex items-center gap-2 font-mono text-micro text-muted-foreground">
          <i className="h-[6px] w-[6px] rounded-full bg-voltage" aria-hidden="true" />
          {title}
        </div>
      )}
      <pre className="overflow-x-auto rounded-lg bg-foreground p-5 font-mono text-micro leading-[1.7] text-background/85">
        {code}
      </pre>
      {note && <p className="mt-2 font-mono text-micro text-muted-foreground">{note}</p>}
    </div>
  )
}

export function MiniTable({ head, rows }) {
  return (
    <div className="mt-4 overflow-x-auto">
      <table className="w-full min-w-[460px] border-collapse">
        <thead>
          <tr>
            {head.map((h) => (
              <th key={h} className="label border-b border-foreground px-0 pb-2 pr-4 text-left text-muted-foreground">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.join('|')}>
              {r.map((c, i) => (
                <td key={r.join('|') + i}
                    className={`border-b border-border py-2 pr-4 text-ui ${i === 0 ? 'text-foreground' : 'font-mono text-micro text-muted-foreground'}`}>
                  {c}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export function DetailBlock({ b }) {
  if (b.kind === 'code') return <CodeBlock code={b.code} title={b.title} note={b.note} />

  if (b.kind === 'diagram') {
    return (
      <figure>
        <h4 className="mb-1.5 text-figure font-semibold text-foreground">{b.title}</h4>
        {b.body && <p className="mb-4 text-ui text-muted-foreground">{b.body}</p>}
        <div className="overflow-x-auto rounded-lg border border-border bg-background p-5">{b.figure}</div>
        {b.caption && <figcaption className="mt-2 font-mono text-micro text-muted-foreground">{b.caption}</figcaption>}
      </figure>
    )
  }

  if (b.kind === 'warn') {
    return (
      <div className="edge-accent rounded-r-lg bg-background p-5">
        <h4 className="mb-1.5 text-ui font-semibold text-foreground">{b.title}</h4>
        <p className="text-ui text-muted-foreground">{b.body}</p>
      </div>
    )
  }

  return (
    <div>
      <h4 className="mb-1.5 text-figure font-semibold text-foreground">{b.title}</h4>
      <p className="text-ui text-muted-foreground">{b.body}</p>
      {b.table && <MiniTable head={b.table.head} rows={b.table.rows} />}
      {b.code && <div className="mt-4"><CodeBlock code={b.code} /></div>}
      {b.after && <p className="mt-3 text-ui text-muted-foreground">{b.after}</p>}
    </div>
  )
}
