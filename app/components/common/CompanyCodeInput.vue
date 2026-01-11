<template>
  <div class="company-code-input">
    <!-- Segmented Input -->
    <div class="flex items-center justify-center gap-2">
      <input
        ref="segment1Ref"
        v-model="segment1"
        type="text"
        maxlength="5"
        class="segment-input"
        :class="inputClass"
        placeholder="XXXXX"
        @input="handleInput(1, $event)"
        @keydown="handleKeydown(1, $event)"
        @paste="handlePaste"
        @focus="currentSegment = 1"
      />
      <span class="text-2xl font-bold text-gray-400 dark:text-gray-600">-</span>
      <input
        ref="segment2Ref"
        v-model="segment2"
        type="text"
        maxlength="5"
        class="segment-input"
        :class="inputClass"
        placeholder="XXXXX"
        @input="handleInput(2, $event)"
        @keydown="handleKeydown(2, $event)"
        @paste="handlePaste"
        @focus="currentSegment = 2"
      />
      <span class="text-2xl font-bold text-gray-400 dark:text-gray-600">-</span>
      <input
        ref="segment3Ref"
        v-model="segment3"
        type="text"
        maxlength="5"
        class="segment-input"
        :class="inputClass"
        placeholder="XXXXX"
        @input="handleInput(3, $event)"
        @keydown="handleKeydown(3, $event)"
        @paste="handlePaste"
        @focus="currentSegment = 3"
      />
    </div>

    <!-- Validation Status -->
    <div v-if="showStatus" class="mt-2 text-center text-sm">
      <span
        v-if="isValid"
        class="text-green-500 flex items-center justify-center gap-1"
      >
        <UIcon name="i-heroicons-check-circle" class="w-4 h-4" />
        {{ $t("common.valid", "Valid") }}
      </span>
      <span v-else-if="fullCode.length > 0" class="text-gray-400">
        {{ remainingChars }} {{ $t("common.characters", "characters") }}
      </span>
    </div>
  </div>
</template>

<script setup lang="ts">
const props = defineProps<{
  modelValue?: string;
  size?: "sm" | "md" | "lg" | "xl";
  showStatus?: boolean;
}>();

const emit = defineEmits<{
  (e: "update:modelValue", value: string): void;
  (e: "valid", isValid: boolean): void;
  (e: "submit"): void;
}>();

const company = useCompany();

// Refs
const segment1Ref = ref<HTMLInputElement>();
const segment2Ref = ref<HTMLInputElement>();
const segment3Ref = ref<HTMLInputElement>();
const currentSegment = ref(1);

// State
const segment1 = ref("");
const segment2 = ref("");
const segment3 = ref("");

// Computed
const fullCode = computed(() => {
  const s1 = segment1.value;
  const s2 = segment2.value;
  const s3 = segment3.value;

  if (!s1 && !s2 && !s3) return "";
  return `${s1}-${s2}-${s3}`.replace(/^-+|-+$/g, "").replace(/-{2,}/g, "-");
});

const isValid = computed(() => company.isValidCompanyCode(fullCode.value));

const remainingChars = computed(() => {
  const current =
    segment1.value.length + segment2.value.length + segment3.value.length;
  return Math.max(0, 15 - current);
});

const inputClass = computed(() => {
  const base =
    "text-center font-mono uppercase transition-all duration-200 rounded-lg border-2 outline-none";
  const focus =
    "focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500";
  const dark = "dark:bg-gray-800 dark:text-white";

  let sizeClass = "";
  switch (props.size) {
    case "sm":
      sizeClass = "w-16 h-10 text-sm";
      break;
    case "lg":
      sizeClass = "w-24 h-14 text-xl";
      break;
    case "xl":
      sizeClass = "w-28 h-16 text-2xl tracking-wider";
      break;
    default:
      sizeClass = "w-20 h-12 text-lg";
  }

  let stateClass = "";
  if (isValid.value) {
    stateClass = "border-green-500 bg-green-50 dark:bg-green-900/20";
  } else {
    stateClass = "border-gray-300 dark:border-gray-600 bg-white";
  }

  return `${base} ${focus} ${dark} ${sizeClass} ${stateClass}`;
});

