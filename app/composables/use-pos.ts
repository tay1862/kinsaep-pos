// composables/use-pos.ts
// 🛒 POS Cart & Session Management
// 🔗 SINGLETON STATE - Shared across all screens (staff POS + customer display)
// 📡 Uses BroadcastChannel for cross-window sync

import { ref, computed, watch } from "vue";
import type {
  Product,
  ProductVariant,
  ProductModifier,
  Cart,
  CartItem,
  Order,
  POSSession,
  CurrencyCode,
  PaymentMethod,
  OrderType,
  AppliedPromotion,
} from "~/types";
import { useCurrency } from "./use-currency";
import { useTax } from "./use-tax";
import { EntityId, generateUUIDv7 } from "~/utils/id";

// ============================================
// GLOBAL SINGLETON STATE
// These refs are shared across ALL usePOS() calls
// This enables dual-screen sync (staff POS ↔ customer display)
// ============================================
const cartItems = ref<CartItem[]>([]);
const selectedCurrency = ref<CurrencyCode>("LAK");
const tipAmount = ref(0);
const discountAmount = ref(0); // Track discount for receipts
const appliedPromotions = ref<AppliedPromotion[]>([]); // Track applied promotions
// taxRate is now managed by useTax composable
const customerNote = ref("");
const customerPubkey = ref<string | null>(null);
const customerName = ref<string | null>(null);
const customerId = ref<string | null>(null);
const currentSession = ref<POSSession | null>(null);

// Order type state (dine-in, take-away, delivery, pickup)
const orderType = ref<OrderType>("dine_in");
const tableNumber = ref<string>("");
const deliveryAddress = ref<string>("");
const customerPhone = ref<string>("");
const scheduledTime = ref<string>("");

// Payment state for customer display sync
const paymentState = ref<{
  status: "idle" | "pending" | "paid" | "cancelled";
  method?: "lightning" | "cash" | "bank_transfer" | "external";
  invoiceData?: string;
  amount?: number;
  satsAmount?: number;
  // Bank transfer specific
  bankCode?: string; // 'bcel' | 'ldb' | 'jdb' | 'apb' etc
  bankName?: string;
  accountNumber?: string;
  accountName?: string;
  bankQrData?: string;
  // External payment specific
  externalMethod?: string;
  // E-Bill for customer (after payment success)
  eBillUrl?: string;
  eBillId?: string;
  receiptCode?: string; // REC-XXXX-XXXX verification code
  // Order info for success display
  orderNumber?: number;
  orderCode?: string;
  items?: Array<{ name: string; quantity: number; total: number }>;
}>({ status: "idle" });

// ============================================
// CROSS-WINDOW SYNC via BroadcastChannel
// This syncs cart state across browser windows/tabs
// ============================================
let broadcastChannel: BroadcastChannel | null = null;
let isReceivingBroadcast = false;

const initBroadcastChannel = () => {
  if (typeof window === "undefined") return;
  if (broadcastChannel) return; // Already initialized

  broadcastChannel = new BroadcastChannel("pos-cart-sync");

  // Listen for updates from other windows
  broadcastChannel.onmessage = (event) => {
    isReceivingBroadcast = true;
    const { type, payload } = event.data;

    if (type === "cart-update") {
      cartItems.value = payload.cartItems || [];
      tipAmount.value = payload.tipAmount || 0;
      discountAmount.value = payload.discountAmount || 0;
      selectedCurrency.value = payload.selectedCurrency || "LAK";
      customerNote.value = payload.customerNote || "";
      // Order type sync
      orderType.value = payload.orderType || "dine_in";
      tableNumber.value = payload.tableNumber || "";
      deliveryAddress.value = payload.deliveryAddress || "";
      customerPhone.value = payload.customerPhone || "";
      scheduledTime.value = payload.scheduledTime || "";
    } else if (type === "cart-clear") {
      cartItems.value = [];
      tipAmount.value = 0;
      discountAmount.value = 0;
      customerNote.value = "";
      orderType.value = "dine_in";
      tableNumber.value = "";
      deliveryAddress.value = "";
      customerPhone.value = "";
      scheduledTime.value = "";
      // DON'T clear payment state - it should persist to show receipt QR
      // Payment state will auto-clear after 15s timeout on customer display
    } else if (type === "payment-update") {
      paymentState.value = payload;
    } else if (type === "request-sync") {
      // Another window is asking for current state
      broadcastCartState();
      broadcastPaymentState();
    }

    isReceivingBroadcast = false;
  };

  // Request current state from any existing POS window
  broadcastChannel.postMessage({ type: "request-sync" });
};

