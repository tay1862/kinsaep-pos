<!-- components/products/FormCardImage.vue -->
<!-- Product Image Form Card with Cloudinary Upload -->
<script setup lang="ts">
const { t } = useI18n();
const cloudinary = useCloudinary();

interface FormData {
  image: string;
}

interface Props {
  emojis?: string[];
}

const props = withDefaults(defineProps<Props>(), {
  emojis: () => [
    "📦",
    "🍕",
    "🍔",
    "🍟",
    "🌮",
    "🌯",
    "🥗",
    "🍜",
    "🍝",
    "🍣",
    "🍱",
    "🍛",
    "🍲",
    "🥘",
    "🍳",
    "🥚",
    "🥞",
    "🧇",
    "🥐",
    "🍞",
    "🥖",
    "🧀",
    "🥩",
    "🍗",
    "🍖",
    "🌭",
    "🥪",
    "🥙",
    "🧆",
    "🍿",
    "🥜",
    "☕",
    "🍵",
    "🥤",
    "🧃",
    "🧋",
    "🍺",
    "🍷",
    "🥂",
    "🍹",
    "🍦",
    "🍧",
    "🍨",
    "🎂",
    "🍰",
    "🧁",
    "🍩",
    "🍪",
    "🍫",
    "🍬",
  ],
});

const form = defineModel<FormData>({ required: true });

const emojiOptions = computed(() => props.emojis);
const imageUrlInput = ref("");
const customEmojiInput = ref("");
const isDragging = ref(false);
const fileInput = ref<HTMLInputElement | null>(null);

// Check if Cloudinary is configured
const isCloudinaryConfigured = computed(() => cloudinary.isConfigured());

watch(
  () => form.value.image,
  (newVal) => {
    if (newVal?.startsWith("http")) {
      imageUrlInput.value = newVal;
      customEmojiInput.value = "";
    } else if (newVal) {
      customEmojiInput.value = newVal;
      imageUrlInput.value = "";
    }
  },
  { immediate: true }
);

function handleCustomEmojiUpdate(val: string) {
  if (val) {
    form.value.image = val;
    imageUrlInput.value = "";
  }
}

function selectEmoji(emoji: string) {
  form.value.image = emoji;
  imageUrlInput.value = "";
}

const previewImage = computed(() => {
  if (form.value.image?.startsWith("http")) return form.value.image;
  return null;
});

const selectedEmoji = computed(() => {
  return form.value.image && !form.value.image.startsWith("http")
    ? form.value.image
    : "";
});

// File upload handlers
function triggerFileInput() {
  fileInput.value?.click();
}

async function handleFileSelect(event: Event) {
  const input = event.target as HTMLInputElement;
  if (input.files?.[0]) {
    await uploadFile(input.files[0]);
  }
}

async function handleDrop(event: DragEvent) {
  isDragging.value = false;
  const file = event.dataTransfer?.files[0];
  if (file && file.type.startsWith("image/")) {
    await uploadFile(file);
  }
}

async function uploadFile(file: File) {
  const result = await cloudinary.uploadImage(file);
  if (result) {
    form.value.image = result.url;
    imageUrlInput.value = result.url;
  }
}

function handleDragOver(event: DragEvent) {
  event.preventDefault();
  isDragging.value = true;
}

function handleDragLeave() {
  isDragging.value = false;
}
</script>