// Methods
function handleInput(segmentNum: number, event: Event) {
  const input = event.target as HTMLInputElement;
  const value = input.value.toUpperCase().replace(/[^A-Z0-9]/g, "");

  // Update the correct segment
  if (segmentNum === 1) segment1.value = value;
  else if (segmentNum === 2) segment2.value = value;
  else segment3.value = value;

  // Auto-advance to next segment when current is full
  if (value.length === 5) {
    if (segmentNum === 1) {
      segment2Ref.value?.focus();
    } else if (segmentNum === 2) {
      segment3Ref.value?.focus();
    } else if (segmentNum === 3 && isValid.value) {
      // Last segment complete and valid - emit submit
      emit("submit");
    }
  }

  emitValue();
}

function handleKeydown(segmentNum: number, event: KeyboardEvent) {
  const input = event.target as HTMLInputElement;

  // Backspace on empty input - go to previous segment
  if (event.key === "Backspace" && input.value === "") {
    event.preventDefault();
    if (segmentNum === 2) {
      segment1Ref.value?.focus();
    } else if (segmentNum === 3) {
      segment2Ref.value?.focus();
    }
  }

  // Enter key - submit if valid
  if (event.key === "Enter" && isValid.value) {
    emit("submit");
  }

  // Arrow keys for navigation
  if (event.key === "ArrowLeft" && input.selectionStart === 0) {
    if (segmentNum === 2) segment1Ref.value?.focus();
    else if (segmentNum === 3) segment2Ref.value?.focus();
  }
  if (
    event.key === "ArrowRight" &&
    input.selectionStart === input.value.length
  ) {
    if (segmentNum === 1) segment2Ref.value?.focus();
    else if (segmentNum === 2) segment3Ref.value?.focus();
  }
}

function handlePaste(event: ClipboardEvent) {
  event.preventDefault();
  const pastedText = event.clipboardData?.getData("text") || "";

  // Clean and extract alphanumeric characters only
  const cleaned = pastedText.toUpperCase().replace(/[^A-Z0-9]/g, "");

  // Split into segments (support both 12 and 15 char codes)
  if (cleaned.length >= 12) {
    if (cleaned.length === 12) {
      // Old format: 4-4-4
      segment1.value = cleaned.slice(0, 4);
      segment2.value = cleaned.slice(4, 8);
      segment3.value = cleaned.slice(8, 12);
    } else {
      // New format: 5-5-5
      segment1.value = cleaned.slice(0, 5);
      segment2.value = cleaned.slice(5, 10);
      segment3.value = cleaned.slice(10, 15);
    }
    segment3Ref.value?.focus();
  } else {
    // Partial paste - fill from current segment
    const remaining = cleaned;
    if (currentSegment.value === 1) {
      segment1.value = remaining.slice(0, 5);
      if (remaining.length > 5) {
        segment2.value = remaining.slice(5, 10);
        if (remaining.length > 10) {
          segment3.value = remaining.slice(10, 15);
        }
      }
    } else if (currentSegment.value === 2) {
      segment2.value = remaining.slice(0, 5);
      if (remaining.length > 5) {
        segment3.value = remaining.slice(5, 10);
      }
    } else {
      segment3.value = remaining.slice(0, 5);
    }
  }

  emitValue();
}

function emitValue() {
  const code = fullCode.value;
  emit("update:modelValue", code);
  emit("valid", isValid.value);
}

function focus() {
  segment1Ref.value?.focus();
}

function clear() {
  segment1.value = "";
  segment2.value = "";
  segment3.value = "";
  emitValue();
}

// Watch for external value changes
watch(
  () => props.modelValue,
  (newVal) => {
    if (!newVal) {
      segment1.value = "";
      segment2.value = "";
      segment3.value = "";
      return;
    }

    const cleaned = newVal.toUpperCase().replace(/[^A-Z0-9]/g, "");
    if (cleaned.length === 12) {
      segment1.value = cleaned.slice(0, 4);
      segment2.value = cleaned.slice(4, 8);
      segment3.value = cleaned.slice(8, 12);
    } else if (cleaned.length >= 15) {
      segment1.value = cleaned.slice(0, 5);
      segment2.value = cleaned.slice(5, 10);
      segment3.value = cleaned.slice(10, 15);
    }
  },
  { immediate: true }
);

// Emit initial valid state
watch(
  isValid,
  (valid) => {
    emit("valid", valid);
  },
  { immediate: true }
);

// Expose methods
defineExpose({ focus, clear });
</script>

<style scoped>
.segment-input {
  caret-color: transparent;
}

.segment-input:focus {
  caret-color: auto;
}

/* Animation for valid state */
.segment-input.border-green-500 {
  animation: pulse-green 0.3s ease-out;
}

@keyframes pulse-green {
  0% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.02);
  }
  100% {
    transform: scale(1);
  }
}
</style>
