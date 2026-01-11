<template>
  <div class="p-4 max-w-2xl mx-auto space-y-6 pb-24">
    <!-- Header -->
    <div class="flex items-center gap-3 mb-6">
      <UButton
        color="neutral"
        variant="ghost"
        icon="i-heroicons-arrow-left"
        @click="navigateTo('/settings')"
      />
      <div>
        <h1 class="text-xl font-bold text-gray-900 dark:text-white">
          {{ $t("settings.marketplace.title", "Marketplace") }}
        </h1>
        <p class="text-sm text-gray-500">
          {{
            $t("settings.marketplace.subtitle", "Store visibility & discovery")
          }}
        </p>
      </div>
    </div>

    <!-- Skeleton Loading State -->
    <template v-if="isLoading">
      <!-- Status banner skeleton -->
      <div class="p-4 rounded-xl border-2 border-gray-200 dark:border-gray-700">
        <div class="flex items-center gap-3">
          <USkeleton class="w-12 h-12 rounded-xl" />
          <div class="flex-1 space-y-2">
            <USkeleton class="h-5 w-24" />
            <USkeleton class="h-4 w-48" />
          </div>
          <USkeleton class="w-10 h-6 rounded-full" />
        </div>
      </div>

      <!-- Cards skeleton -->
      <div class="space-y-4">
        <div
          v-for="i in 4"
          :key="i"
          class="p-4 rounded-xl border border-gray-200 dark:border-gray-700"
        >
          <div class="flex items-center gap-2 mb-3">
            <USkeleton class="w-5 h-5" />
            <USkeleton class="h-5 w-32" />
          </div>
          <USkeleton class="h-10 w-full" />
        </div>
      </div>
    </template>

    <!-- Actual Content (when loaded) -->
    <template v-else>
      <!-- Current Status Banner -->
      <div
        class="p-4 rounded-xl border-2"
        :class="
          isPublic
            ? 'bg-green-50 dark:bg-green-900/20 border-green-300 dark:border-green-700'
            : 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700'
        "
      >
        <div class="flex items-center gap-3">
          <div
            class="w-12 h-12 rounded-xl flex items-center justify-center"
            :class="
              isPublic
                ? 'bg-green-100 dark:bg-green-800'
                : 'bg-gray-200 dark:bg-gray-700'
            "
          >
            <UIcon
              :name="
                isPublic ? 'i-heroicons-globe-alt' : 'i-heroicons-lock-closed'
              "
              class="w-6 h-6"
              :class="isPublic ? 'text-green-600' : 'text-gray-500'"
            />
          </div>
          <div class="flex-1">
            <h3
              class="font-semibold"
              :class="
                isPublic
                  ? 'text-green-800 dark:text-green-200'
                  : 'text-gray-900 dark:text-white'
              "
            >
              {{
                isPublic
                  ? $t("shop.setup.public", "Public")
                  : $t("shop.setup.private", "Private")
              }}
            </h3>
            <p
              class="text-sm"
              :class="
                isPublic
                  ? 'text-green-600 dark:text-green-400'
                  : 'text-gray-500'
              "
            >
              {{
                isPublic
                  ? $t("shop.setup.publicDesc")
                  : $t("shop.setup.privateDesc")
              }}
            </p>
          </div>
          <USwitch
            :model-value="isPublic"
            :loading="isSaving"
            @update:model-value="toggleVisibility"
          />
        </div>
      </div>

      <!-- Marketplace Fields (only if public) -->
      <div v-if="isPublic" class="space-y-4">
        <!-- Lightning Address -->
        <UCard>
          <template #header>
            <div class="flex items-center gap-2">
              <span class="text-xl">⚡</span>
              <span class="font-medium">{{
                $t("shop.marketplace.lud16", "Lightning Address")
              }}</span>
            </div>
          </template>
          <UInput
            v-model="formData.lud16"
            placeholder="shop@getalby.com"
            icon="i-heroicons-bolt"
            class="w-full"
          />
          <p class="text-xs text-gray-500 mt-2">
            {{ $t("shop.marketplace.lud16Hint") }}
          </p>
        </UCard>

        <!-- NIP-05 Verification -->
        <UCard>
          <template #header>
            <div class="flex items-center gap-2">
              <UIcon
                name="i-heroicons-check-badge"
                class="w-5 h-5 text-blue-500"
              />
              <span class="font-medium">{{
                $t("shop.marketplace.nip05", "Nostr Verification")
              }}</span>
            </div>
          </template>
          <UInput
            v-model="formData.nip05"
            placeholder="shop@bnos.space"
            icon="i-heroicons-check-badge"
            class="w-full"
          />
          <p class="text-xs text-gray-500 mt-2">
            {{ $t("shop.marketplace.nip05Hint") }}
          </p>
        </UCard>

        <!-- Description -->
        <UCard>
          <template #header>
            <div class="flex items-center gap-2">
              <UIcon
                name="i-heroicons-document-text"
                class="w-5 h-5 text-purple-500"
              />
              <span class="font-medium">{{
                $t("shop.marketplace.description", "Description")
              }}</span>
            </div>
          </template>
          <UTextarea
            v-model="formData.marketplaceDescription"
            :placeholder="$t('shop.marketplace.descriptionPlaceholder')"
            :rows="3"
            class="w-full"
          />
        </UCard>

        <!-- Services -->
        <UCard>
          <template #header>
            <div class="flex items-center gap-2">
              <UIcon
                name="i-heroicons-squares-2x2"
                class="w-5 h-5 text-teal-500"
              />
              <span class="font-medium">{{
                $t("shop.marketplace.services", "Services Offered")
              }}</span>
            </div>
          </template>
          <div class="flex flex-wrap gap-2">
            <button
              v-for="option in serviceOptions"
              :key="option.value"
              type="button"
              class="px-3 py-2 rounded-lg border-2 text-sm transition-all"
              :class="
                formData.services?.includes(option.value)
                  ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-300'
                  : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400'
              "
              @click="toggleService(option.value)"
            >
              {{ option.label }}
            </button>
          </div>
        </UCard>

        <!-- Location -->
        <UCard>
          <template #header>
            <div class="flex items-center gap-2">
              <UIcon name="i-heroicons-map-pin" class="w-5 h-5 text-red-500" />
              <span class="font-medium">{{
                $t("marketplace.location.title", "Location")
              }}</span>
            </div>
          </template>
          <div class="space-y-3">
            <UInput
              v-model="formData.address"
              :placeholder="$t('shop.addressPlaceholder', 'Street address')"
              icon="i-heroicons-map-pin"
              class="w-full"
            />
            <div class="grid grid-cols-2 gap-3">
              <UInput
                v-model="formData.city"
                :placeholder="$t('marketplace.location.city', 'City')"
              />
              <UInput
                v-model="formData.country"
                :placeholder="$t('marketplace.location.country', 'Country')"
              />
            </div>
            <div class="grid grid-cols-2 gap-3">
              <UInput
                v-model.number="formData.lat"
                type="number"
                step="0.000001"
                :placeholder="$t('marketplace.location.lat', 'Latitude')"
              />
              <UInput
                v-model.number="formData.lng"
                type="number"
                step="0.000001"
                :placeholder="$t('marketplace.location.lng', 'Longitude')"
              />
            </div>
            <UButton
              color="gray"
              variant="soft"
              icon="i-heroicons-map-pin"
              size="sm"
              @click="getCurrentLocation"
            >
              {{ $t("marketplace.location.detect", "Detect Current Location") }}
            </UButton>
          </div>
        </UCard>

        <!-- Business Hours -->
        <UCard>
          <template #header>
            <div class="flex items-center gap-2">
              <UIcon name="i-heroicons-clock" class="w-5 h-5 text-indigo-500" />
              <span class="font-medium">{{
                $t("marketplace.hours.title", "Business Hours")
              }}</span>
            </div>
          </template>
          <div class="space-y-3">
            <div
              class="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-800/50 rounded-lg"
            >
              <span class="text-sm text-gray-600 dark:text-gray-400">{{
                $t("marketplace.hours.applyAll", "Use same hours for all days")
              }}</span>
              <UButton
                color="gray"
                variant="soft"
                size="xs"
                @click="applyToAllDays"
                >{{ $t("common.apply") }}</UButton
              >
            </div>
            <div
              v-for="day in daysOfWeek"
              :key="day"
              class="flex items-center gap-3 p-2 border border-gray-200 dark:border-gray-700 rounded-lg"
            >
              <USwitch v-model="enabledDays[day]" size="sm" />
              <div class="flex-1">
                <p
                  class="text-sm font-medium text-gray-900 dark:text-white capitalize"
                >
                  {{ day }}
                </p>
              </div>
              <template v-if="enabledDays[day]">
                <UInput
                  v-model="formData.businessHours[day]!.open"
                  type="time"
                  size="sm"
                  class="w-28"
                />
                <span class="text-gray-400">—</span>
                <UInput
                  v-model="formData.businessHours[day]!.close"
                  type="time"
                  size="sm"
                  class="w-28"
                />
              </template>
              <span v-else class="text-sm text-gray-400">{{
                $t("marketplace.hours.closed", "Closed")
              }}</span>
            </div>
          </div>
        </UCard>

        <!-- Payment Methods -->
        <UCard>
          <template #header>
            <div class="flex items-center gap-2">
              <UIcon
                name="i-heroicons-credit-card"
                class="w-5 h-5 text-amber-500"
              />
              <span class="font-medium">{{
                $t("shop.marketplace.payments", "Payment Methods")
              }}</span>
            </div>
          </template>
          <div class="space-y-3">
            <div
              class="flex items-center justify-between p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg"
            >
              <div class="flex items-center gap-3">
                <span class="text-xl">⚡</span>
                <div>
                  <p class="font-medium text-sm">
                    {{ $t("shop.marketplace.lightning") }}
                  </p>
                  <p class="text-xs text-gray-500">
                    {{ $t("shop.marketplace.lightningDesc") }}
                  </p>
                </div>
              </div>
              <USwitch v-model="formData.acceptsLightning" />
            </div>

            <div
              class="flex items-center justify-between p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg"
            >
              <div class="flex items-center gap-3">
                <span class="text-xl">₿</span>
                <div>
                  <p class="font-medium text-sm">
                    {{ $t("shop.marketplace.bitcoin") }}
                  </p>
                  <p class="text-xs text-gray-500">
                    {{ $t("shop.marketplace.bitcoinDesc") }}
                  </p>
                </div>
              </div>
              <USwitch v-model="formData.acceptsBitcoin" />
            </div>
          </div>
        </UCard>

        <!-- Save Button -->
        <UButton
          color="primary"
          size="lg"
          block
          icon="i-heroicons-check"
          :loading="isSaving"
          @click="saveSettings"
        >
          {{ $t("common.save", "Save Changes") }}
        </UButton>
      </div>

      <!-- Go Public CTA (if private) -->
      <div v-else class="text-center py-8">
        <div
          class="w-20 h-20 mx-auto mb-4 bg-primary-100 dark:bg-primary-900/30 rounded-full flex items-center justify-center"
        >
          <UIcon
            name="i-heroicons-globe-alt"
            class="w-10 h-10 text-primary-600"
          />
        </div>
        <h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-2">
          {{ $t("settings.marketplace.goPublic", "Go Public!") }}
        </h3>
        <p class="text-gray-500 mb-6 max-w-sm mx-auto">
          {{ $t("settings.marketplace.goPublicDesc") }}
        </p>
        <UButton
          color="primary"
          size="lg"
          icon="i-heroicons-globe-alt"
          :loading="isSaving"
          @click="toggleVisibility(true)"
        >
          {{ $t("settings.marketplace.publishNow", "Publish to Marketplace") }}
        </UButton>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
