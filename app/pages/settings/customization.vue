<template>
  <UContainer>
    <CommonPageHeader
      :title="$t('settings.customization.title')"
      :description="$t('settings.customization.description')"
    />

    <!-- Feed Display Settings -->
    <UCard class="mb-6">
      <template #header>
        <h3 class="font-semibold flex items-center gap-2">
          <UIcon name="i-heroicons-list-bullet" class="text-primary" />
          {{ $t('settings.customization.feedDisplay') }}
        </h3>
      </template>

      <div class="space-y-6">
        <!-- Default View -->
        <UFormField :label="$t('settings.customization.defaultView')">
          <div class="flex gap-2">
            <UButton
              v-for="view in viewOptions"
              :key="view.value"
              :variant="defaultView === view.value ? 'solid' : 'outline'"
              :color="defaultView === view.value ? 'primary' : 'neutral'"
              size="sm"
              @click="setDefaultView(view.value)"
            >
              <UIcon :name="view.icon" class="mr-1" />
              {{ view.label }}
            </UButton>
          </div>
        </UFormField>

        <!-- Content Toggles -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div class="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <div>
              <p class="font-medium text-gray-900 dark:text-white">
                {{ $t('settings.customization.showReposts') }}
              </p>
            </div>
            <USwitch v-model="showReposts" @change="saveSettings" />
          </div>

          <div class="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <div>
              <p class="font-medium text-gray-900 dark:text-white">
                {{ $t('settings.customization.showReplies') }}
              </p>
            </div>
            <USwitch v-model="showReplies" @change="saveSettings" />
          </div>
        </div>

        <!-- Content Density -->
        <UFormField :label="$t('settings.customization.contentDensity')">
          <div class="flex gap-2">
            <UButton
              v-for="density in densityOptions"
              :key="density.value"
              :variant="contentDensity === density.value ? 'solid' : 'outline'"
              :color="contentDensity === density.value ? 'primary' : 'neutral'"
              size="sm"
              @click="setContentDensity(density.value)"
            >
              {{ density.label }}
            </UButton>
          </div>
        </UFormField>
      </div>
    </UCard>

    <!-- UI Preferences -->
    <UCard class="mb-6">
      <template #header>
        <h3 class="font-semibold flex items-center gap-2">
          <UIcon name="i-heroicons-adjustments-horizontal" class="text-primary" />
          {{ $t('settings.customization.uiPreferences') }}
        </h3>
      </template>

      <div class="space-y-6">
        <!-- Animation Speed -->
        <UFormField :label="$t('settings.customization.animationSpeed')">
          <div class="flex gap-2">
            <UButton
              v-for="speed in animationSpeeds"
              :key="speed.value"
              :variant="animationSpeed === speed.value ? 'solid' : 'outline'"
              :color="animationSpeed === speed.value ? 'primary' : 'neutral'"
              size="sm"
              @click="setAnimationSpeed(speed.value)"
            >
              {{ speed.label }}
            </UButton>
          </div>
        </UFormField>

        <!-- Toggle Preferences -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div class="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <div>
              <p class="font-medium text-gray-900 dark:text-white">
                {{ $t('settings.customization.hapticFeedback') }}
              </p>
            </div>
            <USwitch v-model="hapticFeedback" @change="saveSettings" />
          </div>

          <div class="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <div>
              <p class="font-medium text-gray-900 dark:text-white">
                {{ $t('settings.customization.autoPlayMedia') }}
              </p>
            </div>
            <USwitch v-model="autoPlayMedia" @change="saveSettings" />
          </div>
        </div>

        <!-- Image Quality -->
        <UFormField :label="$t('settings.customization.imageQuality')">
          <div class="flex gap-2">
            <UButton
              v-for="quality in imageQualities"
              :key="quality.value"
              :variant="imageQuality === quality.value ? 'solid' : 'outline'"
              :color="imageQuality === quality.value ? 'primary' : 'neutral'"
              size="sm"
              @click="setImageQuality(quality.value)"
            >
              {{ quality.label }}
            </UButton>
          </div>
        </UFormField>
      </div>
    </UCard>

    <!-- POS Settings -->
    <UCard class="mb-6">
      <template #header>
        <h3 class="font-semibold flex items-center gap-2">
          <UIcon name="i-heroicons-shopping-cart" class="text-primary" />
          {{ $t('settings.customization.posSettings') }}
        </h3>
      </template>

      <div class="space-y-6">
        <!-- Product Grid Columns -->
        <UFormField :label="$t('settings.customization.gridColumns')">
          <div class="flex gap-2">
            <UButton
              v-for="col in gridColumnOptions"
              :key="col"
              :variant="gridColumns === col ? 'solid' : 'outline'"
              :color="gridColumns === col ? 'primary' : 'neutral'"
              size="sm"
              @click="setGridColumns(col)"
            >
              {{ col }}
            </UButton>
          </div>
        </UFormField>

        <!-- Cart Position -->
        <UFormField :label="$t('settings.customization.cartPosition')">
          <div class="flex gap-2">
            <UButton
              :variant="cartPosition === 'right' ? 'solid' : 'outline'"
              :color="cartPosition === 'right' ? 'primary' : 'neutral'"
              size="sm"
              @click="setCartPosition('right')"
            >
              <UIcon name="i-heroicons-arrow-right" class="mr-1" />
              {{ $t('settings.appearance.right') }}
            </UButton>
            <UButton
              :variant="cartPosition === 'left' ? 'solid' : 'outline'"
              :color="cartPosition === 'left' ? 'primary' : 'neutral'"
              size="sm"
              @click="setCartPosition('left')"
            >
              <UIcon name="i-heroicons-arrow-left" class="mr-1" />
              {{ $t('settings.appearance.left') }}
            </UButton>
            <UButton
              :variant="cartPosition === 'bottom' ? 'solid' : 'outline'"
              :color="cartPosition === 'bottom' ? 'primary' : 'neutral'"
              size="sm"
              @click="setCartPosition('bottom')"
            >
              <UIcon name="i-heroicons-arrow-down" class="mr-1" />
              Bottom
            </UButton>
          </div>
        </UFormField>

        <!-- Quick Actions -->
        <div>
          <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            {{ $t('settings.customization.quickActions') }}
          </label>
          <div class="flex flex-wrap gap-2">
            <UBadge
              v-for="action in quickActions"
              :key="action.id"
              :color="action.enabled ? 'primary' : 'neutral'"
              :variant="action.enabled ? 'solid' : 'outline'"
              class="cursor-pointer"
              @click="toggleQuickAction(action.id)"
            >
              <UIcon :name="action.icon" class="mr-1" />
              {{ action.label }}
            </UBadge>
          </div>
        </div>
      </div>
    </UCard>

    <!-- Save Button -->
    <div class="flex justify-end">
      <UButton color="primary" :loading="saving" @click="saveSettings">
        <UIcon name="i-heroicons-check" class="mr-1" />
        {{ $t('common.save') }}
      </UButton>
    </div>
  </UContainer>
