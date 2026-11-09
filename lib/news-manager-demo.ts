export type ManagedNews = {
  id: string; title: string; slug: string; category_id: string | null;
  created_at: string | null; updated_at: string | null; published_at: string | null;
  ever_published: boolean; featured: boolean;
};

export const demoCategories = [
  { id: 'internacional', name: 'INTERNACIONAL' },
  { id: 'espana', name: 'ESPAÑA' },
  { id: 'economia', name: 'ECONOMÍA' },
];

const titles = [
  'Las ciudades que recuperan sus ríos',
  'El futuro del transporte nocturno',
  'Cómo cambia la cesta de la compra',
  'La cooperación científica europea',
  'Bibliotecas que abren sus puertas al barrio',
  'La energía solar en los pequeños comercios',
  'Nuevos mapas para entender el océano',
  'El patrimonio de los pueblos pequeños',
  'Qué nos cuenta el precio del alquiler',
  'La diplomacia del agua',
  'La vida alrededor de una estación de tren',
  'El coste de reparar frente a reemplazar',
  'Observar el cielo desde el hemisferio sur',
  'Escuelas que rediseñan sus patios',
  'Las cuentas de una cooperativa',
  'Los retos de las expediciones polares',
  'Un archivo para la memoria del barrio',
  'El viaje de los alimentos al supermercado',
  'La conservación de los bosques tropicales',
  'Los caminos rurales que vuelven a usarse',
  'Cómo funciona una factura eléctrica',
  'La ciencia que conecta continentes',
  'Los museos fuera de las grandes capitales',
  'La segunda vida de los materiales',
  'Los puertos y las rutas del comercio',
  'Vivir junto a un parque natural',
  'Los pequeños negocios ante la digitalización',
  'La protección del patrimonio submarino',
  'Un paseo por la historia del ferrocarril',
  'Por qué importa la productividad',
];

export const demoNews: ManagedNews[] = titles.map((title, index) => {
  const created = new Date(Date.UTC(2026, 9, index + 1, 8)).toISOString();
  const updated = new Date(Date.UTC(2026, 10, index % 6 + 1, 10, index)).toISOString();
  return {
    id: `DEMO-${String(index + 1).padStart(3, '0')}`,
    title, slug: `noticia-ejemplo-${index + 1}`,
    category_id: demoCategories[index % 3].id,
    created_at: created, updated_at: updated,
    published_at: index % 3 === 0 ? updated : null,
    ever_published: index % 3 !== 2,
    featured: index % 7 === 0,
  };
});

export function demoCategoryCount(slug: string) {
  return demoNews.filter(article => article.category_id === slug).length;
}

export function demoNewsDownload(article: ManagedNews, categories: { id: string; name: string }[] = demoCategories) {
  const json = {
    versionEsquema: '1.0.0',
    metadatos: {
      id: article.id, slug: article.slug,
      estado: article.published_at ? 'publicado' : article.ever_published ? 'despublicado' : 'borrador',
      seccion: categories.find(category => category.id === article.category_id)?.name,
      avisoVisible: 'Noticia ficticia de muestra para probar el gestor.', etiquetas: ['demostración'],
    },
    fechas: { creacion: article.created_at, actualizacion: article.updated_at, publicacion: article.published_at },
    titular: article.title, subtitulo: 'Ejemplo editorial para probar el diseño de la tabla.',
    autores: [{ nombre: 'Redacción de muestra' }],
    cuerpo: [{ id: 'texto', tipo: 'parrafo', texto: 'Contenido ficticio de demostración.' }],
  };
  return 'data:application/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(json, null, 2));
}
