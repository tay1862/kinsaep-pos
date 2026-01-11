<template>
  <div class="barcode-scanner">
    <!-- Scanner Input Mode -->
    <div v-if="inputMode === 'keyboard'" class="relative">
      <UInput
        ref="inputRef"
        v-model="barcodeInput"
        :placeholder="placeholder"
        icon="i-heroicons-qr-code"
        class="font-mono w-full"
        @keydown.enter="handleScan"
        @focus="isActive = true"
        @blur="handleBlur"
      />
      <div
        v-if="isActive"
        class="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1"
      >
        <UBadge color="success" variant="subtle" size="xs">
          <UIcon name="i-heroicons-signal" class="animate-pulse" />
          {{ $t("pos.scanner.listening") }}
        </UBadge>
      </div>
    </div>

    <!-- Camera Scanner Mode -->
    <div v-if="inputMode === 'camera'" class="space-y-4">
      <!-- Video Container with Overlay -->
      <div class="relative aspect-square max-w-sm mx-auto bg-black rounded-lg overflow-hidden">
        <!-- Video Element -->
        <video
          ref="videoRef"
          class="w-full h-full object-cover"
          playsinline
          autoplay
          muted
        />

        <!-- Scanning Overlay (on top of video) -->
        <div class="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div class="w-64 h-64 border-2 border-white/50 rounded-lg relative">
            <!-- Corner Brackets -->
            <div
              class="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-primary rounded-tl-lg"
            />
            <div
              class="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-primary rounded-tr-lg"
            />
            <div
              class="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-primary rounded-bl-lg"
            />
            <div
              class="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-primary rounded-br-lg"
            />

            <!-- Scanning Line Animation -->
            <div
              class="absolute left-4 right-4 h-0.5 bg-primary animate-scan"
            />
          </div>
        </div>

        <!-- Camera Status Indicator -->
        <div
          v-if="cameraActive"
          class="absolute top-4 right-4 bg-red-500 text-white px-3 py-1 rounded-full text-xs font-medium flex items-center gap-2"
        >
          <span class="w-2 h-2 bg-white rounded-full animate-pulse" />
          SCANNING
        </div>
      </div>

      <!-- Camera Controls -->
      <div class="flex justify-center gap-2">
        <UButton
          v-if="!cameraActive"
          icon="i-heroicons-video-camera"
          size="lg"
          color="primary"
          @click="startCamera"
        >
          {{ $t("pos.scanner.startCamera", "Start Camera") }}
        </UButton>
        <UButton
          v-else
          variant="outline"
          size="lg"
          color="red"
          icon="i-heroicons-video-camera-slash"
          @click="stopCamera"
        >
          {{ $t("pos.scanner.stopCamera", "Stop Camera") }}
        </UButton>
      </div>
    </div>

    <!-- Mode Toggle -->
    <div class="flex justify-center gap-2 mt-4">
      <UFieldGroup>
        <UButton
          :variant="inputMode === 'keyboard' ? 'solid' : 'outline'"
          size="sm"
          icon="material-symbols:keyboard-alt-outline"
          @click="inputMode = 'keyboard'"
        >
          {{ $t("pos.scanner.keyboard") }}
        </UButton>
        <UButton
          :variant="inputMode === 'camera' ? 'solid' : 'outline'"
          size="sm"
          icon="i-heroicons-camera"
          @click="inputMode = 'camera'"
        >
          {{ $t("pos.scanner.camera") }}
        </UButton>
      </UFieldGroup>
    </div>

    <!-- Last Scanned -->
    <div
      v-if="lastScanned"
      class="mt-4 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg"
    >
      <div class="flex items-center justify-between">
        <div>
          <p class="text-xs text-muted">{{ $t("pos.scanner.lastScanned") }}</p>
          <p class="font-mono font-bold">{{ lastScanned }}</p>
        </div>
        <UButton
          variant="ghost"
          icon="i-heroicons-x-mark"
          size="xs"
          @click="lastScanned = ''"
        />
      </div>
    </div>

    <!-- Scan History -->
    <div v-if="showHistory && scanHistory.length > 0" class="mt-4">
      <div class="flex items-center justify-between mb-2">
        <p class="text-sm font-medium">{{ $t("pos.scanner.recentScans") }}</p>
        <UButton variant="ghost" size="xs" @click="scanHistory = []">
          {{ $t("common.clear") }}
        </UButton>
      </div>
      <div class="space-y-1 max-h-32 overflow-y-auto">
        <div
          v-for="(scan, index) in scanHistory"
          :key="index"
          class="flex items-center justify-between text-sm p-2 bg-gray-50 dark:bg-gray-800 rounded cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700"
          @click="$emit('scan', scan.code)"
        >
          <span class="font-mono">{{ scan.code }}</span>
          <span class="text-xs text-muted">{{ formatTime(scan.time) }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { BrowserMultiFormatReader, NotFoundException } from "@zxing/library";

const props = withDefaults(
  defineProps<{
    placeholder?: string;
    autoFocus?: boolean;
    showHistory?: boolean;
    continuous?: boolean;
    initialMode?: "keyboard" | "camera";
  }>(),
  {
    placeholder: "Scan or enter barcode...",
    autoFocus: true,
    showHistory: false,
    continuous: false,
    initialMode: "keyboard",
  }
);

const emit = defineEmits<{
  scan: [code: string];
  error: [error: Error];
}>();

const { t } = useI18n();

// State
const inputMode = ref<"keyboard" | "camera">(props.initialMode);
const barcodeInput = ref("");
const lastScanned = ref("");
const isActive = ref(false);
const cameraActive = ref(false);
const inputRef = ref<any>(null);
const videoRef = ref<HTMLVideoElement | null>(null);

// Auto-start camera if initial mode is camera
watch(
  () => inputMode.value,
  async (newMode) => {
    if (newMode === "camera" && !cameraActive.value) {
      // Delay to ensure video element is mounted
      await nextTick();
      setTimeout(() => {
        startCamera();
      }, 100);
    }
  },
  { immediate: true }
);

interface ScanRecord {
  code: string;
  time: Date;
}
const scanHistory = ref<ScanRecord[]>([]);

// ZXing reader instance
let codeReader: BrowserMultiFormatReader | null = null;

// Methods
function handleScan() {
  const code = barcodeInput.value.trim();
  if (code) {
    emitScan(code);
    barcodeInput.value = "";
  }
}

function emitScan(code: string) {
  lastScanned.value = code;

  // Add to history
  scanHistory.value.unshift({
    code,
    time: new Date(),
  });

  // Keep only last 10 scans
  if (scanHistory.value.length > 10) {
    scanHistory.value = scanHistory.value.slice(0, 10);
  }

  emit("scan", code);

  // Play sound feedback
  playBeep();
}

function handleBlur() {
  // Delay to allow for re-focus
  setTimeout(() => {
    if (document.activeElement !== inputRef.value) {
      isActive.value = false;
    }
  }, 100);
}

async function startCamera() {
  try {
    if (!codeReader) {
      codeReader = new BrowserMultiFormatReader();
    }

    if (!videoRef.value) {
      console.error("Video element not found");
      return;
    }

    cameraActive.value = true;

    // Try to use environment facing camera (rear camera) first
    try {
      await codeReader.decodeFromConstraints(
        {
          video: {
            facingMode: { ideal: "environment" },
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
        },
        videoRef.value,
        (result, err) => {
          if (result) {
            emitScan(result.getText());
            if (!props.continuous) {
              // Optional: stop after single scan
              // stopCamera();
            }
          }
          if (err && !(err instanceof NotFoundException)) {
            console.error("Decode error:", err);
          }
        }
      );
    } catch (constraintError) {
      // Fallback to any available camera if rear camera fails
      console.warn("Rear camera not available, using default camera");
      await codeReader.decodeFromVideoDevice(
        undefined,
        videoRef.value,
        (result, err) => {
          if (result) {
            emitScan(result.getText());
          }
          if (err && !(err instanceof NotFoundException)) {
            console.error("Decode error:", err);
          }
        }
      );
    }
  } catch (error: any) {
    console.error("Camera error:", error);
    cameraActive.value = false;

    // Emit error with helpful message
    const errorMessage =
      error.name === "NotAllowedError"
        ? "Camera permission denied. Please allow camera access."
        : error.name === "NotFoundError"
        ? "No camera found on this device."
        : error.name === "NotReadableError"
        ? "Camera is already in use by another application."
        : `Camera error: ${error.message}`;

    emit("error", new Error(errorMessage));

    // Show toast notification
    if (process.client) {
      const toast = useToast();
      toast.add({
        title: "Camera Error",
        description: errorMessage,
        color: "red",
        icon: "i-heroicons-exclamation-triangle",
      });
    }
  }
}

function stopCamera() {
  cameraActive.value = false;

  if (codeReader) {
    codeReader.reset();
    // Do not nullify codeReader to reuse instance, or nullify if you prefer fresh start
    // codeReader = null;
  }
}

function playBeep() {
  try {
    const audioContext = new AudioContext();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    oscillator.frequency.value = 1000;
    oscillator.type = "sine";
    gainNode.gain.value = 0.1;

    oscillator.start();
    oscillator.stop(audioContext.currentTime + 0.1);
  } catch {
    // Audio not supported
  }
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

// Focus input on mount
onMounted(() => {
  if (props.autoFocus && inputRef.value) {
    // Handle specific component refs or native elements
    if (typeof inputRef.value.focus === "function") {
      inputRef.value.focus();
    } else if (
      inputRef.value.input &&
      typeof inputRef.value.input.focus === "function"
    ) {
      // Nuxt UI / Headless UI often exposes the underlying input via 'input' ref
      inputRef.value.input.focus();
    }
    isActive.value = true;
  }

  // Global keyboard listener for barcode scanners
  const handleGlobalKeydown = (e: KeyboardEvent) => {
    // Most barcode scanners send data rapidly followed by Enter
    if (inputMode.value === "keyboard" && !isActive.value) {
      if (e.key.length === 1) {
        barcodeInput.value += e.key;
        inputRef.value?.focus();
        isActive.value = true;
      }
    }
  };

  document.addEventListener("keydown", handleGlobalKeydown);

  onUnmounted(() => {
    document.removeEventListener("keydown", handleGlobalKeydown);
    stopCamera();
  });
});
</script>

<style scoped>
@keyframes scan {
  0%,
  100% {
    top: 0;
  }
  50% {
    top: calc(100% - 2px);
  }
}

.animate-scan {
  animation: scan 2s ease-in-out infinite;
}
</style>