</template>

<script setup lang="ts">
definePageMeta({
  layout: 'default',
  middleware: ['auth'],
});

const { t } = useI18n();
const toast = useToast();
const nostrData = useNostrData();

// State
const saving = ref(false);
const defaultView = ref('grid');
const showReposts = ref(true);
const showReplies = ref(true);
const contentDensity = ref('normal');
const animationSpeed = ref('normal');
const hapticFeedback = ref(true);
const autoPlayMedia = ref(false);
const imageQuality = ref('high');
const gridColumns = ref(4);
const cartPosition = ref<'left' | 'right' | 'bottom'>('right');

// Quick actions configuration
const quickActions = ref([
  { id: 'discount', label: 'Discount', icon: 'i-heroicons-receipt-percent', enabled: true },
  { id: 'holdOrder', label: 'Hold Order', icon: 'i-heroicons-pause', enabled: true },
  { id: 'splitBill', label: 'Split Bill', icon: 'i-heroicons-scissors', enabled: false },
  { id: 'printReceipt', label: 'Print', icon: 'i-heroicons-printer', enabled: true },
  { id: 'clearCart', label: 'Clear', icon: 'i-heroicons-trash', enabled: true },
]);

// Options
const viewOptions = computed(() => [
  { value: 'timeline', label: t('settings.customization.timeline'), icon: 'i-heroicons-list-bullet' },
  { value: 'grid', label: t('settings.customization.grid'), icon: 'i-heroicons-squares-2x2' },
  { value: 'compact', label: t('settings.customization.compact'), icon: 'i-heroicons-bars-3' },
]);

