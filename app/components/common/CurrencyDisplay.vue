<template>
  <span :class="[
    'currency-display',
    sizeClasses,
    colorClasses,
    { 'font-mono': mono, 'font-bold': bold }
  ]">
    <span v-if="showSymbol && !showCode" class="currency-symbol">
      {{ currencyInfo?.symbol }}
    </span>
    <span class="currency-amount">
      {{ formattedAmount }}
    </span>
    <span v-if="showCode" class="currency-code ml-1 text-gray-500 dark:text-gray-400">
      {{ currency }}
    </span>
    <span v-if="showDual && dualAmount" class="currency-dual ml-2 text-sm text-gray-500 dark:text-gray-400">
      ({{ dualAmount }})
    </span>
  </span>
</template>

<script setup lang="ts">
import { useCurrency } from '~/composables/use-currency'
import { getCurrencyInfo } from '~/data/currencies'
import type { CurrencyCode } from '~/types'

interface Props {
  amount: number
  currency?: CurrencyCode
  showSymbol?: boolean
  showCode?: boolean
  showDual?: boolean  // Show dual display (e.g., $100 (10,000 sats))
  dualCurrency?: CurrencyCode  // Currency for dual display
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl'
  color?: 'default' | 'success' | 'warning' | 'error' | 'muted'
  mono?: boolean  // Use monospace font
  bold?: boolean  // Bold text
}

const props = withDefaults(defineProps<Props>(), {
  currency: undefined,
  showSymbol: true,
  showCode: false,
  showDual: false,
  dualCurrency: 'SATS',
  size: 'md',
  color: 'default',
  mono: false,
  bold: false
})

const { format, convert, displayCurrency } = useCurrency()

// Use provided currency or fall back to display currency
const effectiveCurrency = computed(() => props.currency || displayCurrency.value)

// Get currency info
const currencyInfo = computed(() => getCurrencyInfo(effectiveCurrency.value))

// Format the amount
const formattedAmount = computed(() => {
  return format(props.amount, effectiveCurrency.value, {
    showSymbol: false,
    showCode: false
  })
})

// Format dual amount if enabled
const dualAmount = computed(() => {
  if (!props.showDual || !props.dualCurrency) return null

  const convertedAmount = convert(props.amount, effectiveCurrency.value, props.dualCurrency)
  return format(convertedAmount, props.dualCurrency)
})

// Size classes
const sizeClasses = computed(() => {
  const sizes = {
    xs: 'text-xs',
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-lg',
    xl: 'text-xl',
    '2xl': 'text-2xl',
    '3xl': 'text-3xl'
  }
  return sizes[props.size]
})

// Color classes
const colorClasses = computed(() => {
  const colors = {
    default: 'text-gray-900 dark:text-white',
    success: 'text-green-600 dark:text-green-400',
    warning: 'text-amber-600 dark:text-amber-400',
    error: 'text-red-600 dark:text-red-400',
    muted: 'text-gray-500 dark:text-gray-400'
  }
  return colors[props.color]
})
</script>

<style scoped>
.currency-display {
  display: inline-flex;
  align-items: baseline;
  white-space: nowrap;
}

.currency-symbol {
  margin-right: 0.125rem;
}
</style>
