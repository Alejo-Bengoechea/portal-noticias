export default function NewsManagerLoading() {
  return <section aria-busy="true" aria-label="Cargando gestor de noticias">
    <p className="editorial-loading" role="status"><span className="editorial-loading-dot" aria-hidden="true" />Cargando noticias…</p>
    <div className="manager-loading-rows" aria-hidden="true">{Array.from({ length: 8 }, (_, i) => <div key={i} />)}</div>
  </section>;
}
