export const analyticsDays = ['Día 1', 'Día 2', 'Día 3', 'Día 4', 'Día 5', 'Día 6', 'Día 7'];
export const articleAnalytics = [
  { id: 'webb', title: 'Las primeras imágenes del James Webb', category: 'INTERNACIONAL', views: [180, 430, 360, 690, 540, 830, 720], readers: [152, 361, 296, 550, 438, 681, 598], readingSeconds: 224, completion: 72 },
  { id: 'ciudades', title: 'Las ciudades que recuperan sus ríos', category: 'ESPAÑA', views: [230, 290, 410, 380, 590, 520, 670], readers: [194, 241, 340, 312, 481, 438, 549], readingSeconds: 188, completion: 65 },
  { id: 'energia', title: 'La energía solar en los pequeños comercios', category: 'ECONOMÍA', views: [110, 250, 190, 340, 300, 470, 420], readers: [91, 210, 157, 282, 249, 390, 344], readingSeconds: 201, completion: 69 },
];
export const categoryAnalytics = [
  { name: 'INTERNACIONAL', color: '#b9a0ff', views: [2100, 2800, 2400, 3600, 3200, 4100, 3800], articles: 18, readingSeconds: 216, completion: 71 },
  { name: 'ESPAÑA', color: '#78e3c3', views: [1700, 2200, 2600, 2300, 3000, 3400, 3100], articles: 24, readingSeconds: 182, completion: 64 },
  { name: 'ECONOMÍA', color: '#f1b77a', views: [1300, 1800, 1500, 2100, 1900, 2600, 2400], articles: 16, readingSeconds: 198, completion: 68 },
];
export const trafficSources = [
  { name: 'Buscadores', percentage: 42, color: '#b9a0ff' },
  { name: 'Redes sociales', percentage: 28, color: '#78e3c3' },
  { name: 'Acceso directo', percentage: 18, color: '#f1b77a' },
  { name: 'Otras webs', percentage: 12, color: '#80bfff' },
];
export const sum = (values: number[]) => values.reduce((total, value) => total + value, 0);
export const portalViews = analyticsDays.map((_, i) => sum(categoryAnalytics.map(category => category.views[i])));
export const portalReaders = portalViews.map(value => Math.round(value * .79));
