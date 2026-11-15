// Cargador del portal: maqueta de portada con trazos de «tinta» que se imprimen mientras llega la edición.
const lines = (count: number) => Array.from({ length: count }, (_, i) => <span className="sk-line" key={i} />);

export function PublicLoader({ variant, label }: { variant: 'category' | 'article'; label: string }) {
  return <section className={`press-loader press-${variant}`} role="status" aria-live="polite">
    <p className="press-label"><span className="press-dot" aria-hidden="true" />{label}<span className="press-cursor" aria-hidden="true" /></p>
    <span className="sr-only">Cargando contenido…</span>
    <div className="press-rule" aria-hidden="true"><span /></div>
    {variant === 'category' ? <div aria-hidden="true">
      <div className="press-hero">
        <div className="press-copy"><span className="sk-kicker" /><span className="sk-title" /><span className="sk-title short" />{lines(2)}</div>
        <span className="sk-image" />
      </div>
      <div className="press-grid">{[0, 1, 2, 3].map(i => <div className="press-row" key={i}>
        <div className="press-copy"><span className="sk-kicker" /><span className="sk-title small" />{lines(2)}</div><span className="sk-image small" />
      </div>)}</div>
    </div> : <div className="press-story" aria-hidden="true">
      <span className="sk-kicker" /><span className="sk-title" /><span className="sk-title short" /><span className="sk-image wide" />{lines(6)}
    </div>}
  </section>;
}
