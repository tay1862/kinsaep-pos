<script setup lang="ts">
/**
 * 📝 Customer Form Component
 * Create/Edit customer form used in modal
 */
import type { LoyaltyMember } from "~/types";

interface PaymentTermOption {
  value: string;
  label: string;
}

interface Props {
  customer?: LoyaltyMember | null;
  paymentTermOptions?: PaymentTermOption[];
  saving?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  paymentTermOptions: () => [],
  saving: false,
});

const emit = defineEmits<{
  save: [form: CustomerFormData];
  cancel: [];
}>();

const { t } = useI18n();

// Form data interface
interface CustomerFormData {
  name: string;
  email: string;
  phone: string;
  address: string;
  nostrPubkey: string;
  lud16: string;
  tier: string;
  notes: string;
  defaultPaymentTermId: string;
  creditLimit: number;
}

// Form state
const form = ref<CustomerFormData>({
  name: "",
  email: "",
  phone: "",
  address: "",
  nostrPubkey: "",
  lud16: "",
  tier: "bronze",
  notes: "",
  defaultPaymentTermId: "none",
  creditLimit: 0,
});

// Tier options
const tierOptions = computed(() => [
  { value: "bronze", label: t("loyalty.bronze", "Bronze") },
  { value: "silver", label: t("loyalty.silver", "Silver") },
  { value: "gold", label: t("loyalty.gold", "Gold") },
  { value: "platinum", label: t("loyalty.platinum", "Platinum") },
]);

// Initialize form when customer prop changes
watch(
  () => props.customer,
  (customer) => {
    if (customer) {
      form.value = {
        name: customer.name || "",
        email: customer.email || "",
        phone: customer.phone || "",
        address: customer.address || "",
        nostrPubkey: customer.nostrPubkey || "",
        lud16: customer.lud16 || customer.lightningAddress || "",
        tier: customer.tier || "bronze",
        notes: customer.notes || "",
        defaultPaymentTermId: customer.defaultPaymentTermId || "none",
        creditLimit: customer.creditLimit || 0,
      };
    } else {
      resetForm();
    }
  },
  { immediate: true }
);

const resetForm = () => {
  form.value = {
    name: "",
    email: "",
    phone: "",
    address: "",
    nostrPubkey: "",
    lud16: "",
    tier: "bronze",
    notes: "",
    defaultPaymentTermId: "none",
    creditLimit: 0,
  };
};

const handleSubmit = () => {
  emit("save", form.value);
};
</script>

<template>
  <form class="space-y-4" @submit.prevent="handleSubmit">
    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
      <!-- Name -->
      <UFormField
        :label="t('customers.name')"
        required
        class="md:col-span-2 w-full"
      >
        <UInput
          v-model="form.name"
          :placeholder="t('customers.namePlaceholder')"
          class="w-full"
        />
      </UFormField>

      <!-- Nostr Pubkey -->
      <UFormField :label="t('customers.nostrPubkey')">
        <UInput
          v-model="form.nostrPubkey"
          placeholder="npub1... or hex pubkey"
          class="w-full"
        />
      </UFormField>

      <!-- Lightning Address -->
      <UFormField :label="t('customers.lightningAddress')">
        <UInput
          v-model="form.lud16"
          placeholder="user@getalby.com"
          class="w-full"
        />
      </UFormField>

      <!-- Tier -->
      <UFormField :label="t('loyalty.tier')">
        <USelect
          v-model="form.tier"
          :items="tierOptions"
          value-key="value"
          label-key="label"
          class="w-full"
        />
      </UFormField>

      <!-- Email -->
      <UFormField :label="t('customers.email')">
        <UInput
          v-model="form.email"
          type="email"
          :placeholder="t('customers.emailPlaceholder')"
          class="w-full"
        />
      </UFormField>

      <!-- Phone -->
      <UFormField :label="t('customers.phone')">
        <UInput
          v-model="form.phone"
          :placeholder="t('customers.phonePlaceholder')"
          class="w-full"
        />
      </UFormField>

      <!-- Address -->
      <UFormField :label="t('customers.address')" class="md:col-span-2">
        <UTextarea
          v-model="form.address"
          :placeholder="t('customers.addressPlaceholder')"
          :rows="2"
          class="w-full"
        />
      </UFormField>

      <!-- Credit & Payment Terms Section -->
      <div
        v-if="paymentTermOptions.length > 0"
        class="md:col-span-2 pt-2 border-t border-gray-200 dark:border-gray-800"
      >
        <p class="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
          {{ t("customers.creditSettings", "Credit Settings") }}
        </p>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <UFormField :label="t('settings.terms.title', 'Payment Terms')">
            <USelect
              v-model="form.defaultPaymentTermId"
              :items="paymentTermOptions"
              value-key="value"
              label-key="label"
              :placeholder="t('common.select', 'Select')"
              class="w-full"
            />
          </UFormField>

          <UFormField :label="t('customers.creditLimit', 'Credit Limit')">
            <UInput
              v-model.number="form.creditLimit"
              type="number"
              placeholder="0"
              class="w-full"
            >
              <template #trailing>
                <span class="text-xs text-gray-400">LAK</span>
              </template>
            </UInput>
          </UFormField>
        </div>
      </div>

      <!-- Notes -->
      <UFormField :label="t('customers.notes')" class="md:col-span-2">
        <UTextarea
          v-model="form.notes"
          :placeholder="t('customers.notesPlaceholder')"
          :rows="2"
          class="w-full"
        />
      </UFormField>
    </div>

    <!-- Actions -->
    <div class="flex justify-end gap-3 pt-4">
      <UButton
        color="neutral"
        variant="outline"
        :label="t('common.cancel')"
        @click="emit('cancel')"
      />
      <UButton
        type="submit"
        color="primary"
        :loading="saving"
        :label="customer ? t('common.update') : t('common.create')"
      />
    </div>
  </form>
</template>
