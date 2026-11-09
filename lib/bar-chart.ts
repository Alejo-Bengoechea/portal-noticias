export function barChartDomain(values: number[]) {
  const finite = values.filter(value => Number.isFinite(value) && Math.abs(value) <= 1e12);
  const low = Math.min(0, ...finite), high = Math.max(0, ...finite);
  const span = high - low || 1;
  const magnitude = 10 ** Math.floor(Math.log10(span / 4));
  const fraction = span / 4 / magnitude;
  const step = (fraction <= 1 ? 1 : fraction <= 2 ? 2 : fraction <= 5 ? 5 : 10) * magnitude;
  const min = Math.floor(low / step) * step;
  const max = high === low ? min + step * 4 : Math.ceil(high / step) * step;
  const ticks = Array.from({ length: Math.round((max - min) / step) + 1 }, (_, i) => Number((min + i * step).toPrecision(12)));
  return { min, max, ticks };
}
