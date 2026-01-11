<template>
  <div class="relative">
    <div class="absolute left-0 top-0 z-10 h-full w-full">
      <div ref="areaChart" v-bind="$attrs" class="h-full w-full" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { type ECOption, useEcharts } from '~/hooks';
import { monthLists } from '~/lib';

const colorMode = useColorMode();
const isDark = computed({
  get() {
    return colorMode.value === 'dark';
  },
  set() {
    colorMode.preference = colorMode.value === 'dark' ? 'light' : 'dark';
  },
});

interface Props {
  title?: string;
  xAxisData?: string[];
  series?: ECOption['series'];
}

const primaryColor = '#08d9a4';

const props = withDefaults(defineProps<Props>(), {
  title: '',
  xAxisData: () => [],
  series: () => [
    {
      type: 'line',
      smooth: false,
      symbolSize: 8,
      showSymbol: true,
      symbol: 'circle',
      hoverAnimation: false,
      areaStyle: {
        color: {
          type: 'linear',
          x: 0,
          y: 0,
          x2: 0,
          y2: 1,
          colorStops: [
            {
              offset: 0,
              color: `${primaryColor}50`,
            },
            {
              offset: 1,
              color: `${primaryColor}02`,
            },
          ],
          global: false,
        },
      },
      lineStyle: {
        color: primaryColor,
        width: 2,
      },
      itemStyle: {
        color: primaryColor,
        borderColor: primaryColor,
        borderWidth: 2,
        borderType: 'solid',
      },
      data: [820, 932, 901, 934, 1290, 1330, 1450, 800, 879, 1209, 1500, 1690],
    },
  ],
});

const chartRef = ref<ECOption>() as Ref<ECOption>;
const { domRef: areaChart } = useEcharts(chartRef);
// const { lineChartColor } = useTheme();

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
      top: '6%',
      containLabel: true,
    },
    legend: {
      textStyle: {
        fontFamily: 'Bouasavanh',
      },
    },
    xAxis: [
      {
        type: 'category',
        // boundaryGap: false,
        axisLine: {
          lineStyle: {
            color: isDark?.value ? '#464646' : '#FCFCFC',
            cap: 'round',
            dashOffset: 5,
          },
        },
        axisLabel: {
          color: isDark?.value ? '#FCFCFC' : '#BDBBBB',
          fontFamily: 'Bouasavanh',
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
            color: isDark?.value ? '#464646' : '#FCFCFC',
          },
        },
        axisLine: {
          lineStyle: {
            color: isDark?.value ? '#464646' : '#FCFCFC',
            cap: 'round',
            dashOffset: 5,
          },
        },
        axisLabel: {
          color: isDark?.value ? '#FCFCFC' : '#BDBBBB',
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
