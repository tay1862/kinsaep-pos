<!-- components/products/PromotionForm.vue -->
<script setup lang="ts">
interface Props {
  modelValue: boolean;
  isLoading?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  isLoading: false,
});

const emit = defineEmits<{
  "update:modelValue": [value: boolean];
  submit: [];
}>();

const { t } = useI18n();
const productsStore = useProducts();
const {
  form: formRef,
  typeOptions,
  scopeOptions,
  discountTypeOptions,
  daysOfWeekOptions,
  validateForm,
  showValidationError,
  addTier,
  removeTier,
  updateBadgeText,
} = usePromotionForm();

// Direct access to form data for v-model in template
// formRef is a Ref<PromotionFormData>, so formRef.value is reactive
const form = formRef.value;

// Product options for select
const productItems = computed(() =>
  productsStore.products.value.map((p) => ({
    value: p.id,
    label: p.name,
  }))
);

// Category options
const categoryItems = computed(() =>
  productsStore.categories.value.map((c) => ({
    value: c.id,
    label: `${c.icon || "📁"} ${c.name}`,
  }))
);

// Active step for wizard-like flow
const activeStep = ref(0);
const steps = ["type", "setup", "conditions", "display"];

// Computed for v-model binding
const isVisible = computed({
  get: () => props.modelValue,
  set: (value: boolean) => emit("update:modelValue", value),
});

// Show different sections based on type
const showBogoFields = computed(
  () => form.type === "bogo" || form.type === "freebie"
);
const showDiscountFields = computed(() => form.type === "discount");
const showTierFields = computed(() => form.type === "tiered");
const showBundleFields = computed(() => form.type === "bundle");

// Auto-update badge text when type changes
watch(
  () => form.type,
  () => {
    updateBadgeText();
  }
);

// Form submission handler
async function handleSubmit() {
  const validation = validateForm();

  if (!validation.isValid) {
    showValidationError(validation.errors);
    return;
  }

  emit("submit");
}

// Close modal handler
function handleClose() {
  isVisible.value = false;
  activeStep.value = 0;
}

function nextStep() {
  if (activeStep.value < steps.length - 1) {
    activeStep.value++;
  }
}

function prevStep() {
  if (activeStep.value > 0) {
    activeStep.value--;
  }
}
</script>

