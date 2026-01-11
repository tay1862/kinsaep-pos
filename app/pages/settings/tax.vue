<template>
  <UContainer>
    <CommonPageHeader :title="$t('settings.tax.title')" :description="$t('settings.tax.description')" />

    <!-- Tax Summary -->
    <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
      <UCard>
        <div class="text-center">
          <p class="text-2xl font-bold text-primary">{{ taxRates.length }}</p>
          <p class="text-sm text-muted">{{ $t("settings.tax.totalRates") }}</p>
        </div>
      </UCard>

      <UCard>
        <div class="text-center">
          <p class="text-2xl font-bold text-green-600">{{ activeTaxRates }}</p>
          <p class="text-sm text-muted">{{ $t("settings.tax.activeRates") }}</p>
        </div>
      </UCard>

      <UCard>
        <div class="text-center">
          <p class="text-2xl font-bold text-blue-600">{{ defaultRate }}%</p>
          <p class="text-sm text-muted">{{ $t("settings.tax.defaultRate") }}</p>
        </div>
      </UCard>
    </div>

    <!-- General Tax Settings -->
    <UCard class="mb-6">
      <template #header>
        <h3 class="font-semibold">{{ $t("settings.tax.generalSettings") }}</h3>
      </template>

      <div class="space-y-4">
        <div class="flex items-center justify-between">
          <div>
            <p class="font-medium">{{ $t("settings.tax.taxEnabled") }}</p>
            <p class="text-sm text-muted">
              {{ $t("settings.tax.taxEnabledDesc") }}
            </p>
          </div>
          <USwitch v-model="settings.taxEnabled" />
        </div>

        <div class="flex items-center justify-between">
          <div>
            <p class="font-medium">{{ $t("settings.tax.pricesIncludeTax") }}</p>
            <p class="text-sm text-muted">
              {{ $t("settings.tax.pricesIncludeTaxDesc") }}
            </p>
          </div>
          <USwitch v-model="settings.pricesIncludeTax" />
        </div>

        <div class="flex items-center justify-between">
          <div>
            <p class="font-medium">{{ $t("settings.tax.showTaxOnReceipt") }}</p>
            <p class="text-sm text-muted">
              {{ $t("settings.tax.showTaxOnReceiptDesc") }}
            </p>
          </div>
          <USwitch v-model="settings.showTaxOnReceipt" />
        </div>

        <div class="flex items-center justify-between">
          <div>
            <p class="font-medium">{{ $t("settings.tax.roundingMethod") }}</p>
            <p class="text-sm text-muted">
              {{ $t("settings.tax.roundingMethodDesc") }}
            </p>
          </div>
          <USelect v-model="settings.roundingMethod" :items="roundingOptions" value-key="value" label-key="label"
            class="w-40" />
        </div>
      </div>

      <template #footer>
        <UButton icon="i-heroicons-check" :loading="savingSettings" @click="saveSettings">
          {{ $t("common.save") }}
        </UButton>
      </template>
    </UCard>

    <!-- Tax Rates -->
    <UCard>
      <template #header>
        <div class="flex items-center justify-between">
          <h3 class="font-semibold">{{ $t("settings.tax.taxRates") }}</h3>
          <UButton icon="i-heroicons-plus" size="sm" @click="openTaxRateModal()">
            {{ $t("settings.tax.addRate") }}
          </UButton>
        </div>
      </template>

      <div v-if="taxRates.length === 0" class="text-center py-8">
        <UIcon name="i-heroicons-calculator" class="text-4xl text-muted mb-2" />
        <p class="text-muted">{{ $t("settings.tax.noRates") }}</p>
        <UButton variant="outline" class="mt-4" icon="i-heroicons-plus" @click="openTaxRateModal()">
          {{ $t("settings.tax.addFirstRate") }}
        </UButton>
      </div>

      <div v-else class="divide-y divide-slate-100 dark:divide-slate-800">
        <div v-for="rate in taxRates" :key="rate.id" class="py-4 flex items-center justify-between">
          <div class="flex items-center gap-4">
            <div class="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
              <span class="text-lg font-bold text-primary">{{ rate.rate }}%</span>
            </div>
            <div>
              <div class="flex items-center gap-2">
                <p class="font-medium">{{ rate.name }}</p>
                <UBadge v-if="rate.isDefault" color="primary" variant="subtle" size="xs">
                  {{ $t("settings.tax.default") }}
                </UBadge>
                <UBadge v-if="!rate.isActive" color="neutral" variant="subtle" size="xs">
                  {{ $t("settings.tax.inactive") }}
                </UBadge>
              </div>
              <p class="text-sm text-muted">
                {{ rate.description || $t("settings.tax.noDescription") }}
              </p>
              <p v-if="rate.categories?.length" class="text-xs text-muted mt-1">
                {{ $t("settings.tax.appliesTo") }}:
                {{ rate.categories.join(", ") }}
              </p>
            </div>
          </div>

          <div class="flex items-center gap-2">
            <UButton variant="ghost" icon="i-heroicons-pencil" size="sm" @click="openTaxRateModal(rate)" />
            <UButton variant="ghost" icon="i-heroicons-trash" color="error" size="sm" :disabled="rate.isDefault"
              @click="confirmDeleteRate(rate)" />
          </div>
        </div>
      </div>
    </UCard>

    <!-- Tax Rate Modal -->
    <UModal v-model:open="showTaxRateModal">
      <template #header>
        <h3 class="font-semibold">
          {{
            editingRate
              ? $t("settings.tax.editRate")
              : $t("settings.tax.addRate")
          }}
        </h3>
      </template>

      <template #body>
        <div class="p-4 space-y-4">
          <UFormField :label="$t('settings.tax.rateName')" required>
            <UInput v-model="rateForm.name" :placeholder="$t('settings.tax.rateNamePlaceholder')" class="w-full" />
          </UFormField>

          <UFormField :label="$t('settings.tax.ratePercent')" required>
            <UInput v-model.number="rateForm.rate" type="number" min="0" max="100" step="0.01"
              :placeholder="$t('settings.tax.ratePercentPlaceholder')">
              <template #trailing>%</template>
            </UInput>
          </UFormField>

          <UFormField :label="$t('settings.tax.rateDescription')">
            <UTextarea v-model="rateForm.description" :placeholder="$t('settings.tax.rateDescriptionPlaceholder')"
              :rows="2" class="w-full" />
          </UFormField>

          <UFormField :label="$t('settings.tax.appliesTo')">
            <div class="space-y-2">
              <UCheckbox v-for="category in productCategories" :key="category"
                :model-value="rateForm.categories.includes(category)" :label="category"
                @update:model-value="toggleCategory(category, $event)" />
            </div>
          </UFormField>

          <div class="flex items-center justify-between">
            <UCheckbox v-model="rateForm.isActive" :label="$t('settings.tax.rateActive')" />
          </div>

          <div class="flex items-center justify-between">
            <UCheckbox v-model="rateForm.isDefault" :label="$t('settings.tax.setAsDefault')" />
          </div>
        </div>

      </template>
      <template #footer>
        <div class="flex w-full justify-end gap-2">
          <UButton variant="ghost" block @click="showTaxRateModal = false">
            {{ $t("common.cancel") }}
          </UButton>
          <UButton :loading="savingRate" block @click="saveRate">
            {{ editingRate ? $t("common.update") : $t("common.create") }}
          </UButton>
        </div>
      </template>
    </UModal>

    <!-- Delete Confirmation Modal -->
    <UModal v-model:open="showDeleteModal">
      <template #header>
        <h3 class="font-semibold text-error">
          {{ $t("settings.tax.deleteRate") }}
        </h3>
      </template>

      <template #body>
        <div class="p-4">
          <p>
            {{
              $t("settings.tax.deleteRateConfirm", { name: rateToDelete?.name })
            }}
          </p>
        </div>
      </template>

      <template #footer>
        <div class="flex justify-end gap-2">
          <UButton variant="ghost" @click="showDeleteModal = false">
            {{ $t("common.cancel") }}
          </UButton>
          <UButton color="error" :loading="deletingRate" @click="deleteRate">
            {{ $t("common.delete") }}
          </UButton>
        </div>
      </template>
    </UModal>
  </UContainer>
