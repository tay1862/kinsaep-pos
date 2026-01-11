<script setup lang="ts">
/**
 * Staff Product Assignment Component
 * Allows admins to assign specific products or categories to staff
 */
import type { Employee, Product, Category } from "~/types";

const props = defineProps<{
  employee: Employee;
}>();

const emit = defineEmits<{
  updated: [];
}>();

const { t } = useI18n();
const toast = useToast();
const employeesStore = useEmployeesStore();
const productsStore = useProducts();

// UI State
const isLoading = ref(false);
const mode = ref<"all" | "assigned" | "category">(
  props.employee.assignmentMode || "all"
);

// Selected IDs
const selectedProductIds = ref<string[]>(
  props.employee.assignedProductIds || []
);
const selectedCategoryIds = ref<string[]>(
  props.employee.assignedCategoryIds || []
);

// Products and categories from store
const products = computed(() => productsStore.products.value || []);
const categories = computed(() => productsStore.categories.value || []);

// Mode options
const modeOptions = [
  {
    value: "all",
    label: t("employees.allProducts", "All Products"),
    icon: "i-heroicons-squares-2x2",
  },
  {
    value: "assigned",
    label: t("employees.assignedOnly", "Assigned Products Only"),
    icon: "i-heroicons-check-circle",
  },
  {
    value: "category",
    label: t("employees.byCategory", "By Category"),
    icon: "i-heroicons-tag",
  },
];

// Product options for select (Nuxt UI v4 format)
const productOptions = computed(() =>
  products.value.map((p: Product) => ({
    value: p.id,
    label: p.name,
  }))
);

// Category options for select (Nuxt UI v4 format)
const categoryOptions = computed(() =>
  categories.value.map((c: Category) => ({
    value: c.id,
    label: `${c.icon || "📁"} ${c.name}`,
  }))
);

// Save assignments
async function saveAssignments() {
  isLoading.value = true;

  try {
    await employeesStore.updateEmployee(props.employee.id, {
      assignmentMode: mode.value,
      assignedProductIds:
        mode.value === "assigned" ? selectedProductIds.value : undefined,
      assignedCategoryIds:
        mode.value === "category" ? selectedCategoryIds.value : undefined,
    });

    toast.add({
      title: t("common.success", "Success"),
      description: t("employees.assignmentSaved", "Product assignment saved"),
      icon: "i-heroicons-check-circle",
      color: "green",
    });

    emit("updated");
  } catch (e) {
    toast.add({
      title: t("common.error", "Error"),
      description: String(e),
      icon: "i-heroicons-exclamation-triangle",
      color: "red",
    });
  } finally {
    isLoading.value = false;
  }
}

// Clear assignments
function clearAssignments() {
  mode.value = "all";
  selectedProductIds.value = [];
  selectedCategoryIds.value = [];
}

// Watch for prop changes
watch(
  () => props.employee,
  (newEmployee) => {
    mode.value = newEmployee.assignmentMode || "all";
    selectedProductIds.value = newEmployee.assignedProductIds || [];
    selectedCategoryIds.value = newEmployee.assignedCategoryIds || [];
  },
  { immediate: true }
);

// Product count summary
const assignmentSummary = computed(() => {
  if (mode.value === "all") {
    return (
      t("employees.noAssignment", "No restrictions - all products visible")
    );
  }
  if (mode.value === "assigned") {
    return `${selectedProductIds.value.length} ${
      t("common.products", "products")
    } ${t("employees.assigned", "assigned")}`;
  }
  if (mode.value === "category") {
    return `${selectedCategoryIds.value.length} ${
      t("common.categories", "categories")
    } ${t("employees.assigned", "assigned")}`;
  }
  return "";
});
</script>