definePageMeta({
  layout: "default",
  middleware: ["auth"],
});

const { t } = useI18n();
const toast = useToast();
const shop = useShop();

const isLoading = ref(true);
const isSaving = ref(false);

// Form data
const formData = ref({
  lud16: "",
  nip05: "",
  marketplaceDescription: "",
  services: [] as string[],
  acceptsLightning: true,
  acceptsBitcoin: false,
  address: "",
  city: "",
  country: "",
  lat: 0,
  lng: 0,
  businessHours: {
    monday: { open: "09:00", close: "18:00" },
    tuesday: { open: "09:00", close: "18:00" },
    wednesday: { open: "09:00", close: "18:00" },
    thursday: { open: "09:00", close: "18:00" },
    friday: { open: "09:00", close: "18:00" },
    saturday: { open: "09:00", close: "18:00" },
    sunday: { open: "09:00", close: "18:00" },
  },
});

// Days of week
const daysOfWeek = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
] as const;

// Enabled days
const enabledDays = ref<Record<string, boolean>>({
  monday: true,
  tuesday: true,
  wednesday: true,
  thursday: true,
  friday: true,
  saturday: true,
  sunday: true,
});

// Service options
const serviceOptions = [
  { value: "dine-in", label: "🍽️ Dine-in" },
  { value: "takeaway", label: "🥡 Takeaway" },
  { value: "delivery", label: "🚚 Delivery" },
  { value: "pickup", label: "📦 Pickup" },
  { value: "reservation", label: "📅 Reservation" },
];

