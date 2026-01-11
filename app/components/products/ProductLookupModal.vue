<!-- components/products/ProductLookupModal.vue -->
<!-- 🔍 Public Product Discovery - Search, Barcode, Import -->
<script setup lang="ts">
import { useDebounceFn } from "@vueuse/core";
import type { PublicProduct } from "~/composables/use-product-lookup";

const props = defineProps<{
  open: boolean;
}>();

const emit = defineEmits<{
  (e: "update:open", value: boolean): void;
  (e: "import", products: PublicProduct[]): void;
  (e: "edit", product: PublicProduct): void;
}>();

const { t, locale } = useI18n();
const productLookup = useProductLookup();
const toast = useToast();

// Local state
const activeTab = ref<"search" | "barcode" | "categories">("search");
const searchQuery = ref("");
const barcodeInput = ref("");
const selectedProducts = ref<Set<string>>(new Set());
const isLaoLocale = computed(() => locale.value.startsWith("lo"));

// Debounced search
const debouncedSearch = useDebounceFn(async (query: string) => {
  if (query.length >= 2) {
    await productLookup.searchOpenFoodFacts(query);
  }
}, 500);

// Watch search query
watch(searchQuery, (query) => {
  if (query.length >= 2) {
    debouncedSearch(query);
  } else if (query.length === 0) {
    productLookup.clearSearch();
  }
});

// Barcode lookup
async function lookupBarcode() {
  if (!barcodeInput.value.trim()) return;

  const product = await productLookup.lookupBarcode(barcodeInput.value.trim());
  if (product) {
    toast.add({
      title: t("products.lookup.productFound"),
      icon: "i-heroicons-check-circle",
      color: "success",
    });
  } else {
    toast.add({
      title: t("products.lookup.productNotFound"),
      description: t("products.lookup.tryManualEntry"),
      icon: "i-heroicons-exclamation-circle",
      color: "warning",
    });
  }
}

// Category search
async function searchCategory(query: string) {
  activeTab.value = "search";
  searchQuery.value = "";
  await productLookup.searchOpenFoodFacts(query);
}

// Toggle product selection
function toggleSelect(product: PublicProduct) {
  if (selectedProducts.value.has(product.id)) {
    selectedProducts.value.delete(product.id);
  } else {
    selectedProducts.value.add(product.id);
  }
}

// Import selected products
function importSelected() {
  const results = productLookup.searchResults.value;
  const products = results.filter((p: PublicProduct) =>
    selectedProducts.value.has(p.id)
  );

  if (products.length === 0) {
    toast.add({
      title: t("products.lookup.selectProducts"),
      icon: "i-heroicons-exclamation-triangle",
      color: "warning",
    });
    return;
  }

  emit("import", products);
  selectedProducts.value.clear();
  emit("update:open", false);
}

// Import single product
function importSingle(product: PublicProduct) {
  emit("import", [product]);
  emit("update:open", false);
}

// Edit product - fill form with data for editing
function editProduct(product: PublicProduct) {
  emit("edit", product);
  emit("update:open", false);
}

// Close modal
function closeModal() {
  productLookup.clearSearch();
  selectedProducts.value.clear();
  searchQuery.value = "";
  barcodeInput.value = "";
  emit("update:open", false);
}

// Get category name
function getCategoryName(cat: { name: string; nameLao: string }) {
  return isLaoLocale.value ? cat.nameLao : cat.name;
}
</script>

