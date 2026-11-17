export function SubscribeSection() {
  return <section className="subscribe-section" aria-labelledby="subscribe-title">
    <div>
      <p className="eyebrow accent">Boletín</p>
      <h2 id="subscribe-title">Recibe el mejor periodismo en tu correo</h2>
      <p>Suscríbete a Alejo Bengoechea y no te pierdas ningún análisis ni reportaje. Sin ruido, solo lo importante.</p>
    </div>
    <form className="subscribe-form" autoComplete="off" onSubmit={undefined} action="#">
      <input type="email" name="email" placeholder="tu@correo.com" aria-label="Correo electrónico" autoComplete="off" disabled />
      <button type="button" disabled>Suscribirme</button>
    </form>
    <p className="subscribe-note">Próximamente. Puedes darte de baja cuando quieras.</p>
  </section>;
}
