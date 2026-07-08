<script setup lang="ts">
import type {
  ChartResponseMeta,
  ChartSliderPosition,
  IndicatorConfig,
  PairHistory,
  PlotConfig,
  Trade,
} from '@/types';
import { ChartType } from '@/types';

import ECharts from 'vue-echarts';

import type { EChartsOption, ElementEvent, ScatterSeriesOption } from 'echarts';
import { BarChart, CandlestickChart, LineChart, ScatterChart } from 'echarts/charts';
import {
  AxisPointerComponent,
  CalendarComponent,
  DataZoomComponent,
  DatasetComponent,
  GridComponent,
  LegendComponent,
  TimelineComponent,
  TitleComponent,
  ToolboxComponent,
  TooltipComponent,
  VisualMapComponent,
  VisualMapPiecewiseComponent,
  MarkAreaComponent,
  GraphicComponent,
  MarkLineComponent,
  MarkPointComponent,
} from 'echarts/components';
import { use } from 'echarts/core';
import { CanvasRenderer } from 'echarts/renderers';

import {
  createLinkedTimeAxisPointer,
  createMainPriceAxisPointer,
  getAxisDomain,
  getTimeAxisDomain,
  withLinkedTimeAxisMapping,
  withLinkedValueAxisMapping,
} from '@/utils/charts/candleChartAxis';
import {
  buildInitialDataZoomRange,
  buildLinkedDataZoomOptions,
  captureDataZoomRange,
  createAxisIndexes,
  restoreDataZoomRange,
} from '@/utils/charts/chartZoom';
import {
  TRADING_SESSION_DISPLAY_COLUMN,
  buildTradingSessionAxisDataset,
  getChartAxisMode,
  getTimestampForDisplayValue,
  type CandleChartAxisMode,
  type TradingSessionAxisDataset,
} from '@/utils/charts/candleChartTradingAxis';
import { formatIndicatorLabel, isIndicatorVisible } from '@/utils/charts/candleChartSeries';
import {
  containsGrid,
  findNearestCandleIndex,
  findContainingGridIndex,
  getGridRect,
  getMainGridPriceAtPixel,
  getTimeAxisGridProjections,
  getTimeValueAtPixel,
  type TimeAxisGridProjection,
  type CandleChartCrosshairSelection,
} from '@/utils/charts/candleChartCrosshair';
import { getPlotConfigKey } from '@/utils/charts/plotConfigKey';
import { formatSignalTooltipValue } from '@/utils/charts/signalTooltip';

use([
  AxisPointerComponent,
  CalendarComponent,
  DatasetComponent,
  DataZoomComponent,
  GridComponent,
  LegendComponent,
  TimelineComponent,
  TitleComponent,
  ToolboxComponent,
  TooltipComponent,
  VisualMapComponent,
  VisualMapPiecewiseComponent,
  MarkAreaComponent,
  GraphicComponent,
  MarkLineComponent,
  MarkPointComponent,

  CandlestickChart,
  BarChart,
  LineChart,
  ScatterChart,
  CanvasRenderer,
]);

const props = defineProps<{
  trades: Trade[];
  dataset: PairHistory & { meta?: ChartResponseMeta | null };
  heikinAshi: boolean;
  showMarkArea: boolean;
  useUTC: boolean;
  plotConfig: PlotConfig;
  theme: 'dark' | 'light';
  sliderPosition?: ChartSliderPosition;
  colorUp: string;
  colorDown: string;
  labelSide: 'left' | 'right';
  startCandleCount: number;
}>();

const isLabelLeft = computed(() => props.labelSide === 'left');
// Chart default options
const MARGINLEFT = isLabelLeft.value ? '5.5%' : '1%';
const MARGINRIGHT = isLabelLeft.value ? '1%' : '5.5%';
const NAMEGAP = 55;
const SUBPLOTHEIGHT = 8; // Value in %
// minimal helpers for debugging
const showAxisLine = false;

// Candle Colors
const upColor = props.colorUp;
const upBorderColor = props.colorUp;
const downColor = props.colorDown;
const downBorderColor = props.colorDown;

// Buy / Sell Signal Colors
const buySignalColor = '#00ff26';
const shortEntrySignalColor = '#00ff26';
const sellSignalColor = '#faba25';
const shortexitSignalColor = '#faba25';

const candleChart = useTemplateRef<InstanceType<typeof ECharts>>('candleChart');
const crosshairOverlay = useTemplateRef<HTMLDivElement>('crosshairOverlay');
const chartOptions = shallowRef<EChartsOption>({});
const crosshairSelection = shallowRef<CandleChartCrosshairSelection>();
const crosshairRows = shallowRef<number[][]>([]);
const crosshairDateColumn = ref(-1);
const crosshairXColumn = ref(-1);
const crosshairAxisMode = ref<CandleChartAxisMode>('time');
const crosshairGridCount = ref(0);
const settingsStore = useSettingsStore();
const { t } = useAppI18n();

