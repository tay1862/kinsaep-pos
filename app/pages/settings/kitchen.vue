<!-- pages/settings/kitchen.vue -->
<!-- 🍳 Kitchen Display System Settings -->
<script setup lang="ts">
import { useKitchenStations } from "~/composables/use-kitchen-stations";
import { useProductsStore } from "~/composables/use-products";
import type { StationRecord } from "~/db/db";

definePageMeta({
  middleware: ["auth"],
});

useHead({
  title: "Kitchen Settings",
});

const { t } = useI18n();
const toast = useToast();
const store = useKitchenStations();
const productStore = useProductsStore();

const isModalOpen = ref(false);
const editingStation = ref<Partial<StationRecord>>({});
const isSaving = ref(false);

// Initialize
onMounted(async () => {
  await store.loadStations();
  if (productStore.categories.value.length === 0) {
    await productStore.init();
  }
});

// Stations Management
async function saveStation() {
  if (!editingStation.value.name) return;

  isSaving.value = true;
  try {
    if (editingStation.value.id) {
      await store.updateStation(editingStation.value.id, editingStation.value);
    } else {
      await store.addStation(editingStation.value);
    }
    isModalOpen.value = false;
    toast.add({ title: t("common.saved", "Saved successfully") });
  } catch (e) {
    toast.add({ title: "Error", description: String(e), color: "error" });
  } finally {
    isSaving.value = false;
  }
}

function openAdd() {
  editingStation.value = { isDefault: false };
  isModalOpen.value = true;
}

function openEdit(station: StationRecord) {
  editingStation.value = { ...station };
  isModalOpen.value = true;
}

async function deleteStation(id: string) {
  if (!confirm(t("common.confirmDelete", "Are you sure?"))) return;
  await store.deleteStation(id);
}

// Category Mapping
const updatingCategory = ref<string | null>(null);

async function updateCategoryStation(categoryId: string, stationId: string) {
  updatingCategory.value = categoryId;
  try {
    const category = productStore.categories.value.find((c) => c.id === categoryId);
    if (category) {
      // Update local state and DB via store
      // We need to implement updateCategory in useProducts or simulate it
      // Since useProducts has no generic updateCategory, we use saveCategoryToLocal logic effectively
      // But wait, category object in store is reactive?
      // Best way is to use a direct update method if available or DB direct + refresh
      
      // Let's modify the category object directly (it's a ref in store) and call a save method
      // Or extend products store to support updating category metadata
      
      // For now, assuming we can just modify the property and call saveCategoryToLocal if it was exposed
      // Since it's private in composable, we might need to expose a method.
      // BUT: We can use db directly since we are in a high-level page component and importing db is allowed,
      // OR better, allow useProducts to update category.
      
      // I'll call a quick DB update here for now as a workaround since extending useProducts again is extra steps
      // Detailed plan said: "Modify use-products.ts: Update saveCategoryToLocal to persist stationId"
      // It didn't mention adding updateCategory method.
      
      // Let's verify if I can import db here. Yes.
      // But purely relying on store is better.
      // Re-checking useProducts code... `categories` is a Ref.
      // I'll modify db directly for persistent storage and update store Ref for UI.
      
      const { db } = await import("~/db/db");
      
      // Update DB
      await db.categories.update(categoryId, { stationId, synced: false });
      
      // Update Store Ref
      category.stationId = stationId;
      
      toast.add({ title: t("common.saved", "Saved") });
    }
  } catch (e) {
    toast.add({ title: "Error", description: String(e), color: "error" });
  } finally {
    updatingCategory.value = null;
  }
}

const columns = [
  { key: "name", label: "Station Name" },
  { key: "type", label: "Type" },
  { key: "actions", label: "" },
];

const stationOptions = computed(() => [
    { label: 'None', value: '' }, // Option to unassign
    ...store.stations.map(s => ({ label: s.name, value: s.id }))
]);
</script>