<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="flex items-center justify-between">
      <div>
        <h3 class="text-lg font-medium text-gray-900 dark:text-white">
          {{ t("employees.productAssignment", "Product Assignment") }}
        </h3>
        <p class="text-sm text-gray-500 dark:text-gray-400">
          {{
            t("employees.productAssignmentDesc", "Control which products this staff can view and sell")
          }}
        </p>
      </div>
      <UBadge
        :color="mode === 'all' ? 'gray' : 'primary'"
        variant="subtle"
        :label="assignmentSummary"
      />
    </div>

    <!-- Mode Selection -->
    <div>
      <label
        class="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300"
      >
        {{ t("employees.assignmentMode", "Assignment Mode") }}
      </label>
      <div class="flex flex-wrap gap-2">
        <UButton
          v-for="option in modeOptions"
          :key="option.value"
          :color="mode === option.value ? 'primary' : 'neutral'"
          :variant="mode === option.value ? 'solid' : 'outline'"
          :icon="option.icon"
          @click="mode = option.value as 'all' | 'assigned' | 'category'"
        >
          {{ option.label }}
        </UButton>
      </div>
    </div>

    <!-- Product Selection (when mode = assigned) -->
    <div v-if="mode === 'assigned'" class="space-y-2">
      <UFormField :label="t('employees.selectProducts', 'Select Products')">
        <USelectMenu
          v-model="selectedProductIds"
          :items="productOptions"
          multiple
          searchable
          value-key="value"
          label-key="label"
          :placeholder="
            t('employees.selectProductsPlaceholder', 'Choose products...')
          "
          class="w-full"
        />
      </UFormField>

      <!-- Selected products chips -->
      <div v-if="selectedProductIds.length > 0" class="flex flex-wrap gap-1">
        <UBadge
          v-for="productId in selectedProductIds"
          :key="productId"
          color="primary"
          variant="subtle"
          class="cursor-pointer"
          @click="
            selectedProductIds = selectedProductIds.filter(
              (id) => id !== productId
            )
          "
        >
          {{ products.find((p) => p.id === productId)?.name || productId }}
          <UIcon name="i-heroicons-x-mark" class="w-3 h-3 ml-1" />
        </UBadge>
      </div>
    </div>

    <!-- Category Selection (when mode = category) -->
    <div v-if="mode === 'category'" class="space-y-2">
      <UFormField
        :label="t('employees.selectCategories', 'Select Categories')"
      >
        <USelectMenu
          v-model="selectedCategoryIds"
          :items="categoryOptions"
          multiple
          value-key="value"
          label-key="label"
          :placeholder="
            t('employees.selectCategoriesPlaceholder', 'Choose categories...')
          "
          class="w-full"
        />
      </UFormField>

      <!-- Selected categories chips -->
      <div v-if="selectedCategoryIds.length > 0" class="flex flex-wrap gap-1">
        <UBadge
          v-for="categoryId in selectedCategoryIds"
          :key="categoryId"
          color="primary"
          variant="subtle"
          class="cursor-pointer"
          @click="
            selectedCategoryIds = selectedCategoryIds.filter(
              (id) => id !== categoryId
            )
          "
        >
          {{ categories.find((c) => c.id === categoryId)?.icon }}
          {{ categories.find((c) => c.id === categoryId)?.name || categoryId }}
          <UIcon name="i-heroicons-x-mark" class="w-3 h-3 ml-1" />
        </UBadge>
      </div>
    </div>

    <!-- Actions -->
    <div class="flex justify-end gap-2 pt-4 border-t border-gray-200 dark:border-gray-700">
      <UButton
        color="neutral"
        variant="ghost"
        icon="i-heroicons-x-mark"
        :disabled="isLoading"
        @click="clearAssignments"
      >
        {{ t("common.clear", "Clear") }}
      </UButton>
      <UButton
        color="primary"
        icon="i-heroicons-check"
        :loading="isLoading"
        @click="saveAssignments"
      >
        {{ t("common.save", "Save") }}
      </UButton>
    </div>
  </div>
</template>
