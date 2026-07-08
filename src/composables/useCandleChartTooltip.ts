import type { EChartsOption, SeriesOption, TooltipComponentFormatterCallbackParams } from 'echarts';
import type { Ref } from 'vue';
import { format as echartsFormat } from 'echarts';
import type { ChartLayerPoint, ChartLayerSource, ChartResponseMeta } from '@/types/candleTypes';
import { isLikelyMillisecondTimestamp } from '@/utils/charts/candleChartAxis';
import { getSeriesMetaByColumn, getSeriesSourceLabel } from '@/utils/charts/chartSeriesMeta';

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

type CandleTooltipGroupInfo = {
  title: string;
  source?: ChartLayerSource;
};

type CandleTooltipGroup = CandleTooltipGroupInfo & {
  lines: CandleTooltipRow[];
  firstIndex: number;
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

const TOOLTIP_SOURCE_PRIORITY: Record<ChartLayerSource, number> = {
  decision_snapshot: 0,
  strategy: 1,
  watch: 2,
  market: 3,
  feature: 4,
  event: 5,
  document: 6,
  execution: 7,
  recomputed: 8,
};

const DECISION_SNAPSHOT_GROUP_TITLE = 'Bot Decision';

const DECISION_SNAPSHOT_PAYLOAD_LABELS: Record<string, string> = {
  decision: 'Decision',
  decision_time: 'Decision Time',
  strategy: 'Strategy',
  snapshot_type: 'Snapshot Type',
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

  function getTooltipSeriesLayer(
    chartMeta: ChartResponseMeta | null | undefined,
    column: string,
  ): ChartResponseMeta['layers'][number] | undefined {
    for (const layer of chartMeta?.layers ?? []) {
      if (layer.series.some((series) => series.column === column)) {
        return layer;
      }
    }
    return undefined;
  }

  function getTooltipGroupInfo(param: CandleTooltipParam): CandleTooltipGroupInfo {
    if (param.seriesType === 'candlestick') {
      return { title: getTooltipSectionTitle(param.seriesIndex) };
    }
    const chartMeta = getChartResponseMeta();
    const column = getTooltipSeriesColumn(param);
    const layer = column ? getTooltipSeriesLayer(chartMeta, column) : undefined;
    if (layer) {
      return {
        title:
          layer.source === 'decision_snapshot' ? DECISION_SNAPSHOT_GROUP_TITLE : layer.label,
        source: layer.source,
      };
    }
    return { title: getTooltipSectionTitle(param.seriesIndex) };
  }

  function getTooltipGroupPriority(group: CandleTooltipGroup): number {
    return group.source ? TOOLTIP_SOURCE_PRIORITY[group.source] : Number.POSITIVE_INFINITY;
  }

  function isRenderableTooltipValue(value: unknown): boolean {
    return value !== null && value !== undefined && value !== '';
  }

  function formatDecisionSnapshotPointValue(value: unknown): string {
    if (typeof value === 'object') {
      return JSON.stringify(value);
    }
    return formatTooltipValue(value);
  }

  function appendDecisionSnapshotPayloadRows(rows: CandleTooltipRow[], payload: Record<string, unknown>) {
    for (const key of ['decision', 'decision_time', 'strategy', 'snapshot_type']) {
      const value = payload[key];
      if (isRenderableTooltipValue(value)) {
        rows.push({
          label: DECISION_SNAPSHOT_PAYLOAD_LABELS[key],
          value: formatDecisionSnapshotPointValue(value),
        });
      }
    }

    for (const sectionKey of ['values', 'context']) {
      const sectionValue = payload[sectionKey];
      if (sectionValue && typeof sectionValue === 'object' && !Array.isArray(sectionValue)) {
        for (const [key, value] of Object.entries(sectionValue)) {
          if (isRenderableTooltipValue(value)) {
            rows.push({
              label: key,
              value: formatDecisionSnapshotPointValue(value),
            });
          }
        }
      } else if (isRenderableTooltipValue(sectionValue)) {
        rows.push({
          label: sectionKey,
          value: formatDecisionSnapshotPointValue(sectionValue),
        });
      }
    }
  }

  function formatPointPayloadValue(value: unknown): string {
    if (typeof value === 'object') {
      return JSON.stringify(value);
    }
    return formatTooltipValue(value);
  }

  function appendGenericPointRows(
    rows: CandleTooltipRow[],
    point: ChartLayerPoint,
  ) {
    if (isRenderableTooltipValue(point.label)) {
      rows.push({
        label: 'Label',
        value: formatPointPayloadValue(point.label),
      });
    }

    for (const [key, value] of Object.entries(point.payload ?? {})) {
      if (isRenderableTooltipValue(value)) {
        rows.push({
          label: key,
          value: formatPointPayloadValue(value),
        });
      }
    }
  }

  function formatDecisionSnapshotPointRows(timestamp: number): CandleTooltipRow[] {
    const rows: CandleTooltipRow[] = [];
    for (const layer of getChartResponseMeta()?.layers ?? []) {
      if (layer.source !== 'decision_snapshot') {
        continue;
      }
      for (const point of layer.points ?? []) {
        if (point.timestamp !== timestamp || !point.payload) {
          continue;
        }
        appendDecisionSnapshotPayloadRows(rows, point.payload);
      }
    }
    return rows;
  }

  function appendGenericPointGroups(
    groupedLines: Map<string, CandleTooltipGroup>,
    timestamp: number,
    firstIndex: number,
  ) {
    for (const layer of getChartResponseMeta()?.layers ?? []) {
      if (layer.source !== 'event' && layer.source !== 'document') {
        continue;
      }

      const lines: CandleTooltipRow[] = [];
      for (const point of layer.points ?? []) {
        if (point.timestamp === timestamp) {
          appendGenericPointRows(lines, point);
        }
      }
      if (lines.length === 0) {
        continue;
      }

      const tooltipGroup = groupedLines.get(layer.label) ?? {
        title: layer.label,
        source: layer.source,
        lines: [],
        firstIndex,
      };
      tooltipGroup.lines.push(...lines);
      groupedLines.set(layer.label, tooltipGroup);
    }
  }

  function sortMetadataGroupsInLegacySlots(groups: CandleTooltipGroup[]): CandleTooltipGroup[] {
    const metadataGroups = groups
      .filter((group) => group.source)
      .sort(
        (left, right) =>
          getTooltipGroupPriority(left) - getTooltipGroupPriority(right) ||
          left.firstIndex - right.firstIndex,
      );
    let metadataGroupIndex = 0;
    return groups.map((group) => {
      if (!group.source) {
        return group;
      }
      const sortedGroup = metadataGroups[metadataGroupIndex];
      metadataGroupIndex += 1;
      return sortedGroup;
    });
  }

  function getTooltipPointTimestamp(tooltipParams: CandleTooltipParam[]): number | undefined {
    const selectionTimestamp = selectedCrosshair?.value?.timestamp;
    if (isLikelyMillisecondTimestamp(selectionTimestamp)) {
      return selectionTimestamp;
    }

    for (const param of tooltipParams) {
      const rowTimestamp = firstTimestampFromValue(param.value);
      if (rowTimestamp !== undefined) {
        return rowTimestamp;
      }

      const axisValueTimestamp = Number(param.axisValue);
      if (isLikelyMillisecondTimestamp(axisValueTimestamp)) {
        return axisValueTimestamp;
      }

      const axisLabelTimestamp = Number(param.axisValueLabel);
      if (isLikelyMillisecondTimestamp(axisLabelTimestamp)) {
        return axisLabelTimestamp;
      }
    }
    return undefined;
  }

  function appendDecisionSnapshotPointGroup(
    groupedLines: Map<string, CandleTooltipGroup>,
    tooltipParams: CandleTooltipParam[],
  ) {
    const timestamp = getTooltipPointTimestamp(tooltipParams);
    if (timestamp === undefined) {
      return;
    }

    const lines = formatDecisionSnapshotPointRows(timestamp);
    if (lines.length > 0) {
      const tooltipGroup = groupedLines.get(DECISION_SNAPSHOT_GROUP_TITLE) ?? {
        title: DECISION_SNAPSHOT_GROUP_TITLE,
        source: 'decision_snapshot',
        lines: [],
        firstIndex: tooltipParams.length,
      };
      tooltipGroup.lines.push(...lines);
      groupedLines.set(DECISION_SNAPSHOT_GROUP_TITLE, tooltipGroup);
    }
    appendGenericPointGroups(groupedLines, timestamp, tooltipParams.length);
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

  function firstTimestampFromValue(value: unknown): number | undefined {
    if (!Array.isArray(value)) {
      return undefined;
    }
    const candidate = Number(value[0]);
    return isLikelyMillisecondTimestamp(candidate) ? candidate : undefined;
  }

  function formatTooltipTimestamp(param: CandleTooltipParam): string {
    const rowTimestamp = firstTimestampFromValue(param.value);
    if (rowTimestamp !== undefined) {
      return timestampms(rowTimestamp);
    }

    const axisValueTimestamp = Number(param.axisValue);
    if (isLikelyMillisecondTimestamp(axisValueTimestamp)) {
      return timestampms(axisValueTimestamp);
    }

    const axisLabelTimestamp = Number(param.axisValueLabel);
    if (isLikelyMillisecondTimestamp(axisLabelTimestamp)) {
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

    const groupedLines = new Map<string, CandleTooltipGroup>();
    tooltipParams.forEach((param, paramIndex) => {
      const lines = formatTooltipLine(param);
      if (lines.length === 0) {
        return;
      }

      const groupInfo = getTooltipGroupInfo(param);
      const tooltipGroup = groupedLines.get(groupInfo.title) ?? {
        ...groupInfo,
        lines: [],
        firstIndex: paramIndex,
      };
      tooltipGroup.lines.push(...lines);
      groupedLines.set(groupInfo.title, tooltipGroup);
    });
    appendDecisionSnapshotPointGroup(groupedLines, tooltipParams);

    const tooltipGroups = Array.from(groupedLines.values());
    const sortedTooltipGroups = tooltipGroups.some((group) => group.source === 'decision_snapshot')
      ? sortMetadataGroupsInLegacySlots(tooltipGroups)
      : tooltipGroups;

    const sections = sortedTooltipGroups
      .map(({ title, lines }, index) => {
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
