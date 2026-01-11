<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="flex justify-between items-center px-4">
      <div>
        <div class="flex items-center gap-3">
          <NuxtLinkLocale to="/products">
            <UButton
              icon="i-heroicons-arrow-left"
              color="neutral"
              variant="ghost"
              size="sm"
            />
          </NuxtLinkLocale>
          <div>
            <h1 class="text-3xl font-bold text-gray-900 dark:text-white">
              {{ $t("products.settings", "Product Settings") }}
            </h1>
            <p class="text-gray-600 dark:text-gray-400 mt-1">
              {{
                $t("products.manageMetadata", "Manage categories and units")
              }}
            </p>
          </div>
        </div>
      </div>
    </div>

    <!-- Tabs -->
    <div class="px-4">
      <div class="flex gap-2 border-b border-gray-200 dark:border-gray-700">
        <button
          :class="[
            'px-4 py-2 text-sm font-medium border-b-2 transition-colors',
            activeTab === 'categories'
              ? 'border-amber-500 text-amber-600 dark:text-amber-400'
              : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300',
          ]"
          @click="activeTab = 'categories'"
        >
          📁 {{ $t("products.categories.title", "Categories") }}
        </button>
        <button
          :class="[
            'px-4 py-2 text-sm font-medium border-b-2 transition-colors',
            activeTab === 'units'
              ? 'border-amber-500 text-amber-600 dark:text-amber-400'
              : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300',
          ]"
          @click="activeTab = 'units'"
        >
          📐 {{ $t("products.units.title", "Units") }}
        </button>
      </div>
    </div>

    <!-- Categories Tab -->
    <div v-if="activeTab === 'categories'" class="px-4 space-y-4">
      <div class="flex justify-between items-center">
        <h2 class="text-xl font-semibold text-gray-900 dark:text-white">
          {{ $t("products.categories.title", "Categories") }} ({{
            productsStore.categories.value.length
          }})
        </h2>
        <UButton
          color="primary"
          icon="i-heroicons-plus"
          @click="openCategoryModal()"
        >
          {{ $t("common.add", "Add") }}
        </UButton>
      </div>

      <div
        class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4"
      >
        <div
          v-for="category in productsStore.categories.value"
          :key="category.id"
          class="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4 flex items-center justify-between"
        >
          <div class="flex items-center gap-3">
            <span class="text-2xl">{{ category.icon || "📦" }}</span>
            <div>
              <h3 class="font-medium text-gray-900 dark:text-white">
                {{ category.name }}
              </h3>
              <p
                v-if="category.description"
                class="text-sm text-gray-500 dark:text-gray-400"
              >
                {{ category.description }}
              </p>
            </div>
          </div>
          <div class="flex items-center gap-1">
            <UButton
              v-if="!['all', 'favorites'].includes(category.id)"
              icon="i-heroicons-pencil"
              color="neutral"
              variant="ghost"
              size="xs"
              @click="openCategoryModal(category)"
            />
            <UButton
              v-if="!['all', 'favorites'].includes(category.id)"
              icon="i-heroicons-trash"
              color="red"
              variant="ghost"
              size="xs"
              @click="confirmDelete('category', category)"
            />
          </div>
        </div>
      </div>
    </div>

    <!-- Units Tab -->
    <div v-if="activeTab === 'units'" class="px-4 space-y-4">
      <div class="flex justify-between items-center">
        <h2 class="text-xl font-semibold text-gray-900 dark:text-white">
          {{ $t("products.units.title", "Units") }} ({{
            productsStore.units.value.length
          }})
        </h2>
        <UButton
          color="primary"
          icon="i-heroicons-plus"
          @click="openUnitModal()"
        >
          {{ $t("common.add", "Add") }}
        </UButton>
      </div>

      <div
        class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4"
      >
        <div
          v-for="unit in productsStore.units.value"
          :key="unit.id"
          class="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4 flex items-center justify-between"
        >
          <div class="flex items-center gap-3">
            <div
              class="w-10 h-10 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center font-bold"
            >
              {{ unit.symbol }}
            </div>
            <div>
              <h3 class="font-medium text-gray-900 dark:text-white">
                {{ unit.name }}
              </h3>
              <p class="text-sm text-gray-500 dark:text-gray-400">
                {{ $t("products.units.symbol", "Symbol") }}: {{ unit.symbol }}
              </p>
            </div>
          </div>
          <div class="flex items-center gap-1">
            <UButton
              icon="i-heroicons-pencil"
              color="neutral"
              variant="ghost"
              size="xs"
              @click="openUnitModal(unit)"
            />
          </div>
        </div>
      </div>
    </div>

    <!-- Category Modal -->
    <UModal v-model:open="showCategoryModal">
      <template #content>
        <div class="p-6 bg-white dark:bg-gray-900">
          <h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            {{
              editingCategory
                ? $t("common.edit", "Edit")
                : $t("common.add", "Add")
            }}
            {{ $t("products.categories.single", "Category") }}
          </h3>

          <div class="space-y-4">
            <!-- Icon Selection -->
            <div>
              <label
                class="block text-sm text-gray-500 dark:text-gray-400 mb-2"
              >
                {{ $t("common.icon", "Icon") }}
              </label>
              <div class="flex flex-wrap gap-2">
                <button
                  v-for="icon in commonIcons"
                  :key="icon"
                  type="button"
                  class="w-10 h-10 rounded-lg text-xl flex items-center justify-center transition-colors"
                  :class="
                    categoryForm.icon === icon
                      ? 'bg-amber-500 text-white'
                      : 'bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700'
                  "
                  @click="categoryForm.icon = icon"
                >
                  {{ icon }}
                </button>
              </div>
            </div>

            <!-- Name -->
            <UFormField :label="$t('common.name', 'Name')" required>
              <UInput
                v-model="categoryForm.name"
                :placeholder="
                  $t('products.categories.namePlaceholder', 'e.g., Drinks, Food, Snacks')
                "
              />
            </UFormField>

            <!-- Description -->
            <UFormField :label="$t('common.description', 'Description')">
              <UInput
                v-model="categoryForm.description"
                :placeholder="$t('common.optional', 'Optional description')"
              />
            </UFormField>

            <div class="flex gap-2 pt-4">
              <UButton
                color="neutral"
                variant="outline"
                class="flex-1"
                @click="showCategoryModal = false"
              >
                {{ $t("common.cancel", "Cancel") }}
              </UButton>
              <UButton
                color="primary"
                class="flex-1"
                :loading="savingCategory"
                @click="saveCategory"
              >
                {{
                  editingCategory
                    ? $t("common.update", "Update")
                    : $t("common.create", "Create")
                }}
              </UButton>
            </div>
          </div>
        </div>
      </template>
    </UModal>

    <!-- Unit Modal -->
    <UModal v-model:open="showUnitModal">
      <template #content>
        <div class="p-6 bg-white dark:bg-gray-900">
          <h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            {{
              editingUnit
                ? $t("common.edit", "Edit")
                : $t("common.add", "Add")
            }}
            {{ $t("products.units.single", "Unit") }}
          </h3>

          <div class="space-y-4">
            <!-- Name -->
            <UFormField :label="$t('common.name', 'Name')" required>
              <UInput
                v-model="unitForm.name"
                :placeholder="
                  $t('products.units.namePlaceholder', 'e.g., Piece, Kilogram, Liter')
                "
              />
            </UFormField>

            <!-- Symbol -->
            <UFormField
              :label="$t('products.units.symbol', 'Symbol')"
              required
            >
              <UInput
                v-model="unitForm.symbol"
                :placeholder="
                  $t('products.units.symbolPlaceholder', 'e.g., pc, kg, L')
                "
              />
            </UFormField>

            <div class="flex gap-2 pt-4">
              <UButton
                color="neutral"
                variant="outline"
                class="flex-1"
                @click="showUnitModal = false"
              >
                {{ $t("common.cancel", "Cancel") }}
              </UButton>
              <UButton
                color="primary"
                class="flex-1"
                :loading="savingUnit"
                @click="saveUnit"
              >
                {{
                  editingUnit
                    ? $t("common.update", "Update")
                    : $t("common.create", "Create")
                }}
              </UButton>
            </div>
          </div>
        </div>
      </template>
    </UModal>

    <!-- Delete Confirmation Modal -->
    <UModal v-model:open="showDeleteModal">
      <template #content>
        <div class="p-6 bg-white dark:bg-gray-900">
          <h3 class="text-lg font-semibold text-red-600 dark:text-red-400 mb-4">
            {{ $t("common.confirmDelete", "Confirm Delete") }}
          </h3>

          <p class="text-gray-600 dark:text-gray-400 mb-6">
            {{
              $t("common.deleteConfirmMessage", "Are you sure you want to delete")
            }}
            <strong class="text-gray-900 dark:text-white">
              "{{ deleteTarget?.item.name }}" </strong
            >?
            {{ $t("common.cannotUndo", "This action cannot be undone.") }}
          </p>

          <div class="flex gap-2">
            <UButton
              color="neutral"
              variant="outline"
              class="flex-1"
              @click="showDeleteModal = false"
            >
              {{ $t("common.cancel", "Cancel") }}
            </UButton>
            <UButton
              color="red"
              class="flex-1"
              :loading="deleting"
              @click="executeDelete"
            >
              {{ $t("common.delete", "Delete") }}
            </UButton>
          </div>
        </div>
      </template>
    </UModal>
  </div>
