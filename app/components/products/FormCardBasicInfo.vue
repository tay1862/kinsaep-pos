<!-- components/products/FormCardBasicInfo.vue -->
<!-- Basic Information Form Card -->
<script setup lang="ts">
import { generateCode } from "~/utils/id";

const { t } = useI18n();
const { generateBarcode } = useBarcode();

interface FormData {
  name: string;
  sku: string;
  barcode?: string;
  barcodeType?: "ean13" | "upca" | "code128" | "qr" | "custom";
  description: string;
  price: number;
}

const form = defineModel<FormData>({ required: true });

const barcodeTypeOptions = computed(() => [
  { value: "ean13", label: t("products.barcodeTypes.ean13") },
  { value: "upca", label: t("products.barcodeTypes.upca") },
  { value: "code128", label: t("products.barcodeTypes.code128") },
  { value: "qr", label: t("products.barcodeTypes.qr") },
  { value: "custom", label: t("products.barcodeTypes.custom") },
]);

// Generate barcode based on selected type
function handleGenerateBarcode() {
  const type = form.value.barcodeType || "ean13";

  if (type === "ean13" || type === "upca") {
    form.value.barcode = generateBarcode("ean13");
  } else if (type === "code128") {
    form.value.barcode = generateBarcode("code128", { length: 10 });
  } else {
    form.value.barcode = generateBarcode("numeric", { length: 8 });
  }
}

// Generate product SKU code
function handleGenerateSku() {
  form.value.sku = generateCode("PRO");
}

// Scanner State
const showScanner = ref(false);
const { detectBarcodeFormat } = useBarcodeScanner(); // Make sure useBarcodeScanner is imported or available

function handleScan(code: string) {
  form.value.barcode = code;

  // Auto-detect type
  const format = detectBarcodeFormat(code);
  if (format && format !== "unknown") {
    // Map format to our type options
    if (format === "EAN-13") form.value.barcodeType = "ean13";
    else if (format === "UPC-A") form.value.barcodeType = "upca";
    else if (format === "CODE128") form.value.barcodeType = "code128";
    else if (format === "QR") form.value.barcodeType = "qr";
  }

  showScanner.value = false;

  // Play sound
  const sound = useSound();
  sound.playSuccess();
}
</script>

<template>
  <div
    class="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden"
  >
    <!-- Header -->
    <div
      class="px-6 py-4 border-b border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/50"
    >
      <div class="flex items-center gap-3">
        <div
          class="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center"
        >
          <UIcon
            name="i-heroicons-information-circle"
            class="w-5 h-5 text-blue-600 dark:text-blue-400"
          />
        </div>
        <div>
          <h3 class="font-semibold text-gray-900 dark:text-white">
            {{ t("products.basicInfo", "Basic Information") }}
          </h3>
          <p class="text-xs text-gray-500">
            {{
              t("products.basicInfoHint", "Product name, price, and identification")
            }}
          </p>
        </div>
      </div>
    </div>

    <!-- Content -->
    <div class="p-6 space-y-5">
      <!-- Name -->
      <UFormField :label="t('products.name')" name="name" required>
        <UInput
          v-model="form.name"
          :placeholder="t('products.namePlaceholder')"
          size="lg"
          class="text-lg w-full"
        />
      </UFormField>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <!-- Price -->
        <UFormField :label="t('products.price')" name="price" required>
          <UInput
            v-model="form.price"
            type="number"
            step="0.01"
            :placeholder="t('products.pricePlaceholder')"
            size="lg"
            class="text-lg w-full"
          >
            <template #leading>
              <span class="text-gray-400 text-sm">₭</span>
            </template>
          </UInput>
        </UFormField>

        <!-- SKU -->
        <UFormField :label="t('products.sku')" name="sku">
          <div class="flex gap-2">
            <UInput
              v-model="form.sku"
              :placeholder="
                t('products.skuPlaceholder', 'Auto-generated if empty')
              "
              size="lg"
              class="text-lg flex-1"
            >
              <template #leading>
                <UIcon
                  name="i-heroicons-hashtag"
                  class="w-4 h-4 text-gray-400"
                />
              </template>
            </UInput>
            <UButton
              color="primary"
              variant="soft"
              size="lg"
              icon="i-heroicons-sparkles"
              @click="handleGenerateSku"
            >
              {{ t("common.generate", "Gen") }}
            </UButton>
          </div>
        </UFormField>
      </div>

      <!-- Barcode -->
      <div class="grid grid-cols-1 md:grid-cols-12 gap-4">
        <div class="md:col-span-12 lg:col-span-5">
          <UFormField :label="t('products.barcode')" name="barcode">
            <div class="flex gap-2">
              <UInput
                v-model="form.barcode"
                :placeholder="
                  t('products.barcodePlaceholder', 'Scan or enter barcode')
                "
                size="lg"
                class="w-full"
              >
                <template #leading>
                  <UIcon
                    name="i-heroicons-qr-code"
                    class="w-4 h-4 text-gray-400"
                  />
                </template>
              </UInput>
              <UTooltip :text="t('pos.scanner.scanBarcode', 'Scan')">
                <UButton
                  color="neutral"
                  variant="soft"
                  icon="i-heroicons-camera"
                  size="lg"
                  @click="showScanner = true"
                />
              </UTooltip>
            </div>
          </UFormField>
        </div>
        <div class="md:col-span-6 lg:col-span-4">
          <UFormField :label="t('products.barcodeType')" name="barcodeType">
            <USelect
              v-model="form.barcodeType"
              :items="barcodeTypeOptions"
              :placeholder="t('common.select')"
              size="lg"
              value-key="value"
              label-key="label"
              class="w-full"
            />
          </UFormField>
        </div>
        <div class="md:col-span-6 lg:col-span-3 flex items-end">
          <UButton
            color="primary"
            variant="soft"
            size="lg"
            icon="i-heroicons-sparkles"
            block
            @click="handleGenerateBarcode"
          >
            {{ t("products.generateBarcode", "Generate") }}
          </UButton>
        </div>
      </div>

      <!-- Description -->
      <UFormField :label="t('products.description')" name="description">
        <UTextarea
          v-model="form.description"
          :placeholder="t('products.descriptionPlaceholder')"
          :rows="3"
          class="w-full"
        />
      </UFormField>
    </div>

    <!-- Barcode Scanner Modal -->
    <UModal v-model:open="showScanner">
      <template #content>
        <div class="p-6">
          <div class="flex items-center justify-between mb-4">
            <h3 class="text-lg font-semibold text-gray-900 dark:text-white">
              {{ t("pos.scanner.title", "Scan Barcode") }}
            </h3>
            <UButton
              icon="i-heroicons-x-mark"
              color="neutral"
              variant="ghost"
              size="sm"
              @click="showScanner = false"
            />
          </div>
          <PosBarcodeScanner :auto-focus="true" @scan="handleScan" />
        </div>
      </template>
    </UModal>
  </div>
</template>