// Computed
const isPublic = computed(() => shop.shopConfig.value?.visibility === "public");

// Methods
function toggleService(service: string) {
  if (!formData.value.services) {
    formData.value.services = [];
  }
  const index = formData.value.services.indexOf(service);
  if (index > -1) {
    formData.value.services.splice(index, 1);
  } else {
    formData.value.services.push(service);
  }
}

async function toggleVisibility(newValue: boolean) {
  isSaving.value = true;
  try {
    if (newValue) {
      await shop.publishToMarketplace();
      toast.add({
        title: t("settings.marketplace.published", "Published!"),
        description: t(
          "settings.marketplace.publishedDesc",
          "Your store is now discoverable"
        ),
        icon: "i-heroicons-check-circle",
        color: "success",
      });
    } else {
      await shop.unpublishFromMarketplace();
      toast.add({
        title: t("settings.marketplace.unpublished", "Private Mode"),
        description: t(
          "settings.marketplace.unpublishedDesc",
          "Your store is now private"
        ),
        icon: "i-heroicons-lock-closed",
        color: "neutral",
      });
    }
    await loadSettings();
  } catch (error) {
    toast.add({
      title: t("common.error"),
      description: String(error),
      color: "error",
    });
  } finally {
    isSaving.value = false;
  }
}

