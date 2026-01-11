<!-- pages/settings/integrations.vue -->
<!-- Cloudinary and other integrations configuration -->
<script setup lang="ts">
definePageMeta({
  layout: "default",
  middleware: ["auth"],
});

const { t } = useI18n();
const toast = useToast();
const cloudinary = useCloudinary();

// Form state
const cloudinaryForm = ref({
  cloudName: "",
  uploadPreset: "",
  apiKey: "",
  folder: "",
  useOwnKey: false,
});

// Load existing config
onMounted(() => {
  const config = cloudinary.getConfig();
  if (config) {
    cloudinaryForm.value.cloudName = config.cloudName;
    cloudinaryForm.value.uploadPreset = config.uploadPreset;
    cloudinaryForm.value.apiKey = config.apiKey || "";
    cloudinaryForm.value.folder = config.folder || "";
    // Check if user has custom config (not using system default)
    const saved = localStorage.getItem("bitspace_cloudinary_config");
    cloudinaryForm.value.useOwnKey = !!saved;
  }
});

// Save config
function saveCloudinaryConfig() {
  if (!cloudinaryForm.value.useOwnKey) {
    cloudinary.clearConfig();
    toast.add({
      title: t("settings.integrations.saved", "Saved"),
      description:
        t("settings.integrations.usingSystemDefault", "Using system default configuration"),
      color: "success",
    });
  } else {
    if (!cloudinaryForm.value.cloudName || !cloudinaryForm.value.uploadPreset) {
      toast.add({
        title: t("common.error", "Error"),
        description:
          t("settings.integrations.fillRequired", "Please fill in Cloud Name and Upload Preset"),
        color: "error",
      });
      return;
    }

    cloudinary.saveConfig({
      cloudName: cloudinaryForm.value.cloudName,
      uploadPreset: cloudinaryForm.value.uploadPreset,
      apiKey: cloudinaryForm.value.apiKey || undefined,
      folder: cloudinaryForm.value.folder || undefined,
    });

    toast.add({
      title: t("settings.integrations.saved", "Saved"),
      description:
        t("settings.integrations.cloudinarySaved", "Cloudinary configuration saved"),
      color: "success",
    });
  }
}

// Test connection
const testing = ref(false);
async function testCloudinaryConnection() {
  testing.value = true;

  // Create a small test image
  const canvas = document.createElement("canvas");
  canvas.width = 10;
  canvas.height = 10;
  const ctx = canvas.getContext("2d");
  if (ctx) {
    ctx.fillStyle = "#ccc";
    ctx.fillRect(0, 0, 10, 10);
  }

  const dataUrl = canvas.toDataURL("image/png");
  const result = await cloudinary.uploadDataUrl(dataUrl);

  testing.value = false;

  if (result) {
    toast.add({
      title:
        t("settings.integrations.connectionSuccess", "Connection Successful"),
      description:
        t("settings.integrations.cloudinaryWorking", "Cloudinary is configured correctly"),
      color: "success",
    });
  } else {
    toast.add({
      title: t("settings.integrations.connectionFailed", "Connection Failed"),
      description: cloudinary.error.value || "Could not connect to Cloudinary",
      color: "error",
    });
  }
}

useHead({
  title: t("settings.integrations.title", "Integrations"),
});
</script>

