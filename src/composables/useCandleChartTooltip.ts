import type { EChartsOption, SeriesOption, TooltipComponentFormatterCallbackParams } from 'echarts';
import type { Ref } from 'vue';
import { format as echartsFormat } from 'echarts';
import type { ChartResponseMeta } from '@/types/candleTypes';
import {
  getSeriesMetaByColumn,
  getSeriesSourceLabel,
  getSeriesTooltipGroup,
} from '@/utils/charts/chartSeriesMeta';

type CandleTooltipParam = Exclude<
  TooltipComponentFormatterCallbackParams,
  TooltipComponentFormatterCallbackParams[]
> & {
  axisValue?: number | string;
  axisValueLabel?: string;
};

type CandleTooltipRow = {
  label: string;
  value?: string;
  marker?: string;
};

type CandleTooltipCrosshairSelection = {
  dataIndex: number;
  timestamp: number;
};

type CandleTooltipSeriesOption = SeriesOption & {
  seriesColumn?: string;
};

type CandleTooltipDatasetOption = {
  meta?: ChartResponseMeta | null;
  source?: unknown;
};

export function useCandleChartTooltip(
  chartOptions: Ref<EChartsOption>,
  selectedCrosshair?: Ref<CandleTooltipCrosshairSelection | undefined>,
  meta?: Ref<ChartResponseMeta | null | undefined> | ChartResponseMeta | null,
) {
  const { t } = useAppI18n();

  function formatTooltipValue(value: unknown): string {
    if (typeof value === 'number') {
      return value.toLocaleString(undefined, { maximumFractionDigits: 15 });
    }
    if (typeof value === 'string') {
      return value;
    }
    if (value === null || value === undefined) {
      return '';
    }
    return String(value);
  }

  function formatTooltipHtmlValue(value: string | undefined): string {
    return echartsFormat.encodeHTML(value ?? '').replaceAll('\n', '<br />');
  }

  function getSeriesOptionForTooltip(
    seriesIndex: number | undefined,
  ): CandleTooltipSeriesOption | undefined {
    if (seriesIndex === undefined || !Array.isArray(chartOptions.value.series)) {
      return undefined;
    }
    return chartOptions.value.series[seriesIndex] as CandleTooltipSeriesOption | undefined;
  }

  function getChartResponseMeta(): ChartResponseMeta | null | undefined {
    if (meta && typeof meta === 'object' && 'value' in meta) {
      return meta.value;
    }
    if (meta) {
      return meta;
    }

    const dataset = chartOptions.value.dataset;
    const datasetOption = Array.isArray(dataset) ? dataset[0] : dataset;
    if (datasetOption && typeof datasetOption === 'object' && 'meta' in datasetOption) {
      return (datasetOption as CandleTooltipDatasetOption).meta;
    }
    return undefined;
  }

  function getDatasetRow(dataIndex: number): unknown[] | undefined {
    const dataset = chartOptions.value.dataset;
    const datasetOption = Array.isArray(dataset) ? dataset[0] : dataset;
    const source =
      datasetOption && typeof datasetOption === 'object' && 'source' in datasetOption
        ? datasetOption.source
        : undefined;

    if (!Array.isArray(source)) {
      return undefined;
    }
    const row = source[dataIndex];
    return Array.isArray(row) ? row : undefined;
  }

  function normalizeTooltipParam(param: CandleTooltipParam): CandleTooltipParam {
    const selection = selectedCrosshair?.value;
    if (!selection) {
      return param;
    }

    const selectedRow = getDatasetRow(selection.dataIndex);
    if (!selectedRow) {
      return param;
    }

    return {
      ...param,
      dataIndex: selection.dataIndex,
      value: selectedRow as CandleTooltipParam['value'],
      axisValue: selection.timestamp,
      axisValueLabel: String(selection.timestamp),
    };
  }

  function getTooltipEncodedDimension(
    seriesIndex: number | undefined,
    dimensionType: 'tooltip' | 'y',
  ): number[] {
    const series = getSeriesOptionForTooltip(seriesIndex);
    if (!series || typeof series !== 'object' || !('encode' in series) || !series.encode) {
      return [];
    }
    const encodeValue = series.encode[dimensionType];
    if (Array.isArray(encodeValue)) {
      return encodeValue.map((value) => Number(value));
    }
    if (encodeValue !== undefined) {
      return [Number(encodeValue)];
    }
    return [];
  }

  function getTooltipSectionTitle(seriesIndex: number | undefined): string {
    const series = getSeriesOptionForTooltip(seriesIndex);
    const axisIndex =
      series && typeof series === 'object' && 'yAxisIndex' in series
        ? Number(series.yAxisIndex ?? 0)
        : 0;

    if (axisIndex === 0) {
      return t('chart.legendCandles');
    }
    if (axisIndex === 1) {
      return t('chart.legendVolume');
    }
    if (Array.isArray(chartOptions.value.yAxis)) {
      const axis = chartOptions.value.yAxis[axisIndex];
      if (axis && typeof axis === 'object' && 'name' in axis && typeof axis.name === 'string') {
        const title = axis.name.trim();
        if (title) {
          return title;
        }
      }
    }
    return t('chart.legendCandles');
  }

  function getTooltipSeriesColumn(param: CandleTooltipParam): string | undefined {
    const chartMeta = getChartResponseMeta();
    const series = getSeriesOptionForTooltip(param.seriesIndex);
    if (series?.seriesColumn) {
      return series.seriesColumn;
    }
    if (chartMeta && param.seriesName && getSeriesMetaByColumn(chartMeta, param.seriesName)) {
      return param.seriesName;
    }
    for (const layer of chartMeta?.layers ?? []) {
      const seriesMeta = layer.series.find((candidate) => candidate.label === param.seriesName);
      if (seriesMeta) {
        return seriesMeta.column;
      }
    }
    return undefined;
  }

  function getTooltipLineLabel(param: CandleTooltipParam): string {
    const chartMeta = getChartResponseMeta();
    const column = getTooltipSeriesColumn(param);
    if (chartMeta && column && getSeriesMetaByColumn(chartMeta, column)) {
      return getSeriesSourceLabel(chartMeta, column);
    }
    return param.seriesName ?? '';
  }

  function getTooltipGroupTitle(param: CandleTooltipParam): string {
    if (param.seriesType === 'candlestick') {
      return getTooltipSectionTitle(param.seriesIndex);
    }
    const chartMeta = getChartResponseMeta();
    const column = getTooltipSeriesColumn(param);
    if (chartMeta && column && getSeriesMetaByColumn(chartMeta, column)) {
      return getSeriesTooltipGroup(chartMeta, column);
    }
    return getTooltipSectionTitle(param.seriesIndex);
  }

  /**
   * Called per series in the tooltip params.
   * Returns the values to render as list
   * @param param
   * @returns List of values to render as string.
   */
  function getTooltipDimensionValues(param: CandleTooltipParam): string[] {
    if (!Array.isArray(param.value)) {
      return [formatTooltipValue(param.value)];
    }
    const series = getSeriesOptionForTooltip(param.seriesIndex);
    const seriesValues = param.value;

    let tooltipDimensions: number[] = Array.isArray(param.encode?.tooltip)
      ? param.encode.tooltip
      : param.encode?.tooltip !== undefined
        ? [param.encode.tooltip]
        : [];

    if (tooltipDimensions.length === 0) {
      // Unfortunately, the "tooltip" encode does not seem to be passed to tooltip params.
      // Workaround - get tooltipDimension from chartOptions
      const seriesOption = getTooltipEncodedDimension(param.seriesIndex, 'tooltip');
      if (seriesOption.length > 0) {
        tooltipDimensions = seriesOption;
      }
    }

    if (series?.tooltip?.valueFormatter) {
      // ValueFormatter handling (mainly for entry/exit signals)
      const valueFormatterData = Array.isArray(tooltipDimensions)
        ? tooltipDimensions.map((dim) => seriesValues[Number(dim)])
        : seriesValues;

      const formattedValue = String(
        series.tooltip.valueFormatter(valueFormatterData, param.dataIndex),
      );
      return formattedValue.trim() ? [formattedValue] : [];
    }

    if (tooltipDimensions.length === 0) {
      // use Y axis value as fallback if tooltip encode is not specified
      tooltipDimensions = Array.isArray(param.encode?.y)
        ? param.encode.y
        : param.encode?.y !== undefined
          ? [param.encode.y]
          : [];
    }
    return tooltipDimensions
      .map((dimension) => formatTooltipValue(seriesValues[Number(dimension)]))
      .filter(Boolean);
  }

  function formatCandlestickSection(param: CandleTooltipParam): CandleTooltipRow[] {
    if (!Array.isArray(param.value)) {
      return [];
    }

    const encodedValues = Array.isArray(param.encode?.y) ? param.encode.y : [];
    if (encodedValues.length < 4) {
      return [];
    }

    const [openIndex, closeIndex, lowIndex, highIndex] = encodedValues.map((value) =>
      Number(value),
    );
    return [
      {
        marker: typeof param.marker === 'string' ? param.marker : '',
        label: t('chart.candleOpen'),
        value: formatTooltipValue(param.value[openIndex]),
      },
      {
        marker: typeof param.marker === 'string' ? param.marker : '',
        label: t('chart.candleHighest'),
        value: formatTooltipValue(param.value[highIndex]),
      },
      {
        marker: typeof param.marker === 'string' ? param.marker : '',
        label: t('chart.candleLowest'),
        value: formatTooltipValue(param.value[lowIndex]),
      },
      {
        marker: typeof param.marker === 'string' ? param.marker : '',
        label: t('chart.candleClose'),
        value: formatTooltipValue(param.value[closeIndex]),
      },
    ];
  }

  function formatTooltipLine(param: CandleTooltipParam): CandleTooltipRow[] {
    if (param.componentType !== 'series') {
      return [];
    }
    if (param.seriesType === 'candlestick') {
      return formatCandlestickSection(param);
    }

    const values = getTooltipDimensionValues(param);
    const marker = typeof param.marker === 'string' ? param.marker : '';
    const label = getTooltipLineLabel(param);
    if (values.length === 0) {
      return [];
    }
    if (values.length === 1) {
      return [{ label, value: values[0], marker }];
    }
    return [
      {
        label,
        value: `${values[0]} (${values.slice(1).join(', ')})`,
        marker,
      },
    ];
  }

  function renderTooltipRow(row: CandleTooltipRow): string {
    const labelHtml = `${row.marker ?? ''}${echartsFormat.encodeHTML(row.label)}`;
    if (!row.value) {
      return `<div style="text-align:start;">${labelHtml}</div>`;
    }

    return `
  <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:12px;"><span>${labelHtml}</span
    ><span style="font-weight:700;text-align:right;white-space:pre-wrap;"
    >${formatTooltipHtmlValue(echartsFormat.encodeHTML(row.value))}</span></div>`;
  }

  function formatTooltipTimestamp(param: CandleTooltipParam): string {
    const axisValueTimestamp = Number(param.axisValue);
    if (Number.isFinite(axisValueTimestamp)) {
      return timestampms(axisValueTimestamp);
    }

    const axisLabelTimestamp = Number(param.axisValueLabel);
    if (Number.isFinite(axisLabelTimestamp)) {
      return timestampms(axisLabelTimestamp);
    }

    return param.axisValueLabel ?? param.axisValue?.toString() ?? '';
  }

  /** Main chandlechart tooltip formatter */
  function formatCandleTooltip(params: TooltipComponentFormatterCallbackParams): string {
    // console.log('tooltipParams', params[0].data[0], params);
    const tooltipParams: CandleTooltipParam[] = (Array.isArray(params) ? params : [params]).map(
      normalizeTooltipParam,
    );
    if (tooltipParams.length === 0) {
      return '';
    }

    const timestamp = formatTooltipTimestamp(tooltipParams[0]);

    const groupedLines = new Map<string, CandleTooltipRow[]>();
    for (const param of tooltipParams) {
      const lines = formatTooltipLine(param);
      if (lines.length === 0) {
        continue;
      }

      const sectionTitle = getTooltipGroupTitle(param);
      const sectionLines = groupedLines.get(sectionTitle) ?? [];
      sectionLines.push(...lines);
      groupedLines.set(sectionTitle, sectionLines);
    }

    const sections = Array.from(groupedLines.entries())
      .map(([title, lines], index) => {
        const titleHtml =
          title === t('chart.legendVolume')
            ? ''
            : `<div style="margin:${index === 0 ? '6px' : '8px'} 0 2px;font-weight:700; text-decoration:underline; text-align:left;"
            >${echartsFormat.encodeHTML(title)}</div>`;
        const linesHtml = lines.map((line) => renderTooltipRow(line)).join('');
        return `${titleHtml}${linesHtml}`;
      })
      .join('');

    return `<div style="font-size:13px;line-height:1.45;"
      ><span style="font-weight:700; text-decoration:underline;">${echartsFormat.encodeHTML(timestamp)}</span
      >${sections}</div>`;
  }
  return { formatCandleTooltip };
}
