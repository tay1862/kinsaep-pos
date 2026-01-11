<script setup lang="ts">
import { DateFormatter, type DateValue, parseDate, CalendarDate } from "@internationalized/date";

interface Props {
  modelValue?: Date | null | number | string | DateValue;
  placeholder?: string;
  dateStyle?: "full" | "long" | "medium" | "short";
  locale?: string;
  disabled?: boolean;
  loading?: boolean;
  clearable?: boolean;
  color?: "primary" | "neutral" | "gray" | "red" | "orange" | "amber" | "yellow" | "lime" | "green" | "emerald" | "teal" | "cyan" | "sky" | "blue" | "indigo" | "violet" | "purple" | "fuchsia" | "pink" | "rose";
  variant?: "solid" | "outline" | "soft" | "ghost" | "link" | "subtle";
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  icon?: string;
  minDate?: Date;
  maxDate?: Date;
  label?: string;
  error?: string;
  hint?: string;
  required?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  modelValue: null,
  placeholder: undefined,
  dateStyle: "medium",
  locale: "en-US",
  disabled: false,
  loading: false,
  clearable: true,
  color: "neutral",
  variant: "subtle",
  size: "md",
  icon: "i-lucide-calendar",
  minDate: undefined,
  maxDate: undefined,
  label: undefined,
  error: undefined,
  hint: undefined,
  required: false,
});

const emit = defineEmits<{
  (e: "update:modelValue", value: Date | null): void;
  (e: "change", value: Date | null): void;
  (e: "clear"): void;
}>();

const { t } = useI18n();

// Date formatter with configurable locale and style
const df = computed(() => new DateFormatter(props.locale, {
  dateStyle: props.dateStyle,
}));

// Helper: Convert Date to CalendarDate
const dateToCalendarDate = (date: Date): CalendarDate | null => {
  try {
    if (!date || isNaN(date.getTime())) return null;
    return new CalendarDate(date.getFullYear(), date.getMonth() + 1, date.getDate());
  } catch {
    return null;
  }
};

// Helper: Convert CalendarDate to Date
const calendarDateToDate = (calendarDate: DateValue): Date | null => {
  try {
    if (!calendarDate) return null;
    const date = new Date(calendarDate.year, calendarDate.month - 1, calendarDate.day);
    return isNaN(date.getTime()) ? null : date;
  } catch {
    return null;
  }
};

// Internal calendar value (CalendarDate for UCalendar)
const calendarValue = computed({
  get(): CalendarDate | null {
    // Handle null, undefined, or empty string
    if (props.modelValue == null || props.modelValue === "") {
      return null;
    }
    
    // Already a CalendarDate/DateValue object
    if (typeof props.modelValue === 'object' && 'year' in props.modelValue && 'month' in props.modelValue && 'day' in props.modelValue) {
      return props.modelValue as CalendarDate;
    }
    
    // Handle number (timestamp)
    if (typeof props.modelValue === "number") {
      return dateToCalendarDate(new Date(props.modelValue));
    }
    
    // Handle string (ISO date string)
    if (typeof props.modelValue === "string") {
      try {
        // Try ISO format first (YYYY-MM-DD)
        if (/^\d{4}-\d{2}-\d{2}/.test(props.modelValue)) {
          return parseDate(props.modelValue.split('T')[0]);
        }
        return dateToCalendarDate(new Date(props.modelValue));
      } catch {
        return null;
      }
    }
    
    // Handle Date object
    if (props.modelValue instanceof Date) {
      return dateToCalendarDate(props.modelValue);
    }
    
    return null;
  },
  set(value: CalendarDate | null) {
    // Convert CalendarDate to native Date before emitting
    const dateValue = value ? calendarDateToDate(value) : null;
    emit("update:modelValue", dateValue);
    emit("change", dateValue);
  },
});

// Display value as native Date for formatting
const displayDate = computed(() => {
  if (!calendarValue.value) return null;
  return calendarDateToDate(calendarValue.value);
});

// Formatted display value
const displayValue = computed(() => {
  if (!displayDate.value) {
    return props.placeholder || t("common.select", "Select Date");
  }
  
  try {
    // Validate the date is actually valid before formatting
    if (isNaN(displayDate.value.getTime())) {
      return props.placeholder || t("common.select", "Select Date");
    }
    return df.value.format(displayDate.value);
  } catch (error) {
    console.warn("[CommonDatePicker] Invalid date format:", error);
    return props.placeholder || t("common.select", "Select Date");
  }
});

// Clear selected date
const clearDate = (event: Event) => {
  event.stopPropagation();
  calendarValue.value = null;
  emit("clear");
};

// Validation computed
const isInvalid = computed(() => !!props.error);

</script>

<template>
  <div class="flex flex-col gap-1.5">
    <!-- Label -->
    <label
      v-if="label"
      class="block text-sm font-medium text-gray-700 dark:text-gray-300"
    >
      {{ label }}
      <span v-if="required" class="text-red-500">*</span>
    </label>

    <!-- Date Picker Popover -->
    <UPopover :disabled="disabled || loading">
      <UButton
        :color="isInvalid ? 'red' : color"
        :variant="variant"
        :size="size"
        :icon="loading ? 'i-lucide-loader-2' : icon"
        :disabled="disabled || loading"
        :class="[
          'justify-between min-w-[200px]',
          loading && 'animate-spin',
          isInvalid && 'ring-2 ring-red-500 dark:ring-red-400',
        ]"
        block
      >
        <span class="flex-1 text-left truncate">
          {{ displayValue }}
        </span>
        
        <!-- Clear button -->
        <button
          v-if="clearable && calendarValue && !disabled && !loading"
          type="button"
          class="ml-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded p-0.5 transition-colors"
          @click="clearDate"
        >
          <UIcon name="i-lucide-x" class="w-3 h-3" />
        </button>
      </UButton>

      <template #content>
        <div class="p-2">
          <UCalendar
            v-model="calendarValue"
            :min-date="minDate"
            :max-date="maxDate"
            :disabled="disabled"
          />
        </div>
      </template>
    </UPopover>

    <!-- Hint or Error Message -->
    <p
      v-if="hint && !error"
      class="text-xs text-gray-500 dark:text-gray-400"
    >
      {{ hint }}
    </p>
    <p
      v-if="error"
      class="text-xs text-red-600 dark:text-red-400 flex items-center gap-1"
    >
      <UIcon name="i-lucide-alert-circle" class="w-3 h-3" />
      {{ error }}
    </p>
  </div>
</template>
