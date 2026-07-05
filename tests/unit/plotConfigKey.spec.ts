import { describe, expect, it } from 'vitest';

import type { PlotConfig } from '@/types';
import { getPlotConfigKey } from '@/utils/charts/plotConfigKey';

describe('getPlotConfigKey', () => {
  it('keeps the same key for equivalent plot configs with different object identities', () => {
    const config: PlotConfig = {
      main_plot: {
        watch_ma20: { color: 'blue' },
      },
      subplots: {
        RSI: {
          watch_rsi14: { color: 'purple' },
        },
      },
    };
    const sameConfig = JSON.parse(JSON.stringify(config));

    expect(getPlotConfigKey(sameConfig)).toBe(getPlotConfigKey(config));
  });

  it('changes the key when plot config content changes', () => {
    const config: PlotConfig = {
      main_plot: {
        watch_ma20: { color: 'blue' },
      },
      subplots: {},
    };
    const changedConfig: PlotConfig = {
      main_plot: {
        watch_ma20: { color: 'blue' },
        watch_ma60: { color: 'orange' },
      },
      subplots: {},
    };

    expect(getPlotConfigKey(changedConfig)).not.toBe(getPlotConfigKey(config));
  });
});
