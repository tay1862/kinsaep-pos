// composables/use-coupons.ts
// 🎫 Coupon & Discount Management
// Stores coupons in Nostr relay using NIP-78 (Application-specific data)

import { ref, computed } from 'vue';
import type { Coupon, CurrencyCode } from '~/types';

// ============================================
// TYPES
// ============================================

interface CouponUsage {
  couponId: string;
  customerId?: string;
  orderId: string;
  usedAt: string;
  discountAmount: number;
}

interface CouponValidationResult {
  valid: boolean;
  coupon?: Coupon;
  error?: string;
  discountAmount?: number;
}

interface CouponData {
  coupons: Coupon[];
  usages: CouponUsage[];
}

// ============================================
// SINGLETON STATE
// ============================================

const coupons = ref<Coupon[]>([]);
const couponUsages = ref<CouponUsage[]>([]);
const isLoading = ref(false);
const lastSyncAt = ref<string | null>(null);

// Import centralized NOSTR_KINDS
import { NOSTR_KINDS } from "~/types/nostr-kinds";

export function useCoupons() {
  const nostrData = useNostrData();

  // ============================================
  // DATA OPERATIONS
  // ============================================

  /**
   * Load all coupons from Nostr relay
   */
  const loadCoupons = async (): Promise<void> => {
    isLoading.value = true;
    try {
      const data = await nostrData.getReplaceableEvent<CouponData>(NOSTR_KINDS.COUPON, 'coupons');
      if (data?.data) {
        coupons.value = data.data.coupons || [];
        couponUsages.value = data.data.usages || [];
        lastSyncAt.value = new Date().toISOString();
      }
    } catch (error) {
      console.error('[Coupons] Failed to load coupons:', error);
    } finally {
      isLoading.value = false;
    }
  };

  /**
   * Save all coupons to Nostr relay
   */
  const saveCoupons = async (): Promise<void> => {
    try {
      await nostrData.publishReplaceableEvent(
        NOSTR_KINDS.COUPON,
        {
          coupons: coupons.value,
          usages: couponUsages.value,
        } as CouponData,
        'coupons',
        [],
        true // encrypt
      );
      lastSyncAt.value = new Date().toISOString();
    } catch (error) {
      console.error('[Coupons] Failed to save coupons:', error);
      throw error;
    }
  };

  // ============================================
  // COUPON CRUD OPERATIONS
  // ============================================

  /**
   * Create a new coupon
   */
  const createCoupon = async (couponData: Omit<Coupon, 'id' | 'usedCount' | 'createdAt' | 'updatedAt'>): Promise<Coupon> => {
    const now = new Date().toISOString();
    const coupon: Coupon = {
      ...couponData,
      id: `coupon_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      usedCount: 0,
      createdAt: now,
      updatedAt: now,
    };

    coupons.value.push(coupon);
    await saveCoupons();
    return coupon;
  };

  /**
   * Update an existing coupon
   */
  const updateCoupon = async (id: string, updates: Partial<Coupon>): Promise<Coupon | null> => {
    const index = coupons.value.findIndex(c => c.id === id);
    if (index === -1) return null;

    const existingCoupon = coupons.value[index];
    if (!existingCoupon) return null;

    const updatedCoupon: Coupon = {
      ...existingCoupon,
      ...updates,
      id: existingCoupon.id, // ensure id is not overwritten
      updatedAt: new Date().toISOString(),
    };

    coupons.value[index] = updatedCoupon;
    await saveCoupons();
    return updatedCoupon;
  };

  /**
   * Delete a coupon
   */
  const deleteCoupon = async (id: string): Promise<boolean> => {
    const index = coupons.value.findIndex(c => c.id === id);
    if (index === -1) return false;

    coupons.value.splice(index, 1);
    await saveCoupons();
    return true;
  };

  /**
   * Toggle coupon active status
   */
  const toggleCouponStatus = async (id: string): Promise<Coupon | null> => {
    const coupon = coupons.value.find(c => c.id === id);
    if (!coupon) return null;

    return updateCoupon(id, { isActive: !coupon.isActive });
  };

  // ============================================
  // COUPON VALIDATION
  // ============================================

  /**
   * Find coupon by code
   */
  const findByCode = (code: string): Coupon | undefined => {
    return coupons.value.find(c => c.code.toUpperCase() === code.toUpperCase());
  };

  /**
   * Get customer usage count for a coupon
   */
  const getCustomerUsageCount = (couponId: string, customerId: string): number => {
    return couponUsages.value.filter(
      u => u.couponId === couponId && u.customerId === customerId
    ).length;
  };

  /**
   * Validate a coupon code
   */
  const validateCoupon = (
    code: string,
    subtotal: number,
    currencyCode: CurrencyCode,
    customerId?: string,
    cartProductIds?: string[],
    cartCategoryIds?: string[]
  ): CouponValidationResult => {
    const coupon = findByCode(code);

    // Coupon not found
    if (!coupon) {
      return { valid: false, error: 'coupon.errors.invalid' };
    }

    // Coupon inactive
    if (!coupon.isActive) {
      return { valid: false, error: 'coupon.errors.inactive' };
    }

    // Check date validity
    const now = new Date();
    const validFrom = new Date(coupon.validFrom);
    const validUntil = new Date(coupon.validUntil);

    if (now < validFrom) {
      return { valid: false, error: 'coupon.errors.notYetValid' };
    }

    if (now > validUntil) {
      return { valid: false, error: 'coupon.errors.expired' };
    }

    // Check usage limit
    if (coupon.usageLimit && coupon.usedCount >= coupon.usageLimit) {
      return { valid: false, error: 'coupon.errors.usageLimit' };
    }

    // Check per-customer limit
    if (customerId && coupon.perCustomerLimit) {
      const customerUsage = getCustomerUsageCount(coupon.id, customerId);
      if (customerUsage >= coupon.perCustomerLimit) {
        return { valid: false, error: 'coupon.errors.customerLimit' };
      }
    }

    // Check minimum order amount
    if (coupon.minOrderAmount && subtotal < coupon.minOrderAmount) {
      return { 
        valid: false, 
        error: 'coupon.errors.minOrder',
      };
    }

    // Check applicable products
    if (coupon.applicableProducts && coupon.applicableProducts.length > 0 && cartProductIds) {
      const hasApplicableProduct = cartProductIds.some(id => 
        coupon.applicableProducts!.includes(id)
      );
      if (!hasApplicableProduct) {
        return { valid: false, error: 'coupon.errors.notApplicable' };
      }
    }

    // Check applicable categories
    if (coupon.applicableCategories && coupon.applicableCategories.length > 0 && cartCategoryIds) {
      const hasApplicableCategory = cartCategoryIds.some(id => 
        coupon.applicableCategories!.includes(id)
      );
      if (!hasApplicableCategory) {
        return { valid: false, error: 'coupon.errors.notApplicable' };
      }
    }

    // Calculate discount amount
    let discountAmount = 0;
    switch (coupon.type) {
      case 'percentage':
        discountAmount = (subtotal * coupon.value) / 100;
        // Apply max discount cap if set
        if (coupon.maxDiscount && discountAmount > coupon.maxDiscount) {
          discountAmount = coupon.maxDiscount;
        }
        break;
      case 'fixed':
        discountAmount = Math.min(coupon.value, subtotal);
        break;
      case 'free_item':
        // Discount will be handled separately (free item price)
        discountAmount = 0;
        break;
      case 'buy_x_get_y':
        // Discount will be calculated based on cart contents
        discountAmount = 0;
        break;
    }

    return {
      valid: true,
      coupon,
      discountAmount,
    };
  };

  /**
   * Apply a coupon and record usage
   */
  const applyCoupon = async (
    couponId: string,
    orderId: string,
    discountAmount: number,
    customerId?: string
  ): Promise<void> => {
    const coupon = coupons.value.find(c => c.id === couponId);
    if (!coupon) return;

    // Increment usage count
    coupon.usedCount += 1;

    // Record usage
    couponUsages.value.push({
      couponId,
      customerId,
      orderId,
      usedAt: new Date().toISOString(),
      discountAmount,
    });

    await saveCoupons();
  };

  // ============================================
  // COMPUTED VALUES
  // ============================================

  /**
   * Active coupons only
   */
  const activeCoupons = computed(() => {
    const now = new Date();
    return coupons.value.filter(c => {
      if (!c.isActive) return false;
      const validUntil = new Date(c.validUntil);
      return now <= validUntil;
    });
  });

  /**
   * Expired coupons
   */
  const expiredCoupons = computed(() => {
    const now = new Date();
    return coupons.value.filter(c => {
      const validUntil = new Date(c.validUntil);
      return now > validUntil;
    });
  });

  /**
   * Coupons with remaining usage
   */
  const availableCoupons = computed(() => {
    return activeCoupons.value.filter(c => {
      if (!c.usageLimit) return true;
      return c.usedCount < c.usageLimit;
    });
  });

  /**
   * Total discount given
   */
  const totalDiscountGiven = computed(() => {
    return couponUsages.value.reduce((sum, u) => sum + u.discountAmount, 0);
  });

  /**
   * Coupon usage statistics
   */
  const usageStats = computed(() => {
    const stats: Record<string, { count: number; totalDiscount: number }> = {};
    
    for (const usage of couponUsages.value) {
      if (!stats[usage.couponId]) {
        stats[usage.couponId] = { count: 0, totalDiscount: 0 };
      }
      const couponStats = stats[usage.couponId];
      if (couponStats) {
        couponStats.count += 1;
        couponStats.totalDiscount += usage.discountAmount;
      }
    }
    
    return stats;
  });

  // ============================================
  // PRESET COUPONS (for demo/testing)
  // ============================================

  /**
   * Create default demo coupons
   */
  const createDemoCoupons = async (): Promise<void> => {
    const demoCoupons: Omit<Coupon, 'id' | 'usedCount' | 'createdAt' | 'updatedAt'>[] = [
      {
        code: 'WELCOME10',
        name: 'Welcome 10% Off',
        description: '10% off for new customers',
        type: 'percentage',
        value: 10,
        minOrderAmount: 50000,
        maxDiscount: 100000,
        validFrom: '2024-01-01',
        validUntil: '2025-12-31',
        usageLimit: 1000,
        perCustomerLimit: 1,
        isActive: true,
      },
      {
        code: 'SAVE20K',
        name: 'Save ₭20,000',
        description: 'Fixed ₭20,000 discount',
        type: 'fixed',
        value: 20000,
        minOrderAmount: 100000,
        validFrom: '2024-01-01',
        validUntil: '2025-12-31',
        usageLimit: 500,
        isActive: true,
      },
      {
        code: 'LIGHTNING',
        name: 'Lightning Special',
        description: '15% off when paying with Lightning',
        type: 'percentage',
        value: 15,
        validFrom: '2024-01-01',
        validUntil: '2025-12-31',
        isActive: true,
      },
      {
        code: 'BITCOIN21',
        name: 'Bitcoin 21% Off',
        description: 'Special Bitcoin community discount',
        type: 'percentage',
        value: 21,
        maxDiscount: 500000,
        validFrom: '2024-01-01',
        validUntil: '2025-12-31',
        isActive: true,
      },
    ];

    for (const couponData of demoCoupons) {
      // Check if coupon with same code already exists
      if (!findByCode(couponData.code)) {
        await createCoupon(couponData);
      }
    }
  };

  // ============================================
  // INITIALIZE
  // ============================================

  const initialize = async (): Promise<void> => {
    await loadCoupons();
  };

  // ============================================
  // RETURN
  // ============================================

  return {
    // State
    coupons,
    couponUsages,
    isLoading,
    lastSyncAt,

    // Computed
    activeCoupons,
    expiredCoupons,
    availableCoupons,
    totalDiscountGiven,
    usageStats,

    // Actions
    initialize,
    loadCoupons,
    saveCoupons,
    createCoupon,
    updateCoupon,
    deleteCoupon,
    toggleCouponStatus,
    
    // Validation
    findByCode,
    validateCoupon,
    applyCoupon,
    getCustomerUsageCount,

    // Demo
    createDemoCoupons,
  };
}