async function saveSettings() {
  isSaving.value = true;
  try {
    // Build geolocation
    const geolocation =
      formData.value.address || formData.value.lat
        ? {
            lat: formData.value.lat || 0,
            lng: formData.value.lng || 0,
            address: formData.value.address,
            city: formData.value.city,
            country: formData.value.country,
          }
        : undefined;

    // Build business hours (only enabled days)
    const businessHours: any = { timezone: "Asia/Vientiane" };
    daysOfWeek.forEach((day) => {
      if (enabledDays.value[day] && formData.value.businessHours[day]) {
        businessHours[day] = formData.value.businessHours[day];
      }
    });

    await shop.saveShopConfig({
      lud16: formData.value.lud16 || undefined,
      nip05: formData.value.nip05 || undefined,
      marketplaceDescription:
        formData.value.marketplaceDescription || undefined,
      services: formData.value.services,
      acceptsLightning: formData.value.acceptsLightning,
      acceptsBitcoin: formData.value.acceptsBitcoin,
      geolocation,
      businessHours:
        Object.keys(businessHours).length > 1 ? businessHours : undefined,
    });

    // If public, republish to marketplace to update Nostr event
    if (isPublic.value) {
      try {
        await shop.publishToMarketplace();
        console.log("[Marketplace Settings] Republished to Nostr marketplace");
      } catch (e) {
        console.warn("[Marketplace Settings] Failed to republish:", e);
        // Don't block save if republish fails
      }
    }

    toast.add({
      title: t("common.saved", "Saved!"),
      icon: "i-heroicons-check-circle",
      color: "success",
    });
  } catch (error) {
    toast.add({
      title: t("common.error"),
      description: String(error),
      color: "error",
    });
  } finally {
    isSaving.value = false;
  }
}

