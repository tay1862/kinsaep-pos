<template>
  <div ref="lineChart" v-bind="$attrs" class="h-full w-full" />
</template>

<script setup lang="ts">
import { type ECOption, useEcharts } from '~/hooks';
import { monthLists } from '~/lib';

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
      name: '',
      type: 'bar',
      barWidth: '60%',
      itemStyle: {
        color: primaryColor,
        borderRadius: [10, 10, 0, 0],
      },
      data: [820, 932, 901, 934, 1290, 1330, 1450, 800, 879, 1209, 1500, 1690],
    },
  ],
});

const colorMode = useColorMode();
const isDark = computed(() => colorMode.value === 'dark');

const chartRef = ref<ECOption>() as Ref<ECOption>;
const { domRef: lineChart } = useEcharts(chartRef);

function renderChart() {
  const textColor = isDark.value ? '#9ca3af' : '#6b7280';
  const lineColor = isDark.value ? '#374151' : '#e5e7eb';
  const axisLineColor = isDark.value ? '#4b5563' : '#d1d5db';

  chartRef.value = {
    tooltip: {
      trigger: 'axis',
      axisPointer: {
        type: 'cross',
        label: {
          backgroundColor: '#6a7985',
        },
      },
      backgroundColor: isDark.value ? '#1f2937' : '#ffffff',
      borderColor: isDark.value ? '#374151' : '#e5e7eb',
      textStyle: {
        color: textColor,
      },
    },
    grid: {
      left: '2%',
      right: '4%',
      bottom: '0%',
      top: '20%',
      containLabel: true,
    },
    legend: {
      textStyle: {
        color: textColor,
      },
    },
    xAxis: [
      {
        type: 'category',
        axisLine: {
          lineStyle: {
            color: axisLineColor,
            cap: 'round',
            dashOffset: 5,
          },
        },
        axisLabel: {
          color: textColor,
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
            color: lineColor,
          },
        },
        axisLine: {
          lineStyle: {
            color: axisLineColor,
            cap: 'round',
            dashOffset: 5,
          },
        },
        axisLabel: {
          color: textColor,
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

watch(
  () => colorMode.value,
  () => {
    renderChart();
  }
);

onMounted(() => {
  renderChart();
});
</script>