<template>
  <div
    class="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden"
  >
    <!-- Header -->
    <div
      class="px-6 py-4 border-b border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/50"
    >
      <div class="flex items-center gap-3">
        <div
          class="w-10 h-10 rounded-xl bg-pink-100 dark:bg-pink-900/30 flex items-center justify-center"
        >
          <UIcon
            name="i-heroicons-photo"
            class="w-5 h-5 text-pink-600 dark:text-pink-400"
          />
        </div>
        <div>
          <h3 class="font-semibold text-gray-900 dark:text-white">
            {{ t("products.image", "Product Image") }}
          </h3>
          <p class="text-xs text-gray-500">
            {{
              t(
                "products.imageHint",
                "Upload image, enter URL, or select emoji"
              )
            }}
          </p>
        </div>
      </div>
    </div>

    <!-- Content -->
    <div class="p-6 space-y-4">
      <!-- Image Preview / Upload Zone -->
      <div class="flex justify-center">
        <div
          class="w-32 h-32 rounded-2xl border-2 border-dashed flex items-center justify-center overflow-hidden transition-all cursor-pointer"
          :class="[
            isDragging
              ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
              : 'border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 hover:border-primary-400',
            cloudinary.isUploading.value && 'opacity-60',
          ]"
          @click="triggerFileInput"
          @drop.prevent="handleDrop"
          @dragover="handleDragOver"
          @dragleave="handleDragLeave"
        >
          <!-- Uploading state -->
          <div v-if="cloudinary.isUploading.value" class="text-center">
            <UIcon
              name="i-heroicons-arrow-path"
              class="w-8 h-8 text-primary-500 animate-spin"
            />
            <p class="text-xs text-gray-500 mt-1">Uploading...</p>
          </div>

          <!-- Preview image -->
          <img
            v-else-if="previewImage"
            :src="previewImage"
            alt="Product preview"
            class="w-full h-full object-cover"
          />

          <!-- Selected emoji -->
          <span v-else-if="selectedEmoji" class="text-6xl">
            {{ selectedEmoji }}
          </span>

          <!-- Empty state -->
          <div v-else class="text-center p-2">
            <UIcon
              name="i-heroicons-cloud-arrow-up"
              class="w-8 h-8 text-gray-400"
            />
            <p class="text-xs text-gray-400 mt-1">Drop or click</p>
          </div>
        </div>
      </div>

      <!-- Hidden file input -->
      <input
        ref="fileInput"
        type="file"
        accept="image/*"
        class="hidden"
        @change="handleFileSelect"
      />

      <!-- Upload button (when Cloudinary configured) -->
      <UButton
        v-if="isCloudinaryConfigured"
        color="primary"
        variant="soft"
        block
        icon="i-heroicons-cloud-arrow-up"
        :loading="cloudinary.isUploading.value"
        @click="triggerFileInput"
      >
        {{ t("products.uploadImage", "Upload Image") }}
      </UButton>

      <!-- Error message -->
      <p v-if="cloudinary.error.value" class="text-sm text-red-500 text-center">
        {{ cloudinary.error.value }}
      </p>

      <!-- Cloudinary not configured message -->
      <div v-if="!isCloudinaryConfigured" class="text-center">
        <p class="text-xs text-gray-500 mb-2">
          {{
            t(
              "products.cloudinaryNotConfigured",
              "Configure Cloudinary in Settings → Integrations for image uploads"
            )
          }}
        </p>
      </div>

      <!-- Image URL -->
      <UFormField :label="t('products.imageUrl', 'Image URL')" name="image">
        <UInput
          v-model="imageUrlInput"
          type="url"
          :placeholder="
            t('products.imageUrlPlaceholder', 'https://example.com/image.jpg')
          "
          icon="i-heroicons-link"
          class="w-full"
          @update:model-value="(val: string) => { if (val) form.image = val }"
        />
      </UFormField>

      <!-- Custom Emoji Input -->
      <UFormField :label="t('products.customEmoji', 'Custom Emoji')">
        <UInput
          v-model="customEmojiInput"
          :placeholder="
            t(
              'products.customEmojiPlaceholder',
              'Type or paste an emoji (e.g. 🚀)'
            )
          "
          icon="i-heroicons-face-smile"
          class="w-full"
          @update:model-value="handleCustomEmojiUpdate"
        />
      </UFormField>

      <!-- Web Search & System Picker Hint -->
      <div class="space-y-3">
        <label
          class="block text-sm font-medium text-gray-700 dark:text-gray-300"
        >
          {{ t("products.orSelectEmoji", "Or select from list") }}
        </label>

        <!-- Helper Links -->
        <div
          class="flex flex-wrap items-center gap-2 text-xs text-gray-500 bg-gray-50 dark:bg-gray-800/50 p-3 rounded-lg border border-gray-100 dark:border-gray-800"
        >
          <UIcon name="i-heroicons-globe-alt" class="w-4 h-4" />
          <span>{{ t("products.findEmojiOn", "Find on:") }}</span>
          <a
            href="https://emojipedia.org"
            target="_blank"
            rel="noopener noreferrer"
            class="text-primary-600 dark:text-primary-400 hover:underline flex items-center gap-1"
          >
            Emojipedia
            <UIcon
              name="i-heroicons-arrow-top-right-on-square"
              class="w-3 h-3"
            />
          </a>
          <span class="text-gray-300 dark:text-gray-700">|</span>
          <a
            href="https://emojiterra.com"
            target="_blank"
            rel="noopener noreferrer"
            class="text-primary-600 dark:text-primary-400 hover:underline flex items-center gap-1"
          >
            Emojiterra
            <UIcon
              name="i-heroicons-arrow-top-right-on-square"
              class="w-3 h-3"
            />
          </a>

          <div class="w-full h-px bg-gray-200 dark:bg-gray-700 my-1"></div>

          <UIcon name="i-heroicons-command-line" class="w-4 h-4" />
          <span>
            {{ t("products.systemEmojiHint", "Shortcut:") }}
            <span class="font-mono bg-gray-200 dark:bg-gray-700 px-1 rounded"
              >Win + .</span
            >
            /
            <span class="font-mono bg-gray-200 dark:bg-gray-700 px-1 rounded"
              >Cmd + Ctrl + Space</span
            >
          </span>
        </div>

        <div
          class="h-32 overflow-y-auto border border-gray-200 dark:border-gray-700 rounded-lg p-2"
        >
          <div class="grid grid-cols-10 gap-1">
            <button
              v-for="emoji in emojiOptions"
              :key="emoji"
              type="button"
              class="w-8 h-8 flex items-center justify-center rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-lg"
              :class="{
                'bg-primary-100 dark:bg-primary-900/30 ring-2 ring-primary-500':
                  selectedEmoji === emoji,
              }"
              @click="selectEmoji(emoji)"
            >
              {{ emoji }}
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