const broadcastCartState = () => {
  if (!broadcastChannel || isReceivingBroadcast) return;

  // Serialize cart items to plain objects (remove any non-clonable data)
  const serializedItems = cartItems.value.map((item) => ({
    product: JSON.parse(JSON.stringify(item.product)),
    quantity: item.quantity,
    price: item.price,
    total: item.total,
    selectedVariant: item.selectedVariant
      ? JSON.parse(JSON.stringify(item.selectedVariant))
      : undefined,
    selectedModifiers: item.selectedModifiers
      ? JSON.parse(JSON.stringify(item.selectedModifiers))
      : undefined,
    notes: item.notes,
  }));

  broadcastChannel.postMessage({
    type: "cart-update",
    payload: {
      cartItems: serializedItems,
      tipAmount: tipAmount.value,
      discountAmount: discountAmount.value,
      selectedCurrency: selectedCurrency.value,
      customerNote: customerNote.value,
      // Order type info
      orderType: orderType.value,
      tableNumber: tableNumber.value,
      deliveryAddress: deliveryAddress.value,
      customerPhone: customerPhone.value,
      scheduledTime: scheduledTime.value,
    },
  });
};

const broadcastCartClear = () => {
  if (!broadcastChannel) return;
  broadcastChannel.postMessage({ type: "cart-clear" });
};

const broadcastPaymentState = () => {
  if (!broadcastChannel || isReceivingBroadcast) return;

  // Serialize payment state to plain object (ensure all data is clonable)
  const serializedState = {
    status: paymentState.value.status,
    method: paymentState.value.method || undefined,
    invoiceData: paymentState.value.invoiceData || undefined,
    amount: paymentState.value.amount || undefined,
    satsAmount: paymentState.value.satsAmount || undefined,
    // Bank transfer
    bankCode: paymentState.value.bankCode || undefined,
    bankName: paymentState.value.bankName || undefined,
    accountNumber: paymentState.value.accountNumber || undefined,
    accountName: paymentState.value.accountName || undefined,
    bankQrData: paymentState.value.bankQrData || undefined,
    // External
    externalMethod: paymentState.value.externalMethod || undefined,
    // E-Bill (for customer display after payment)
    eBillUrl: paymentState.value.eBillUrl || undefined,
    eBillId: paymentState.value.eBillId || undefined,
    receiptCode: paymentState.value.receiptCode || undefined,
    // Order info (for success display)
    orderNumber: paymentState.value.orderNumber || undefined,
    orderCode: paymentState.value.orderCode || undefined,
    // Serialize items array to ensure it's clonable (remove any circular refs)
    items: paymentState.value.items
      ? JSON.parse(JSON.stringify(paymentState.value.items))
      : undefined,
  };

  broadcastChannel.postMessage({
    type: "payment-update",
    payload: serializedState,
  });
};

// Helper to update payment state and broadcast
const setPaymentState = (state: typeof paymentState.value) => {
  paymentState.value = state;
  broadcastPaymentState();
};