const strategy = computed(() => {
  return props.dataset ? props.dataset.strategy : '';
});

const pair = computed(() => {
  return props.dataset ? props.dataset.pair : '';
});

const timeframe = computed(() => {
  return props.dataset ? props.dataset.timeframe : '';
});

const chartMeta = computed(() => props.dataset.meta ?? null);

const hasData = computed(() => {
  return props.dataset !== null && typeof props.dataset === 'object';
});

const filteredTrades = computed(() => {
  return props.trades.filter((item: Trade) => item.pair === pair.value);
});

const chartTitle = computed(() => {
  return `${strategy.value} - ${pair.value} - ${timeframe.value}`;
});

const diffCols = computed(() => {
  return getDiffColumnsFromPlotConfig(props.plotConfig);
});
const plotConfigKey = computed(() => getPlotConfigKey(props.plotConfig));

usePercentageTool(
  candleChart,
  toRef(() => props.theme),
  toRef(() => props.dataset.timeframe_ms),
);

const { formatCandleTooltip } = useCandleChartTooltip(chartOptions, crosshairSelection, chartMeta);

function formatPriceAxisPointerLabel(params: { value: unknown }) {
  const value = Number(params.value);

  return Number.isFinite(value) ? formatDecimal(value, 'en-EN') : '';
}

const crosshairVerticalLines = new Map<number, HTMLDivElement>();
let crosshairHorizontalLine: HTMLDivElement | undefined;
let crosshairPriceLabel: HTMLDivElement | undefined;
let lastTooltipDataIndex: number | undefined;
let pendingCrosshairPoint: { x: number; y: number } | undefined;
let crosshairFrameId: number | undefined;

function applyCrosshairLineStyle(element: HTMLDivElement) {
  element.style.position = 'absolute';
  element.style.pointerEvents = 'none';
  element.style.borderColor = '#cccccc';
  element.style.opacity = '1';
  element.style.zIndex = '20';
}

function getCrosshairVerticalLine(gridIndex: number): HTMLDivElement | undefined {
  const overlay = crosshairOverlay.value;
  if (!overlay) {
    return undefined;
  }

  const current = crosshairVerticalLines.get(gridIndex);
  if (current) {
    return current;
  }

  const line = document.createElement('div');
  applyCrosshairLineStyle(line);
  line.style.width = '0';
  line.style.borderLeft = '1px dashed #cccccc';
  overlay.appendChild(line);
  crosshairVerticalLines.set(gridIndex, line);
  return line;
}

function getCrosshairHorizontalLine(): HTMLDivElement | undefined {
  const overlay = crosshairOverlay.value;
  if (!overlay) {
    return undefined;
  }

  if (!crosshairHorizontalLine) {
    crosshairHorizontalLine = document.createElement('div');
    applyCrosshairLineStyle(crosshairHorizontalLine);
    crosshairHorizontalLine.style.height = '0';
    crosshairHorizontalLine.style.borderTop = '1px dashed #cccccc';
    overlay.appendChild(crosshairHorizontalLine);
  }
  return crosshairHorizontalLine;
}

function getCrosshairPriceLabel(): HTMLDivElement | undefined {
  const overlay = crosshairOverlay.value;
  if (!overlay) {
    return undefined;
  }

  if (!crosshairPriceLabel) {
    crosshairPriceLabel = document.createElement('div');
    crosshairPriceLabel.style.position = 'absolute';
    crosshairPriceLabel.style.pointerEvents = 'none';
    crosshairPriceLabel.style.zIndex = '21';
    crosshairPriceLabel.style.color = '#ffffff';
    crosshairPriceLabel.style.font = '12px sans-serif';
    crosshairPriceLabel.style.backgroundColor = '#111827';
    crosshairPriceLabel.style.border = '1px solid #cccccc';
    crosshairPriceLabel.style.padding = '3px 5px';
    crosshairPriceLabel.style.whiteSpace = 'nowrap';
    overlay.appendChild(crosshairPriceLabel);
  }
  return crosshairPriceLabel;
}

function getProjectionUnionRect(projections: TimeAxisGridProjection[]) {
  const left = Math.min(...projections.map((projection) => projection.rect.x));
  const top = Math.min(...projections.map((projection) => projection.rect.y));
  const right = Math.max(
    ...projections.map((projection) => projection.rect.x + projection.rect.width),
  );
  const bottom = Math.max(
    ...projections.map((projection) => projection.rect.y + projection.rect.height),
  );
  return { x: left, y: top, width: right - left, height: bottom - top };
}

