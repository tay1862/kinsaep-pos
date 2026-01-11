<!-- ============================================
  🏪 COMPANY CODE CONNECT BANNER
  Shows on dashboard when no company code is set
  Allows staff to connect to their company's data
============================================ -->

<template>
  <UCard
    v-if="!hasCompanyCode && isVisible"
    class="border-l-4 border-l-primary-500"
  >
    <div class="flex items-start gap-4">
      <div class="p-2 rounded-lg bg-primary/10">
        <UIcon
          name="i-heroicons-building-office-2"
          class="w-8 h-8 text-primary"
        />
      </div>

      <div class="flex-1">
        <h3 class="font-semibold text-lg">
          {{ t("auth.company.connectTitle", "Connect to Company") }}
        </h3>
        <p class="text-sm text-gray-500 mb-4">
          {{
            t("auth.company.connectDescription", "Enter your company code to sync data")
          }}
        </p>

        <div class="flex flex-col gap-4">
          <CommonCompanyCodeInput
            v-model="codeInput"
            size="md"
            @valid="isValidCode = $event"
            @submit="handleConnect"
          />

          <UButton
            size="lg"
            :loading="isConnecting"
            :disabled="!isValidCode"
            @click="handleConnect"
          >
            <UIcon name="i-heroicons-link" class="w-5 h-5 mr-2" />
            {{ t("auth.company.connect", "Connect") }}
          </UButton>
        </div>

        <!-- Error -->
        <p v-if="errorMsg" class="mt-2 text-sm text-red-500">
          {{ errorMsg }}
        </p>
      </div>

      <!-- Dismiss -->
      <UButton
        variant="ghost"
        color="gray"
        icon="i-heroicons-x-mark"
        size="sm"
        @click="dismiss"
      />
    </div>
  </UCard>
</template>

<script setup lang="ts">
// Composables
const { t } = useI18n();
const toast = useToast();
const company = useCompany();
const nostrData = useNostrData();

// State
const codeInput = ref("");
const isConnecting = ref(false);
const errorMsg = ref("");
const isDismissed = ref(false);

// Computed
const hasCompanyCode = computed(() => company.hasCompanyCode.value);
const isVisible = computed(() => !isDismissed.value);
const isValidCode = computed(() => company.isValidCompanyCode(codeInput.value));

// Methods
function formatCodeInput(event: Event) {
  const input = event.target as HTMLInputElement;
  let value = input.value.toUpperCase().replace(/[^A-Z0-9]/g, "");

  // Support both old (4-4-4) and new (5-5-5) formats
  // Auto-format based on length: if >12 chars without dashes, use new format
  const rawLength = value.length;

  if (rawLength <= 12) {
    // Old format: XXXX-XXXX-XXXX (4-4-4)
    if (value.length > 4) {
      value = value.slice(0, 4) + "-" + value.slice(4);
    }
    if (value.length > 9) {
      value = value.slice(0, 9) + "-" + value.slice(9);
    }
    if (value.length > 14) {
      value = value.slice(0, 14);
    }
  } else {
    // New format: XXXXX-XXXXX-XXXXX (5-5-5)
    if (value.length > 5) {
      value = value.slice(0, 5) + "-" + value.slice(5);
    }
    if (value.length > 11) {
      value = value.slice(0, 11) + "-" + value.slice(11);
    }
    if (value.length > 17) {
      value = value.slice(0, 17);
    }
  }

  codeInput.value = value;
}

async function handleConnect() {
  if (!isValidCode.value) return;

  isConnecting.value = true;
  errorMsg.value = "";

  try {
    // First, try to discover the owner's pubkey by company code
    let ownerPubkey: string | null = null;
    try {
      ownerPubkey = await nostrData.discoverOwnerByCompanyCode(codeInput.value);
      console.log(
        "[CompanyCode] Discovered owner:",
        ownerPubkey?.slice(0, 8) + "..."
      );
    } catch (e) {
      console.warn("[CompanyCode] Could not discover owner:", e);
    }

    // Set the company code WITH owner pubkey
    await company.setCompanyCode(codeInput.value, ownerPubkey || undefined);

    // Enable company code feature
    company.toggleCompanyCode(true);

    toast.add({
      title: t("auth.company.connectSuccess", "Connected!"),
      description: t("auth.company.syncingData", "Syncing company data..."),
      icon: "i-heroicons-check-circle",
      color: "success",
    });

    // Try to sync data from relays (now will include owner's data)
    try {
      await nostrData.fullSync();
    } catch (syncError) {
      console.warn(
        "[CompanyCode] Sync failed, will retry on page load:",
        syncError
      );
    }

    // Reload page to initialize with synced data
    setTimeout(() => {
      window.location.reload();
    }, 1500);
  } catch (error) {
    errorMsg.value =
      t("auth.company.connectError", "Failed to connect. Please check the code.");
  } finally {
    isConnecting.value = false;
  }
}

function dismiss() {
  isDismissed.value = true;
  // Store in session so it doesn't show again this session
  sessionStorage.setItem("company_banner_dismissed", "true");
}

// Check if dismissed this session
onMounted(() => {
  if (import.meta.client) {
    isDismissed.value =
      sessionStorage.getItem("company_banner_dismissed") === "true";
  }
});
</script>