export const usePOS = () => {
  // Initialize broadcast channel on first use
  if (typeof window !== "undefined") {
    initBroadcastChannel();
  }

  // Initialize composables
  const currency = useCurrency();
  const taxHelper = useTax();
  const promotionsStore = usePromotionsStore();
  const productsStore = useProducts();

  // Session computed (uses global state)
  const isSessionActive = computed(
    () => currentSession.value?.status === "active"
  );

  // ============================================
  // Price Calculation Helpers
  // ============================================

  /**
   * Calculate final price with variant and modifiers
   */
  const calculateItemPrice = (
    product: Product,
    variant?: ProductVariant,
    modifiers?: ProductModifier[]
  ): number => {
    let basePrice = product.prices?.[selectedCurrency.value] || product.price;

    // Add variant price modifier
    if (variant) {
      if (variant.priceModifierType === "fixed") {
        basePrice += variant.priceModifier;
      } else {
        basePrice += basePrice * (variant.priceModifier / 100);
      }
    }

    // Add modifier prices
    if (modifiers && modifiers.length > 0) {
      modifiers.forEach((mod) => {
        basePrice += mod.price;
      });
    }

    return basePrice;
  };

  /**
   * Generate unique cart item key (product + variant + modifiers)
   */
  const getCartItemKey = (
    productId: string,
    variant?: ProductVariant,
    modifiers?: ProductModifier[]
  ): string => {
    let key = productId;
    if (variant) key += `-${variant.id}`;
    if (modifiers && modifiers.length > 0) {
      key += `-${modifiers
        .map((m) => m.id)
        .sort()
        .join(",")}`;
    }
    return key;
  };

  // ============================================
  // Cart Operations
  // ============================================

  /**
   * Add product to cart with optional variant and modifiers
   */
  const addToCart = (
    product: Product,
    quantity: number = 1,
    options?: {
      variant?: ProductVariant;
      modifiers?: ProductModifier[];
      notes?: string;
    }
  ) => {
    const variant = options?.variant;
    const modifiers = options?.modifiers;
    const notes = options?.notes;

    // Find existing item with same product + variant + modifiers
    const itemKey = getCartItemKey(product.id, variant, modifiers);
    const existingItem = cartItems.value.find((item) => {
      const existingKey = getCartItemKey(
        item.product.id,
        item.selectedVariant,
        item.selectedModifiers
      );
      return existingKey === itemKey && item.notes === notes;
    });

    if (existingItem) {
      existingItem.quantity += quantity;
      existingItem.total = existingItem.quantity * existingItem.price;
    } else {
      const price = calculateItemPrice(product, variant, modifiers);

      cartItems.value.push({
        product,
        quantity,
        price,
        total: quantity * price,
        selectedVariant: variant,
        selectedModifiers: modifiers,
        notes,
      });
    }

    // Broadcast to other windows
    broadcastCartState();
  };

  /**
   * Remove product from cart by index
   */
  const removeFromCart = (index: number) => {
    if (index >= 0 && index < cartItems.value.length) {
      cartItems.value.splice(index, 1);
      broadcastCartState();
    }
  };

  /**
   * Remove by product ID (removes first match)
   */
  const removeFromCartById = (productId: string) => {
    const index = cartItems.value.findIndex(
      (item) => item.product.id === productId
    );
    if (index !== -1) {
      cartItems.value.splice(index, 1);
      broadcastCartState();
    }
  };

  /**
   * Update item quantity by index
   */
  const updateQuantity = (index: number, quantity: number) => {
    const item = cartItems.value[index];
    if (item) {
      if (quantity <= 0) {
        removeFromCart(index);
      } else {
        item.quantity = quantity;
        item.total = item.quantity * item.price;
        broadcastCartState();
      }
    }
  };

  /**
   * Update item quantity by product ID (for backward compatibility)
   */
  const updateQuantityById = (productId: string, quantity: number) => {
    const index = cartItems.value.findIndex(
      (item) => item.product.id === productId
    );
    if (index !== -1) {
      updateQuantity(index, quantity);
    }
  };

  /**
   * Update item notes
   */
  const updateItemNotes = (index: number, notes: string) => {
    const item = cartItems.value[index];
    if (item) {
      item.notes = notes || undefined;
    }
  };

  /**
   * Update item variant
   */
  const updateItemVariant = (index: number, variant: ProductVariant) => {
    const item = cartItems.value[index];
    if (item) {
      item.selectedVariant = variant;
      item.price = calculateItemPrice(
        item.product,
        variant,
        item.selectedModifiers
      );
      item.total = item.quantity * item.price;
    }
  };

  /**
   * Update item modifiers
   */
  const updateItemModifiers = (index: number, modifiers: ProductModifier[]) => {
    const item = cartItems.value[index];
    if (item) {
      item.selectedModifiers = modifiers;
      item.price = calculateItemPrice(
        item.product,
        item.selectedVariant,
        modifiers
      );
      item.total = item.quantity * item.price;
    }
  };

  /**
   * Clear cart
   */
  const clearCart = () => {
    cartItems.value = [];
    tipAmount.value = 0;
    discountAmount.value = 0; // Reset discount
    appliedPromotions.value = []; // Reset promotions
    customerNote.value = "";
    customerPubkey.value = null;
    customerName.value = null;
    customerId.value = null;
    // Reset order type to defaults
    orderType.value = "dine_in";
    tableNumber.value = "";
    deliveryAddress.value = "";
    customerPhone.value = "";
    scheduledTime.value = "";
    broadcastCartClear();
  };

  /**
   * Set customer for the order
   */
  const setCustomer = (
    customer: {
      id?: string;
      name?: string;
      nostrPubkey?: string;
      phone?: string;
    } | null
  ) => {
    if (customer) {
      customerId.value = customer.id || null;
      customerName.value = customer.name || null;
      customerPubkey.value = customer.nostrPubkey || null;
      if (customer.phone) customerPhone.value = customer.phone;
    } else {
      customerId.value = null;
      customerName.value = null;
      customerPubkey.value = null;
    }
    broadcastCartState();
  };

  /**
   * Set order type with optional details
   */
  const setOrderType = (
    type: OrderType,
    details?: {
      tableNumber?: string;
      deliveryAddress?: string;
      customerPhone?: string;
      scheduledTime?: string;
    }
  ) => {
    orderType.value = type;
    if (details?.tableNumber) tableNumber.value = details.tableNumber;
    if (details?.deliveryAddress)
      deliveryAddress.value = details.deliveryAddress;
    if (details?.customerPhone) customerPhone.value = details.customerPhone;
    if (details?.scheduledTime) scheduledTime.value = details.scheduledTime;
    broadcastCartState();
  };

  /**
   * Set tip amount
   */
  const setTip = (amount: number) => {
    tipAmount.value = amount;
    broadcastCartState();
  };

  /**
   * Set tip as percentage
   */
  const setTipPercentage = (percentage: number) => {
    tipAmount.value = Math.round(subtotal.value * (percentage / 100));
    broadcastCartState();
  };

  // ============================================
  // Promotion Methods
  // ============================================

  /**
   * Apply a promotion to the cart
   */
  const applyPromotion = (promotion: AppliedPromotion) => {
    // Check if promotion is already applied
    const existingIndex = appliedPromotions.value.findIndex(
      (p) => p.promotionId === promotion.promotionId
    );

    if (existingIndex >= 0) {
      // Update existing promotion
      appliedPromotions.value[existingIndex] = promotion;
    } else {
      // Add new promotion
      appliedPromotions.value.push(promotion);
    }

    broadcastCartState();
  };

  /**
   * Remove a promotion from the cart
   */
  const removePromotion = (promotionId: string) => {
    appliedPromotions.value = appliedPromotions.value.filter(
      (p) => p.promotionId !== promotionId
    );
    broadcastCartState();
  };

  /**
   * Clear all applied promotions
   */
  const clearPromotions = () => {
    appliedPromotions.value = [];
    broadcastCartState();
  };

  /**
   * 🎁 Auto-calculate and apply eligible promotions based on cart contents
   *
   * This function automatically evaluates all active promotions and applies discounts
   * to the current cart. Promotions are sorted by priority (higher first) and applied
   * sequentially. Only promotions with calculable discounts are added to the cart.
   *
   * ## Promotion Scopes
   * Determines which products a promotion applies to:
   * - **all**: Applies to all products in cart
   * - **products**: Applies only to specific products (via triggerProductIds)
   * - **categories**: Applies only to products in specific categories (via triggerCategoryIds)
   *
   * ## Promotion Types & Calculation Logic
   *
   * ### 1. BOGO (Buy One Get One) / Freebie
   * **How it works**: Customer buys X quantity of trigger products, gets Y reward products free
   *
   * **Requirements**:
   * - `triggerProductIds`: Products that trigger the promotion
   * - `triggerQuantity`: How many trigger products needed (e.g., 2 for "Buy 2")
   * - `rewardType`: Type of reward (free_product, discount, percentage_off)
   * - `rewardProductIds`: Products given free (for free_product type)
   * - `rewardQuantity`: How many reward products given (e.g., 1 for "Get 1")
   * - `rewardDiscount`: Discount amount (for discount/percentage_off types)
   *
   * **Calculation**:
   * 1. Count trigger products in cart (only those matching triggerProductIds)
   * 2. Calculate times applied: floor(triggerCount / (triggerQuantity + rewardQuantity))
   * 3. Apply max uses limit if specified
   * 4. Calculate discount based on rewardType:
   *    - free_product: reward product price × reward quantity × times applied
   *    - discount: fixed amount × times applied
   *    - percentage_off: percentage of applicable items total
   *
   * **Example**: Buy 2 Coffee, Get 1 Free
   * - triggerProductIds: [coffee-id]
   * - triggerQuantity: 2
   * - rewardQuantity: 1
   * - Cart: 6 coffees → Applies 2 times (floor(6/(2+1))) → 2 free coffees, pay for 4
   *
   * ### 2. Discount
   * **How it works**: Flat or percentage discount on applicable products
   *
   * **Requirements**:
   * - `discountType`: percentage or fixed
   * - `discountValue`: Amount (e.g., 10 for 10% or 10 for ฿10)
   *
   * **Calculation**:
   * - percentage: (items total × discount value) / 100
   * - fixed: min(discount value, items total) - can't exceed total
   *
   * **Example 1**: 20% off all drinks
   * - scope: categories
   * - triggerCategoryIds: [drinks-category-id]
   * - discountType: percentage
   * - discountValue: 20
   * - Cart total ฿100 drinks → Discount ฿20
   *
   * **Example 2**: ฿50 off order
   * - scope: all
   * - discountType: fixed
   * - discountValue: 50
   * - Cart total ฿200 → Discount ฿50
   *
   * ### 3. Tiered Discount
   * **How it works**: Different discounts based on quantity purchased
   *
   * **Requirements**:
   * - `tiers`: Array of {minQuantity, discountType, discountValue}
   *
   * **Calculation**:
   * 1. Count total quantity of applicable items
   * 2. Find highest tier where quantity >= minQuantity
   * 3. Apply that tier's discount (percentage or fixed)
   *
   * **Example**: Volume discount on coffee
   * - Tiers:
   *   - 3+ coffees: 10% off
   *   - 5+ coffees: 15% off
   *   - 10+ coffees: 20% off
   * - Cart: 6 coffees @ ฿30 each = ฿180
   * - Applies 15% tier → Discount ฿27 (180 × 0.15)
   *
   * ### 4. Bundle
   * **How it works**: Discount when buying specific products together
   *
   * **Requirements**:
   * - `triggerProductIds`: Array of product IDs that must ALL be in cart
   * - `discountValue`: Percentage off the bundle
   *
   * **Calculation**:
   * 1. Check if ALL required products are in cart
   * 2. If yes, apply percentage discount to bundle total
   * 3. If no, skip promotion
   *
   * **Example**: Meal combo (burger + fries + drink)
   * - triggerProductIds: [burger-id, fries-id, drink-id]
   * - discountValue: 15
   * - Cart: Has all 3 products, total ฿120 → Discount ฿18 (120 × 0.15)
   * - Cart: Missing fries → No discount applied
   *
   * ## Priority & Max Uses
   * - Promotions sorted by `priority` field (higher = applied first)
   * - `maxUsesPerOrder`: Limits how many times a promotion can apply in single order
   *
   * ## Output
   * Updates `appliedPromotions` array with:
   * - promotionId, promotionName, type
   * - triggerItemIds: Products that triggered the promotion
   * - rewardItemIds: Products given as rewards (for BOGO)
   * - discountAmount: Total discount value (rounded)
   * - description: Human-readable description (e.g., "Buy 2 Get 1 Free")
   * - timesApplied: How many times promotion was applied
   */
  const calculatePromotions = async () => {
    try {
      // Initialize if needed
      if (!promotionsStore.isInitialized.value) {
        await promotionsStore.init();
      }

      if (cartItems.value.length === 0) {
        appliedPromotions.value = [];
        return;
      }

      const activePromotions = promotionsStore.activePromotions.value;
      const newAppliedPromotions: AppliedPromotion[] = [];

      // Sort promotions by priority (higher first)
      const sortedPromotions = [...activePromotions].sort(
        (a, b) => b.priority - a.priority
      );

      for (const promotion of sortedPromotions) {
        let discountAmount = 0;
        let description = "";
        const triggerItemIds: string[] = [];
        const rewardItemIds: string[] = [];
        let timesApplied = 0;

        // Check if promotion applies to cart
        const applicableItems = cartItems.value.filter((item) => {
          if (promotion.scope === "all") return true;
          if (
            promotion.scope === "products" &&
            promotion.triggerProductIds?.includes(item.product.id)
          )
            return true;
          if (
            promotion.scope === "categories" &&
            promotion.triggerCategoryIds?.includes(item.product.categoryId)
          )
            return true;
          return false;
        });

        if (applicableItems.length === 0) continue;

        // Calculate discount based on promotion type
        switch (promotion.type) {
          case "bogo":
          case "freebie": {
            // Count trigger products
            let triggerCount = 0;
            applicableItems.forEach((item) => {
              if (promotion.triggerProductIds?.includes(item.product.id)) {
                triggerCount += item.quantity;
                triggerItemIds.push(item.product.id);
              }
            });

            // Calculate how many times BOGO applies
            // For "Buy X Get Y Free", you need (X + Y) items total for 1 application
            // Example: Buy 1 Get 1 = need 2 items for 1 free
            // Example: Buy 2 Get 1 = need 3 items for 1 free
            const triggerQty = promotion.triggerQuantity || 1;
            const rewardQty = promotion.rewardQuantity || 1;
            const totalNeeded = triggerQty + rewardQty;

            timesApplied = Math.floor(triggerCount / totalNeeded);

            // Respect max uses per order
            if (promotion.maxUsesPerOrder) {
              timesApplied = Math.min(timesApplied, promotion.maxUsesPerOrder);
            }

            if (timesApplied > 0) {
              // Calculate reward value
              if (promotion.rewardType === "free_product") {
                const rewardQty =
                  (promotion.rewardQuantity || 1) * timesApplied;
                // Find reward product price
                promotion.rewardProductIds?.forEach((productId) => {
                  const product = productsStore.getProduct(productId);
                  if (product) {
                    discountAmount += product.price * rewardQty;
                    rewardItemIds.push(productId);
                  }
                });
                description = `Buy ${promotion.triggerQuantity} Get ${promotion.rewardQuantity} Free`;
              } else if (promotion.rewardType === "discount") {
                discountAmount = (promotion.rewardDiscount || 0) * timesApplied;
                description = `฿${promotion.rewardDiscount} off`;
              } else if (promotion.rewardType === "percentage_off") {
                const itemsTotal = applicableItems.reduce(
                  (sum, item) => sum + item.total,
                  0
                );
                discountAmount =
                  (itemsTotal * (promotion.rewardDiscount || 0)) / 100;
                description = `${promotion.rewardDiscount}% off`;
              }
            }
            break;
          }

          case "discount": {
            const itemsTotal = applicableItems.reduce(
              (sum, item) => sum + item.total,
              0
            );
            applicableItems.forEach((item) =>
              triggerItemIds.push(item.product.id)
            );

            if (promotion.discountType === "percentage") {
              discountAmount =
                (itemsTotal * (promotion.discountValue || 0)) / 100;
              description = `${promotion.discountValue}% off`;
            } else if (promotion.discountType === "fixed") {
              discountAmount = Math.min(
                promotion.discountValue || 0,
                itemsTotal
              );
              description = `฿${promotion.discountValue} off`;
            }
            timesApplied = 1;
            break;
          }

          case "tiered": {
            const totalQuantity = applicableItems.reduce(
              (sum, item) => sum + item.quantity,
              0
            );
            const itemsTotal = applicableItems.reduce(
              (sum, item) => sum + item.total,
              0
            );
            applicableItems.forEach((item) =>
              triggerItemIds.push(item.product.id)
            );

            // Find applicable tier
            if (promotion.tiers && promotion.tiers.length > 0) {
              const applicableTiers = promotion.tiers
                .filter((tier) => totalQuantity >= tier.minQuantity)
                .sort((a, b) => b.minQuantity - a.minQuantity);

              if (applicableTiers.length > 0) {
                const tier = applicableTiers[0];
                if (tier) {
                  if (tier.discountType === "percentage") {
                    discountAmount = (itemsTotal * tier.discountValue) / 100;
                    description = `Buy ${tier.minQuantity}+ get ${tier.discountValue}% off`;
                  } else {
                    discountAmount = Math.min(tier.discountValue, itemsTotal);
                    description = `Buy ${tier.minQuantity}+ get ฿${tier.discountValue} off`;
                  }
                  timesApplied = 1;
                }
              }
            }
            break;
          }

          case "bundle": {
            // Check if all required products are in cart
            const hasAllProducts = promotion.triggerProductIds?.every(
              (productId) =>
                cartItems.value.some((item) => item.product.id === productId)
            );

            if (hasAllProducts) {
              const bundleTotal = applicableItems.reduce(
                (sum, item) => sum + item.total,
                0
              );
              applicableItems.forEach((item) =>
                triggerItemIds.push(item.product.id)
              );

              discountAmount =
                (bundleTotal * (promotion.discountValue || 0)) / 100;
              description = `${promotion.discountValue}% off bundle`;
              timesApplied = 1;
            }
            break;
          }
        }

        // Add promotion if discount was calculated
        if (discountAmount > 0) {
          newAppliedPromotions.push({
            promotionId: promotion.id,
            promotionName: promotion.name,
            type: promotion.type,
            triggerItemIds,
            rewardItemIds,
            discountAmount: Math.round(discountAmount),
            discountType: promotion.discountType,
            timesApplied,
            description,
          });
        }
      }

      // Update applied promotions
      appliedPromotions.value = newAppliedPromotions;
      broadcastCartState();
    } catch (error) {
      console.error("Failed to calculate promotions:", error);
    }
  };

  // ============================================
  // Cart Calculations
  // ============================================

  const subtotal = computed(() => {
    return cartItems.value.reduce((sum, item) => sum + item.total, 0);
  });

  const tax = computed(() => {
    // Use tax composable with category-aware calculation
    // Each cart item can have a category from product
    const itemsWithCategory = cartItems.value.map((item) => ({
      total: item.total,
      category: item.product.categoryId, // Use categoryId from Product type
    }));
    return taxHelper.calculateTax(itemsWithCategory);
  });

  // Calculate total promotion discount
  const promotionDiscount = computed(() => {
    return appliedPromotions.value.reduce(
      (sum, promo) => sum + promo.discountAmount,
      0
    );
  });

  const total = computed(() => {
    return Math.max(
      0,
      subtotal.value +
        tax.value +
        tipAmount.value -
        promotionDiscount.value -
        discountAmount.value
    );
  });

  const totalSats = computed(() => {
    // Only calculate if we have a valid total
    if (total.value <= 0) return 0;
    const sats = currency.toSats(total.value, selectedCurrency.value);
    return sats;
  });

  const itemCount = computed(() => {
    return cartItems.value.reduce((sum, item) => sum + item.quantity, 0);
  });

  const cart = computed<Cart>(() => ({
    items: cartItems.value,
    subtotal: subtotal.value,
    tax: tax.value,
    tip: tipAmount.value,
    total: total.value,
    totalSats: totalSats.value,
    currency: selectedCurrency.value,
  }));

  // ============================================
  // Order Creation
  // ============================================

  /**
   * Create order from cart
   */
  const createOrder = (paymentMethod: PaymentMethod): Order => {
    const { id: orderId, code: orderCode } = EntityId.order();

    // Determine customer display name
    const customerDisplay =
      customerName.value ||
      (customerPubkey.value
        ? `nostr:${customerPubkey.value.slice(0, 8)}`
        : "Walk-in");

    // Get active branch ID
    let branchId = currentSession.value?.branchId;

    // If no session branch, try to get from shop config
    if (!branchId) {
      if (typeof window !== "undefined") {
        const storedConfig = localStorage.getItem("bitspace_shop_config");
        if (storedConfig) {
          try {
            const config = JSON.parse(storedConfig);
            branchId = config.branchId;
          } catch (e) {
            /* ignore */
          }
        }
      }
    }

    const order: Order = {
      id: orderId,
      code: orderCode,
      customer: customerDisplay,
      customerPubkey: customerPubkey.value || undefined,
      branch: branchId || "main", // Use found branchId or default
      date: new Date().toISOString(),
      total: total.value,
      totalSats: totalSats.value,
      currency: selectedCurrency.value,
      status: "pending",
      paymentMethod,
      notes: customerNote.value || undefined,
      tip: tipAmount.value > 0 ? tipAmount.value : undefined,
      discount: discountAmount.value > 0 ? discountAmount.value : undefined,
      appliedPromotions:
        appliedPromotions.value.length > 0
          ? appliedPromotions.value
          : undefined,
      kitchenStatus: "new",
      // Order type fields
      orderType: orderType.value,
      tableNumber: tableNumber.value || undefined,
      deliveryAddress: deliveryAddress.value || undefined,
      customerPhone: customerPhone.value || undefined,
      scheduledTime: scheduledTime.value || undefined,
      items: cartItems.value.map((item) => ({
        id: generateUUIDv7(),
        productId: item.product.id,
        quantity: item.quantity,
        price: item.price,
        total: item.total,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        product: item.product,
        selectedVariant: item.selectedVariant,
        selectedModifiers: item.selectedModifiers,
        notes: item.notes,
        kitchenStatus: "pending",
      })),
      isOffline: !navigator.onLine,
    };

    return order;
  };

  // ============================================
  // Session Management
  // ============================================

  /**
   * Start new POS session
   */
  const startSession = (
    branchId: string,
    staffId: string,
    openingBalance: number = 0
  ): POSSession => {
    const session: POSSession = {
      id: generateUUIDv7(),
      branchId,
      staffId,
      startedAt: new Date().toISOString(),
      openingBalance,
      totalSales: 0,
      totalOrders: 0,
      cashSales: 0,
      lightningSales: 0,
      status: "active",
    };

    currentSession.value = session;

    // Store in localStorage for persistence
    localStorage.setItem("pos_session", JSON.stringify(session));

    return session;
  };

  /**
   * End current session
   */
  const endSession = (closingBalance: number): POSSession | null => {
    if (!currentSession.value) return null;

    currentSession.value.endedAt = new Date().toISOString();
    currentSession.value.closingBalance = closingBalance;
    currentSession.value.status = "closed";

    const session = { ...currentSession.value };

    // Clear session
    localStorage.removeItem("pos_session");
    currentSession.value = null;

    return session;
  };

  /**
   * Update session totals after order
   */
  const updateSessionTotals = (order: Order) => {
    if (!currentSession.value) return;

    currentSession.value.totalSales += order.total;
    currentSession.value.totalOrders += 1;

    if (order.paymentMethod === "cash") {
      currentSession.value.cashSales += order.total;
    } else if (
      order.paymentMethod === "lightning" ||
      order.paymentMethod === "bolt12"
    ) {
      currentSession.value.lightningSales += order.total;
    }

    localStorage.setItem("pos_session", JSON.stringify(currentSession.value));
  };

  /**
   * Restore session from localStorage
   */
  const restoreSession = () => {
    const stored = localStorage.getItem("pos_session");
    if (stored) {
      try {
        const session = JSON.parse(stored) as POSSession;
        if (session.status === "active") {
          currentSession.value = session;
        }
      } catch {
        localStorage.removeItem("pos_session");
      }
    }
  };

  // ============================================
  // Quick Actions
  // ============================================

  /**
   * Apply discount and track amount for receipts
   */
  const applyDiscount = (type: "percentage" | "fixed", value: number) => {
    if (value === 0) {
      // Reset discount
      discountAmount.value = 0;
      return;
    }

    if (type === "percentage") {
      // Calculate and store discount amount before modifying prices
      const discount = Math.round(subtotal.value * (value / 100));
      discountAmount.value = discount;
      // Apply percentage discount to each item
      cartItems.value.forEach((item) => {
        item.price = item.price * (1 - value / 100);
        item.total = item.quantity * item.price;
      });
    } else {
      // Fixed discount - store the value directly
      discountAmount.value = value;
      // Apply fixed discount proportionally
      const discountRatio = value / subtotal.value;
      cartItems.value.forEach((item) => {
        item.price = item.price * (1 - discountRatio);
        item.total = item.quantity * item.price;
      });
    }
    broadcastCartState();
  };

  /**
   * Change currency
   */
  const changeCurrency = (newCurrency: CurrencyCode) => {
    const oldCurrency = selectedCurrency.value;
    selectedCurrency.value = newCurrency;

    // Convert prices
    cartItems.value.forEach((item) => {
      item.price = currency.convert(item.price, oldCurrency, newCurrency);
      item.total = item.quantity * item.price;
    });

    if (tipAmount.value > 0) {
      tipAmount.value = currency.convert(
        tipAmount.value,
        oldCurrency,
        newCurrency
      );
    }
  };

  // Initialize on mount
  restoreSession();

  return {
    // Cart State
    cartItems,
    selectedCurrency,
    tipAmount,
    discountAmount, // Discount amount for receipts
    appliedPromotions, // Applied promotions
    taxSettings: taxHelper.settings, // Tax settings from useTax
    customerNote,
    customerPubkey,
    customerName,
    customerId,

    // Computed
    subtotal,
    tax,
    promotionDiscount,
    total,
    totalSats,
    itemCount,
    cart,

    // Session
    currentSession,
    isSessionActive,

    // Cart Methods
    addToCart,
    removeFromCart,
    removeFromCartById,
    updateQuantity,
    updateQuantityById,
    updateItemNotes,
    updateItemVariant,
    updateItemModifiers,
    clearCart,
    setTip,
    setTipPercentage,
    applyDiscount,
    changeCurrency,
    calculateItemPrice,

    // Promotion Methods
    applyPromotion,
    removePromotion,
    clearPromotions,
    calculatePromotions,

    // Order
    createOrder,

    // Session Methods
    startSession,
    endSession,
    updateSessionTotals,
    restoreSession,

    // Payment state (for customer display sync)
    paymentState,
    setPaymentState,

    // Order type
    orderType,
    tableNumber,
    deliveryAddress,
    customerPhone,
    scheduledTime,
    setOrderType,

    // Customer
    setCustomer,
  };
};
