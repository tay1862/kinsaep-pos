<template>
  <div class="qr-scanner">
    <!-- Scanner UI (Fullscreen Camera) -->
    <UModal v-model:open="isScanning">
      <template #content>
        <div class="fixed inset-0 z-50 bg-black flex flex-col">
          <!-- Header -->
          <div class="flex items-center justify-between p-4 bg-black/50">
            <h3 class="text-white font-semibold">
              {{ $t("auth.signin.scanQrCode", "Scan QR Code") }}
            </h3>
            <UButton
              color="white"
              variant="ghost"
              size="sm"
              @click="stopScanning"
            >
              <UIcon name="i-heroicons-x-mark" class="w-6 h-6" />
            </UButton>
          </div>

          <!-- Video Feed -->
          <div class="flex-1 relative overflow-hidden">
            <video
              ref="videoRef"
              class="absolute inset-0 w-full h-full object-cover"
              playsinline
              autoplay
              muted
            />

            <!-- Scan Frame Overlay -->
            <div class="absolute inset-0 flex items-center justify-center">
              <div
                class="w-64 h-64 border-4 border-white/50 rounded-2xl relative"
              >
                <div
                  class="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-primary-500 rounded-tl-lg"
                />
                <div
                  class="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-primary-500 rounded-tr-lg"
                />
                <div
                  class="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-primary-500 rounded-bl-lg"
                />
                <div
                  class="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-primary-500 rounded-br-lg"
                />

                <!-- Scanning line animation -->
                <div
                  class="absolute inset-x-4 h-0.5 bg-primary-500 animate-scan-line"
                />
              </div>
            </div>

            <!-- Hidden canvas for image capture -->
            <canvas ref="canvasRef" class="hidden" />
          </div>

          <!-- Manual Input Option -->
          <div class="p-4 bg-black/50">
            <p class="text-white/80 text-sm text-center mb-4">
              {{
                $t("auth.signin.pointCameraAtQr", "Point camera at QR code")
              }}
            </p>

            <!-- Manual Link Entry -->
            <div class="flex gap-2">
              <UInput
                v-model="manualLink"
                :placeholder="
                  $t('auth.signin.pasteInviteLink', 'Or paste invite link...')
                "
                class="flex-1"
              />
              <UButton
                color="primary"
                :disabled="!manualLink"
                @click="handleManualLink"
              >
                {{ $t("common.submit", "Submit") }}
              </UButton>
            </div>
          </div>
        </div>
      </template>
    </UModal>

    <!-- Scan Button (visible when not scanning) -->
    <slot name="trigger" :startScanning="startScanning">
      <UButton variant="outline" class="w-full" @click="startScanning">
        <UIcon name="i-heroicons-qr-code" class="w-5 h-5 mr-2" />
        {{ $t("auth.signin.scanQrToJoin", "Scan QR to Join") }}
      </UButton>
    </slot>
  </div>
</template>

<script setup lang="ts">
const emit = defineEmits<{
  scanned: [data: string];
  error: [message: string];
}>();

const { t } = useI18n();

const isScanning = ref(false);
const videoRef = ref<HTMLVideoElement | null>(null);
const canvasRef = ref<HTMLCanvasElement | null>(null);
const manualLink = ref("");
let stream: MediaStream | null = null;

const startScanning = async () => {
  try {
    isScanning.value = true;
    manualLink.value = "";

    await nextTick();

    // Request camera access
    stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: "environment" },
    });

    if (videoRef.value) {
      videoRef.value.srcObject = stream;
      videoRef.value.play();
    }
  } catch (error) {
    console.error("Camera access error:", error);
    emit(
      "error",
      t("auth.signin.cameraAccessDenied", "Camera access denied. Please paste the invite link instead.")
    );
    // Keep modal open for manual link entry
  }
};

const stopScanning = () => {
  if (stream) {
    stream.getTracks().forEach((track) => track.stop());
    stream = null;
  }

  isScanning.value = false;
};

const handleManualLink = () => {
  if (manualLink.value.trim()) {
    stopScanning();
    emit("scanned", manualLink.value.trim());
  }
};

// Watch for QR detection using BarcodeDetector API (if available)
// This is a modern browser API that doesn't require external libraries
let detector: BarcodeDetector | null = null;
let detecting = false;

onMounted(async () => {
  // Check if BarcodeDetector is available (Chrome 83+, Edge 83+)
  if ("BarcodeDetector" in window) {
    try {
      detector = new BarcodeDetector({ formats: ["qr_code"] });
    } catch {
      console.log("[QRScanner] BarcodeDetector not supported");
    }
  }
});

// Start detection loop when scanning
watch(isScanning, async (scanning) => {
  if (scanning && detector && videoRef.value) {
    detecting = true;
    detectLoop();
  } else {
    detecting = false;
  }
});

async function detectLoop() {
  if (!detecting || !detector || !videoRef.value) return;

  try {
    const codes = await detector.detect(videoRef.value);

    if (codes.length > 0) {
      const qrCode = codes[0];
      console.log("[QRScanner] Detected:", qrCode.rawValue);
      stopScanning();
      emit("scanned", qrCode.rawValue);
      return;
    }
  } catch {
    // Detection failed, continue
  }

  // Continue scanning
  if (detecting) {
    requestAnimationFrame(detectLoop);
  }
}

onUnmounted(() => {
  stopScanning();
});

// Declare BarcodeDetector type for TypeScript
declare global {
  interface Window {
    BarcodeDetector: typeof BarcodeDetector;
  }

  class BarcodeDetector {
    constructor(options?: { formats: string[] });
    detect(
      image: HTMLVideoElement | HTMLImageElement | HTMLCanvasElement
    ): Promise<Array<{ rawValue: string }>>;
  }
}
</script>

<style scoped>
@keyframes scan-line {
  0% {
    top: 0;
  }
  50% {
    top: calc(100% - 2px);
  }
  100% {
    top: 0;
  }
}

.animate-scan-line {
  animation: scan-line 2s ease-in-out infinite;
}
</style>