<template>
  <div class="p-4 max-w-2xl mx-auto space-y-6">
    <!-- Header -->
    <div class="flex items-center gap-4 mb-6">
      <UButton
        color="neutral"
        variant="ghost"
        icon="i-heroicons-arrow-left"
        to="/settings"
      />
      <div>
        <h1 class="text-2xl font-bold text-gray-900 dark:text-white">
          {{ t("settings.integrations.title", "Integrations") }}
        </h1>
        <p class="text-sm text-gray-500">
          {{
            t("settings.integrations.subtitle", "Configure external services")
          }}
        </p>
      </div>
    </div>

    <!-- Cloudinary Configuration -->
    <div
      class="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 overflow-hidden"
    >
      <div
        class="px-6 py-4 border-b border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/50"
      >
        <div class="flex items-center gap-3">
          <div
            class="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center"
          >
            <UIcon name="i-heroicons-cloud" class="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <h3 class="font-semibold text-gray-900 dark:text-white">
              Cloudinary
            </h3>
            <p class="text-xs text-gray-500">
              {{
                t("settings.integrations.cloudinaryDesc", "Image hosting and optimization")
              }}
            </p>
          </div>
        </div>
      </div>

      <div class="p-6 space-y-4">
        <!-- Use Custom API Key Toggle -->
        <div
          class="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-xl"
        >
          <div>
            <p class="font-medium text-gray-900 dark:text-white">
              {{ t("settings.integrations.useOwnKey", "Use My Own API Key") }}
            </p>
            <p class="text-sm text-gray-500">
              {{
                t("settings.integrations.useOwnKeyDesc", "Configure your own Cloudinary account, or use system default")
              }}
            </p>
          </div>
          <UCheckbox v-model="cloudinaryForm.useOwnKey" />
        </div>

        <!-- Custom Configuration -->
        <div v-if="cloudinaryForm.useOwnKey" class="space-y-4">
          <!-- Instructions Banner -->
          <div
            class="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-200 dark:border-blue-800"
          >
            <div class="flex items-start gap-3">
              <UIcon
                name="i-heroicons-information-circle"
                class="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5"
              />
              <div class="space-y-2 text-sm">
                <p class="font-medium text-blue-900 dark:text-blue-100">
                  Setup Instructions:
                </p>
                <ol class="list-decimal list-inside space-y-1 text-blue-700 dark:text-blue-300">
                  <li>Go to <a href="https://console.cloudinary.com/settings/upload" target="_blank" class="underline hover:text-blue-800">Cloudinary Console → Settings → Upload</a></li>
                  <li>Click "Add upload preset" at the bottom</li>
                  <li>Set Signing Mode to <strong>"Unsigned"</strong></li>
                  <li>Set a Preset name (e.g., "bitspace_preset")</li>
                  <li>Save and copy the preset name below</li>
                  <li>Get your Cloud Name from <a href="https://console.cloudinary.com/settings/account" target="_blank" class="underline hover:text-blue-800">Settings → Account</a></li>
                </ol>
              </div>
            </div>
          </div>

          <UFormField label="Cloud Name" required>
            <UInput
              v-model="cloudinaryForm.cloudName"
              placeholder="doqyvdhvo"
              icon="i-heroicons-cloud"
              class="w-full"
            />
            <template #hint>
              <p class="text-xs text-gray-500">
                Found in your Cloudinary dashboard under Settings → Account
              </p>
            </template>
          </UFormField>

          <UFormField label="Upload Preset" required>
            <UInput
              v-model="cloudinaryForm.uploadPreset"
              placeholder="bitspace_preset"
              icon="i-heroicons-cog-6-tooth"
              class="w-full"
            />
            <template #hint>
              <p class="text-xs text-gray-500">
                Must be an <strong>unsigned</strong> upload preset. Create one in Settings → Upload → Add upload preset
              </p>
            </template>
          </UFormField>

          <UFormField label="API Key (Optional)">
            <UInput
              v-model="cloudinaryForm.apiKey"
              placeholder="123456789012345"
              icon="i-heroicons-key"
              type="password"
              class="w-full"
            />
            <template #hint>
              <p class="text-xs text-gray-500">
                Only needed for advanced features like deleting images
              </p>
            </template>

          <UFormField label="Default Folder (Optional)">
            <UInput
              v-model="cloudinaryForm.folder"
              placeholder="products"
              icon="i-heroicons-folder"
              class="w-full"
            />
            <template #hint>
              <p class="text-xs text-gray-500">
                Organize uploads into folders. E.g., "products", "avatars", "banners"
              </p>
            </template>
          </UFormField>
          </UFormField>

          <div
            class="flex items-center gap-2 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg"
          >
          </div>
        </div>

        <!-- Actions -->
        <div class="flex gap-3 pt-4">
          <UButton color="primary" @click="saveCloudinaryConfig">
            {{ t("common.save", "Save") }}
          </UButton>
          <UButton
            v-if="cloudinaryForm.useOwnKey"
            color="neutral"
            variant="outline"
            :loading="testing"
            @click="testCloudinaryConnection"
          >
            {{ t("settings.integrations.testConnection", "Test Connection") }}
          </UButton>
        </div>
      </div>
    </div>
  </div>
</template>
