import { describe, expect, it } from 'vitest';

import { formatSignalTooltipValue } from '@/utils/charts/signalTooltip';

describe('formatSignalTooltipValue', () => {
  it('renders a signal label when the signal tag is missing', () => {
    expect(formatSignalTooltipValue([61089.8, undefined], 'Short entries')).toBe('Short entries');
  });

  it('renders a signal label with a tag when available', () => {
    expect(formatSignalTooltipValue([61089.8, 'breakdown'], 'Short entries')).toBe(
      'Short entries (breakdown)',
    );
  });

  it('renders nothing when the signal value is empty', () => {
    expect(formatSignalTooltipValue([null, 'breakdown'], 'Short entries')).toBe('');
  });
});
