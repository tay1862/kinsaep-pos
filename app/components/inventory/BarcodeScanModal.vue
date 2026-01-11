<!-- components/inventory/BarcodeScanModal.vue -->
<!-- Camera/Scanner Barcode Input with Quick Actions -->
<script setup lang="ts">
import type { ScanResult } from "~/composables/use-barcode-scanner";

// ============================================
// 📋 PROPS & EMITS
// ============================================

const props = defineProps<{
  inventoryItems?: Array<{
    productId: string;
    productName: string;
    sku: string;
    barcode?: string;
    currentStock: number;
  }>;
}>();

const emit = defineEmits<{
  (e: "scan", result: ScanResult, product?: typeof props.inventoryItems[number]): void;
  (e: "close"): void;
}>();

const open = defineModel<boolean>("open", { default: false });

// ============================================
// 📦 STATE
// ============================================

const { t } = useI18n();
const toast = useToast();

const videoRef = ref<HTMLVideoElement | null>(null);
const manualCode = ref("");
const scanMode = ref<"camera" | "manual">("camera");
const lastScannedProduct = ref<typeof props.inventoryItems[number] | null>(null);

// Scanner composable
const {
  isScanning,
  lastScan,
  error: scannerError,
  startCameraScanner,
  stopCameraScanner,
  isCameraScannerSupported,
  manualEntry,
} = useBarcodeScanner({
  onScan: handleScan,
  onError: (err) => {
    toast.add({
      title: t("common.error"),
      description: err,
      color: "error",
    });
  },
});

// ============================================
// 🎯 HANDLERS
// ============================================

function handleScan(result: ScanResult) {
  // Find product by barcode or SKU
  const product = props.inventoryItems?.find(
    (item) =>
      item.barcode === result.code ||
      item.sku === result.code ||
      item.productId === result.code
  );

  lastScannedProduct.value = product || null;

  // Play sound feedback
  playBeep();

  if (product) {
    toast.add({
      title: t("inventory.productFound", "Product Found"),
      description: product.productName,
      icon: "i-heroicons-check-circle",
      color: "success",
    });
  } else {
    toast.add({
      title: t("inventory.productNotFound", "Product Not Found"),
      description: result.code,
      icon: "i-heroicons-exclamation-triangle",
      color: "warning",
    });
  }

  emit("scan", result, product || undefined);
}

function handleManualSubmit() {
  if (manualCode.value.length >= 3) {
    manualEntry(manualCode.value);
    manualCode.value = "";
  }
}