async function getCurrentLocation() {
  if (!navigator.geolocation) {
    toast.add({
      title: t("common.error"),
      description: "Geolocation not supported",
      color: "error",
    });
    return;
  }

  try {
    const position = await new Promise<GeolocationPosition>(
      (resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject);
      }
    );

    formData.value.lat = position.coords.latitude;
    formData.value.lng = position.coords.longitude;

    toast.add({
      title: t("common.success"),
      description: "Location detected",
      color: "success",
    });
  } catch (error) {
    toast.add({
      title: t("common.error"),
      description: "Failed to get location",
      color: "error",
    });
  }
}

function applyToAllDays() {
  // Get the template from Monday (or first enabled day)
  const template = {
    open: formData.value.businessHours.monday.open,
    close: formData.value.businessHours.monday.close,
  };

  // Apply to all days (create new objects to trigger reactivity)
  daysOfWeek.forEach((day) => {
    formData.value.businessHours[day] = {
      open: template.open,
      close: template.close,
    };
    // Also enable the day
    enabledDays.value[day] = true;
  });

  toast.add({
    title: t("common.success"),
    description: "Applied to all days",
    color: "success",
  });
}

function loadSettings() {
  const config = shop.shopConfig.value;

  if (config) {
    formData.value = {
      lud16: config.lud16 || "",
      nip05: config.nip05 || "",
      marketplaceDescription: config.marketplaceDescription || "",
      services: [...(config.services || [])],
      acceptsLightning: config.acceptsLightning ?? true,
      acceptsBitcoin: config.acceptsBitcoin ?? false,
      address: config.geolocation?.address || "",
      city: config.geolocation?.city || "",
      country: config.geolocation?.country || "",
      lat: config.geolocation?.lat || 0,
      lng: config.geolocation?.lng || 0,
      businessHours: {
        monday: config.businessHours?.monday || {
          open: "09:00",
          close: "18:00",
        },
        tuesday: config.businessHours?.tuesday || {
          open: "09:00",
          close: "18:00",
        },
        wednesday: config.businessHours?.wednesday || {
          open: "09:00",
          close: "18:00",
        },
        thursday: config.businessHours?.thursday || {
          open: "09:00",
          close: "18:00",
        },
        friday: config.businessHours?.friday || {
          open: "09:00",
          close: "18:00",
        },
        saturday: config.businessHours?.saturday || {
          open: "09:00",
          close: "18:00",
        },
        sunday: config.businessHours?.sunday || {
          open: "09:00",
          close: "18:00",
        },
      },
    };

    // Update enabled days
    daysOfWeek.forEach((day) => {
      enabledDays.value[day] = !!config.businessHours?.[day];
    });
  }
}

// Initialize
onMounted(async () => {
  // Ensure shop config is loaded
  await shop.init();
  loadSettings();
  isLoading.value = false;
});

useHead({
  title: t("settings.marketplace.title", "Marketplace Settings"),
});
</script>
