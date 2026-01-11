// ============================================
// 🎁 PROMOTION FORM COMPOSABLE
// Form state management and validation for promotions
// Uses useState for shared state across components
// ============================================

import type {
  Promotion,
  PromotionType,
  PromotionScope,
  DiscountType,
  PromotionTier,
} from "~/types";

interface PromotionFormData {
  // Basic info
  name: string;
  description: string;
  type: PromotionType;
  scope: PromotionScope;

  // Trigger
  triggerProductIds: string[];
  triggerCategoryIds: string[];
  triggerQuantity: number;

  // Discount settings
  discountType: DiscountType;
  discountValue: number;
  tiers: PromotionTier[];

  // Reward (for BOGO)
  rewardProductIds: string[];
  rewardQuantity: number;

  // Conditions
  minOrderValue: number | null;
  minQuantity: number | null;
  customerTiers: string[];
  firstOrderOnly: boolean;

  // Schedule
  startDate: string;
  endDate: string;
  daysOfWeek: number[];

  // Limits
  maxUsesPerOrder: number | null;
  maxUsesPerCustomer: number | null;
  maxUsesTotal: number | null;

  // Stacking
  stackable: boolean;

  // Display
  badgeText: string;
  badgeColor: string;
  highlightOnPOS: boolean;
}

interface FormValidation {
  isValid: boolean;
  errors: Record<string, string>;
}

// Default form data
function getDefaultFormData(): PromotionFormData {
  return {
    name: "",
    description: "",
    type: "bogo",
    scope: "products",
    triggerProductIds: [],
    triggerCategoryIds: [],
    triggerQuantity: 1,
    discountType: "percentage",
    discountValue: 10,
    tiers: [],
    rewardProductIds: [],
    rewardQuantity: 1,
    minOrderValue: null,
    minQuantity: null,
    customerTiers: [],
    firstOrderOnly: false,
    startDate: "",
    endDate: "",
    daysOfWeek: [],
    maxUsesPerOrder: null,
    maxUsesPerCustomer: null,
    maxUsesTotal: null,
    stackable: true,
    badgeText: "BUY 1 GET 1 FREE",
    badgeColor: "green",
    highlightOnPOS: true,
  };
}

// Promotion type options
const typeOptions = [
  {
    value: "bogo",
    label: "Buy One Get One",
    icon: "🎁",
    description: "Buy X get Y free",
  },
  {
    value: "discount",
    label: "Discount",
    icon: "💰",
    description: "Percentage or fixed off",
  },
  {
    value: "tiered",
    label: "Tiered Discount",
    icon: "📊",
    description: "Buy more save more",
  },
  {
    value: "bundle",
    label: "Bundle Deal",
    icon: "📦",
    description: "Discount on combo",
  },
  {
    value: "freebie",
    label: "Free Gift",
    icon: "🎀",
    description: "Free item with purchase",
  },
];

const scopeOptions = [
  { value: "products", label: "Specific Products" },
  { value: "categories", label: "Product Categories" },
  { value: "all", label: "All Products" },
];

const discountTypeOptions = [
  { value: "percentage", label: "Percentage Off (%)" },
  { value: "fixed", label: "Fixed Amount" },
];

const daysOfWeekOptions = [
  { value: 0, label: "Sunday" },
  { value: 1, label: "Monday" },
  { value: 2, label: "Tuesday" },
  { value: 3, label: "Wednesday" },
  { value: 4, label: "Thursday" },
  { value: 5, label: "Friday" },
  { value: 6, label: "Saturday" },
];

