import { describe, expect, it } from 'vitest';

import type { ChartIndicatorPayload, IndicatorConfig } from '@/types';
import { getDiffColumnsFromPlotConfig } from '@/utils/charts/areaPlotDataset';
import { formatIndicatorLabel, isIndicatorVisible } from '@/utils/charts/candleChartSeries';

describe('indicator plot visibility', () => {
  it('treats hidden helper indicators as non-visible', () => {
    const config: IndicatorConfig = { type: 'line', hidden: true };

    expect(isIndicatorVisible(config)).toBe(false);
  });

  it('keeps normal indicators visible by default', () => {
    const config: IndicatorConfig = { type: 'line' };

    expect(isIndicatorVisible(config)).toBe(true);
  });

  it('keeps explicitly visible indicators visible', () => {
    const config: IndicatorConfig = { type: 'line', hidden: false };

    expect(isIndicatorVisible(config)).toBe(true);
  });

  it('keeps hidden fill targets available for area calculations', () => {
    const diffColumns = getDiffColumnsFromPlotConfig({
      main_plot: {
        watch_supertrend_up: {
          color: '#22c55e',
          type: 'line',
          fill_to: 'watch_supertrend_price',
        },
        watch_supertrend_price: {
          type: 'line',
          hidden: true,
        },
      },
      subplots: {},
    });

    expect(diffColumns).toEqual([['watch_supertrend_up', 'watch_supertrend_price']]);
  });

  it('keeps supertrend watch indicator payload shape intact', () => {
    const payload: ChartIndicatorPayload = {
      supertrend: [{ period: 10, multiplier: 3 }],
    };

    expect(payload.supertrend?.[0]?.period).toBe(10);
    expect(payload.supertrend?.[0]?.multiplier).toBe(3);
  });

  it('formats watch indicator labels for chart display', () => {
    expect(formatIndicatorLabel('watch_ma20')).toBe('MA20');
    expect(formatIndicatorLabel('watch_ma60')).toBe('MA60');
    expect(formatIndicatorLabel('watch_rsi14')).toBe('RSI 14');
    expect(formatIndicatorLabel('watch_macd')).toBe('MACD');
    expect(formatIndicatorLabel('watch_macdsignal')).toBe('Signal');
    expect(formatIndicatorLabel('watch_macdhist')).toBe('Histogram');
    expect(formatIndicatorLabel('watch_supertrend_up')).toBe('Supertrend Up');
    expect(formatIndicatorLabel('watch_supertrend_down')).toBe('Supertrend Down');
  });

  it('keeps strategy indicator labels unchanged', () => {
    expect(formatIndicatorLabel('ema_fast')).toBe('ema_fast');
  });
});