</template>

<script setup lang="ts">
import type { Category, Unit } from "~/types";

definePageMeta({
  title: "Product Settings",
  description: "Manage categories and units",
  layout: "default",
  middleware: ["auth"],
});

const productsStore = useProductsStore();
const toast = useToast();

// ============================================
// State
// ============================================
const activeTab = ref<"categories" | "units">("categories");

// Category Modal
const showCategoryModal = ref(false);
const editingCategory = ref<Category | null>(null);
const categoryForm = ref({
  name: "",
  description: "",
  icon: "📦",
});
const savingCategory = ref(false);

// Unit Modal
const showUnitModal = ref(false);
const editingUnit = ref<Unit | null>(null);
const unitForm = ref({
  name: "",
  symbol: "",
});
const savingUnit = ref(false);

// Delete confirmation
const showDeleteModal = ref(false);
const deleteTarget = ref<{
  type: "category" | "unit";
  item: Category | Unit;
} | null>(null);
const deleting = ref(false);

// Common icons for categories
const commonIcons = [
  "📦",
  "🍹",
  "🍜",
  "🍰",
  "🍿",
  "☕",
  "🍺",
  "🍔",
  "🍕",
  "🌮",
  "🍣",
  "🥗",
  "🍪",
  "🎂",
  "🍦",
  "🧃",
  "🥤",
  "🍵",
  "🛒",
  "⭐",
];