function renderCrosshairVerticalLines(projections: TimeAxisGridProjection[]) {
  if (projections.length === 0) {
    hideCrosshairOverlay();
    return;
  }

  const minX = Math.min(...projections.map((projection) => projection.x));
  const maxX = Math.max(...projections.map((projection) => projection.x));
  const visibleLineIndexes = new Set<number>();

  if (maxX - minX <= 0.5) {
    const line = getCrosshairVerticalLine(-1);
    const rect = getProjectionUnionRect(projections);
    if (line) {
      line.style.display = 'block';
      line.style.left = `${(minX + maxX) / 2}px`;
      line.style.top = `${rect.y}px`;
      line.style.height = `${rect.height}px`;
    }
    visibleLineIndexes.add(-1);
  } else {
    for (const projection of projections) {
      const line = getCrosshairVerticalLine(projection.gridIndex);
      if (line) {
        line.style.display = 'block';
        line.style.left = `${projection.x}px`;
        line.style.top = `${projection.rect.y}px`;
        line.style.height = `${projection.rect.height}px`;
      }
      visibleLineIndexes.add(projection.gridIndex);
    }
  }

  for (const [gridIndex, line] of crosshairVerticalLines) {
    if (!visibleLineIndexes.has(gridIndex)) {
      line.style.display = 'none';
    }
  }
}

function renderCrosshairHorizontalLine(
  horizontal:
    | {
        y: number;
        rect: { x: number; y: number; width: number; height: number };
        label: string;
        labelSide: 'left' | 'right';
      }
    | undefined,
) {
  if (!horizontal) {
    if (crosshairHorizontalLine) {
      crosshairHorizontalLine.style.display = 'none';
    }
    if (crosshairPriceLabel) {
      crosshairPriceLabel.style.display = 'none';
    }
    return;
  }

  const horizontalLine = getCrosshairHorizontalLine();
  const priceLabel = getCrosshairPriceLabel();
  if (!horizontalLine || !priceLabel) {
    return;
  }

  const labelOnRight = horizontal.labelSide === 'right';
  horizontalLine.style.display = 'block';
  horizontalLine.style.left = `${horizontal.rect.x}px`;
  horizontalLine.style.top = `${horizontal.y}px`;
  horizontalLine.style.width = `${horizontal.rect.width}px`;

  priceLabel.style.display = 'block';
  priceLabel.textContent = horizontal.label;
  priceLabel.style.left = labelOnRight
    ? `${horizontal.rect.x + horizontal.rect.width + 4}px`
    : `${horizontal.rect.x - 4}px`;
  priceLabel.style.right = '';
  priceLabel.style.top = `${horizontal.y}px`;
  priceLabel.style.transform = labelOnRight ? 'translateY(-50%)' : 'translate(-100%, -50%)';
}

function renderCrosshairOverlay(
  projections: TimeAxisGridProjection[],
  horizontal?:
    | {
        y: number;
        rect: { x: number; y: number; width: number; height: number };
        label: string;
        labelSide: 'left' | 'right';
      }
    | undefined,
) {
  renderCrosshairVerticalLines(projections);
  renderCrosshairHorizontalLine(horizontal);
}

function hideCrosshairOverlay() {
  for (const line of crosshairVerticalLines.values()) {
    line.style.display = 'none';
  }
  if (crosshairHorizontalLine) {
    crosshairHorizontalLine.style.display = 'none';
  }
  if (crosshairPriceLabel) {
    crosshairPriceLabel.style.display = 'none';
  }
}

function hideCrosshair() {
  if (crosshairFrameId !== undefined) {
    cancelAnimationFrame(crosshairFrameId);
    crosshairFrameId = undefined;
  }
  pendingCrosshairPoint = undefined;
  crosshairSelection.value = undefined;
  lastTooltipDataIndex = undefined;
  hideCrosshairOverlay();
  candleChart.value?.dispatchAction({ type: 'hideTip' });
}

function updateCrosshairGraphic(x: number, y: number) {
  const chart = candleChart.value;
  const hitGridIndex = chart
    ? findContainingGridIndex(chart, crosshairGridCount.value, x, y)
    : undefined;
  if (!chart || hitGridIndex === undefined) {
    hideCrosshair();
    return;
  }

  const pointerXValue = getTimeValueAtPixel(chart, hitGridIndex, x);
  if (pointerXValue === undefined) {
    hideCrosshair();
    return;
  }

  const dataIndex = findNearestCandleIndex(
    crosshairRows.value,
    crosshairAxisMode.value === 'trading_session'
      ? crosshairXColumn.value
      : crosshairDateColumn.value,
    pointerXValue,
  );
  const selectedRow = dataIndex === undefined ? undefined : crosshairRows.value[dataIndex];
  const timestamp =
    selectedRow && crosshairDateColumn.value >= 0
      ? Number(selectedRow[crosshairDateColumn.value])
      : undefined;
  if (dataIndex === undefined || timestamp === undefined || !Number.isFinite(timestamp)) {
    hideCrosshair();
    return;
  }

  const projectionValue =
    crosshairAxisMode.value === 'trading_session' && selectedRow
      ? Number(selectedRow[crosshairXColumn.value])
      : timestamp;
  const projections = getTimeAxisGridProjections(
    chart,
    crosshairGridCount.value,
    projectionValue,
  );
  if (projections.length === 0) {
    hideCrosshair();
    return;
  }

  crosshairSelection.value = { dataIndex, timestamp };

  const mainRect = getGridRect(chart, 0);
  const mainProjection = projections.find((projection) => projection.gridIndex === 0);
  const price =
    mainProjection && containsGrid(chart, 0, x, y)
      ? getMainGridPriceAtPixel(chart, mainProjection.x, y)
      : undefined;
  renderCrosshairOverlay(
    projections,
    mainRect && price !== undefined
      ? {
          y,
          rect: mainRect,
          label: formatPriceAxisPointerLabel({ value: price }),
          labelSide: props.labelSide,
        }
      : undefined,
  );

  if (lastTooltipDataIndex !== dataIndex) {
    chart.dispatchAction({
      type: 'showTip',
      seriesIndex: 0,
      dataIndex,
    });
    lastTooltipDataIndex = dataIndex;
  }
}

