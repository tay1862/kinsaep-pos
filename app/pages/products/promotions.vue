<template>
  <div class="space-y-6">
    <!-- Header -->
    <div
      class="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 px-4"
    >
      <div>
        <h1
          class="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white"
        >
          {{ $t("promotions.title", "Promotions") }}
          <span class="text-gray-500 dark:text-gray-400"
            >({{ promotionsStore.promotions.value.length }})</span
          >
        </h1>
        <p class="text-sm sm:text-base text-gray-600 dark:text-gray-400 mt-1">
          {{
            $t(
              "promotions.subtitle",
              "Manage BOGO and promotional offers for products"
            )
          }}
        </p>
      </div>
      <div class="flex items-center gap-2">
        <UButton
          color="primary"
          class="text-sm sm:text-base"
          icon="i-heroicons-plus"
          block
          @click="showCreateModal = true"
        >
          <span class="sm:inline">{{ $t("common.add") }}</span>
        </UButton>
      </div>
    </div>

    <!-- Stats Cards -->
    <ProductsPromotionStatsCards
      :promotions="promotionsStore.promotions.value as Promotion[]"
      :is-loading="promotionsStore.isLoading.value"
    />

    <!-- Table -->
    <ProductsPromotionTable
      :promotions="promotionsStore.promotions.value as Promotion[]"
      :is-loading="isProcessing"
      @toggle-status="handleToggleStatus"
      @delete="handleDelete"
      @view-details="handleViewDetails"
      @create="handleCreateFromTable"
    />

    <!-- Create Modal -->
    <ProductsPromotionForm
      v-model="showCreateModal"
      :is-loading="isProcessing"
      @submit="handleCreatePromotion"
    />

    <!-- Delete Confirmation Modal -->
    <ProductsPromotionDeleteModal
      v-model="showDeleteModal"
      :promotion="selectedPromotion"
      :is-loading="isProcessing"
      @confirm="handleDeleteConfirm"
    />

    <!-- Details Modal -->
    <ProductsPromotionDetailsModal
      v-model="showDetailsModal"
      :promotion="selectedPromotion"
    />
  </div>
</template>

<script setup lang="ts">
import type { Promotion } from "~/types";

useHead({
  title: "Promotions",
});

const { t } = useI18n();
const toast = useToast();
const promotionsStore = usePromotionsStore();
const productsStore = useProducts();

// Form composable
const {
  resetForm,
  validateForm,
  showValidationError,
  prepareSubmissionData,
  setLoading,
} = usePromotionForm();

// UI State
const showCreateModal = ref(false);
const showDeleteModal = ref(false);
const showDetailsModal = ref(false);
const selectedPromotion = ref<Promotion | null>(null);
const isProcessing = ref(false);

// Initialize stores
onMounted(async () => {
  await Promise.all([promotionsStore.init(), productsStore.init()]);
});

// Event handlers
async function handleCreateFromTable() {
  showCreateModal.value = true;
}

async function handleCreatePromotion() {
  const validation = validateForm();

  if (!validation.isValid) {
    showValidationError(validation.errors);
    return;
  }

  isProcessing.value = true;
  setLoading(true);

  try {
    const submissionData = prepareSubmissionData();
    await promotionsStore.addPromotion(submissionData);

    showCreateModal.value = false;
    resetForm();
  } catch (error) {
    console.error("Failed to create promotion:", error);
    toast.add({
      title: t("common.error"),
      description: String(error),
      color: "red",
    });
  } finally {
    isProcessing.value = false;
    setLoading(false);
  }
}

async function handleToggleStatus(promotion: Promotion) {
  isProcessing.value = true;

  try {
    const newStatus = promotion.status === "active" ? "inactive" : "active";
    await promotionsStore.updatePromotion(promotion.id, { status: newStatus });

    toast.add({
      title: t("promotions.statusUpdated", "Status Updated"),
      description: t(
        "promotions.statusUpdatedDesc",
        `Promotion status changed to ${newStatus}`
      ),
      color: "success",
    });
  } catch (error) {
    console.error("Failed to toggle promotion status:", error);
    toast.add({
      title: t("common.error"),
      description: String(error),
      color: "red",
    });
  } finally {
    isProcessing.value = false;
  }
}

async function handleDelete(promotion: Promotion) {
  selectedPromotion.value = promotion;
  showDeleteModal.value = true;
}

async function handleViewDetails(promotion: Promotion) {
  selectedPromotion.value = promotion;
  showDetailsModal.value = true;
}

async function handleDeleteConfirm(promotion: Promotion) {
  isProcessing.value = true;

  try {
    await promotionsStore.deletePromotion(promotion.id);

    showDeleteModal.value = false;
    selectedPromotion.value = null;

    toast.add({
      title: t("promotions.deleteSuccess", "Promotion Deleted"),
      description: t(
        "promotions.deleteSuccessDesc",
        `Promotion "${promotion.name}" has been deleted`
      ),
      color: "success",
    });
  } catch (error) {
    console.error("Failed to delete promotion:", error);
    toast.add({
      title: t("common.error"),
      description: String(error),
      color: "red",
    });
  } finally {
    isProcessing.value = false;
  }
}
</script>
