import { renderCode } from '../lib/code'

export default function Terminal({ file, fileNote, code }) {
  return (
    <div className="card termcard">
      <div className="term-win">
        <div className="term-bar">
          <span className="dot" style={{ background: '#F43F5E' }} />
          <span className="dot" style={{ background: '#FBBF24' }} />
          <span className="dot" style={{ background: '#10B981' }} />
          <span className="fname">{file}{fileNote ? ` · ${fileNote}` : ''}</span>
        </div>
        <pre className="fade" key={file + code}>{renderCode(code)}<span className="caret" /></pre>
      </div>
      <div className="src">Kaynak: <code>{file}</code> · terime dokun veya üstüne gel → tanım</div>
    </div>
  )
}