function handleCrosshairMove(event: ElementEvent) {
  pendingCrosshairPoint = { x: Number(event.offsetX), y: Number(event.offsetY) };
  if (crosshairFrameId !== undefined) {
    return;
  }
  crosshairFrameId = requestAnimationFrame(() => {
    crosshairFrameId = undefined;
    const point = pendingCrosshairPoint;
    pendingCrosshairPoint = undefined;
    if (point) {
      updateCrosshairGraphic(point.x, point.y);
    }
  });
}

function addLegend(name: string, position: number | undefined = undefined) {
  if (
    !chartOptions.value.legend ||
    Array.isArray(chartOptions.value.legend) ||
    !Array.isArray(chartOptions.value.legend.data)
  )
    return;
  const label = formatIndicatorLabel(name, chartMeta.value);
  if (!chartOptions.value.legend.data.includes(label)) {
    if (position !== undefined) {
      chartOptions.value.legend.data.splice(position, 0, label);
    } else {
      chartOptions.value.legend.data.push(label);
    }
  }
}

function getInitialLegendLabels() {
  return [
    t('chart.legendCandles'),
    t('chart.legendVolume'),
    t('chart.legendEntry'),
    t('chart.legendExit'),
  ];
}

function resetLocalizedLegendLabels() {
  if (
    !chartOptions.value.legend ||
    Array.isArray(chartOptions.value.legend) ||
    !Array.isArray(chartOptions.value.legend.data)
  )
    return;

  chartOptions.value.legend.data = getInitialLegendLabels();
}

