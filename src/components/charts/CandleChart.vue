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
  getTimeAxisDomain,
  withLinkedTimeAxisMapping,
} from '@/utils/charts/candleChartAxis';
import {
  buildInitialTimeDataZoomRange,
  buildLinkedDataZoomOptions,
  captureDataZoomRange,
  createAxisIndexes,
  restoreDataZoomRange,
} from '@/utils/charts/chartZoom';
import { formatIndicatorLabel, isIndicatorVisible } from '@/utils/charts/candleChartSeries';
import {
  buildCrosshairGraphics,
  buildRemoveCrosshairGraphics,
  containsAnyGrid,
  containsGrid,
  findNearestCandleIndex,
  getGridRect,
  getGridUnionRect,
  getMainGridPriceAtPixel,
  getTimeValueAtPixel,
  getXAxisPixel,
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
const chartOptions = shallowRef<EChartsOption>({});
const crosshairSelection = shallowRef<CandleChartCrosshairSelection>();
const crosshairRows = shallowRef<number[][]>([]);
const crosshairDateColumn = ref(-1);
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

const { formatCandleTooltip } = useCandleChartTooltip(
  chartOptions,
  crosshairSelection,
  chartMeta,
);

function formatPriceAxisPointerLabel(params: { value: unknown }) {
  const value = Number(params.value);

  return Number.isFinite(value) ? formatDecimal(value, 'en-EN') : '';
}

function hideCrosshair() {
  crosshairSelection.value = undefined;
  candleChart.value?.dispatchAction({ type: 'hideTip' });
  candleChart.value?.setOption({
    graphic: buildRemoveCrosshairGraphics(),
  } as EChartsOption);
}

function updateCrosshairGraphic(x: number, y: number) {
  const chart = candleChart.value;
  if (!chart || !containsAnyGrid(chart, crosshairGridCount.value, x, y)) {
    hideCrosshair();
    return;
  }

  const pointerTimestamp = getTimeValueAtPixel(chart, x);
  if (pointerTimestamp === undefined) {
    hideCrosshair();
    return;
  }

  const dataIndex = findNearestCandleIndex(
    crosshairRows.value,
    crosshairDateColumn.value,
    pointerTimestamp,
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

  const xPixel = getXAxisPixel(chart, timestamp);
  const verticalRect = getGridUnionRect(chart, crosshairGridCount.value);
  if (xPixel === undefined || !verticalRect) {
    hideCrosshair();
    return;
  }

  crosshairSelection.value = { dataIndex, timestamp };

  const mainRect = getGridRect(chart, 0);
  const price = containsGrid(chart, 0, x, y) ? getMainGridPriceAtPixel(chart, xPixel, y) : undefined;
  const graphic = buildCrosshairGraphics({
    x: xPixel,
    verticalRect,
    horizontal:
      mainRect && price !== undefined
        ? {
            y,
            rect: mainRect,
            label: formatPriceAxisPointerLabel({ value: price }),
            labelSide: props.labelSide,
          }
        : undefined,
  });

  chart.setOption({ graphic } as EChartsOption);
  chart.dispatchAction({
    type: 'showTip',
    seriesIndex: 0,
    dataIndex,
  });
}

function handleCrosshairMove(event: ElementEvent) {
  updateCrosshairGraphic(Number(event.offsetX), Number(event.offsetY));
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

  const colDate = columns.findIndex((el) => el === '__date_ts');
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

  diffCols.value.forEach(([colFrom, colTo]) => {
    if (colFrom && colTo) {
      // Enhance dataset with diff columns for area plots
      dataset = calculateDiff(columns, dataset, colFrom, colTo);
    }
  });
  // Add new rows to end to allow slight "scroll past"
  const scrollPastLength = 5;
  crosshairRows.value = dataset.slice();
  crosshairDateColumn.value = colDate;
  const lastColDate = dataset[dataset.length - 1]?.[colDate];
  if (lastColDate) {
    const newArray = Array(scrollPastLength);
    newArray[colDate] = lastColDate + props.dataset.timeframe_ms * scrollPastLength;
    dataset.push(newArray);
  }
  const timeAxisDomain = getTimeAxisDomain(dataset, colDate);

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
          x: colDate,
          // open, close, low, high
          y: [colOpen, colClose, colLow, colHigh],
        },
      },
      {
        name: nameVolume,
        type: 'bar',
        xAxisIndex: 1,
        yAxisIndex: 1,
        itemStyle: {
          color: '#777777',
        },
        large: true,
        encode: {
          x: colDate,
          y: colVolume,
        },
      },
    ],
    xAxis: [
      withLinkedTimeAxisMapping(
        {
          type: 'time',
          axisLine: { onZero: false },
          axisTick: { show: true },
          axisLabel: { show: true },
          axisPointer: createLinkedTimeAxisPointer(),
          position: 'top',
          splitLine: { show: false },
          splitNumber: 20,
        },
        timeAxisDomain,
      ),
      withLinkedTimeAxisMapping(
        {
          type: 'time',
          gridIndex: 1,
          axisLine: { onZero: false },
          axisTick: { show: false },
          axisLabel: { show: false },
          axisPointer: createLinkedTimeAxisPointer(),
          splitLine: { show: false },
          splitNumber: 20,
        },
        timeAxisDomain,
      ),
    ],
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
      options.series.push(areaSeries);
    }
    const signalConfigs = [
      {
        colData: colEntryData,
        name: nameEntry,
        symbol: 'triangle',
        symbolSize: 10,
        color: buySignalColor,
        tooltipPrefix: t('chart.longEntries'),
        colTooltip: colEnterTag,
      },
      {
        colData: colExitData,
        name: nameExit,
        symbol: 'diamond',
        symbolSize: 8,
        color: sellSignalColor,
        tooltipPrefix: t('chart.longExit'),
        colTooltip: colExitTag,
      },
      {
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
            x: colDate,
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
          options.series.push(generateCandleSeries(colDate, col, key, value, 0, chartMeta.value));

          if (value.fill_to) {
            // Assign
            const fillColKey = `${key}-${value.fill_to}`;
            const fillCol = columns.findIndex((el) => el === fillColKey);
            const fillValue: IndicatorConfig = {
              color: value.color,
              type: ChartType.line,
            };
            const areaSeries = generateAreaCandleSeries(
              colDate,
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
        options.xAxis.push(
          withLinkedTimeAxisMapping(
            {
              type: 'time',
              gridIndex: currGridIdx,
              axisLine: { onZero: false },
              axisTick: { show: false },
              axisLabel: { show: false },
              axisPointer: createLinkedTimeAxisPointer(),
              splitLine: { show: false },
              splitNumber: 20,
            },
            timeAxisDomain,
          ),
        );
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
              generateCandleSeries(colDate, col, sk, sv, plotIndex, chartMeta.value),
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
                colDate,
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
  if (Array.isArray(options.series)) {
    options.series.push(tradesSeries);
  }
  if (Array.isArray(options.xAxis)) {
    const xAxisIndex = createAxisIndexes(options.xAxis.length);
    const initialZoomRange = initial
      ? buildInitialTimeDataZoomRange(props.dataset.data, colDate, props.startCandleCount + 2)
      : undefined;
    options.dataZoom = buildLinkedDataZoomOptions(xAxisIndex, initialZoomRange);
  }
  crosshairGridCount.value = Array.isArray(options.grid) ? options.grid.length : 0;
  crosshairSelection.value = undefined;

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
</style>
