<!-- components/pos/CouponInput.vue -->
<!-- 🎫 Coupon Code Input Component -->
<script setup lang="ts">
import type { AppliedCoupon, CurrencyCode } from '~/types';

const props = defineProps<{
  subtotal: number;
  currency: CurrencyCode;
  appliedCoupon?: AppliedCoupon | null;
  customerId?: string;
  cartProductIds?: string[];
  cartCategoryIds?: string[];
}>();

const emit = defineEmits<{
  apply: [coupon: AppliedCoupon];
  remove: [];
}>();

// Composables
const currencyHelper = useCurrency();
const { t } = useI18n();
const couponsComposable = useCoupons();

// State
const couponCode = ref('');
const isValidating = ref(false);
const error = ref('');
const showInput = ref(false);

// Initialize coupons on mount
onMounted(async () => {
  await couponsComposable.initialize();
});

const validateCoupon = async () => {
  if (!couponCode.value.trim()) {
    error.value = t('coupon.errors.empty');
    return;
  }

  isValidating.value = true;
  error.value = '';

  // Small delay for UX
  await new Promise(resolve => setTimeout(resolve, 300));

  const code = couponCode.value.toUpperCase().trim();
  
  // Validate using the coupons composable
  const result = couponsComposable.validateCoupon(
    code,
    props.subtotal,
    props.currency,
    props.customerId,
    props.cartProductIds,
    props.cartCategoryIds
  );

  if (!result.valid) {
    // Handle error with any extra context
    if (result.error === 'coupon.errors.minOrder') {
      const coupon = couponsComposable.findByCode(code);
      if (coupon?.minOrderAmount) {
        error.value = t(result.error, { amount: currencyHelper.format(coupon.minOrderAmount, props.currency) });
      } else {
        error.value = t(result.error);
      }
    } else {
      error.value = t(result.error || 'coupon.errors.invalid');
    }
    isValidating.value = false;
    return;
  }

  // Emit applied coupon
  emit('apply', {
    coupon: result.coupon!,
    discountAmount: result.discountAmount || 0,
    appliedAt: new Date().toISOString(),
  });

  // Reset
  couponCode.value = '';
  showInput.value = false;
  isValidating.value = false;
};

const removeCoupon = () => {
  emit('remove');
};

const toggleInput = () => {
  showInput.value = !showInput.value;
  error.value = '';
  couponCode.value = '';
};
</script>

<template>
  <div class="space-y-2">
    <!-- Applied Coupon Display -->
    <div
      v-if="appliedCoupon"
      class="flex items-center justify-between p-3 bg-green-500/10 border border-green-500/20 rounded-xl"
    >
      <div class="flex items-center gap-3">
        <div class="w-10 h-10 rounded-lg bg-green-500/20 flex items-center justify-center">
          <span class="text-xl">🎫</span>
        </div>
        <div class="text-left">
          <p class="font-semibold text-green-700 dark:text-green-400 text-sm">
            {{ appliedCoupon.coupon.code }}
          </p>
          <p class="text-xs text-green-600 dark:text-green-500">
            {{ appliedCoupon.coupon.name }}
          </p>
        </div>
      </div>
      <div class="flex items-center gap-2">
        <span class="font-bold text-green-600 dark:text-green-400">
          -{{ currencyHelper.format(appliedCoupon.discountAmount, currency) }}
        </span>
        <button
          class="w-6 h-6 rounded-full bg-green-500/20 hover:bg-red-500/20 text-green-600 hover:text-red-500 flex items-center justify-center transition-colors"
          @click="removeCoupon"
        >
          <UIcon name="i-heroicons-x-mark" class="w-4 h-4" />
        </button>
      </div>
    </div>

    <!-- Add Coupon Button/Input -->
    <div v-else>
      <button
        v-if="!showInput"
        class="w-full flex items-center justify-between px-3 py-2 rounded-lg bg-gray-100 dark:bg-gray-800/50 hover:bg-gray-200 dark:hover:bg-gray-800 transition-colors"
        @click="toggleInput"
      >
        <div class="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
          <UIcon name="i-heroicons-ticket" class="w-4 h-4" />
          <span>{{ t('coupon.addCoupon') }}</span>
        </div>
        <UIcon name="i-heroicons-plus" class="w-4 h-4 text-gray-400 dark:text-gray-600" />
      </button>

      <!-- Coupon Input -->
      <div v-else class="space-y-2">
        <div class="flex gap-2">
          <UInput
            v-model="couponCode"
            :placeholder="t('coupon.enterCode')"
            class="flex-1 uppercase"
            size="sm"
            :disabled="isValidating"
            @keyup.enter="validateCoupon"
          />
          <UButton
            color="primary"
            size="sm"
            :loading="isValidating"
            :disabled="!couponCode.trim()"
            @click="validateCoupon"
          >
            {{ t('coupon.apply') }}
          </UButton>
          <UButton
            color="neutral"
            variant="ghost"
            size="sm"
            icon="i-heroicons-x-mark"
            @click="toggleInput"
          />
        </div>
        
        <!-- Error Message -->
        <p v-if="error" class="text-xs text-red-500 text-left">
          {{ error }}
        </p>
      </div>
    </div>
  </div>
</template>