<template>
  <div class="p-4 lg:p-6 space-y-6 max-w-5xl mx-auto">
    <!-- Header -->
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <UIcon name="i-heroicons-fire" class="w-8 h-8 text-primary-500" />
          {{ t("settings.kitchen.title", "Kitchen Stations") }}
        </h1>
        <p class="text-gray-500 dark:text-gray-400">
          {{ t("settings.kitchen.subtitle", "Manage prep stations and route categories") }}
        </p>
      </div>
      <UButton icon="i-heroicons-plus" color="primary" @click="openAdd">
        {{ t("common.add", "Add Station") }}
      </UButton>
    </div>

    <!-- Stations List -->
    <UCard>
      <template #header>
        <h3 class="font-semibold">{{ t("settings.kitchen.stations", "Preparation Stations") }}</h3>
      </template>

      <UTable :rows="store.stations" :columns="columns">
        <template #name-data="{ row }">
          <div class="flex items-center gap-3">
             <div class="p-2 bg-gray-100 dark:bg-gray-800 rounded-lg">
                <UIcon name="i-heroicons-printer" class="w-5 h-5 text-gray-500" />
             </div>
             <div>
               <p class="font-medium text-gray-900 dark:text-white">{{ row.name }}</p>
               <p class="text-xs text-gray-500">{{ row.description }}</p>
             </div>
          </div>
        </template>
        
         <template #type-data="{ row }">
            <UBadge v-if="row.isDefault" color="green" variant="subtle">Default</UBadge>
            <span v-else class="text-gray-500 text-sm">Auxiliary</span>
         </template>

        <template #actions-data="{ row }">
          <div class="flex items-center justify-end gap-2">
            <UButton color="gray" variant="ghost" icon="i-heroicons-pencil-square" @click="openEdit(row)" />
            <UButton color="red" variant="ghost" icon="i-heroicons-trash" @click="deleteStation(row.id)" />
          </div>
        </template>
      </UTable>
    </UCard>

    <!-- Category Routing -->
    <UCard>
      <template #header>
        <h3 class="font-semibold">{{ t("settings.kitchen.routing", "Category Routing") }}</h3>
      </template>
      
      <div class="space-y-4">
        <p class="text-sm text-gray-500">
            Assign entire categories to specific stations. Items in these categories will only appear on their assigned station's display.
        </p>
        
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div v-for="category in productStore.categories.value" :key="category.id" 
                class="p-4 border rounded-xl flex items-center justify-between dark:border-gray-700 bg-white dark:bg-gray-900">
                <div class="flex items-center gap-3">
                    <span class="text-2xl">{{ category.icon || '📦' }}</span>
                    <div>
                        <p class="font-medium">{{ category.name }}</p>
                        <p class="text-xs text-gray-500">{{ category.description }}</p>
                    </div>
                </div>
                
                <div class="w-48">
                    <USelectMenu
                        :model-value="category.stationId || ''"
                        :options="stationOptions"
                        placeholder="Select Station"
                        value-attribute="value"
                        option-attribute="label"
                        @update:model-value="(val) => updateCategoryStation(category.id, val)"
                    />
                </div>
            </div>
        </div>
      </div>
    </UCard>

    <!-- Modal -->
    <UModal v-model="isModalOpen">
      <div class="p-6 space-y-4">
        <h3 class="text-lg font-bold">
          {{ editingStation.id ? "Edit Station" : "New Station" }}
        </h3>
        
        <UFormGroup label="Name" required>
          <UInput v-model="editingStation.name" placeholder="e.g. Bar, Grill, Sushi Bar" autofocus />
        </UFormGroup>
        
        <UFormGroup label="Description">
          <UInput v-model="editingStation.description" placeholder="Optional description" />
        </UFormGroup>
        
        <div class="flex items-center justify-between py-2">
             <span class="text-sm font-medium">Default Station</span>
             <UToggle v-model="editingStation.isDefault" />
        </div>
        <p class="text-xs text-gray-500 -mt-2">Items without a specific station category will appear here.</p>

        <div class="flex justify-end gap-2 mt-6">
          <UButton color="gray" variant="soft" @click="isModalOpen = false">Cancel</UButton>
          <UButton color="primary" :loading="isSaving" @click="saveStation">Save</UButton>
        </div>
      </div>
    </UModal>
  </div>
</template>