function updateChart(initial = false) {
  if (!hasData.value) {
    return;
  }
  const currentZoomRange = initial ? undefined : captureDataZoomRange(candleChart.value);
  const nameCandles = t('chart.legendCandles');
  const nameVolume = t('chart.legendVolume');
  const nameEntry = t('chart.legendEntry');
  const nameExit = t('chart.legendExit');
  if (chartOptions.value?.title) {
    chartOptions.value.title[0].text = chartTitle.value;
  }
  resetLocalizedLegendLabels();
  // Avoid mutation of dataset.columns array
  const columns = props.dataset.columns.slice();

  const timestampSourceColumn = chartMeta.value?.axis?.source_column ?? '__date_ts';
  const rawDateColumn = columns.findIndex((el) => el === timestampSourceColumn);
  const colOpen = columns.findIndex((el) => el === 'open');
  const colHigh = columns.findIndex((el) => el === 'high');
  const colLow = columns.findIndex((el) => el === 'low');
  const colClose = columns.findIndex((el) => el === 'close');
  const colVolume = columns.findIndex((el) => el === 'volume');
  const colEnterTag = columns.findIndex((el) => el === 'enter_tag');
  const colExitTag = columns.findIndex((el) => el === 'exit_tag');

  const colEntryData = columns.findIndex(
    (el) => el === '_buy_signal_close' || el === '_enter_long_signal_close',
  );
  const colExitData = columns.findIndex(
    (el) => el === '_sell_signal_close' || el === '_exit_long_signal_close',
  );

  const colShortEntryData = columns.findIndex((el) => el === '_enter_short_signal_close');
  const colShortExitData = columns.findIndex((el) => el === '_exit_short_signal_close');

  const subplotCount =
    'subplots' in props.plotConfig
      ? Object.values(props.plotConfig.subplots).filter((subplot) =>
          Object.values(subplot).some(isIndicatorVisible),
        ).length + 1
      : 1;

  let dataset = props.heikinAshi
    ? heikinAshiDataset(columns, props.dataset.data)
    : props.dataset.data.slice();
  const axisMode = getChartAxisMode(chartMeta.value);
  let xColumn = rawDateColumn;
  let timestampColumn = rawDateColumn;
  let tradingAxisDataset: TradingSessionAxisDataset | undefined;

  if (axisMode === 'trading_session' && rawDateColumn >= 0) {
    tradingAxisDataset = buildTradingSessionAxisDataset(
      columns,
      dataset,
      rawDateColumn,
      chartMeta.value?.axis?.display_column ?? TRADING_SESSION_DISPLAY_COLUMN,
    );
    columns.splice(0, columns.length, ...tradingAxisDataset.columns);
    dataset = tradingAxisDataset.rows;
    xColumn = tradingAxisDataset.displayColumn;
    timestampColumn = tradingAxisDataset.timestampColumn;
  }

  diffCols.value.forEach(([colFrom, colTo]) => {
    if (colFrom && colTo) {
      // Enhance dataset with diff columns for area plots
      dataset = calculateDiff(columns, dataset, colFrom, colTo);
    }
  });
  // Add new rows to end to allow slight "scroll past"
  const scrollPastLength = 5;
  crosshairRows.value = dataset.slice();
  crosshairDateColumn.value = timestampColumn;
  crosshairXColumn.value = xColumn;
  crosshairAxisMode.value = axisMode;
  const lastXValue = dataset[dataset.length - 1]?.[xColumn];
  if (lastXValue !== undefined) {
    const newArray = Array(columns.length);
    newArray[xColumn] =
      axisMode === 'trading_session'
        ? Number(lastXValue) + scrollPastLength
        : Number(lastXValue) + props.dataset.timeframe_ms * scrollPastLength;
    dataset.push(newArray);
  }
  const xAxisDomain =
    axisMode === 'trading_session'
      ? getAxisDomain(dataset, xColumn)
      : getTimeAxisDomain(dataset, xColumn);

  const formatTradingAxisLabel = (value: unknown): string => {
    if (!tradingAxisDataset) {
      return '';
    }
    const timestamp = getTimestampForDisplayValue(tradingAxisDataset, value);
    return timestamp ? timestampms(timestamp) : '';
  };

  const buildXAxis = (gridIndex?: number) =>
    axisMode === 'trading_session'
      ? withLinkedValueAxisMapping(
          {
            type: 'value',
            ...(gridIndex !== undefined ? { gridIndex } : {}),
            axisLine: { onZero: false },
            axisTick: { show: gridIndex === undefined },
            axisLabel: { show: gridIndex === undefined },
            axisPointer: createLinkedTimeAxisPointer(),
            position: gridIndex === undefined ? 'top' : undefined,
            splitLine: { show: false },
            splitNumber: 20,
          },
          xAxisDomain,
          formatTradingAxisLabel,
        )
      : withLinkedTimeAxisMapping(
          {
            type: 'time',
            ...(gridIndex !== undefined ? { gridIndex } : {}),
            axisLine: { onZero: false },
            axisTick: { show: gridIndex === undefined },
            axisLabel: { show: gridIndex === undefined },
            axisPointer: createLinkedTimeAxisPointer(),
            position: gridIndex === undefined ? 'top' : undefined,
            splitLine: { show: false },
            splitNumber: 20,
          },
          xAxisDomain,
        );

  const options: EChartsOption = {
    dataset: {
      source: dataset,
    },
    grid: [
      {
        left: MARGINLEFT,
        right: MARGINRIGHT,
        // Grid Layout from bottom to top
        bottom: `${subplotCount * SUBPLOTHEIGHT + 2}%`,
      },
      {
        // Volume
        left: MARGINLEFT,
        right: MARGINRIGHT,
        // Grid Layout from bottom to top
        bottom: `${subplotCount * SUBPLOTHEIGHT}%`,
        height: `${SUBPLOTHEIGHT}%`,
      },
    ],

    series: [
      {
        id: 'candles',
        name: nameCandles,
        type: 'candlestick',
        barWidth: '80%',
        itemStyle: {
          color: upColor,
          color0: downColor,
          borderColor: upBorderColor,
          borderColor0: downBorderColor,
        },
        encode: {
          x: xColumn,
          // open, close, low, high
          y: [colOpen, colClose, colLow, colHigh],
        },
      },
      {
        id: 'volume',
        name: nameVolume,
        type: 'bar',
        xAxisIndex: 1,
        yAxisIndex: 1,
        itemStyle: {
          color: '#777777',
        },
        large: true,
        encode: {
          x: xColumn,
          y: colVolume,
        },
      },
    ],
    xAxis: [buildXAxis(), buildXAxis(1)],
    yAxis: [
      {
        scale: true,
        max: (value) => {
          return formatDecimal(value.max + (value.max - value.min) * 0.02, 'en-EN');
        },
        min: (value) => {
          return formatDecimal(value.min - (value.max - value.min) * 0.04, 'en-EN');
        },
        name: ' ', // Necessary to avoid layout shift
        nameLocation: 'middle',
        nameGap: NAMEGAP,
        axisLine: { show: showAxisLine },
        axisLabel: {
          hideOverlap: true,
          overflow: 'truncate',
        },
        position: props.labelSide,
        axisPointer: createMainPriceAxisPointer(formatPriceAxisPointerLabel),
      },
      {
        scale: true,
        gridIndex: 1,
        splitNumber: 2,
        name: nameVolume,
        nameLocation: 'middle',
        position: props.labelSide,
        axisPointer: { show: false },
        nameGap: NAMEGAP,
        axisLabel: { show: false },
        axisLine: { show: showAxisLine },
        axisTick: { show: false },
        splitLine: { show: false },
      },
    ],
  };

  if (Array.isArray(options.series)) {
    const areaSeries = generateMarkAreaSeries(
      props.dataset,
      props.showMarkArea,
      props.plotConfig.options?.markAreaZIndex,
    );

    if (areaSeries) {
      areaSeries.id = 'mark-area';
      options.series.push(areaSeries);
    }
    const signalConfigs = [
      {
        id: 'long-entry-signals',
        colData: colEntryData,
        name: nameEntry,
        symbol: 'triangle',
        symbolSize: 10,
        color: buySignalColor,
        tooltipPrefix: t('chart.longEntries'),
        colTooltip: colEnterTag,
      },
      {
        id: 'long-exit-signals',
        colData: colExitData,
        name: nameExit,
        symbol: 'diamond',
        symbolSize: 8,
        color: sellSignalColor,
        tooltipPrefix: t('chart.longExit'),
        colTooltip: colExitTag,
      },
      {
        id: 'short-entry-signals',
        colData: colShortEntryData,
        name: nameEntry,
        symbol: 'triangle',
        symbolSize: 10,
        symbolRotate: 180,
        color: shortEntrySignalColor,
        tooltipPrefix: t('chart.shortEntries'),
        colTooltip: colEnterTag,
      },
      {
        id: 'short-exit-signals',
        colData: colShortExitData,
        name: nameExit,
        symbol: 'pin',
        symbolSize: 8,
        color: shortexitSignalColor,
        tooltipPrefix: t('chart.shortExits'),
        colTooltip: colExitTag,
      },
    ];

    for (const signal of signalConfigs) {
      if (signal.colData >= 0) {
        options.series.push({
          id: signal.id,
          name: signal.name,
          type: 'scatter',
          symbol: signal.symbol,
          symbolSize: signal.symbolSize,
          symbolRotate: signal.symbolRotate ?? 0,
          xAxisIndex: 0,
          yAxisIndex: 0,
          itemStyle: {
            color: signal.color,
          },
          tooltip: {
            valueFormatter: (value) =>
              formatSignalTooltipValue(value, signal.tooltipPrefix, signal.colTooltip),
          },
          encode: {
            x: xColumn,
            y: signal.colData,
            tooltip:
              signal.colTooltip >= 0 ? [signal.colData, signal.colTooltip] : [signal.colData],
          },
        });
      }
    }
  }

  if ('main_plot' in props.plotConfig) {
    Object.entries(props.plotConfig.main_plot).forEach(([key, value]) => {
      if (!isIndicatorVisible(value)) {
        return;
      }
      const col = columns.findIndex((el) => el === key);
      if (col > 0) {
        addLegend(key);
        if (Array.isArray(options.series)) {
          options.series.push(generateCandleSeries(xColumn, col, key, value, 0, chartMeta.value));

          if (value.fill_to) {
            // Assign
            const fillColKey = `${key}-${value.fill_to}`;
            const fillCol = columns.findIndex((el) => el === fillColKey);
            const fillValue: IndicatorConfig = {
              color: value.color,
              type: ChartType.line,
            };
            const areaSeries = generateAreaCandleSeries(
              xColumn,
              fillCol,
              key,
              fillValue,
              0,
              chartMeta.value,
            );

            const currentSeries = options.series[options.series.length - 1];
            if (currentSeries) {
              currentSeries['stack'] = key;
            }
            options.series.push(areaSeries);
          }
          options.series.splice(options.series.length - 1, 0);
        }
      } else {
        console.log(`element ${key} for main plot not found in columns.`);
      }
    });
  }

  // START Subplots
  if ('subplots' in props.plotConfig) {
    let plotIndex = 2;
    Object.entries(props.plotConfig.subplots).forEach(([key, value]) => {
      const visibleEntries = Object.entries(value).filter(([, sv]) => isIndicatorVisible(sv));
      if (visibleEntries.length === 0) {
        return;
      }

      // define yaxis

      // Subplots are added from bottom to top - only the "bottom-most" plot stays at the bottom.
      // const currGridIdx = totalSubplots - plotIndex > 1 ? totalSubplots - plotIndex : plotIndex;
      const currGridIdx = plotIndex;
      if (Array.isArray(options.yAxis) && options.yAxis.length <= plotIndex) {
        options.yAxis.push({
          scale: true,
          gridIndex: currGridIdx,
          name: key,
          position: props.labelSide,
          axisPointer: { show: false },
          nameLocation: 'middle',
          nameGap: NAMEGAP,
          axisLabel: {
            show: true,
            hideOverlap: true,
            overflow: 'truncate',
          },
          axisLine: { show: showAxisLine },
          axisTick: { show: false },
          splitLine: { show: false },
        });
      }
      if (Array.isArray(options.xAxis) && options.xAxis.length <= plotIndex) {
        options.xAxis.push(buildXAxis(currGridIdx));
      }
      if (options.grid && Array.isArray(options.grid)) {
        options.grid.push({
          left: MARGINLEFT,
          right: MARGINRIGHT,
          bottom: `${(subplotCount - plotIndex + 1) * SUBPLOTHEIGHT}%`,
          height: `${SUBPLOTHEIGHT}%`,
        });
      }
      visibleEntries.forEach(([sk, sv]) => {
        // entries per subplot
        const col = columns.findIndex((el) => el === sk);
        if (col > 0) {
          addLegend(sk);
          if (options.series && Array.isArray(options.series)) {
            options.series.push(
              generateCandleSeries(xColumn, col, sk, sv, plotIndex, chartMeta.value),
            );
            if (sv.fill_to) {
              // Assign
              const fillColKey = `${sk}-${sv.fill_to}`;
              const fillCol = columns.findIndex((el) => el === fillColKey);
              const fillValue: IndicatorConfig = {
                color: sv.color,
                type: ChartType.line,
              };
              const areaSeries = generateAreaCandleSeries(
                xColumn,
                fillCol,
                sk,
                fillValue,
                plotIndex,
                chartMeta.value,
              );
              const currentSeries = options.series[options.series.length - 1];
              if (currentSeries) {
                currentSeries['stack'] = sk;
              }
              options.series.push(areaSeries);
            }
            options.series.splice(options.series.length - 1, 0);
          }
        } else {
          console.log(`element ${sk} was not found in the columns.`);
        }
      });

      plotIndex += 1;
    });
  }
  // END Subplots
  // Last subplot should show xAxis labels
  // if (options.xAxis && Array.isArray(options.xAxis)) {
  //   options.xAxis[options.xAxis.length - 1].axisLabel.show = true;
  //   options.xAxis[options.xAxis.length - 1].axisTick.show = true;
  // }
  if (Array.isArray(options.grid)) {
    // Last subplot is bottom
    const localGrid = options.grid[options.grid.length - 1];
    if (localGrid) {
      // Last subplot is bottom
      localGrid.bottom = '50px';
      delete localGrid.top;
    }
  }

  const nameTrades = t('chart.legendTrades');
  // Insert trades into legend, after the default columns
  addLegend(nameTrades, 4);
  const tradesSeries: ScatterSeriesOption = generateTradeSeries(
    nameTrades,
    props.theme,
    props.dataset,
    filteredTrades.value,
  );
  tradesSeries.id = 'trades';
  if (Array.isArray(options.series)) {
    options.series.push(tradesSeries);
  }
  if (Array.isArray(options.xAxis)) {
    const xAxisIndex = createAxisIndexes(options.xAxis.length);
    const initialZoomRange =
      xColumn >= 0
        ? buildInitialDataZoomRange(dataset, xColumn, props.startCandleCount + 2)
        : undefined;
    options.dataZoom = buildLinkedDataZoomOptions(xAxisIndex, initialZoomRange);
  }
  crosshairGridCount.value = Array.isArray(options.grid) ? options.grid.length : 0;
  crosshairSelection.value = undefined;
  lastTooltipDataIndex = undefined;
  hideCrosshairOverlay();

  // Merge this into original data
  Object.assign(chartOptions.value, options);
  // console.log('chartOptions', chartOptions.value);
  candleChart.value?.setOption(chartOptions.value, {
    replaceMerge: ['series', 'grid', 'yAxis', 'xAxis', 'legend', 'dataZoom'],
    notMerge: initial,
  });
  restoreDataZoomRange(candleChart.value, currentZoomRange);
}

