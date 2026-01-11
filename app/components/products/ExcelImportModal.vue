<template>
  <UModal
    v-model:open="isOpen"
    title="Import Products"
    description="Import products from an Excel file"
  >
    <template #header>
      <div class="flex items-center justify-between">
        <h3 class="text-xl font-bold flex items-center gap-2">
          <span>📊</span>
          {{ $t("products.import.title", "Import Products") }}
        </h3>
        <UButton
          color="gray"
          variant="ghost"
          icon="i-heroicons-x-mark"
          @click="isOpen = false"
        />
      </div>
    </template>

    <template #body>
      <div class="p-6 space-y-6">
        <!-- Step 1: Download Template -->
        <div
          class="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-xl flex items-start gap-4"
        >
          <div
            class="p-2 bg-blue-100 dark:bg-blue-800 rounded-lg text-blue-600 dark:text-blue-300"
          >
            <UIcon name="i-heroicons-document-arrow-down" class="w-6 h-6" />
          </div>
          <div>
            <h4 class="font-semibold text-blue-900 dark:text-blue-100">
              {{ $t("products.import.step1", "1. Download Template") }}
            </h4>
            <p class="text-sm text-blue-700 dark:text-blue-300 mt-1">
              {{
                $t("products.import.step1Desc", "Use our pre-formatted Excel template to avoid errors.")
              }}
            </p>
            <UButton
              class="mt-3"
              size="sm"
              color="blue"
              variant="soft"
              :label="
                $t('products.import.downloadTemplate', 'Download Excel Template')
              "
              icon="i-heroicons-arrow-down-tray"
              @click="downloadTemplate"
            />
          </div>
        </div>

        <!-- Step 2: Upload File -->
        <div
          v-if="!previewData.length"
          class="border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-xl p-8 text-center hover:border-primary-500 transition-colors cursor-pointer"
          @dragover.prevent
          @drop.prevent="handleDrop"
          @click="fileInput?.click()"
        >
          <input
            ref="fileInput"
            type="file"
            accept=".xlsx, .xls"
            class="hidden"
            @change="handleFileSelect"
          />
          <div
            class="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full mx-auto flex items-center justify-center mb-4"
          >
            <UIcon
              name="i-heroicons-arrow-up-tray"
              class="w-8 h-8 text-gray-400"
            />
          </div>
          <h4 class="font-semibold text-lg text-gray-900 dark:text-white">
            {{ $t("products.import.uploadTitle", "Click or Drop File Here") }}
          </h4>
          <p class="text-gray-500 mt-2">
            {{
              $t("products.import.uploadDesc", "Supports .xlsx and .xls files")
            }}
          </p>
        </div>

        <!-- Step 3: Preview Data -->
        <div v-else class="space-y-4">
          <div class="flex justify-between items-center">
            <h4 class="font-semibold text-lg">
              {{ $t("products.import.preview", "Data Preview") }}
              <span class="text-sm font-normal text-gray-500"
                >({{ previewData.length }} rows)</span
              >
            </h4>
            <UButton
              color="red"
              variant="ghost"
              :label="$t('common.cancel')"
              @click="reset"
            />
          </div>

          <div
            class="overflow-x-auto border border-gray-200 dark:border-gray-700 rounded-lg max-h-[300px]"
          >
            <table class="w-full text-sm text-left">
              <thead
                class="bg-gray-50 dark:bg-gray-800 text-gray-500 font-medium sticky top-0 z-10"
              >
                <tr>
                  <th
                    v-for="header in headers"
                    :key="header"
                    class="px-3 py-2 border-b dark:border-gray-700"
                  >
                    {{ header }}
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="(row, i) in previewData.slice(0, 10)"
                  :key="i"
                  class="border-b dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50"
                >
                  <th v-for="header in headers" :key="header" class="px-3 py-2">
                    {{ row[header] }}
                  </th>
                </tr>
              </tbody>
            </table>
          </div>
          <p
            v-if="previewData.length > 10"
            class="text-center text-xs text-gray-500 mt-2"
          >
            Showing first 10 rows of {{ previewData.length }}
          </p>
        </div>
      </div>
    </template>

    <template #footer>
      <div class="flex justify-end gap-3">
        <UButton
          color="gray"
          variant="ghost"
          :label="$t('common.cancel')"
          @click="isOpen = false"
        />
        <UButton
          v-if="previewData.length"
          color="primary"
          :loading="importing"
          :label="
            $t('products.import.confirm', 'Import ') + previewData.length + ' Products'
          "
          @click="confirmImport"
        />
      </div>
    </template>
  </UModal>
</template>

<script setup lang="ts">
import * as XLSX from "xlsx";

const props = defineProps<{
  open: boolean;
}>();

const emit = defineEmits(["update:open", "import"]);

const isOpen = computed({
  get: () => props.open,
  set: (val) => emit("update:open", val),
});

const fileInput = ref<HTMLInputElement | null>(null);
const previewData = ref<any[]>([]);
const headers = ref<string[]>([]);
const importing = ref(false);

const reset = () => {
  previewData.value = [];
  headers.value = [];
  if (fileInput.value) fileInput.value.value = "";
};

const processedFile = async (file: File) => {
  const data = await file.arrayBuffer();
  const workbook = XLSX.read(data);
  const worksheet = workbook.Sheets[workbook.SheetNames[0]];
  const json = XLSX.utils.sheet_to_json(worksheet);

  if (json.length > 0) {
    previewData.value = json;
    headers.value = Object.keys(json[0] as object);
  }
};

const handleFileSelect = (e: Event) => {
  const file = (e.target as HTMLInputElement).files?.[0];
  if (file) processedFile(file);
};

const handleDrop = (e: DragEvent) => {
  const file = e.dataTransfer?.files[0];
  if (file) processedFile(file);
};

const downloadTemplate = () => {
  const templateHeaders = [
    [
      "Name",
      "Category",
      "Price",
      "Cost",
      "Stock",
      "Unit",
      "SKU",
      "Barcode",
      "Description",
      "Image",
      "CanExpire",
      "ExpiryDays",
    ],
  ];
  // Add an example row
  const example = [
    [
      "Example Product",
      "Drinks",
      50000,
      30000,
      100,
      "bottle",
      "DRINK-001",
      "885000123",
      "Delicious drink",
      "https://example.com/image.jpg",
      "true",
      30,
    ],
  ];

  const ws = XLSX.utils.aoa_to_sheet([...templateHeaders, ...example]);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Template");
  XLSX.writeFile(wb, "product_template.xlsx");
};

const confirmImport = () => {
  importing.value = true;
  try {
    emit("import", previewData.value);
    isOpen.value = false;
    reset();
  } finally {
    importing.value = false;
  }
};
</script>