const densityOptions = computed(() => [
  { value: 'compact', label: t('settings.customization.compact') },
  { value: 'normal', label: t('settings.customization.normal') },
  { value: 'comfortable', label: 'Comfortable' },
]);

const animationSpeeds = computed(() => [
  { value: 'fast', label: t('settings.customization.fast') },
  { value: 'normal', label: t('settings.customization.normal') },
  { value: 'slow', label: t('settings.customization.slow') },
]);

const imageQualities = computed(() => [
  { value: 'low', label: t('settings.customization.low') },
  { value: 'medium', label: t('settings.customization.medium') },
  { value: 'high', label: t('settings.customization.high') },
]);

const gridColumnOptions = [2, 3, 4, 5, 6];

// Methods
function setDefaultView(view: string) {
  defaultView.value = view;
  saveSettings();
}

function setContentDensity(density: string) {
  contentDensity.value = density;
  saveSettings();
}

function setAnimationSpeed(speed: string) {
  animationSpeed.value = speed;
  saveSettings();
}

function setImageQuality(quality: string) {
  imageQuality.value = quality;
  saveSettings();
}

function setGridColumns(cols: number) {
  gridColumns.value = cols;
  saveSettings();
}

function setCartPosition(position: 'left' | 'right' | 'bottom') {
  cartPosition.value = position;
  saveSettings();
}

function toggleQuickAction(id: string) {
  const action = quickActions.value.find((a) => a.id === id);
  if (action) {
    action.enabled = !action.enabled;
    saveSettings();
  }
}

async function saveSettings() {
  saving.value = true;
  try {
    const customizationSettings = {
      defaultView: defaultView.value,
      showReposts: showReposts.value,
      showReplies: showReplies.value,
      contentDensity: contentDensity.value,
      animationSpeed: animationSpeed.value,
      hapticFeedback: hapticFeedback.value,
      autoPlayMedia: autoPlayMedia.value,
      imageQuality: imageQuality.value,
      gridColumns: gridColumns.value,
      cartPosition: cartPosition.value,
      quickActions: quickActions.value,
    };

    // Save to localStorage
    localStorage.setItem('customization', JSON.stringify(customizationSettings));

    // Save to Nostr for cross-device sync
    const settings = await nostrData.getSettings();
    if (settings) {
      settings.customization = customizationSettings;
      await nostrData.saveSettings(settings);
    }

    toast.add({
      title: t('common.success'),
      description: t('settings.customization.saved'),
      color: 'success',
    });
  } catch (error) {
    console.error('Failed to save customization settings:', error);
    toast.add({
      title: t('common.error'),
      description: t('common.error'),
      color: 'error',
    });
  } finally {
    saving.value = false;
  }
}

async function loadSettings() {
  try {
    // First try localStorage
    const localSettings = localStorage.getItem('customization');
    if (localSettings) {
      applySettings(JSON.parse(localSettings));
    }

    // Then try Nostr
    const nostrSettings = await nostrData.getSettings();
    if (nostrSettings?.customization) {
      applySettings(nostrSettings.customization);
    }
  } catch (error) {
    console.error('Failed to load customization settings:', error);
  }
}

function applySettings(settings: Record<string, unknown>) {
  if (settings.defaultView) defaultView.value = settings.defaultView as string;
  if (typeof settings.showReposts === 'boolean') showReposts.value = settings.showReposts;
  if (typeof settings.showReplies === 'boolean') showReplies.value = settings.showReplies;
  if (settings.contentDensity) contentDensity.value = settings.contentDensity as string;
  if (settings.animationSpeed) animationSpeed.value = settings.animationSpeed as string;
  if (typeof settings.hapticFeedback === 'boolean') hapticFeedback.value = settings.hapticFeedback;
  if (typeof settings.autoPlayMedia === 'boolean') autoPlayMedia.value = settings.autoPlayMedia;
  if (settings.imageQuality) imageQuality.value = settings.imageQuality as string;
  if (typeof settings.gridColumns === 'number') gridColumns.value = settings.gridColumns;
  if (settings.cartPosition) cartPosition.value = settings.cartPosition as 'left' | 'right' | 'bottom';
  if (Array.isArray(settings.quickActions)) {
    quickActions.value = settings.quickActions as typeof quickActions.value;
  }
}

// Initialize
onMounted(() => {
  loadSettings();
});

// Set page title
useHead({
  title: t('settings.customization.title'),
});
</script>
