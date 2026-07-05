export function formatSignalTooltipValue(
  value: unknown,
  tooltipPrefix: string,
  tagColumn?: number,
): string {
  if (!Array.isArray(value)) {
    return value ? `${tooltipPrefix} ${value}` : '';
  }
  if (value.length === 0 || !value[0]) {
    return '';
  }

  const rawTag = Array.isArray(value[1]) ? value[1][tagColumn ?? -1] : value[1];
  const tagShort = rawTag === null || rawTag === undefined ? '' : String(rawTag).substring(0, 100);

  return `${tooltipPrefix} ${tagShort ? `(${tagShort})` : ''}`.trim();
}