function initializeChartOptions() {
  // Ensure we start empty.
  candleChart.value?.setOption({}, { notMerge: true });

  chartOptions.value = {
    title: [
      {
        // text: this.chartTitle,
        show: false,
      },
    ],
    backgroundColor: 'rgba(0, 0, 0, 0)',
    useUTC: props.useUTC,
    animation: false,
    legend: {
      // Initial legend, further entries are pushed to the below list
      data: getInitialLegendLabels(),
      right: '1%',
      top: 0,
      type: 'scroll',
      pageTextStyle: {
        color: props.theme === 'dark' ? '#dedede' : '#333',
      },
      pageIconColor: props.theme === 'dark' ? '#aaa' : '#2f4554',
      pageIconInactiveColor: props.theme === 'dark' ? '#2f4554' : '#aaa',
    },
    tooltip: {
      show: true,
      trigger: 'axis',
      renderMode: 'html',
      formatter: formatCandleTooltip,
      backgroundColor: 'rgba(80,80,80,0.7)',
      borderWidth: 0,
      textStyle: {
        color: '#fff',
      },
      axisPointer: {
        show: false,
        type: 'line',
        axis: 'x',
        snap: false,
        lineStyle: createLinkedTimeAxisPointer().lineStyle,
      },
      // positioning copied from https://echarts.apache.org/en/option.html#tooltip.position
      position(pos, params, dom, rect, size) {
        // tooltip will be fixed on the right if mouse hovering on the left,
        // and on the left if hovering on the right.
        const obj = { top: 60 };
        const mouseIsLeft = pos[0] < size.viewSize[0] / 2;
        obj[['left', 'right'][+mouseIsLeft]!] = mouseIsLeft ? MARGINRIGHT : MARGINLEFT;
        return obj;
      },
    },
    axisPointer: {
      link: [{ xAxisIndex: 'all' }],
      snap: false,
      label: {
        show: false,
        backgroundColor: '#777',
      },
    },

    // visualMap: {
    //   //  TODO: this would allow to colorize volume bars (if we'd want this)
    //   //  Needs green / red indicator column in data.
    //   show: true,
    //   seriesIndex: 1,
    //   dimension: 5,
    //   pieces: [
    //     {
    //       max: 500000.0,
    //       color: downColor,
    //     },
    //     {
    //       min: 500000.0,
    //       color: upColor,
    //     },
    //   ],
    // },
  };

  console.log('Initialized');
  updateChart(true);
}