// ============================================
// Category Methods
// ============================================
const openCategoryModal = (category?: Category) => {
  if (category) {
    editingCategory.value = category;
    categoryForm.value = {
      name: category.name,
      description: category.description || "",
      icon: category.icon || "📦",
    };
  } else {
    editingCategory.value = null;
    categoryForm.value = {
      name: "",
      description: "",
      icon: "📦",
    };
  }
  showCategoryModal.value = true;
};

const saveCategory = async () => {
  if (!categoryForm.value.name.trim()) {
    toast.add({
      title: "Error",
      description: "Category name is required",
      color: "red",
      icon: "i-heroicons-exclamation-circle",
    });
    return;
  }

  savingCategory.value = true;
  try {
    if (editingCategory.value) {
      await productsStore.updateCategory(editingCategory.value.id, {
        name: categoryForm.value.name,
        description: categoryForm.value.description || undefined,
        icon: categoryForm.value.icon,
      });
      toast.add({
        title: "Success",
        description: "Category updated successfully",
        color: "green",
        icon: "i-heroicons-check-circle",
      });
    } else {
      await productsStore.addCategory({
        name: categoryForm.value.name,
        description: categoryForm.value.description || undefined,
        icon: categoryForm.value.icon,
      });
      toast.add({
        title: "Success",
        description: "Category created successfully",
        color: "green",
        icon: "i-heroicons-check-circle",
      });
    }
    showCategoryModal.value = false;
  } catch (error) {
    console.error("Error saving category:", error);
    toast.add({
      title: "Error",
      description: "Failed to save category",
      color: "red",
      icon: "i-heroicons-exclamation-circle",
    });
  } finally {
    savingCategory.value = false;
  }
};

