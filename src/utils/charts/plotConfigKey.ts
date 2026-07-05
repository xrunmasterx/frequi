import type { PlotConfig } from '@/types';

export function getPlotConfigKey(plotConfig: PlotConfig): string {
  return JSON.stringify(plotConfig);
}