function updateSliderPosition() {
  if (getChartAxisMode(chartMeta.value) === 'trading_session') {
    return;
  }
  if (!props.sliderPosition) return;

  const start = props.sliderPosition.startValue - props.dataset.timeframe_ms * 40;
  const end = props.sliderPosition.endValue
    ? props.sliderPosition.endValue + props.dataset.timeframe_ms * 40
    : props.sliderPosition.startValue + props.dataset.timeframe_ms * 80;
  if (candleChart.value) {
    candleChart.value.dispatchAction({
      type: 'dataZoom',
      dataZoomIndex: 0,
      startValue: start,
      endValue: end,
    });
  }
}

// const buyData = ref<number[][]>([]);
// const sellData = ref<number[][]>([]);
// createSignalData(colDate: number, colOpen: number, colBuy: number, colSell: number): void {
// Calculate Buy and sell Series
// if (!this.signalsCalculated) {
//   // Generate Buy and sell array (using open rate to display marker)
//   for (let i = 0, len = this.dataset.data.length; i < len; i += 1) {
//     if (this.dataset.data[i][colBuy] === 1) {
//       this.buyData.push([this.dataset.data[i][colDate], this.dataset.data[i][colOpen]]);
//     }
//     if (this.dataset.data[i][colSell] === 1) {
//       this.sellData.push([this.dataset.data[i][colDate], this.dataset.data[i][colOpen]]);
//     }
//   }
//   this.signalsCalculated = true;
// }
// }