export function usePromotionForm() {
  const toast = useToast();
  const { t } = useI18n();

  // Use useState for shared form state across components (Nuxt SSR-safe singleton)
  const form = useState<PromotionFormData>("promotion-form", () =>
    getDefaultFormData()
  );
  const isLoading = useState<boolean>("promotion-form-loading", () => false);

  // Add a tier for tiered promotions
  function addTier(): void {
    const lastTier = form.value.tiers[form.value.tiers.length - 1];
    form.value.tiers.push({
      minQuantity: lastTier ? lastTier.minQuantity + 1 : 2,
      discountType: "percentage",
      discountValue: 10,
    });
  }

  // Remove a tier
  function removeTier(index: number): void {
    form.value.tiers.splice(index, 1);
  }

  // Set badge text based on type
  function updateBadgeText(): void {
    switch (form.value.type) {
      case "bogo":
        form.value.badgeText = `BUY ${form.value.triggerQuantity} GET ${form.value.rewardQuantity} FREE`;
        break;
      case "discount":
        form.value.badgeText =
          form.value.discountType === "percentage"
            ? `${form.value.discountValue}% OFF`
            : `฿${form.value.discountValue} OFF`;
        break;
      case "tiered":
        form.value.badgeText = "BUY MORE SAVE MORE";
        break;
      case "bundle":
        form.value.badgeText = "BUNDLE DEAL";
        break;
      case "freebie":
        form.value.badgeText = "FREE GIFT";
        break;
    }
  }

  // Reset form to default values
  function resetForm(): void {
    const defaults = getDefaultFormData();
    Object.assign(form.value, defaults);
  }

  // Validate form data
  function validateForm(): FormValidation {
    const errors: Record<string, string> = {};

    // Name validation
    if (!form.value.name.trim()) {
      errors.name = t("validation.required", "Name is required");
    } else if (form.value.name.length < 2) {
      errors.name = t(
        "validation.minLength",
        "Name must be at least 2 characters"
      );
    }

    // Type-specific validation
    if (form.value.type === "bogo" || form.value.type === "freebie") {
      if (
        form.value.scope === "product" &&
        form.value.triggerProductIds.length === 0
      ) {
        errors.triggerProductIds = t(
          "validation.required",
          "Select at least one trigger product"
        );
      }
      if (form.value.triggerQuantity < 1) {
        errors.triggerQuantity = t(
          "validation.min",
          "Quantity must be at least 1"
        );
      }
    }

    if (form.value.type === "discount") {
      if (form.value.discountValue <= 0) {
        errors.discountValue = t(
          "validation.min",
          "Discount must be greater than 0"
        );
      }
      if (
        form.value.discountType === "percentage" &&
        form.value.discountValue > 100
      ) {
        errors.discountValue = t(
          "validation.max",
          "Percentage cannot exceed 100%"
        );
      }
    }

    if (form.value.type === "tiered") {
      if (form.value.tiers.length === 0) {
        errors.tiers = t("validation.required", "Add at least one tier level");
      }
    }

    if (!form.value.badgeText.trim()) {
      errors.badgeText = t("validation.required", "Badge text is required");
    }

    return {
      isValid: Object.keys(errors).length === 0,
      errors,
    };
  }

  // Show validation errors
  function showValidationError(errors: Record<string, string>): void {
    const firstError = Object.values(errors)[0];
    if (firstError) {
      toast.add({
        title: t("common.validationError", "Validation Error"),
        description: firstError,
        color: "red",
      });
    }
  }

  // Prepare form data for submission
  function prepareSubmissionData(): Omit<
    Promotion,
    "id" | "usageCount" | "createdAt" | "updatedAt"
  > {
    const rewardProductIds =
      form.value.rewardProductIds.length > 0
        ? form.value.rewardProductIds
        : form.value.triggerProductIds;

    return {
      name: form.value.name.trim(),
      description: form.value.description.trim() || undefined,
      type: form.value.type,
      status: "active",
      scope: form.value.scope,

      // Trigger
      triggerProductIds: form.value.triggerProductIds,
      triggerCategoryIds:
        form.value.triggerCategoryIds.length > 0
          ? form.value.triggerCategoryIds
          : undefined,
      triggerQuantity: form.value.triggerQuantity,

      // Discount
      discountType:
        form.value.type === "discount" || form.value.type === "tiered"
          ? form.value.discountType
          : undefined,
      discountValue:
        form.value.type === "discount" ? form.value.discountValue : undefined,
      tiers:
        form.value.type === "tiered" && form.value.tiers.length > 0
          ? form.value.tiers
          : undefined,

      // Reward
      rewardType:
        form.value.type === "bogo" || form.value.type === "freebie"
          ? "free_product"
          : "discount",
      rewardProductIds,
      rewardQuantity: form.value.rewardQuantity,

      // Conditions
      minOrderValue: form.value.minOrderValue || undefined,
      minQuantity: form.value.minQuantity || undefined,
      customerTiers:
        form.value.customerTiers.length > 0
          ? form.value.customerTiers
          : undefined,
      firstOrderOnly: form.value.firstOrderOnly || undefined,

      // Schedule
      startDate: form.value.startDate || undefined,
      endDate: form.value.endDate || undefined,
      daysOfWeek:
        form.value.daysOfWeek.length > 0 ? form.value.daysOfWeek : undefined,

      // Limits
      maxUsesPerOrder: form.value.maxUsesPerOrder || undefined,
      maxUsesPerCustomer: form.value.maxUsesPerCustomer || undefined,
      maxUsesTotal: form.value.maxUsesTotal || undefined,

      // Stacking
      stackable: form.value.stackable,
      priority: 10,

      // Display
      badgeText: form.value.badgeText.trim(),
      badgeColor: form.value.badgeColor || undefined,
      highlightOnPOS: form.value.highlightOnPOS || undefined,
    };
  }

  return {
    // State - form is now a Ref from useState
    form,
    isLoading,

    // Options
    typeOptions,
    scopeOptions,
    discountTypeOptions,
    daysOfWeekOptions,

    // Methods
    resetForm,
    validateForm,
    showValidationError,
    prepareSubmissionData,
    setLoading: (loading: boolean) => {
      isLoading.value = loading;
    },

    // Tier management
    addTier,
    removeTier,
    updateBadgeText,
  };
}