<template>
  <USlideover :open="open" side="right" @update:open="closeModal">
    <template #content>
      <div
        class="flex flex-col h-full bg-white dark:bg-gray-900 w-full max-w-xl"
      >
        <!-- Header -->
        <div
          class="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700"
        >
          <div class="flex items-center gap-3">
            <div
              class="w-10 h-10 rounded-xl bg-primary-500/10 flex items-center justify-center"
            >
              <UIcon
                name="i-heroicons-magnifying-glass-circle"
                class="w-5 h-5 text-primary-600 dark:text-primary-400"
              />
            </div>
            <div>
              <h2 class="text-lg font-semibold text-gray-900 dark:text-white">
                {{ t("products.lookup.title") }}
              </h2>
              <p class="text-sm text-gray-500">
                {{ t("products.lookup.subtitle") }}
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

        <!-- Tabs -->
        <div class="flex border-b border-gray-200 dark:border-gray-700">
          <button
            v-for="tab in [
              {
                id: 'search',
                icon: 'i-heroicons-magnifying-glass',
                label: t('products.lookup.search'),
              },
              {
                id: 'barcode',
                icon: 'i-heroicons-qr-code',
                label: t('products.lookup.barcode'),
              },
              {
                id: 'categories',
                icon: 'i-heroicons-squares-2x2',
                label: t('products.lookup.browse'),
              },
            ]"
            :key="tab.id"
            class="flex-1 px-4 py-3 text-sm font-medium transition-colors relative"
            :class="
              activeTab === tab.id
                ? 'text-primary-600 dark:text-primary-400'
                : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
            "
            @click="activeTab = tab.id as typeof activeTab"
          >
            <span class="flex items-center justify-center gap-2">
              <UIcon :name="tab.icon" class="w-4 h-4" />
              <span>{{ tab.label }}</span>
            </span>
            <div
              v-if="activeTab === tab.id"
              class="absolute bottom-0 left-0 right-0 h-0.5 bg-primary-500"
            />
          </button>
        </div>

        <!-- Content -->
        <div class="flex-1 overflow-y-auto p-4">
          <!-- Search Tab -->
          <div v-if="activeTab === 'search'" class="space-y-4">
            <UInput
              v-model="searchQuery"
              :placeholder="t('products.lookup.searchPlaceholder')"
              icon="i-heroicons-magnifying-glass"
              size="lg"
              autofocus
              class="w-full"
            />

            <!-- Loading -->
            <div
              v-if="productLookup.isSearching.value"
              class="flex items-center justify-center py-8"
            >
              <UIcon
                name="i-heroicons-arrow-path"
                class="w-6 h-6 animate-spin text-primary-500"
              />
            </div>

            <!-- Error -->
            <div
              v-else-if="productLookup.searchError.value"
              class="text-center py-8 text-red-500"
            >
              <UIcon
                name="i-heroicons-exclamation-circle"
                class="w-8 h-8 mx-auto mb-2"
              />
              <p>{{ productLookup.searchError.value }}</p>
            </div>

            <!-- Results -->
            <div
              v-else-if="productLookup.searchResults.value.length > 0"
              class="space-y-3"
            >
              <p class="text-sm text-gray-500">
                {{
                  t("products.lookup.showingOf", {
                    shown: productLookup.searchResults.value.length,
                    total: productLookup.searchTotal.value,
                  })
                }}
              </p>
              <div
                v-for="product in productLookup.searchResults.value"
                :key="product.id"
                class="flex items-center gap-3 p-3 rounded-lg border transition-all cursor-pointer"
                :class="
                  selectedProducts.has(product.id)
                    ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                    : 'border-gray-200 dark:border-gray-700 hover:border-primary-300'
                "
                @click="toggleSelect(product)"
              >
                <!-- Image -->
                <div
                  class="w-14 h-14 rounded-lg bg-gray-100 dark:bg-gray-800 flex-shrink-0 overflow-hidden"
                >
                  <img
                    v-if="product.image"
                    :src="product.image"
                    :alt="product.name"
                    class="w-full h-full object-cover"
                  />
                  <UIcon
                    v-else
                    name="i-heroicons-photo"
                    class="w-6 h-6 m-4 text-gray-400"
                  />
                </div>

                <!-- Info -->
                <div class="flex-1 min-w-0">
                  <p class="font-medium text-gray-900 dark:text-white truncate">
                    {{ product.name }}
                  </p>
                  <p
                    v-if="product.brand"
                    class="text-sm text-gray-500 truncate"
                  >
                    {{ product.brand }}
                  </p>
                  <div class="flex items-center gap-2 mt-1">
                    <code
                      v-if="product.barcode"
                      class="text-xs bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded"
                    >
                      {{ product.barcode }}
                    </code>
                    <span v-if="product.category" class="text-xs text-gray-400">
                      {{ product.category }}
                    </span>
                  </div>
                </div>

                <!-- Actions -->
                <div class="flex items-center gap-2">
                  <UButton
                    size="xs"
                    color="neutral"
                    variant="soft"
                    icon="i-heroicons-pencil-square"
                    @click.stop="editProduct(product)"
                  >
                    {{ t("common.edit") }}
                  </UButton>
                  <UButton
                    size="xs"
                    color="primary"
                    variant="soft"
                    icon="i-heroicons-plus"
                    @click.stop="importSingle(product)"
                  >
                    {{ t("common.add") }}
                  </UButton>
                </div>
              </div>

              <!-- Load More Button -->
              <div v-if="productLookup.hasMore.value" class="pt-2">
                <UButton
                  block
                  color="neutral"
                  variant="soft"
                  :loading="productLookup.isLoadingMore.value"
                  @click="productLookup.loadMore()"
                >
                  <UIcon
                    v-if="!productLookup.isLoadingMore.value"
                    name="i-heroicons-arrow-down"
                    class="w-4 h-4 mr-2"
                  />
                  {{
                    productLookup.isLoadingMore.value
                      ? t("products.lookup.loading")
                      : t("products.lookup.loadMore")
                  }}
                </UButton>
              </div>
            </div>

            <!-- Empty State -->
            <div
              v-else-if="searchQuery.length >= 2"
              class="text-center py-8 text-gray-400"
            >
              <UIcon
                name="i-heroicons-magnifying-glass"
                class="w-12 h-12 mx-auto mb-2 opacity-50"
              />
              <p>{{ t("products.lookup.noResults") }}</p>
            </div>

            <!-- Initial State -->
            <div v-else class="text-center py-8 text-gray-400">
              <UIcon
                name="i-heroicons-sparkles"
                class="w-12 h-12 mx-auto mb-2 opacity-50"
              />
              <p>{{ t("products.lookup.startTyping") }}</p>
            </div>
          </div>

          <!-- Barcode Tab -->
          <div v-if="activeTab === 'barcode'" class="space-y-4">
            <div class="text-center py-4">
              <div
                class="w-20 h-20 mx-auto mb-4 rounded-2xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center"
              >
                <UIcon
                  name="i-heroicons-qr-code"
                  class="w-10 h-10 text-gray-400"
                />
              </div>
              <p class="text-gray-600 dark:text-gray-400">
                {{ t("products.lookup.enterBarcode") }}
              </p>
            </div>

            <div class="flex gap-2">
              <UInput
                v-model="barcodeInput"
                :placeholder="t('products.lookup.barcodePlaceholder')"
                class="w-full"
                size="lg"
                @keyup.enter="lookupBarcode"
              />
              <UButton
                color="primary"
                size="lg"
                icon="i-heroicons-magnifying-glass"
                :loading="productLookup.isSearching.value"
                @click="lookupBarcode"
              >
                {{ t("products.lookup.lookup") }}
              </UButton>
            </div>

            <!-- Barcode Result -->
            <div
              v-if="
                productLookup.searchResults.value.length > 0 &&
                activeTab === 'barcode'
              "
              class="mt-4"
            >
              <div
                v-for="product in productLookup.searchResults.value"
                :key="product.id"
                class="p-4 rounded-xl border border-primary-200 dark:border-primary-800 bg-primary-50 dark:bg-primary-900/20"
              >
                <div class="flex items-start gap-4">
                  <div
                    class="w-20 h-20 rounded-lg bg-white dark:bg-gray-800 overflow-hidden flex-shrink-0"
                  >
                    <img
                      v-if="product.image"
                      :src="product.image"
                      :alt="product.name"
                      class="w-full h-full object-cover"
                    />
                  </div>
                  <div class="flex-1">
                    <h3 class="font-semibold text-gray-900 dark:text-white">
                      {{ product.name }}
                    </h3>
                    <p
                      v-if="product.brand"
                      class="text-sm text-gray-600 dark:text-gray-400"
                    >
                      {{ product.brand }}
                    </p>
                    <p
                      v-if="product.description"
                      class="text-sm text-gray-500 mt-1"
                    >
                      {{ product.description }}
                    </p>
                  </div>
                </div>
                <UButton
                  class="w-full mt-4"
                  color="primary"
                  icon="i-heroicons-plus"
                  @click="importSingle(product)"
                >
                  {{ t("products.lookup.importProduct") }}
                </UButton>
              </div>
            </div>
          </div>

          <!-- Categories Tab -->
          <div v-if="activeTab === 'categories'" class="space-y-4">
            <p class="text-sm text-gray-500">
              {{ t("products.lookup.browseCategories") }}
            </p>
            <div class="grid grid-cols-2 gap-3">
              <button
                v-for="cat in productLookup.popularCategories"
                :key="cat.id"
                class="p-4 rounded-xl border border-gray-200 dark:border-gray-700 hover:border-primary-300 dark:hover:border-primary-700 bg-white dark:bg-gray-800/50 text-left transition-all group"
                @click="searchCategory(cat.query)"
              >
                <span class="text-3xl block mb-2">{{ cat.icon }}</span>
                <span
                  class="font-medium text-gray-900 dark:text-white group-hover:text-primary-600"
                >
                  {{ getCategoryName(cat) }}
                </span>
              </button>
            </div>
          </div>
        </div>

        <!-- Footer -->
        <div
          v-if="selectedProducts.size > 0"
          class="p-4 border-t border-gray-200 dark:border-gray-700"
        >
          <UButton
            block
            color="primary"
            size="lg"
            icon="i-heroicons-arrow-down-tray"
            @click="importSelected"
          >
            {{
              t("products.lookup.importSelected", {
                count: selectedProducts.size,
              })
            }}
          </UButton>
        </div>
      </div>
    </template>
  </USlideover>
</template>
