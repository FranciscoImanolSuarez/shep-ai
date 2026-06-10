import type { CustomRenderer } from 'streamdown'
import { SVGRenderer } from './svg-renderer'
import { ChartRenderer } from './chart-renderer'
import { MetricsRenderer } from './metrics-renderer'

export const richRenderers: CustomRenderer[] = [
  { language: 'svg', component: SVGRenderer },
  { language: 'chart', component: ChartRenderer },
  { language: 'metrics', component: MetricsRenderer },
]
