// composables/use-barcode-scanner.ts
// Enterprise Barcode Scanner Integration
// Supports camera-based scanning and physical scanner keyboard input

import { ref, onMounted, onUnmounted } from "vue";

// ============================================
// 📋 TYPES
// ============================================

export interface ScanResult {
  code: string;
  format: "EAN-13" | "UPC-A" | "CODE128" | "QR" | "unknown";
  timestamp: number;
}

export interface BarcodeScannerOptions {
  onScan?: (result: ScanResult) => void;
  onError?: (error: string) => void;
  enableKeyboard?: boolean;
  keyboardTimeout?: number; // ms to wait for barcode input completion
  minCodeLength?: number;
}

// ============================================
// 🔍 BARCODE SCANNER COMPOSABLE
// ============================================

export function useBarcodeScanner(options: BarcodeScannerOptions = {}) {
  const {
    onScan,
    onError,
    enableKeyboard = true,
    keyboardTimeout = 100,
    minCodeLength = 4,
  } = options;

  // State
  const isScanning = ref(false);
  const lastScan = ref<ScanResult | null>(null);
  const error = ref<string | null>(null);
  const cameraStream = ref<MediaStream | null>(null);
  const videoElement = ref<HTMLVideoElement | null>(null);

  // Keyboard scanner state
  let keyboardBuffer = "";
  let keyboardTimer: ReturnType<typeof setTimeout> | null = null;

  // ============================================
  // 🎹 KEYBOARD SCANNER (Physical Scanners)
  // Most USB/Bluetooth barcode scanners work as keyboard input
  // They type the barcode followed by Enter key
  // ============================================

  const handleKeyboardInput = (event: KeyboardEvent) => {
    if (!enableKeyboard) return;

    // Clear previous timer
    if (keyboardTimer) {
      clearTimeout(keyboardTimer);
    }

    // If Enter is pressed and we have buffered input, process it
    if (event.key === "Enter" && keyboardBuffer.length >= minCodeLength) {
      const code = keyboardBuffer;
      keyboardBuffer = "";

      const result: ScanResult = {
        code,
        format: detectBarcodeFormat(code),
        timestamp: Date.now(),
      };

      lastScan.value = result;
      onScan?.(result);
      return;
    }

    // Only capture printable characters
    if (event.key.length === 1) {
      keyboardBuffer += event.key;

      // Set timer to clear buffer if typing stops (not a scanner)
      keyboardTimer = setTimeout(() => {
        keyboardBuffer = "";
      }, keyboardTimeout);
    }
  };

  // ============================================
  // 📷 CAMERA SCANNER (Web API)
  // Uses BarcodeDetector API where available
  // Falls back to image analysis
  // ============================================

  const startCameraScanner = async (
    video: HTMLVideoElement
  ): Promise<boolean> => {
    try {
      // Check if BarcodeDetector is available
      if (!("BarcodeDetector" in window)) {
        error.value = "Barcode detection not supported in this browser";
        onError?.(error.value);
        return false;
      }

      // Request camera access
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "environment", // Prefer back camera
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
      });

      video.srcObject = stream;
      await video.play();

      cameraStream.value = stream;
      videoElement.value = video;
      isScanning.value = true;

      // Start detection loop
      detectBarcodesFromCamera(video);

      return true;
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to access camera";
      error.value = message;
      onError?.(message);
      return false;
    }
  };

  const detectBarcodesFromCamera = async (video: HTMLVideoElement) => {
    if (!isScanning.value || !("BarcodeDetector" in window)) return;

    try {
      // BarcodeDetector is experimental and not in TypeScript types
      const BarcodeDetectorClass = (window as unknown as { BarcodeDetector: new (options: { formats: string[] }) => { detect: (source: HTMLVideoElement) => Promise<Array<{ rawValue: string; format: string }>> } }).BarcodeDetector;
      const detector = new BarcodeDetectorClass({
        formats: ["ean_13", "ean_8", "upc_a", "upc_e", "code_128", "qr_code"],
      });

      const detect = async () => {
        if (!isScanning.value || video.paused || video.ended) return;

        try {
          const barcodes = await detector.detect(video);

          if (barcodes.length > 0) {
            const barcode = barcodes[0];
            if (barcode) {
              const result: ScanResult = {
                code: barcode.rawValue,
                format: mapBarcodeFormat(barcode.format),
                timestamp: Date.now(),
              };

              lastScan.value = result;
              onScan?.(result);

              // Pause briefly after successful scan
              await new Promise((resolve) => setTimeout(resolve, 1500));
            }
          }
        } catch {
          // Detection frame error, continue
        }

        // Continue detection loop
        if (isScanning.value) {
          requestAnimationFrame(detect);
        }
      };

      requestAnimationFrame(detect);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to initialize scanner";
      error.value = message;
      onError?.(message);
    }
  };

  const stopCameraScanner = () => {
    isScanning.value = false;

    if (cameraStream.value) {
      cameraStream.value.getTracks().forEach((track) => track.stop());
      cameraStream.value = null;
    }

    if (videoElement.value) {
      videoElement.value.srcObject = null;
      videoElement.value = null;
    }
  };

  // ============================================
  // 🔧 UTILITIES
  // ============================================

  const detectBarcodeFormat = (code: string): ScanResult["format"] => {
    if (/^\d{13}$/.test(code)) return "EAN-13";
    if (/^\d{12}$/.test(code)) return "UPC-A";
    if (/^[A-Za-z0-9\-\.\/\+\s]+$/.test(code) && code.length > 5)
      return "CODE128";
    if (code.length > 20) return "QR";
    return "unknown";
  };

  const mapBarcodeFormat = (
    format: string
  ): ScanResult["format"] => {
    const map: Record<string, ScanResult["format"]> = {
      ean_13: "EAN-13",
      ean_8: "EAN-13",
      upc_a: "UPC-A",
      upc_e: "UPC-A",
      code_128: "CODE128",
      qr_code: "QR",
    };
    return map[format] || "unknown";
  };

  // Check if camera scanning is supported
  const isCameraScannerSupported = (): boolean => {
    return (
      typeof navigator !== "undefined" &&
      "mediaDevices" in navigator &&
      "BarcodeDetector" in window
    );
  };

  // Manual code entry (for testing or fallback)
  const manualEntry = (code: string) => {
    if (code.length < minCodeLength) {
      error.value = "Code too short";
      onError?.(error.value);
      return;
    }

    const result: ScanResult = {
      code,
      format: detectBarcodeFormat(code),
      timestamp: Date.now(),
    };

    lastScan.value = result;
    onScan?.(result);
  };

  // ============================================
  // 🔄 LIFECYCLE
  // ============================================

  onMounted(() => {
    if (enableKeyboard && typeof window !== "undefined") {
      window.addEventListener("keydown", handleKeyboardInput);
    }
  });

  onUnmounted(() => {
    stopCameraScanner();
    if (enableKeyboard && typeof window !== "undefined") {
      window.removeEventListener("keydown", handleKeyboardInput);
    }
    if (keyboardTimer) {
      clearTimeout(keyboardTimer);
    }
  });

  return {
    // State
    isScanning,
    lastScan,
    error,

    // Camera methods
    startCameraScanner,
    stopCameraScanner,
    isCameraScannerSupported,

    // Manual entry
    manualEntry,

    // Utilities
    detectBarcodeFormat,
  };
}
