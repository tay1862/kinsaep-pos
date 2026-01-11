
<template>
  <div ref="lineChart" class="h-full w-full" />
</template>

<script setup lang="ts">
import { type ECOption, useEcharts } from '~/hooks';
import { monthLists } from '~/lib';

interface Props {
  title?: string;
  xAxisData?: string[];
  series?: ECOption['series'];
  // eslint-disable-next-line vue/require-default-prop
  axisLabel?: {
    show?: boolean;
    formatter?: string;
    [key: string]: unknown;
  };
}
// const { locale } = useI18n();

const props = withDefaults(defineProps<Props>(), {
  title: '',
  xAxisData: () => [],
  series: () => [
    {
      type: 'line',
      smooth: false,
      // symbolSize: 8,
      showSymbol: false,
      symbol: 'circle',
      hoverAnimation: false,
      // areaStyle: {
      //   color: {
      //     type: "linear",
      //     x: 0,
      //     y: 0,
      //     x2: 0,
      //     y2: 1,
      //     colorStops: [
      //       {
      //         offset: 0,
      //         color: "rgba(61, 184, 51, 0.3)",
      //       },
      //       {
      //         offset: 1,
      //         color: "rgba(61, 184, 51, 0)",
      //       },
      //     ],
      //     global: false,
      //   },
      // },
      lineStyle: {
        color: '#08d9a4',
        width: 4,
      },
      itemStyle: {
        color: '#08d9a4',
        borderColor: '#08d9a4',
        borderWidth: 2,
        borderType: 'solid',
      },
      data: [820, 932, 901, 934, 1290, 1330, 950, 2020, 2320, 1320, 1100, 1220],
    },
  ],
});

const chartRef = ref<ECOption>() as Ref<ECOption>;
const { domRef: lineChart } = useEcharts(chartRef);

function renderChart() {
  chartRef.value = {
    tooltip: {
      trigger: 'axis',
      axisPointer: {
        type: 'cross',
        label: {
          backgroundColor: '#6a7985',
          fontFamily: 'Bouasavanh',
        },
      },
    },
    grid: {
      left: '0%',
      right: '0%',
      bottom: '0%',
      top: '10%',
      containLabel: true,
    },
    legend: {},
    xAxis: [
      {
        type: 'category',
        // boundaryGap: false,
        axisLine: {
          lineStyle: {
            color: '#FCFCFC',
            cap: 'round',
            dashOffset: 5,
          },
        },
        axisLabel: {
          color: '#BDBBBB',
        },
        data: props.xAxisData.length
          ? props.xAxisData
          : monthLists.en.monthNamesShort,
      },
    ],
    yAxis: [
      {
        type: 'value',
        splitLine: {
          lineStyle: {
            color: '#FCFCFC',
          },
        },
        axisLine: {
          lineStyle: {
            color: '#FCFCFC',
            cap: 'round',
            dashOffset: 5,
          },
        },
        axisLabel: {
          // show: false,
          // formatter: '{value} %',
          color: '#BDBBBB',
          ...props.axisLabel,
        },
      },
    ],
    series: props.series,
  };
}

watch(
  () => props.series,
  () => {
    renderChart();
  }
);

watchEffect(() => {
  renderChart();
});

onMounted(() => {
  renderChart();
});
</script>