// ============================================
// Unit Methods
// ============================================
const openUnitModal = (unit?: Unit) => {
  if (unit) {
    editingUnit.value = unit;
    unitForm.value = {
      name: unit.name,
      symbol: unit.symbol,
    };
  } else {
    editingUnit.value = null;
    unitForm.value = {
      name: "",
      symbol: "",
    };
  }
  showUnitModal.value = true;
};

const saveUnit = async () => {
  if (!unitForm.value.name.trim() || !unitForm.value.symbol.trim()) {
    toast.add({
      title: "Error",
      description: "Unit name and symbol are required",
      color: "red",
      icon: "i-heroicons-exclamation-circle",
    });
    return;
  }

  savingUnit.value = true;
  try {
    if (editingUnit.value) {
      await productsStore.updateUnit(editingUnit.value.id, {
        name: unitForm.value.name,
        symbol: unitForm.value.symbol,
      });
      toast.add({
        title: "Success",
        description: "Unit updated successfully",
        color: "green",
        icon: "i-heroicons-check-circle",
      });
    } else {
      await productsStore.addUnit({
        name: unitForm.value.name,
        symbol: unitForm.value.symbol,
      });
      toast.add({
        title: "Success",
        description: "Unit created successfully",
        color: "green",
        icon: "i-heroicons-check-circle",
      });
    }
    showUnitModal.value = false;
  } catch (error) {
    console.error("Error saving unit:", error);
    toast.add({
      title: "Error",
      description: "Failed to save unit",
      color: "red",
      icon: "i-heroicons-exclamation-circle",
    });
  } finally {
    savingUnit.value = false;
  }
};

// ============================================
// Delete Methods
// ============================================
const confirmDelete = (type: "category" | "unit", item: Category | Unit) => {
  // Don't allow deleting built-in items
  if (type === "category" && ["all", "favorites"].includes(item.id)) {
    toast.add({
      title: "Error",
      description: "Cannot delete built-in category",
      color: "red",
      icon: "i-heroicons-exclamation-circle",
    });
    return;
  }

  deleteTarget.value = { type, item };
  showDeleteModal.value = true;
};

const executeDelete = async () => {
  if (!deleteTarget.value) return;

  deleting.value = true;
  try {
    if (deleteTarget.value.type === "category") {
      const success = await productsStore.deleteCategory(
        deleteTarget.value.item.id
      );
      if (success) {
        toast.add({
          title: "Success",
          description: "Category deleted successfully",
          color: "green",
          icon: "i-heroicons-check-circle",
        });
      } else {
        toast.add({
          title: "Error",
          description: productsStore.error.value || "Failed to delete category",
          color: "red",
          icon: "i-heroicons-exclamation-circle",
        });
      }
    } else {
      // Delete unit
      toast.add({
        title: "Info",
        description: "Unit deletion not implemented yet",
        color: "blue",
        icon: "i-heroicons-information-circle",
      });
    }
    showDeleteModal.value = false;
  } finally {
    deleting.value = false;
    deleteTarget.value = null;
  }
};

// ============================================
// Lifecycle
// ============================================
onMounted(async () => {
  await productsStore.init();
});
</script>