<template>
  <UModal v-model:open="isVisible" @update:model-value="handleClose">
    <template #header>
      <h3
        class="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2"
      >
        <span>🎁</span>
        {{ t("promotions.create", "Create Promotion") }}
      </h3>
    </template>

    <template #body>
      <div class="space-y-6">
        <!-- Step Indicators -->
        <div class="flex items-center justify-between mb-4">
          <button
            v-for="(step, index) in steps"
            :key="index"
            class="flex-1 text-center py-2 text-sm font-medium transition-colors"
            :class="
              index === activeStep
                ? 'text-primary-600 border-b-2 border-primary-500'
                : index < activeStep
                ? 'text-green-600 border-b-2 border-green-500'
                : 'text-gray-400 border-b border-gray-200 dark:border-gray-700'
            "
            @click="activeStep = index"
          >
            {{ t(`promotions.form.${step}Setup`, step) }}
          </button>
        </div>

        <!-- Step 1: Type Selection -->
        <div v-show="activeStep === 0" class="space-y-4">
          <h4 class="font-medium text-gray-900 dark:text-white">
            {{ t("promotions.type.label", "Select Promotion Type") }}
          </h4>
          <div class="grid grid-cols-2 gap-3">
            <button
              v-for="type in typeOptions"
              :key="type.value"
              class="p-4 rounded-xl border-2 text-left transition-all"
              :class="
                form.type === type.value
                  ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                  : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'
              "
              @click="form.type = type.value as any"
            >
              <div class="text-2xl mb-2">{{ type.icon }}</div>
              <div class="font-medium text-gray-900 dark:text-white">
                {{ type.label }}
              </div>
              <div class="text-xs text-gray-500">{{ type.description }}</div>
            </button>
          </div>
        </div>

        <!-- Step 2: Setup (varies by type) -->
        <div v-show="activeStep === 1" class="space-y-4">
          <!-- Promotion Name -->
          <UFormField :label="t('common.name', 'Promotion Name')" required>
            <UInput
              v-model="form.name"
              placeholder="e.g., Buy 1 Get 1 Free Coffee"
              :disabled="isLoading"
            />
          </UFormField>

          <!-- Scope -->
          <UFormField :label="t('promotions.scope.label', 'Applies To')">
            <USelect
              v-model="form.scope"
              :items="scopeOptions"
              value-key="value"
              label-key="label"
              :disabled="isLoading"
            />
          </UFormField>

          <!-- BOGO/Freebie Fields -->
          <template v-if="showBogoFields">
            <UFormField
              :label="t('promotions.triggerProduct', 'When Customer Buys')"
              required
            >
              <div class="flex gap-2 items-center">
                <UInput
                  v-model.number="form.triggerQuantity"
                  type="number"
                  min="1"
                  class="w-20"
                  :disabled="isLoading"
                />
                <span class="text-gray-500">×</span>
                <!-- Products (when scope = products) -->
                <USelectMenu
                  v-if="form.scope === 'products'"
                  v-model="form.triggerProductIds"
                  :items="productItems"
                  multiple
                  searchable
                  value-key="value"
                  label-key="label"
                  placeholder="Select products..."
                  class="flex-1"
                  :disabled="isLoading"
                />
                <!-- Categories (when scope = categories) -->
                <USelectMenu
                  v-else-if="form.scope === 'categories'"
                  v-model="form.triggerCategoryIds"
                  :items="categoryItems"
                  multiple
                  searchable
                  value-key="value"
                  label-key="label"
                  placeholder="Select categories..."
                  class="flex-1"
                  :disabled="isLoading"
                />
                <!-- Order scope (no selection needed) -->
                <div v-else class="flex-1 text-gray-500 text-sm">
                  All products in order
                </div>
              </div>
            </UFormField>

            <UFormField
              :label="t('promotions.rewardProduct', 'They Get FREE')"
              required
            >
              <div class="flex gap-2 items-center">
                <UInput
                  v-model.number="form.rewardQuantity"
                  type="number"
                  min="1"
                  class="w-20"
                  :disabled="isLoading"
                />
                <span class="text-gray-500">×</span>
                <USelectMenu
                  v-model="form.rewardProductIds"
                  :items="productItems"
                  multiple
                  searchable
                  value-key="value"
                  label-key="label"
                  placeholder="Same as trigger (or select different)"
                  class="flex-1"
                  :disabled="isLoading"
                />
              </div>
            </UFormField>
          </template>

          <!-- Discount Fields -->
          <template v-if="showDiscountFields">
            <UFormField
              :label="t('promotions.discountType.label', 'Discount Type')"
            >
              <USelect
                v-model="form.discountType"
                :items="discountTypeOptions"
                value-key="value"
                label-key="label"
                :disabled="isLoading"
              />
            </UFormField>

            <UFormField
              :label="t('promotions.fields.discountValue', 'Discount Value')"
              required
            >
              <div class="flex items-center gap-2">
                <UInput
                  v-model.number="form.discountValue"
                  type="number"
                  min="0"
                  :max="form.discountType === 'percentage' ? 100 : undefined"
                  class="flex-1"
                  :disabled="isLoading"
                />
                <span class="text-lg font-medium text-gray-500">
                  {{ form.discountType === "percentage" ? "%" : "฿" }}
                </span>
              </div>
            </UFormField>
            <!-- Apply To (varies by scope) -->
            <UFormField
              v-if="form.scope === 'products'"
              :label="
                t('promotions.fields.triggerProducts', 'Apply To Products')
              "
            >
              <USelectMenu
                v-model="form.triggerProductIds"
                :items="productItems"
                multiple
                searchable
                value-key="value"
                label-key="label"
                placeholder="Select products (or leave empty for all)"
                :disabled="isLoading"
              />
            </UFormField>
            <UFormField
              v-else-if="form.scope === 'categories'"
              :label="
                t('promotions.fields.triggerCategories', 'Apply To Categories')
              "
            >
              <USelectMenu
                v-model="form.triggerCategoryIds"
                :items="categoryItems"
                multiple
                searchable
                value-key="value"
                label-key="label"
                placeholder="Select categories"
                :disabled="isLoading"
              />
            </UFormField>
            <div
              v-else
              class="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg text-sm text-gray-600 dark:text-gray-400"
            >
              Applies to entire order total
            </div>
          </template>

          <!-- Tiered Fields -->
          <template v-if="showTierFields">
            <div class="space-y-3">
              <div class="flex items-center justify-between">
                <label class="font-medium text-gray-900 dark:text-white">
                  {{ t("promotions.tiers.title", "Tier Levels") }}
                </label>
                <UButton
                  size="sm"
                  variant="ghost"
                  icon="i-heroicons-plus"
                  @click="addTier"
                >
                  {{ t("promotions.tiers.addTier", "Add Tier") }}
                </UButton>
              </div>

              <div
                v-if="form.tiers.length === 0"
                class="text-sm text-gray-500 italic"
              >
                {{
                  t(
                    "promotions.tiers.example",
                    "e.g., Buy 2 get 10% off, Buy 3 get 20% off"
                  )
                }}
              </div>

              <div
                v-for="(tier, index) in form.tiers"
                :key="index"
                class="flex items-center gap-2 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg"
              >
                <span class="text-sm font-medium">Buy</span>
                <UInput
                  v-model.number="tier.minQuantity"
                  type="number"
                  min="1"
                  class="w-16"
                />
                <span class="text-sm font-medium">+ get</span>
                <UInput
                  v-model.number="tier.discountValue"
                  type="number"
                  min="0"
                  class="w-16"
                />
                <USelect
                  v-model="tier.discountType"
                  :items="discountTypeOptions"
                  value-key="value"
                  label-key="label"
                  class="w-32"
                />
                <UButton
                  variant="ghost"
                  color="red"
                  icon="i-heroicons-trash"
                  size="xs"
                  @click="removeTier(index)"
                />
              </div>
            </div>

            <!-- Apply To (varies by scope) -->
            <UFormField
              v-if="form.scope === 'products'"
              :label="
                t('promotions.fields.triggerProducts', 'Apply To Products')
              "
            >
              <USelectMenu
                v-model="form.triggerProductIds"
                :items="productItems"
                multiple
                searchable
                value-key="value"
                label-key="label"
                placeholder="Select products"
                :disabled="isLoading"
              />
            </UFormField>
            <UFormField
              v-else-if="form.scope === 'categories'"
              :label="
                t('promotions.fields.triggerCategories', 'Apply To Categories')
              "
            >
              <USelectMenu
                v-model="form.triggerCategoryIds"
                :items="categoryItems"
                multiple
                searchable
                value-key="value"
                label-key="label"
                placeholder="Select categories"
                :disabled="isLoading"
              />
            </UFormField>
            <div
              v-else
              class="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg text-sm text-gray-600 dark:text-gray-400"
            >
              Applies to entire order total
            </div>
          </template>

          <!-- Bundle Fields -->
          <template v-if="showBundleFields">
            <div
              class="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg text-sm text-blue-700 dark:text-blue-300 mb-2"
            >
              📦
              {{
                t(
                  "promotions.type.bundleDesc",
                  "Select products that must be bought together to get a discount"
                )
              }}
            </div>

            <!-- Bundle Items (varies by scope) -->
            <UFormField
              v-if="form.scope === 'products'"
              :label="t('promotions.fields.triggerProducts', 'Bundle Products')"
              required
            >
              <USelectMenu
                v-model="form.triggerProductIds"
                :items="productItems"
                multiple
                searchable
                value-key="value"
                label-key="label"
                placeholder="Select 2+ products for the bundle..."
                :disabled="isLoading"
              />
              <div
                v-if="form.triggerProductIds.length > 0"
                class="text-sm text-gray-500 mt-1"
              >
                {{ form.triggerProductIds.length }} products in bundle
              </div>
            </UFormField>

            <UFormField
              v-else-if="form.scope === 'categories'"
              :label="
                t('promotions.fields.triggerCategories', 'Bundle Categories')
              "
              required
            >
              <USelectMenu
                v-model="form.triggerCategoryIds"
                :items="categoryItems"
                multiple
                searchable
                value-key="value"
                label-key="label"
                placeholder="Select categories for the bundle..."
                :disabled="isLoading"
              />
              <div
                v-if="form.triggerCategoryIds.length > 0"
                class="text-sm text-gray-500 mt-1"
              >
                {{ form.triggerCategoryIds.length }} categories in bundle
              </div>
            </UFormField>

            <div
              v-else
              class="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg text-sm text-gray-600 dark:text-gray-400"
            >
              Bundle applies to entire order
            </div>

            <UFormField
              :label="t('promotions.discountType.label', 'Discount Type')"
            >
              <USelect
                v-model="form.discountType"
                :items="discountTypeOptions"
                value-key="value"
                label-key="label"
                :disabled="isLoading"
              />
            </UFormField>

            <UFormField
              :label="t('promotions.fields.discountValue', 'Bundle Discount')"
              required
            >
              <div class="flex items-center gap-2">
                <UInput
                  v-model.number="form.discountValue"
                  type="number"
                  min="0"
                  :max="form.discountType === 'percentage' ? 100 : undefined"
                  class="flex-1"
                  :disabled="isLoading"
                />
                <span class="text-lg font-medium text-gray-500">
                  {{ form.discountType === "percentage" ? "%" : "" }}
                </span>
              </div>
            </UFormField>
          </template>
        </div>

        <!-- Step 3: Conditions -->
        <div v-show="activeStep === 2" class="space-y-4">
          <h4 class="font-medium text-gray-900 dark:text-white">
            {{ t("promotions.conditions.title", "Conditions (Optional)") }}
          </h4>

          <UFormField
            :label="
              t('promotions.conditions.minOrderValue', 'Minimum Order Value')
            "
          >
            <div class="flex items-center gap-2">
              <span class="text-gray-500">-</span>
              <UInput
                v-model.number="form.minOrderValue"
                type="number"
                min="0"
                placeholder="No minimum"
                :disabled="isLoading"
              />
            </div>
          </UFormField>

          <div
            class="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg"
          >
            <div>
              <div class="font-medium text-gray-900 dark:text-white">
                {{
                  t("promotions.conditions.firstOrderOnly", "First Order Only")
                }}
              </div>
              <div class="text-xs text-gray-500">
                {{
                  t(
                    "promotions.conditions.firstOrderOnlyHint",
                    "Only applies to new customers"
                  )
                }}
              </div>
            </div>
            <USwitch v-model="form.firstOrderOnly" />
          </div>

          <UFormField
            :label="t('promotions.schedule.daysOfWeek', 'Days of Week')"
          >
            <div class="flex flex-wrap gap-2">
              <button
                v-for="day in daysOfWeekOptions"
                :key="day.value"
                class="px-3 py-1.5 rounded-lg text-sm transition-all"
                :class="
                  form.daysOfWeek.includes(day.value)
                    ? 'bg-primary-500 text-white'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300'
                "
                @click="
                  form.daysOfWeek.includes(day.value)
                    ? form.daysOfWeek.splice(
                        form.daysOfWeek.indexOf(day.value),
                        1
                      )
                    : form.daysOfWeek.push(day.value)
                "
              >
                {{ day.label.slice(0, 3) }}
              </button>
            </div>
            <div class="text-xs text-gray-500 mt-1">
              {{
                form.daysOfWeek.length === 0
                  ? "All days"
                  : `${form.daysOfWeek.length} days selected`
              }}
            </div>
          </UFormField>

          <div class="grid grid-cols-2 gap-4">
            <UFormField
              :label="t('promotions.schedule.startDate', 'Start Date')"
            >
              <UInput
                v-model="form.startDate"
                type="date"
                :disabled="isLoading"
              />
            </UFormField>
            <UFormField :label="t('promotions.schedule.endDate', 'End Date')">
              <UInput
                v-model="form.endDate"
                type="date"
                :disabled="isLoading"
              />
            </UFormField>
          </div>

          <UFormField
            :label="t('promotions.limits.total', 'Total Usage Limit')"
          >
            <UInput
              v-model.number="form.maxUsesTotal"
              type="number"
              min="0"
              :placeholder="t('promotions.limits.unlimited', 'Unlimited')"
              :disabled="isLoading"
            />
          </UFormField>
        </div>

        <!-- Step 4: Display -->
        <div v-show="activeStep === 3" class="space-y-4">
          <h4 class="font-medium text-gray-900 dark:text-white">
            {{ t("promotions.display.title", "Display Options") }}
          </h4>

          <UFormField
            :label="t('promotions.fields.badgeText', 'Badge Text')"
            required
          >
            <UInput
              v-model="form.badgeText"
              placeholder="BUY 1 GET 1 FREE"
              :disabled="isLoading"
            />
          </UFormField>

          <div class="p-4 bg-gray-50 dark:bg-gray-800 rounded-xl text-center">
            <p class="text-sm text-gray-500 mb-2">Preview</p>
            <UBadge color="green" size="lg" :label="form.badgeText" />
          </div>

          <div
            class="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg"
          >
            <div>
              <div class="font-medium text-gray-900 dark:text-white">
                {{ t("promotions.display.highlightOnPOS", "Highlight on POS") }}
              </div>
              <div class="text-xs text-gray-500">
                {{
                  t(
                    "promotions.display.highlightOnPOSHint",
                    "Show badge in product grid"
                  )
                }}
              </div>
            </div>
            <USwitch v-model="form.highlightOnPOS" />
          </div>

          <div
            class="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg"
          >
            <div>
              <div class="font-medium text-gray-900 dark:text-white">
                {{ t("promotions.stacking.stackable", "Can Stack") }}
              </div>
              <div class="text-xs text-gray-500">
                {{
                  t(
                    "promotions.stacking.stackableHint",
                    "Can combine with other promotions"
                  )
                }}
              </div>
            </div>
            <USwitch v-model="form.stackable" />
          </div>
        </div>
      </div>
    </template>

    <template #footer>
      <div class="flex justify-between w-full gap-3">
        <UButton
          v-if="activeStep > 0"
          color="gray"
          variant="ghost"
          icon="i-heroicons-arrow-left"
          :disabled="isLoading"
          @click="prevStep"
        >
          {{ t("common.back", "Back") }}
        </UButton>
        <div v-else />

        <div class="flex gap-2">
          <UButton
            color="gray"
            variant="outline"
            :label="t('common.cancel')"
            :disabled="isLoading"
            @click="handleClose"
          />
          <UButton
            v-if="activeStep < steps.length - 1"
            color="primary"
            trailing-icon="i-heroicons-arrow-right"
            :disabled="isLoading"
            @click="nextStep"
          >
            {{ t("common.next", "Next") }}
          </UButton>
          <UButton
            v-else
            color="primary"
            :loading="isLoading"
            :label="t('common.create')"
            @click="handleSubmit"
          />
        </div>
      </div>
    </template>
  </UModal>
</template>
