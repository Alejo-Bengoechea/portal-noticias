export const metadata = { title: 'Privacidad', alternates: { canonical: '/privacidad' } };

export default function PrivacyPage() {
  return <article className="story legal">
    <h1>Privacidad</h1>
    <div className="rich">
      <p>Puedes leer las publicaciones sin crear una cuenta. El acceso con cuenta se utiliza para administrar el sitio.</p>
      <p>Cuando usas el buscador, las palabras que introduces se envían como parte de la dirección de la página de resultados.</p>
      <p>Al abrir una noticia con un vídeo integrado, tu navegador puede conectarse a YouTube para cargar el reproductor.</p>
      <p>El sitio suma las vistas por página y día. El contador guarda totales y prescinde de cookies e identificadores de visitante.</p>
    </div>
  </article>;
}
