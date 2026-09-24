/** Escala "bonita" para eixos: ticks redondos cobrindo [min, max]. */
export function niceScale(minValue: number, maxValue: number, targetTicks = 4): { min: number; max: number; ticks: number[] } {
  const lo = Math.min(0, minValue)
  const hi = Math.max(0, maxValue)
  if (hi - lo <= 0) return { min: 0, max: 1, ticks: [0] }
  const raw = (hi - lo) / targetTicks
  const magnitude = 10 ** Math.floor(Math.log10(raw))
  const residual = raw / magnitude
  const nice = residual > 5 ? 10 : residual > 2.5 ? 5 : residual > 2 ? 2.5 : residual > 1 ? 2 : 1
  const step = nice * magnitude
  const min = Math.floor(lo / step) * step
  const max = Math.ceil(hi / step) * step
  const ticks: number[] = []
  for (let v = min; v <= max + step / 2; v += step) ticks.push(Math.round(v))
  return { min, max, ticks }
}