onMounted(() => {
  initializeChartOptions();
});

onBeforeUnmount(() => {
  hideCrosshair();
  for (const line of crosshairVerticalLines.values()) {
    line.remove();
  }
  crosshairVerticalLines.clear();
  crosshairHorizontalLine?.remove();
  crosshairHorizontalLine = undefined;
  crosshairPriceLabel?.remove();
  crosshairPriceLabel = undefined;
});

watch([() => props.useUTC, () => props.theme, () => plotConfigKey.value], () =>
  initializeChartOptions(),
);

watch(
  () => settingsStore.localeMode,
  () => {
    resetLocalizedLegendLabels();
    updateChart(false);
  },
);

watch([() => props.dataset, () => props.heikinAshi, () => props.showMarkArea], () => updateChart());

watch(
  () => props.sliderPosition,
  () => updateSliderPosition(),
);
</script>

<template>
  <div class="candle-chart-wrapper h-full w-full">
    <ECharts
      v-if="hasData"
      ref="candleChart"
      :theme="theme"
      autoresize
      manual-update
      @zr:mousemove="handleCrosshairMove"
      @zr:globalout="hideCrosshair"
    />
    <div ref="crosshairOverlay" class="crosshair-overlay" />
  </div>
</template>

<style scoped lang="css">
.candle-chart-wrapper {
  position: relative;
}

.echarts {
  width: 100%;
  min-height: 200px;
  /* TODO: height calculation is not working correctly - uses min-height for now */
  /* height: 600px; */
  height: 100%;
}

.crosshair-overlay {
  position: absolute;
  inset: 0;
  pointer-events: none;
}
</style>