</template>

<script setup lang="ts">
import { useTax, type TaxRate } from '~/composables/use-tax';

definePageMeta({
  middleware: ["auth", "permission"],
});

useHead({
  title: "Tax",
});

const { t } = useI18n();
const toast = useToast();

// Use shared tax composable
const tax = useTax();

// Local UI State
const showTaxRateModal = ref(false);
const showDeleteModal = ref(false);
const savingSettings = ref(false);
const savingRate = ref(false);
const deletingRate = ref(false);
const editingRate = ref<TaxRate | null>(null);
const rateToDelete = ref<TaxRate | null>(null);

// Settings is now synced with composable
const settings = tax.settings;

// Tax rates from composable
const taxRates = tax.rates;

const rateForm = reactive({
  name: "",
  rate: 0,
  description: "",
  categories: [] as string[],
  isActive: true,
  isDefault: false,
});

const productCategories = [
  "Food",
  "Beverages",
  "Groceries",
  "Electronics",
  "Clothing",
  "Services",
];

// Computed
const activeTaxRates = computed(
  () => taxRates.value.filter((r) => r.isActive).length
);
const defaultRate = computed(
  () => taxRates.value.find((r) => r.isDefault)?.rate || 0
);

const roundingOptions = computed(() => [
  { value: "round", label: t("settings.tax.roundNearest") },
  { value: "floor", label: t("settings.tax.roundDown") },
  { value: "ceil", label: t("settings.tax.roundUp") },
]);