function playBeep() {
  try {
    const audioContext = new (window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    oscillator.frequency.value = 1200;
    oscillator.type = "sine";
    gainNode.gain.value = 0.1;

    oscillator.start();
    oscillator.stop(audioContext.currentTime + 0.1);
  } catch {
    // Audio not supported
  }
}

// ============================================
// 📷 CAMERA CONTROL
// ============================================

async function startCamera() {
  if (videoRef.value) {
    const success = await startCameraScanner(videoRef.value);
    if (success) {
      scanMode.value = "camera";
    } else {
      scanMode.value = "manual";
    }
  }
}

function closeModal() {
  stopCameraScanner();
  lastScannedProduct.value = null;
  manualCode.value = "";
  open.value = false;
  emit("close");
}

// Watch for modal open
watch(open, async (isOpen) => {
  if (isOpen) {
    // Small delay to let DOM render
    await nextTick();
    setTimeout(() => {
      if (isCameraScannerSupported()) {
        startCamera();
      } else {
        scanMode.value = "manual";
      }
    }, 100);
  } else {
    stopCameraScanner();
  }
});
</script>

<template>
  <UModal v-model:open="open" class="max-w-lg">
    <template #content>
      <div class="bg-white dark:bg-gray-900 rounded-2xl overflow-hidden">
        <!-- Header -->
        <div class="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-xl bg-primary-500 text-white flex items-center justify-center">
              <UIcon name="i-heroicons-qr-code" class="w-5 h-5" />
            </div>
            <div>
              <h3 class="font-semibold text-gray-900 dark:text-white">
                {{ t('inventory.scanBarcode', 'Scan Barcode') }}
              </h3>
              <p class="text-xs text-gray-500">
                {{ t('inventory.scanOrEnterCode', 'Use camera or enter code manually') }}
              </p>
            </div>
          </div>
          <UButton
            icon="i-heroicons-x-mark"
            color="neutral"
            variant="ghost"
            @click="closeModal"
          />
        </div>

        <!-- Content -->
        <div class="p-4 space-y-4">
          <!-- Mode Toggle -->
          <div class="flex gap-2">
            <UButton
              :color="scanMode === 'camera' ? 'primary' : 'neutral'"
              :variant="scanMode === 'camera' ? 'solid' : 'outline'"
              icon="i-heroicons-camera"
              class="flex-1"
              @click="scanMode = 'camera'; startCamera()"
            >
              {{ t('inventory.camera', 'Camera') }}
            </UButton>
            <UButton
              :color="scanMode === 'manual' ? 'primary' : 'neutral'"
              :variant="scanMode === 'manual' ? 'solid' : 'outline'"
              icon="i-heroicons-pencil-square"
              class="flex-1"
              @click="scanMode = 'manual'; stopCameraScanner()"
            >
              {{ t('inventory.manualEntry', 'Manual') }}
            </UButton>
          </div>

          <!-- Camera View -->
          <div
            v-if="scanMode === 'camera'"
            class="relative w-full aspect-[4/3] bg-black rounded-xl overflow-hidden"
          >
            <video
              ref="videoRef"
              class="w-full h-full object-cover"
              autoplay
              playsinline
              muted
            />
            
            <!-- Scanner overlay -->
            <div class="absolute inset-0 pointer-events-none">
              <!-- Corner brackets -->
              <div class="absolute top-1/4 left-1/4 w-1/2 h-1/2">
                <div class="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-primary-500 rounded-tl-lg" />
                <div class="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-primary-500 rounded-tr-lg" />
                <div class="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-primary-500 rounded-bl-lg" />
                <div class="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-primary-500 rounded-br-lg" />
              </div>
              
              <!-- Scan line animation -->
              <div
                v-if="isScanning"
                class="absolute top-1/4 left-1/4 w-1/2 h-0.5 bg-primary-500 animate-scan"
              />
            </div>

            <!-- Status overlay -->
            <div class="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/80 to-transparent p-4">
              <div class="flex items-center justify-center gap-2 text-white">
                <div
                  class="w-2 h-2 rounded-full animate-pulse"
                  :class="isScanning ? 'bg-green-500' : 'bg-yellow-500'"
                />
                <span class="text-sm">
                  {{ isScanning 
                    ? (t('inventory.scanning', 'Scanning...'))
                    : (t('inventory.startingCamera', 'Starting camera...'))
                  }}
                </span>
              </div>
            </div>

            <!-- Error overlay -->
            <div
              v-if="scannerError"
              class="absolute inset-0 flex flex-col items-center justify-center bg-black/90 text-white p-4 text-center"
            >
              <UIcon name="i-heroicons-exclamation-triangle" class="w-12 h-12 text-yellow-500 mb-3" />
              <p class="font-medium">{{ scannerError }}</p>
              <UButton class="mt-4" color="primary" @click="startCamera">
                {{ t('common.retry', 'Retry') }}
              </UButton>
            </div>
          </div>

          <!-- Manual Entry -->
          <div v-if="scanMode === 'manual'" class="space-y-3">
            <UFormField :label="t('inventory.enterBarcode', 'Enter Barcode/SKU')">
              <UInput
                v-model="manualCode"
                :placeholder="t('inventory.barcodePlaceholder', 'Scan or type barcode...')"
                size="lg"
                autofocus
                @keyup.enter="handleManualSubmit"
              >
                <template #trailing>
                  <UButton
                    icon="i-heroicons-magnifying-glass"
                    color="primary"
                    variant="ghost"
                    size="sm"
                    :disabled="manualCode.length < 3"
                    @click="handleManualSubmit"
                  />
                </template>
              </UInput>
            </UFormField>
            <p class="text-xs text-gray-500 text-center">
              {{ t('inventory.physicalScannerHint', 'Physical scanners will auto-detect input') }}
            </p>
          </div>

          <!-- Last Scanned Result -->
          <div
            v-if="lastScan || lastScannedProduct"
            class="p-4 rounded-xl"
            :class="lastScannedProduct 
              ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800'
              : 'bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800'"
          >
            <div class="flex items-start gap-3">
              <div
                class="w-10 h-10 rounded-lg flex items-center justify-center text-white"
                :class="lastScannedProduct ? 'bg-green-500' : 'bg-yellow-500'"
              >
                <UIcon
                  :name="lastScannedProduct ? 'i-heroicons-check' : 'i-heroicons-question-mark-circle'"
                  class="w-5 h-5"
                />
              </div>
              <div class="flex-1 min-w-0">
                <p
                  class="font-medium"
                  :class="lastScannedProduct 
                    ? 'text-green-800 dark:text-green-200'
                    : 'text-yellow-800 dark:text-yellow-200'"
                >
                  {{ lastScannedProduct?.productName || t('inventory.unknownProduct', 'Unknown Product') }}
                </p>
                <p class="text-sm text-gray-600 dark:text-gray-400">
                  {{ lastScan?.code }}
                </p>
                <p v-if="lastScannedProduct" class="text-xs text-gray-500 mt-1">
                  {{ t('inventory.currentStock') }}: {{ lastScannedProduct.currentStock }}
                </p>
              </div>
            </div>

            <!-- Quick Actions -->
            <div v-if="lastScannedProduct" class="flex gap-2 mt-3">
              <UButton
                color="green"
                variant="soft"
                size="sm"
                icon="i-heroicons-plus"
                class="flex-1"
                @click="emit('scan', lastScan!, lastScannedProduct); closeModal()"
              >
                {{ t('inventory.addStock', 'Add Stock') }}
              </UButton>
              <UButton
                color="blue"
                variant="soft"
                size="sm"
                icon="i-heroicons-eye"
                class="flex-1"
                @click="navigateTo(`/products/${lastScannedProduct.productId}`)"
              >
                {{ t('common.view', 'View') }}
              </UButton>
            </div>
          </div>
        </div>

        <!-- Footer -->
        <div class="p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
          <div class="flex items-center justify-between text-xs text-gray-500">
            <div class="flex items-center gap-2">
              <UIcon name="i-heroicons-information-circle" />
              <span>{{ t('inventory.supportedFormats', 'EAN-13, UPC-A, Code128, QR') }}</span>
            </div>
            <UButton
              color="neutral"
              variant="ghost"
              size="xs"
              @click="closeModal"
            >
              {{ t('common.close', 'Close') }}
            </UButton>
          </div>
        </div>
      </div>
    </template>
  </UModal>
</template>

<style scoped>
@keyframes scan {
  0%, 100% {
    transform: translateY(0);
    opacity: 1;
  }
  50% {
    transform: translateY(100px);
    opacity: 0.5;
  }
}

.animate-scan {
  animation: scan 2s ease-in-out infinite;
}
</style>
