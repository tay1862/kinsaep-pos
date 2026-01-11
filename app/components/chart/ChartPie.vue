<template>
  <div ref="pieChart" v-bind="$attrs" class="h-full w-full" />
</template>

<script setup lang="ts">
import { type ECOption, useEcharts } from '~/hooks';

interface Props {
  title?: string;
  chartData?: ECOption;
}

const props = withDefaults(defineProps<Props>(), {
  title: '',
  chartData: (): ECOption => ({
    tooltip: {
      trigger: 'item',
    },
    legend: {
      top: '0%',
      // left: 'center',
      // align: 'center',orient: 'vertical',
      left: 'right',
      orient: 'vertical',
    },
    series: [
      {
        name: 'Access From',
        type: 'pie',
        radius: ['85%', '100%'],
        center: ['50%', '100%'],
        startAngle: 180,
        endAngle: 360,
        avoidLabelOverlap: false,
        label: {
          // show: false,
          position: 'center',
          // formatter: '{b}\n{c} ({d}%)',
          formatter: '{d}%',
          fontSize: 24,
          fontFamily: '-apple-system, system ui, Segoe UI, Roboto, sans-serif',
        },
        itemStyle: {
          // borderRadius: 10,
        },
        labelLine: {
          show: false,
        },
        data: [
          { value: 1048, name: 'Female' },
          { value: 735, name: 'Male' },
        ],
      },
    ],
  }),
});

const colorMode = useColorMode();
const isDark = computed(() => colorMode.value === 'dark');

const chartRef = ref<ECOption>() as Ref<ECOption>;
const { domRef: pieChart } = useEcharts(chartRef);

function renderChart() {
  const textColor = isDark.value ? '#9ca3af' : '#6b7280';
  const chartData = props.chartData!;
  
  // Apply theme-aware text colors
  if (chartData.legend) {
    chartData.legend.textStyle = {
      color: textColor,
    };
  }
  
  if (chartData.tooltip) {
    chartData.tooltip = {
      ...chartData.tooltip,
      backgroundColor: isDark.value ? '#1f2937' : '#ffffff',
      borderColor: isDark.value ? '#374151' : '#e5e7eb',
      textStyle: {
        color: textColor,
      },
    };
  }
  
  // Update label colors in series
  if (chartData.series && Array.isArray(chartData.series)) {
    chartData.series = chartData.series.map((s: any) => {
      if (s.label) {
        return {
          ...s,
          label: {
            ...s.label,
            color: textColor,
          },
        };
      }
      return s;
    });
  }
  
  chartRef.value = chartData;
}

watch(
  () => props.chartData,
  () => {
    renderChart();
  },
  { deep: true }
);

watch(
  () => colorMode.value,
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