// Methods
function openTaxRateModal(rate?: TaxRate) {
  if (rate) {
    editingRate.value = rate;
    rateForm.name = rate.name;
    rateForm.rate = rate.rate;
    rateForm.description = rate.description || "";
    rateForm.categories = rate.categories || [];
    rateForm.isActive = rate.isActive;
    rateForm.isDefault = rate.isDefault;
  } else {
    editingRate.value = null;
    rateForm.name = "";
    rateForm.rate = 0;
    rateForm.description = "";
    rateForm.categories = [];
    rateForm.isActive = true;
    rateForm.isDefault = false;
  }
  showTaxRateModal.value = true;
}

function toggleCategory(category: string, checked: boolean | "indeterminate") {
  if (checked === true) {
    if (!rateForm.categories.includes(category)) {
      rateForm.categories.push(category);
    }
  } else {
    const index = rateForm.categories.indexOf(category);
    if (index !== -1) {
      rateForm.categories.splice(index, 1);
    }
  }
}

async function saveSettings() {
  savingSettings.value = true;

  try {
    // Save using composable
    tax.saveSettings();

    toast.add({
      title: t("settings.tax.settingsSaved"),
      color: "success",
    });
  } catch (error) {
    console.error("Failed to save settings:", error);
    toast.add({
      title: t("settings.tax.settingsFailed"),
      color: "error",
    });
  } finally {
    savingSettings.value = false;
  }
}

async function saveRate() {
  if (!rateForm.name || rateForm.rate < 0) {
    toast.add({
      title: t("settings.tax.validationError"),
      description: t("settings.tax.fillRequired"),
      color: "error",
    });
    return;
  }

  savingRate.value = true;

  try {
    if (editingRate.value) {
      // Update existing rate
      const index = taxRates.value.findIndex(
        (r) => r.id === editingRate.value?.id
      );
      if (index !== -1) {
        const existingRate = taxRates.value[index];
        // If setting as default, unset other defaults
        if (rateForm.isDefault && existingRate && !existingRate.isDefault) {
          taxRates.value.forEach((r) => (r.isDefault = false));
        }

        if (existingRate) {
          taxRates.value[index] = {
            id: existingRate.id,
            name: rateForm.name,
            rate: rateForm.rate,
            description: rateForm.description,
            categories: rateForm.categories,
            isActive: rateForm.isActive,
            isDefault: rateForm.isDefault,
          };
        }
      }

      toast.add({
        title: t("settings.tax.rateUpdated"),
        color: "success",
      });
    } else {
      // Create new rate
      if (rateForm.isDefault) {
        taxRates.value.forEach((r) => (r.isDefault = false));
      }

      taxRates.value.push({
        id: Date.now().toString(),
        name: rateForm.name,
        rate: rateForm.rate,
        description: rateForm.description,
        categories: rateForm.categories,
        isActive: rateForm.isActive,
        isDefault: rateForm.isDefault,
      });

      toast.add({
        title: t("settings.tax.rateCreated"),
        color: "success",
      });
    }

    // Save using composable
    tax.saveRates();
    showTaxRateModal.value = false;
  } catch (error) {
    console.error("Failed to save rate:", error);
    toast.add({
      title: t("settings.tax.rateFailed"),
      color: "error",
    });
  } finally {
    savingRate.value = false;
  }
}

function confirmDeleteRate(rate: TaxRate) {
  rateToDelete.value = rate;
  showDeleteModal.value = true;
}

async function deleteRate() {
  if (!rateToDelete.value) return;

  deletingRate.value = true;

  try {
    // Delete using composable
    tax.deleteTaxRate(rateToDelete.value.id);

    toast.add({
      title: t("settings.tax.rateDeleted"),
      color: "success",
    });

    showDeleteModal.value = false;
  } catch (error) {
    console.error("Failed to delete rate:", error);
    toast.add({
      title: t("settings.tax.deleteFailed"),
      color: "error",
    });
  } finally {
    deletingRate.value = false;
  }
}

// Composable auto-loads settings on initialization - no onMounted needed
</script>
