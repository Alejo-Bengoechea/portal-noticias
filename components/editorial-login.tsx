import Link from 'next/link';
import type { ReactNode } from 'react';

export function EditorialLogin({ children }: { children: ReactNode }) {
  return <div className="editorial-login">
    <header className="login-brand"><span>ALEJO <strong>BENGOECHEA</strong></span><small>PERIODISMO Y ANÁLISIS</small></header>
    <div className="login-stage">
      <section className="login-intro" aria-label="Mesa editorial">
        <span className="login-overline"><i /> MESA EDITORIAL / ACCESO PRIVADO</span>
        <h1>Detrás de cada<br />historia, <em>tu mirada.</em></h1>
        <p>Tu espacio para investigar, escribir<br />y dar forma a la próxima noticia.</p>
        <div className="login-terminal" aria-hidden="true"><span>~/mesa-editorial</span><strong>Una historia empieza con una pregunta.<i /></strong></div>
      </section>
      <section className="login-access" aria-labelledby="login-access-title">
        <div className="login-lock" aria-hidden="true"><svg width="23" height="23" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.3"><rect x="5" y="10" width="14" height="11" rx="3" /><path d="M8 10V7a4 4 0 0 1 8 0v3M12 14v3" /></svg></div>
        <span className="login-access-label">SOLO ADMINISTRACIÓN</span>
        <h2 id="login-access-title">Iniciar sesión</h2>
        <p>Bienvenido a tu mesa editorial.</p>
        {children}
        <div className="login-private-note"><span aria-hidden="true">⌘</span> Un espacio reservado para el editor.</div>
      </section>
    </div>
    <footer className="login-footer"><Link href="/">← Volver al portal</Link><span>ALEJO BENGOECHEA · ÁREA EDITORIAL</span></footer>
  </div>;
}
