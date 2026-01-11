<!-- pages/pos/index.vue -->
<!-- 🛒 Full-Featured POS Terminal - Lightning + Nostr -->
<script setup lang="ts">
import type {
  Product,
  ProductVariant,
  ProductModifier,
  PaymentMethod,
  AppliedCoupon,
  Order,
  OrderType,
} from "~/types";
import {
  POS_CURRENCY_OPTIONS,
  getCurrencySelectOptions,
  CURRENCY_OPTIONS,
} from "~/composables/use-currency";
definePageMeta({
  layout: "blank",
  middleware: ["auth"],
});

useHead({
  title: "POS - bnos.space",
  meta: [
    {
      name: "description",
      content: "POS - bnos.space",
    },
    {
      name: "keywords",
      content: "POS, bnos.space",
    },
    {
      name: "author",
      content: "bnos.space",
    },
    {
      name: "robots",
      content: "index, follow",
    },
  ],
});

// ============================================
// Composables
// ============================================
const shop = useShop();
const pos = usePOS();
const productsStore = useProducts();
const ordersStore = useOrders();
const tablesStore = useTables();
const lightning = useLightning();
const currency = useCurrency();
const promotionsStore = usePromotionsStore();
const couponsStore = useCoupons();
const posSettings = usePOSSettings(); // POS settings for auto-close kitchen

const branches = computed(() => productsStore.branches.value);

const offline = useOffline();
const sound = useSound();
const receipt = useReceipt();
const receiptGenerator = useReceiptGenerator();
const customersStore = useCustomers();
const tableSession = useTableSession();
const { t } = useI18n();
const orderSyncNotifications = useOrderSyncNotifications();
const toast = useToast();
// ============================================
// UI State
// ============================================
const showPaymentModal = ref(false);
const showReceiptModal = ref(false);
const showDiscountModal = ref(false);
const showCustomItemModal = ref(false);
const showHeldOrdersModal = ref(false);
const showSettingsModal = ref(false);
const showProductOptionsModal = ref(false);
const showMobileCart = ref(false); // Mobile cart slide-up panel
const showExtras = ref(false); // Toggle for coupon/discount/tip section
const filterByPromotions = ref(false); // Filter to show only products with promotions
const showTableSwitcher = ref(false); // Table switcher modal
const showPendingOrdersModal = ref(false); // Pending orders for payment
const showSplitBillModal = ref(false); // Split bill modal
const showCustomerModal = ref(false); // Customer lookup modal
const showBarcodeScannerModal = ref(false); // Barcode scanner modal
const showVoidOrderModal = ref(false); // Void/cancel order modal
const orderToVoid = ref<{ id: string; orderNumber?: string } | null>(null); // Order being cancelled
const barcodeScannerMode = ref<"keyboard" | "camera">("keyboard"); // Scanner mode
const showPaymentOrderDetails = ref(false); // Toggle order details in payment modal
// Per-order: Auto-close kitchen status when payment completes (defaults to global setting)
const autoCloseKitchenOnPayment = ref(
  posSettings.autoCloseKitchenStatusOnPayment.value
);
const splitOrder = ref<Order | null>(null); // Order being split

// Reset checkbox to global setting when payment modal opens
watch(showPaymentModal, (isOpen) => {
  if (isOpen) {
    autoCloseKitchenOnPayment.value =
      posSettings.autoCloseKitchenStatusOnPayment.value;
  }
});
const splitCount = ref(2); // Number of people splitting
const splitPaidCount = ref(0); // Number of portions already paid
const splitPayments = ref<
  Array<{
    portionNumber: number;
    amount: number;
    method: PaymentMethod;
    paidAt: string;
    proof?: unknown;
  }>
>([]); // Track individual split payments
const isProcessingSplit = ref(false); // Separate flag for split payment processing
const isProcessing = ref(false);

// Open camera scanner directly
const openCameraScanner = () => {
  barcodeScannerMode.value = "camera";
  showBarcodeScannerModal.value = true;
};

// Numpad modal state
const showNumpad = ref(false);
const numpadTarget = ref<number | null>(null);
const numpadInitialValue = ref(0);

// Completed order for receipt
const completedOrder = ref<Order | null>(null);
const completedPaymentMethod = ref<PaymentMethod>("cash");

// Default payment method (when clicking specific payment buttons)
const defaultPaymentMethod = ref<PaymentMethod | null>(null);

// Coupon
const appliedCoupon = ref<AppliedCoupon | null>(null);

// Product options selection
const selectedProduct = ref<Product | null>(null);
const selectedVariant = ref<ProductVariant | null>(null);
const selectedModifiers = ref<ProductModifier[]>([]);
const productQuantity = ref(1);

// Item notes modal state
const showItemNotesModal = ref(false);
const editingItemIndex = ref<number | null>(null);
const editingItemNotes = ref("");
const editingItemName = ref("");

// Custom item modal state (removed - now handled in component)

// Discount tracking (for display in cart)
const discountType = ref<"percentage" | "fixed">("percentage");
const discountValue = ref(0);

// Held orders storage
const heldOrders = ref<
  Array<{
    id: string;
    code?: string;
    orderNumber?: number;
    items: typeof pos.cartItems.value;
    total: number;
    createdAt: string;
    tableNumber?: string;
  }>
>([]);

// Tables data (loaded from localStorage or tablesStore)
const tables = ref<
  Array<{
    id: string;
    name: string;
    number?: string;
    status: "available" | "occupied" | "reserved" | "cleaning" | "unavailable";
    seats: number;
  }>
>([]);

// Customer selection state
const selectedCustomer = ref<(typeof customersStore.customers.value)[0] | null>(
  null
);

const selectCustomer = (
  customer: (typeof customersStore.customers.value)[0]
) => {
  selectedCustomer.value = customer;
  // Set customer in POS composable for order creation
  pos.setCustomer({
    id: customer.id,
    name: customer.name,
    nostrPubkey: customer.nostrPubkey,
    phone: customer.phone,
  });

  toast.add({
    title: "Customer Selected",
    description: customer.name || "Customer",
    color: "green",
  });
};

const clearCustomer = () => {
  selectedCustomer.value = null;
  pos.setCustomer(null);
};

// Pending customer orders count (for kitchen badge)
const pendingKitchenOrders = computed(
  () =>
    ordersStore.orders.value.filter(
      (o) =>
        (o.status === "pending" || o.status === "processing") &&
        o.kitchenStatus === "new"
    ).length
);

// List of pending orders for payment (cafe pay-later)
// Filter out bill request placeholders (total = 0)
const pendingOrdersList = computed(() =>
  ordersStore.orders.value
    .filter((o) => o.status === "pending" && o.total > 0)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
);

// Selected pending order for payment
const selectedPendingOrder = ref<Order | null>(null);

// Merge orders feature
const isMergeMode = ref(false);
const ordersToMerge = ref<Order[]>([]);

const toggleOrderForMerge = (order: Order) => {
  const index = ordersToMerge.value.findIndex((o) => o.id === order.id);
  if (index === -1) {
    ordersToMerge.value.push(order);
  } else {
    ordersToMerge.value.splice(index, 1);
  }
};

const isOrderSelectedForMerge = (orderId: string) => {
  return ordersToMerge.value.some((o) => o.id === orderId);
};

const mergeSelectedOrders = async () => {
  const toast = useToast();
  if (ordersToMerge.value.length < 2) {
    toast.add({
      title: "Select at least 2 orders",
      description: "Please select multiple orders to merge",
      icon: "i-heroicons-exclamation-triangle",
      color: "yellow",
    });
    return;
  }

  // Clear cart and load all items from selected orders
  pos.clearCart();

  for (const order of ordersToMerge.value) {
    for (const item of order.items) {
      pos.addToCart(item.product, item.quantity);
    }
  }

  // Get table info from first order
  const firstOrder = ordersToMerge.value[0];
  if (firstOrder?.tableNumber) {
    pos.tableNumber.value = firstOrder.tableNumber;
    pos.setOrderType("dine_in");
  }

  // Mark original orders as merged/canceled
  for (const order of ordersToMerge.value) {
    order.status = "canceled";
    order.kitchenNotes = `Merged with other orders at ${new Date().toISOString()}`;
    await ordersStore.updateOrder(order.id, order);
  }

  toast.add({
    title: `Merged ${ordersToMerge.value.length} orders`,
    description: "Items loaded into cart. Complete payment when ready.",
    icon: "i-heroicons-check-circle",
    color: "green",
  });

  // Reset merge mode
  ordersToMerge.value = [];
  isMergeMode.value = false;
};

// Editing existing order state
const editingOrderId = ref<string | null>(null);
const isEditingOrder = computed(() => !!editingOrderId.value);

// Split bill computed values
const splitAmountPerPerson = computed(() => {
  if (!splitOrder.value || splitCount.value < 2) return 0;
  return Math.ceil(splitOrder.value.total / splitCount.value);
});

const splitRemainingAmount = computed(() => {
  if (!splitOrder.value || splitCount.value < 2) return 0;
  // Calculate based on actual payments made
  const totalPaid = splitPayments.value.reduce((sum, p) => sum + p.amount, 0);
  return Math.max(0, splitOrder.value.total - totalPaid);
});

const splitRemainingSplits = computed(() => {
  return splitCount.value - splitPaidCount.value;
});

// Tax settings
const taxEnabled = ref(false);
const taxRatePercent = ref(10); // Default 10% (common VAT rate)
const taxInclusive = ref(false); // false = add tax on top, true = tax included in price

// Current time display
const currentTime = ref(new Date());
let timeInterval: ReturnType<typeof setInterval>;

// Order types for selector
const orderTypes: Array<{ value: OrderType; label: string; icon: string }> = [
  { value: "dine_in", label: "Dine In", icon: "🍽️" },
  { value: "take_away", label: "Take Away", icon: "🥡" },
  { value: "delivery", label: "Delivery", icon: "🛵" },
  { value: "pickup", label: "Pickup", icon: "🏃" },
];

// ============================================
// Computed
// ============================================

// Available tables for switching
const availableTables = computed(() =>
  tables.value.filter(
    (t) => t.status === "available" || t.name === pos.tableNumber.value
  )
);

// Current table info
const currentTable = computed(() =>
  tables.value.find((t) => t.name === pos.tableNumber.value)
);

const formattedTime = computed(() => {
  return currentTime.value.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
});

const formattedDate = computed(() => {
  return currentTime.value.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
});

// Calculate selected product total price
const selectedProductPrice = computed(() => {
  if (!selectedProduct.value) return 0;
  return pos.calculateItemPrice(
    selectedProduct.value,
    selectedVariant.value || undefined,
    selectedModifiers.value
  );
});

// Category icons mapping
const categoryIcons: Record<string, string> = {
  all: "🏪",
  drinks: "🍹",
  food: "🍽️",
  desserts: "🍰",
  snacks: "🍿",
  favorites: "⭐",
};

// Tip options
const tipOptions = [
  { label: "No Tip", value: 0 },
  { label: "5%", value: 5 },
  { label: "10%", value: 10 },
  { label: "15%", value: 15 },
  { label: "20%", value: 20 },
];

// ============================================
// Promotion Helpers
// ============================================

// Check if a product has active promotions
const hasPromotion = (productId: string): boolean => {
  return promotionsStore.activePromotions.value.some((promo) => {
    if (promo.scope === "all") return true;
    if (
      promo.scope === "products" &&
      promo.triggerProductIds?.includes(productId)
    )
      return true;
    const product = productsStore.getProduct(productId);
    if (
      promo.scope === "categories" &&
      product &&
      promo.triggerCategoryIds?.includes(product.categoryId)
    )
      return true;
    return false;
  });
};

// Get promotion count for a product
const getProductPromotionCount = (productId: string): number => {
  return promotionsStore.activePromotions.value.filter((promo) => {
    if (promo.scope === "all") return true;
    if (
      promo.scope === "products" &&
      promo.triggerProductIds?.includes(productId)
    )
      return true;
    const product = productsStore.getProduct(productId);
    if (
      promo.scope === "categories" &&
      product &&
      promo.triggerCategoryIds?.includes(product.categoryId)
    )
      return true;
    return false;
  }).length;
};

// Filter products by promotions
const displayedProducts = computed(() => {
  const filtered = productsStore.filteredProducts.value;
  if (!filterByPromotions.value) {
    return filtered;
  }
  return filtered.filter((product) => hasPromotion(product.id));
});

// Count products with promotions
const productsWithPromotionsCount = computed(() => {
  return productsStore.filteredProducts.value.filter((product) =>
    hasPromotion(product.id)
  ).length;
});

// Auto-calculate promotions when cart changes
watch(
  () => pos.cartItems.value,
  async () => {
    if (pos.cartItems.value.length > 0) {
      await pos.calculatePromotions();
    } else {
      pos.clearPromotions();
    }
  },
  { deep: true }
);

// ============================================
// Product Methods
// ============================================
const selectProduct = (product: Product) => {
  // If product has variants or modifiers, show options modal
  if (product.hasVariants && product.variants && product.variants.length > 0) {
    selectedProduct.value = product;
    // Select default variant
    selectedVariant.value =
      product.variants.find((v) => v.isDefault) || product.variants[0] || null;
    selectedModifiers.value = [];
    productQuantity.value = 1;
    showProductOptionsModal.value = true;
  } else if (product.modifierGroups && product.modifierGroups.length > 0) {
    selectedProduct.value = product;
    selectedVariant.value = null;
    // Select default modifiers
    selectedModifiers.value = product.modifierGroups.flatMap((g) =>
      g.modifiers.filter((m) => m.isDefault)
    );
    productQuantity.value = 1;
    showProductOptionsModal.value = true;
  } else {
    // No options, add directly
    pos.addToCart(product);
  }
};

// Handle barcode scan - find product and add to cart
const handleBarcodeScan = (code: string) => {
  // Search by SKU or barcode
  const product = productsStore.products.value.find(
    (p) =>
      p.sku?.toLowerCase() === code.toLowerCase() ||
      p.barcode?.toLowerCase() === code.toLowerCase()
  );

  if (product) {
    selectProduct(product);
    showBarcodeScannerModal.value = false;

    // Success toast
    const toast = useToast();
    toast.add({
      title: t("pos.scanner.productFound", "Product Found"),
      description: product.name,
      icon: "i-heroicons-check-circle",
      color: "green",
    });
  } else {
    // Not found - put code in search
    productsStore.searchQuery.value = code;
    showBarcodeScannerModal.value = false;

    const toast = useToast();
    toast.add({
      title: t("pos.scanner.notFound", "Product Not Found"),
      description:
        t("pos.scanner.searchingFor", { code }) || `Searching for: ${code}`,
      icon: "i-heroicons-magnifying-glass",
      color: "amber",
    });
  }
};

const addProductWithOptions = () => {
  if (!selectedProduct.value) return;

  pos.addToCart(selectedProduct.value, productQuantity.value, {
    variant: selectedVariant.value || undefined,
    modifiers:
      selectedModifiers.value.length > 0 ? selectedModifiers.value : undefined,
  });

  // Play scan beep
  sound.playScanBeep();

  // Reset and close
  showProductOptionsModal.value = false;
  selectedProduct.value = null;
  selectedVariant.value = null;
  selectedModifiers.value = [];
  productQuantity.value = 1;
};

const toggleModifier = (modifier: ProductModifier) => {
  const index = selectedModifiers.value.findIndex((m) => m.id === modifier.id);
  if (index === -1) {
    selectedModifiers.value.push(modifier);
  } else {
    selectedModifiers.value.splice(index, 1);
  }
};

const handleQuantityChange = (index: number, delta: number) => {
  const item = pos.cartItems.value[index];
  if (item) {
    pos.updateQuantity(index, item.quantity + delta);
  }
};

const openNumpad = (index: number, currentQty: number) => {
  numpadTarget.value = index;
  numpadInitialValue.value = currentQty;
  showNumpad.value = true;
};

const handleNumpadConfirm = (qty: number) => {
  if (numpadTarget.value !== null) {
    pos.updateQuantity(numpadTarget.value, qty);
  }
  numpadTarget.value = null;
  numpadInitialValue.value = 0;
};

// ============================================
// Item Notes
// ============================================
const openItemNotes = (index: number) => {
  const item = pos.cartItems.value[index];
  if (!item) return;

  editingItemIndex.value = index;
  editingItemNotes.value = item.notes || "";
  editingItemName.value = item.product.name;
  showItemNotesModal.value = true;
};

const saveItemNotes = (notes: string) => {
  if (editingItemIndex.value !== null) {
    pos.updateItemNotes(editingItemIndex.value, notes);
  }
  editingItemIndex.value = null;
  editingItemNotes.value = "";
  editingItemName.value = "";
};

// ============================================
// Quick Actions
// ============================================
const holdOrder = () => {
  if (pos.cartItems.value.length === 0) return;

  heldOrders.value.push({
    id: `HOLD-${Date.now()}`,
    items: [...pos.cartItems.value],
    total: pos.total.value,
    createdAt: new Date().toISOString(),
  });

  pos.clearCart();
};

/**
 * Send order to kitchen with pending payment (cafe-style "pay later")
 * Creates a real order with status=pending, sends to kitchen display
 * Customer can pay when ready to leave
 */
const sendToKitchen = async () => {
  if (pos.cartItems.value.length === 0) return;

  if (isEditingOrder.value) {
    await updateExistingOrder();
    return;
  }

  isProcessing.value = true;

  try {
    // Create order with PENDING status (not paid yet)
    const order = pos.createOrder("pending" as PaymentMethod);
    order.status = "pending"; // Not paid yet
    order.kitchenStatus = "new"; // Ready for kitchen

    // Link to table if dine-in
    if (pos.tableNumber.value) {
      order.tableNumber = pos.tableNumber.value;
      order.orderType = "dine_in";
    }

    // Add kitchen notes from cart items
    order.kitchenNotes = pos.cartItems.value
      .filter((item) => item.notes)
      .map((item) => `${item.product.name}: ${item.notes}`)
      .join("; ");

    // Save order to local DB and sync to Nostr
    await ordersStore.createOrder(order);

    // Update table status to 'occupied' if a table is selected
    if (pos.tableNumber.value) {
      const table = tablesStore.tables.value.find(
        (t) =>
          t.name === pos.tableNumber.value || t.number === pos.tableNumber.value
      );
      if (table && table.status === "available") {
        // Use seatTable to properly set status and link order
        await tablesStore.seatTable(table.id, 1, order.id, "staff");
      } else if (table) {
        // Table already occupied, just link the new order
        await tablesStore.updateTable(table.id, { currentOrderId: order.id });
      }
    }

    // Update POS session
    pos.updateSessionTotals(order);

    // Play notification sound
    sound.playNotification();

    // Clear cart
    pos.clearCart();

    // Show success toast
    const toast = useToast();
    toast.add({
      title: t("pos.orderSentToKitchen", "Order Sent to Kitchen!"),
      description: `${
        order.orderNumber ? "#" + order.orderNumber + " - " : ""
      }${order.code || order.id} - ${t(
        "pos.payLater",
        "Pay when ready to leave"
      )}`,
      icon: "i-heroicons-check-circle",
      color: "green",
    });
  } catch (e) {
    console.error("Failed to send order to kitchen:", e);
    const toast = useToast();
    toast.add({
      title: t("common.error", "Error"),
      description: String(e),
      icon: "i-heroicons-exclamation-triangle",
      color: "red",
    });
  } finally {
    isProcessing.value = false;
  }
};

const updateExistingOrder = async () => {
  if (!editingOrderId.value) return;
  isProcessing.value = true;

  try {
    const updates: Partial<Order> = {
      items: pos.cartItems.value.map((item, idx) => ({
        id: item.id || `ITEM-${Date.now()}-${idx}`,
        productId: item.product.id,
        quantity: item.quantity,
        price: item.price,
        total: item.total,
        product: item.product,
        selectedVariant: item.selectedVariant,
        selectedModifiers: item.selectedModifiers,
        notes: item.notes,
        kitchenStatus: item.kitchenStatus || "new",
        createdAt: new Date().toISOString(), // This might reset createdAt for existing items if not careful, but OrderItem type requires it. Ideally we should store original createdAt in CartItem if we want to preserve it.
        updatedAt: new Date().toISOString(),
      })),
      total: pos.total.value,
      totalSats: pos.totalSats.value,
      notes: pos.customerNote.value || undefined,
    };

    await ordersStore.updateOrder(editingOrderId.value, updates);

    const toast = useToast();
    toast.add({
      title: t("common.success"),
      description: "Order updated successfully",
      color: "green",
    });

    pos.clearCart();
    editingOrderId.value = null;

    // If we were on a table, maybe go back to tables?
    // Or just stay on empty POS.
    // Optionally redirect back to tables if tableId was set
    if (route.query.redirect === "tables") {
      navigateTo("/pos/tables");
    }
  } catch (e) {
    console.error("Failed to update order:", e);
    const toast = useToast();
    toast.add({
      title: t("common.error"),
      description: String(e),
      color: "red",
    });
  } finally {
    isProcessing.value = false;
  }
};

/**
 * Load a pending order into the cart for editing (adding more items)
 */
const loadOrderForEditing = (order: Order) => {
  // Set editing mode
  editingOrderId.value = order.id;

  // Clear current cart
  pos.clearCart();

  // Map order items to cart items
  const items = order.items.map((item) => ({
    id: item.id,
    kitchenStatus: item.kitchenStatus,
    product: item.product,
    quantity: item.quantity,
    price: item.price,
    total: item.total,
    selectedVariant: item.selectedVariant,
    selectedModifiers: item.selectedModifiers,
    notes: item.notes,
  }));

  pos.cartItems.value = items;
  pos.tableNumber.value = order.tableNumber || "";
  pos.orderType.value = order.orderType || "dine_in";
  if (order.notes) pos.customerNote.value = order.notes;

  // Close the pending orders modal
  showPendingOrdersModal.value = false;

  // Show feedback
  const toast = useToast();
  toast.add({
    title: t("pos.editingOrder", "Editing Order"),
    description: `${t(
      "pos.addMoreItems",
      "Add items and click Update Order"
    )} - #${order.code || order.id}`,
    color: "blue",
  });
};

const recallOrder = (orderId: string) => {
  const order = heldOrders.value.find((o) => o.id === orderId);
  if (order) {
    order.items.forEach((item) => {
      pos.addToCart(item.product, item.quantity, {
        variant: item.selectedVariant,
        modifiers: item.selectedModifiers,
        notes: item.notes,
      });
    });
    heldOrders.value = heldOrders.value.filter((o) => o.id !== orderId);
    showHeldOrdersModal.value = false;
  }
};

const deleteHeldOrder = (orderId: string) => {
  heldOrders.value = heldOrders.value.filter((o) => o.id !== orderId);
};

const applyDiscount = (type: "percentage" | "fixed", value: number) => {
  discountType.value = type;
  discountValue.value = value;
  pos.applyDiscount(type, value);
};

// ============================================
// Coupon Methods
// ============================================
const handleCouponApply = (coupon: AppliedCoupon) => {
  appliedCoupon.value = coupon;
  // Apply as fixed discount
  pos.applyDiscount("fixed", coupon.discountAmount);
};

const handleCouponRemove = () => {
  if (appliedCoupon.value) {
    // Remove the discount
    pos.applyDiscount("fixed", 0);
    appliedCoupon.value = null;
  }
};

const addCustomItem = (item: { name: string; price: number }) => {
  const product: Product = {
    id: `custom-${Date.now()}`,
    name: item.name,
    sku: "CUSTOM",
    categoryId: "custom",
    unitId: "piece",
    price: item.price,
    stock: 999,
    minStock: 0,
    branchId: "main",
    status: "active",
    image: "📦",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  pos.addToCart(product);
};

// ============================================
// Payment Methods
// ============================================
const proceedToPayment = async (method?: PaymentMethod) => {
  if (pos.cartItems.value.length === 0) return;

  try {
    // Play notification sound (non-blocking)
    sound.playNotification();
  } catch (e) {
    console.warn("[POS] Sound failed:", e);
  }

  defaultPaymentMethod.value = method || null;

  // Clear split state - this is a regular cart payment
  splitOrder.value = null;
  splitPaidCount.value = 0;
  splitPayments.value = [];

  // Notify customer display that payment is pending
  pos.setPaymentState({
    status: "pending",
    amount: totalWithTax.value,
    satsAmount: totalSatsWithTax.value,
  });

  // Force modal to fully reset by closing first, then reopening after nextTick
  // This fixes reactivity issues where the modal gets stuck
  showPaymentModal.value = false;
  await nextTick();
  showPaymentModal.value = true;
};

const handlePaymentComplete = async (method: PaymentMethod, proof: unknown) => {
  // Check if this is a split payment
  if (splitOrder.value && showSplitBillModal.value) {
    await handleSplitPaymentComplete(method, proof);
    return;
  }

  isProcessing.value = true;

  try {
    let order: Order;
    const isUpdate = !!editingOrderId.value;

    if (isUpdate && editingOrderId.value) {
      // 🔄 UPDATE EXISTING ORDER
      // We use createOrder to get the updated calculations/items from cart
      const tempOrder = pos.createOrder(method);
      const existing = ordersStore.getOrder(editingOrderId.value);

      if (existing) {
        // Merge temp details into existing order to preserve ID/Code/History
        order = {
          ...existing,
          ...tempOrder,
          id: existing.id,
          code: existing.code,
          orderNumber: existing.orderNumber,
          createdAt: existing.createdAt || existing.date,
          status: "completed",
          paymentMethod: method,
          updatedAt: new Date().toISOString(),
        };
      } else {
        // Fallback if not found locally
        order = tempOrder;
        order.status = "completed";
      }
    } else {
      // 🆕 NEW ORDER
      order = pos.createOrder(method);
      order.status = "completed";
    }

    // Add payment proof if available
    if (proof) {
      order.paymentProof = {
        id: `proof_${Date.now()}`,
        orderId: order.id,
        paymentHash: (proof as { paymentHash?: string })?.paymentHash || "",
        preimage: (proof as { preimage?: string })?.preimage || "",
        amount: order.totalSats || 0,
        receivedAt: new Date().toISOString(),
        method,
        isOffline: !navigator.onLine,
      };
    }

    // Check if this is a session payment (consolidated bill)
    // If so, we don't create a new order - we'll update the existing session orders later
    const sessionInfoRaw = sessionStorage.getItem("active-session-info");
    const isSessionPayment = !!sessionInfoRaw;

    // Save order (Update or Create) - but skip for session payments
    if (!isSessionPayment) {
      if (isUpdate) {
        await ordersStore.updateOrder(order.id, order);
        editingOrderId.value = null; // Clear editing mode
      } else {
        await ordersStore.createOrder(order);
      }

      // ✅ AUTO-ADJUST STOCK: Decrease stock for each item (only for non-session orders)
      // Session orders already had stock deducted when originally placed
      for (const item of order.items || []) {
        if (item.productId && item.product?.trackStock !== false) {
          await productsStore.decreaseStock(item.productId, item.quantity);
        }
      }
    }

    // ✅ LOG PROMOTION USAGE: Track and sync promotion usage to Nostr
    if (order.appliedPromotions && order.appliedPromotions.length > 0) {
      for (const appliedPromo of order.appliedPromotions) {
        await promotionsStore.logPromotionUsage(
          appliedPromo.promotionId,
          order.id,
          appliedPromo.discountAmount,
          appliedPromo.timesApplied,
          {
            customerId: order.customer,
            customerPubkey: order.customerPubkey,
            branch: order.branch,
          }
        );
      }
    }

    // ✅ LOG COUPON USAGE: Track coupon usage if applied
    if (appliedCoupon.value) {
      await couponsStore.applyCoupon(
        appliedCoupon.value.coupon.id,
        order.id,
        appliedCoupon.value.discountAmount,
        order.customer
      );
    }

    // Update POS session totals
    pos.updateSessionTotals(order);

    // Play success sound
    if (method === "lightning" || method === "bolt12" || method === "lnurl") {
      sound.playLightningZap();
    } else if (method === "cash") {
      sound.playCashRegister();
    } else {
      sound.playOrderComplete();
    }

    // Store offline payment proof if needed
    if (!navigator.onLine) {
      const paymentProof = lightning.createPaymentProof(
        order.id,
        method === "cash"
          ? "cash-" + order.id
          : (proof as { preimage?: string })?.preimage || "",
        method === "cash" ? "cash-payment" : "lightning-payment",
        order.total,
        method,
        true
      );
      await offline.storeOfflinePayment(order, paymentProof);
    }

    // Auto-serve kitchen status if checkbox is checked (mark as served when paid)
    if (
      autoCloseKitchenOnPayment.value &&
      order.kitchenStatus &&
      order.kitchenStatus !== "served"
    ) {
      await ordersStore.updateOrderStatus(order.id, order.status, {
        kitchenStatus: "served",
        servedAt: new Date().toISOString(),
      });
      order.kitchenStatus = "served";
      console.log(
        "[POS] Auto-closed kitchen status for order:",
        order.id.slice(-8)
      );
    }

    // Store completed order for receipt modal
    completedOrder.value = order;
    completedPaymentMethod.value = method;

    // Generate e-bill for customer display (legacy)
    const generatedReceipt = receipt.generateReceipt(order, order.paymentProof);
    receipt.storeEBill(generatedReceipt);
    const eBillUrl = receipt.generateEBillUrl(generatedReceipt.id);

    // 🆕 Generate public receipt with QR code (Nostr + digital)
    try {
      let publicReceipt, url, qrCode;

      // BROADCAST UPDATE to other POS tabs (must serialize to avoid DataCloneError)
      if (import.meta.client && customerOrderChannel) {
        customerOrderChannel.postMessage({
          type: "order-update",
          order: JSON.parse(JSON.stringify(order)),
        });
      }

      // Check if this is a session payment (consolidated bill)
      const sessionInfoRaw = sessionStorage.getItem("active-session-info");
      console.log("[POS DEBUG] active-session-info:", sessionInfoRaw);

      const sessionInfo = sessionInfoRaw ? JSON.parse(sessionInfoRaw) : null;
      console.log("[POS DEBUG] Parsed sessionInfo:", sessionInfo);

      if (sessionInfo) {
        console.log(
          "[POS DEBUG] Processing session payment, sessionId:",
          sessionInfo.sessionId
        );
        // This is a session payment - generate consolidated receipt
        const sessionOrders: Order[] = [];

        // Load all orders from session
        for (const orderId of sessionInfo.orderIds) {
          const sessionOrder = ordersStore.getOrder(orderId);
          if (sessionOrder) {
            sessionOrders.push(sessionOrder);
          }
        }

        // Generate consolidated receipt
        const consolidated = await receiptGenerator.createConsolidatedReceipt(
          sessionOrders,
          {
            sessionId: sessionInfo.sessionId,
            tableName: sessionInfo.tableName,
            tableNumber: sessionInfo.tableNumber,
          },
          {
            method,
            proof: order.paymentProof,
            paidAt: new Date().toISOString(),
          }
        );

        publicReceipt = consolidated.receipt;
        url = consolidated.url;
        qrCode = consolidated.qrCode;

        // Mark all session orders as completed
        for (const sessionOrder of sessionOrders) {
          sessionOrder.status = "completed";
          sessionOrder.paymentMethod = method;
          sessionOrder.paymentProof = order.paymentProof;
          await ordersStore.updateOrder(sessionOrder.id, sessionOrder);
        }

        // Close the session
        console.log(
          "[POS DEBUG] Calling closeSession for:",
          sessionInfo.sessionId
        );
        const closed = tableSession.closeSession(sessionInfo.sessionId);
        console.log("[POS DEBUG] closeSession result:", closed);

        // Broadcast session closed event so PendingBillRequests updates
        if (import.meta.client) {
          const channel = new BroadcastChannel("bitspace-pos-commands");
          channel.postMessage({
            type: "session-closed",
            sessionId: sessionInfo.sessionId,
          });
          channel.close();
        }

        // Clear session info
        sessionStorage.removeItem("active-session-info");
      } else {
        // Regular single order receipt
        const generated = await receiptGenerator.createReceiptFromOrder(order, {
          method,
          proof: order.paymentProof,
          paidAt: new Date().toISOString(),
        });

        publicReceipt = generated.receipt;
        url = generated.url;
        qrCode = generated.qrCode;
      }

      // Store receipt data for display
      if (completedOrder.value) {
        Object.assign(completedOrder.value, {
          receiptQR: qrCode,
          receiptUrl: url,
          receiptCode: publicReceipt.code,
        });
      }

      // Update customer display with new receipt URL
      pos.setPaymentState({
        status: "paid",
        eBillUrl: url, // Use new public receipt URL
        eBillId: publicReceipt.id,
        receiptCode: publicReceipt.code, // REC-XXXX-XXXX
        amount: order.total,
        satsAmount: order.totalSats,
        orderNumber: order.orderNumber,
        orderCode: order.code,
        items: order.items.map((item) => ({
          name: item.product.name,
          quantity: item.quantity,
          total: item.total,
        })),
      });
    } catch (e) {
      console.warn("[POS] Failed to generate public receipt:", e);
      // Fallback to legacy receipt
      pos.setPaymentState({
        status: "paid",
        eBillUrl: eBillUrl,
        eBillId: generatedReceipt.id,
        amount: order.total,
        satsAmount: order.totalSats,
        orderNumber: order.orderNumber,
        orderCode: order.code,
        items: order.items.map((item) => ({
          name: item.product.name,
          quantity: item.quantity,
          total: item.total,
        })),
      });
    }

    pos.clearCart();

    // Reset table to available if this was a table order
    if (order.tableNumber) {
      const table = tablesStore.tables.value.find(
        (t) => t.name === order.tableNumber || t.number === order.tableNumber
      );
      if (table) {
        await tablesStore.freeTable(table.id);
      }
    }

    showPaymentModal.value = false;

    // Show receipt options
    showReceiptModal.value = true;
  } catch (e) {
    console.error("Payment error:", e);
    sound.playError();
    pos.setPaymentState({ status: "cancelled" });
  } finally {
    isProcessing.value = false;
  }
};

const cancelPayment = () => {
  showPaymentModal.value = false;
  isProcessing.value = false;

  // If this was a split payment in progress (and split modal was previously open), restore it
  if (
    splitOrder.value &&
    splitPaidCount.value < splitCount.value &&
    !selectedPendingOrder.value
  ) {
    showSplitBillModal.value = true;
  }

  selectedPendingOrder.value = null;
  pos.setPaymentState({ status: "idle" });
};

/**
 * Select a pending order and open payment modal
 */
const selectPendingOrderForPayment = (order: Order) => {
  selectedPendingOrder.value = order;
  showPendingOrdersModal.value = false;

  // Clear split state - this is a regular payment, not a split
  splitOrder.value = null;
  splitPaidCount.value = 0;
  splitPayments.value = [];

  // Set payment state with order total
  pos.setPaymentState({
    status: "pending",
    amount: order.total,
    satsAmount: currency.toSats(order.total, order.currency || "LAK"),
  });

  showPaymentModal.value = true;
};

/**
 * Complete payment for a pending order
 */
const payPendingOrder = async (method: PaymentMethod, proof: unknown) => {
  if (!selectedPendingOrder.value) return;

  isProcessing.value = true;

  try {
    const order = selectedPendingOrder.value;

    // Update order status to completed
    await ordersStore.updateOrderStatus(order.id, "completed", {
      paymentMethod: method,
    });

    // Add payment proof if available
    if (proof) {
      order.paymentProof = {
        id: `proof_${Date.now()}`,
        orderId: order.id,
        paymentHash: (proof as { paymentHash?: string })?.paymentHash || "",
        preimage: (proof as { preimage?: string })?.preimage || "",
        amount: order.totalSats || 0,
        receivedAt: new Date().toISOString(),
        method,
        isOffline: !navigator.onLine,
      };
    }

    // Play success sound
    if (method === "lightning" || method === "bolt12" || method === "lnurl") {
      sound.playLightningZap();
    } else if (method === "cash") {
      sound.playCashRegister();
    } else {
      sound.playOrderComplete();
    }

    // Store completed order for receipt
    completedOrder.value = {
      ...order,
      status: "completed",
      paymentMethod: method,
    };
    completedPaymentMethod.value = method;

    // Generate receipt (legacy)
    const generatedReceipt = receipt.generateReceipt(
      completedOrder.value,
      completedOrder.value.paymentProof
    );
    receipt.storeEBill(generatedReceipt);

    // 🆕 Generate public receipt with QR code
    try {
      const {
        receipt: publicReceipt,
        url,
        qrCode,
      } = await receiptGenerator.createReceiptFromOrder(completedOrder.value, {
        method,
        proof: completedOrder.value.paymentProof,
        paidAt: new Date().toISOString(),
      });

      // Store receipt data
      if (completedOrder.value) {
        Object.assign(completedOrder.value, {
          receiptQR: qrCode,
          receiptUrl: url,
          receiptCode: publicReceipt.code,
        });
      }

      // Clear and close
      selectedPendingOrder.value = null;
      showPaymentModal.value = false;
      showReceiptModal.value = true;

      // Update customer display with new public receipt
      pos.setPaymentState({
        status: "paid",
        amount: order.total,
        satsAmount: order.totalSats,
        eBillUrl: url, // Use new public receipt URL
        eBillId: publicReceipt.id,
        receiptCode: publicReceipt.code, // REC-XXXX-XXXX
        orderNumber: order.orderNumber,
        orderCode: order.code,
        items: order.items.map((item) => ({
          name: item.product.name,
          quantity: item.quantity,
          total: item.total,
        })),
      });
    } catch (e) {
      console.warn(
        "[POS] Failed to generate public receipt for pending order:",
        e
      );

      // Fallback to legacy receipt
      selectedPendingOrder.value = null;
      showPaymentModal.value = false;
      showReceiptModal.value = true;

      pos.setPaymentState({
        status: "paid",
        amount: order.total,
        satsAmount: order.totalSats,
        eBillUrl: receipt.generateEBillUrl(generatedReceipt.id),
        eBillId: generatedReceipt.id,
        orderNumber: order.orderNumber,
        orderCode: order.code,
        items: order.items.map((item) => ({
          name: item.product.name,
          quantity: item.quantity,
          total: item.total,
        })),
      });
    }

    const toast = useToast();
    toast.add({
      title: t("payment.success", "Payment Complete!"),
      description: `${t("pos.orderNumber", "Order")}: #${order?.orderNumber}-${
        order.code || order.id
      }`,
      icon: "i-heroicons-check-circle",
      color: "green",
    });

    // Reset table to available if this was a table order
    if (order.tableNumber) {
      const table = tablesStore.tables.value.find(
        (t) => t.name === order.tableNumber || t.number === order.tableNumber
      );
      if (table) {
        await tablesStore.freeTable(table.id);
      }
    }
  } catch (e) {
    console.error("Failed to process pending order payment:", e);
    const toast = useToast();
    toast.add({
      title: t("common.error", "Error"),
      description: String(e),
      icon: "i-heroicons-exclamation-triangle",
      color: "red",
    });
  } finally {
    isProcessing.value = false;
  }
};

// ============================================
// Split Bill Functions
// ============================================
/**
 * Open split bill modal for a pending order
 */
const openSplitBill = (order: Order) => {
  splitOrder.value = order;
  splitCount.value = 2;
  splitPaidCount.value = 0;
  splitPayments.value = []; // Reset payment history
  isProcessingSplit.value = false;
  showPendingOrdersModal.value = false;
  showSplitBillModal.value = true;
};

/**
 * Pay one portion of a split bill - opens payment modal with per-person amount
 */
const paySplitPortion = async () => {
  if (!splitOrder.value || isProcessingSplit.value) return;

  if (splitPaidCount.value >= splitCount.value) {
    const toast = useToast();
    toast.add({
      title: t("pos.splitComplete", "Already Paid"),
      description: t("pos.allPortionsPaid", "All portions have been paid"),
      icon: "i-heroicons-check-circle",
      color: "green",
    });
    return;
  }

  // Set the payment amount to the per-person amount
  pos.setPaymentState({
    status: "pending",
    amount: splitAmountPerPerson.value,
    satsAmount: currency.toSats(
      splitAmountPerPerson.value,
      splitOrder.value.currency || "LAK"
    ),
  });

  // Hide split modal and open payment modal
  showSplitBillModal.value = false;
  defaultPaymentMethod.value = null;
  showPaymentModal.value = true;
};

/**
 * Handle split payment completion (called from payment modal)
 */
const handleSplitPaymentComplete = async (
  method: PaymentMethod,
  proof: unknown
) => {
  if (!splitOrder.value || isProcessingSplit.value) return;

  isProcessingSplit.value = true;

  try {
    // Record this payment
    splitPayments.value.push({
      portionNumber: splitPaidCount.value + 1,
      amount: splitAmountPerPerson.value,
      method,
      paidAt: new Date().toISOString(),
      proof,
    });

    splitPaidCount.value++;

    // Play sound
    if (method === "lightning" || method === "bolt12" || method === "lnurl") {
      sound.playLightningZap();
    } else if (method === "cash") {
      sound.playCashRegister();
    } else {
      sound.playSuccess();
    }

    // Check if all portions are paid
    if (splitPaidCount.value >= splitCount.value) {
      // All paid - complete the order
      await ordersStore.updateOrderStatus(splitOrder.value.id, "completed", {
        paymentMethod: "split", // Mark as split payment
        paymentProof: {
          id: `split_${Date.now()}`,
          orderId: splitOrder.value.id,
          paymentHash: `SPLIT-${splitCount.value}-WAYS`,
          preimage: JSON.stringify(splitPayments.value),
          amount: splitOrder.value.totalSats || 0,
          receivedAt: new Date().toISOString(),
          method: "split" as PaymentMethod,
          isOffline: !navigator.onLine,
        },
      });

      // Play completion sound
      sound.playOrderComplete();

      const toast = useToast();
      toast.add({
        title: t("pos.splitComplete", "Split Bill Complete!"),
        description: `${splitCount.value} ${t(
          "pos.people",
          "people"
        )} paid ${currency.format(
          splitAmountPerPerson.value,
          splitOrder.value.currency || "LAK"
        )} ${t("pos.each", "each")}`,
        icon: "i-heroicons-check-circle",
        color: "green",
      });

      // Store completed order for receipt
      completedOrder.value = splitOrder.value;
      completedPaymentMethod.value = "split" as PaymentMethod;

      // Generate receipt
      const generatedReceipt = receipt.generateReceipt(
        splitOrder.value,
        splitOrder.value.paymentProof
      );
      receipt.storeEBill(generatedReceipt);

      // Reset table if applicable
      if (splitOrder.value.tableNumber) {
        const table = tablesStore.tables.value.find(
          (t) =>
            t.name === splitOrder.value!.tableNumber ||
            t.number === splitOrder.value!.tableNumber
        );
        if (table) {
          await tablesStore.freeTable(table.id);
        }
      }

      // Close modals and reset
      closeSplitBill();
      showReceiptModal.value = true;
    } else {
      // More portions to pay
      const toast = useToast();
      toast.add({
        title: t("pos.portionPaid", "Portion Paid!"),
        description: `${splitRemainingSplits.value} ${t(
          "pos.moreToGo",
          "more to go"
        )} - ${currency.format(
          splitRemainingAmount.value,
          splitOrder.value.currency || "LAK"
        )} ${t("pos.remaining", "remaining")}`,
        icon: "i-heroicons-check",
        color: "blue",
      });

      // Close payment modal and re-show split modal for next portion
      showPaymentModal.value = false;
      showSplitBillModal.value = true;
    }
  } catch (e) {
    console.error("Failed to process split payment:", e);

    // Rollback the payment record
    if (splitPayments.value.length > 0) {
      splitPayments.value.pop();
    }
    splitPaidCount.value = Math.max(0, splitPaidCount.value - 1);

    const toast = useToast();
    toast.add({
      title: t("common.error", "Error"),
      description: String(e),
      icon: "i-heroicons-exclamation-triangle",
      color: "red",
    });
  } finally {
    isProcessingSplit.value = false;
  }
};

/**
 * Close split bill and reset state
 */
const closeSplitBill = () => {
  showSplitBillModal.value = false;
  showPaymentModal.value = false;
  splitOrder.value = null;
  splitCount.value = 2;
  splitPaidCount.value = 0;
  splitPayments.value = [];
  isProcessingSplit.value = false;
  pos.setPaymentState({ status: "idle" });
};

/**
 * Open void order modal for current cart
 */
const openVoidOrderModal = () => {
  // Can only void if there's a pending order loaded
  const pendingOrder = ordersStore.orders.value.find(
    (o) =>
      o.status === "pending" &&
      o.items.some((item) =>
        pos.cartItems.value.some(
          (cartItem) => cartItem.productId === item.productId
        )
      )
  );

  if (!pendingOrder) {
    toast.add({
      title: t("common.error"),
      description: t("pos.no_pending_order_to_void"),
      color: "red",
    });
    return;
  }

  orderToVoid.value = {
    id: pendingOrder.id,
    orderNumber: pendingOrder.orderNumber,
  };
  showVoidOrderModal.value = true;
};

/**
 * Open void order modal for a specific order (from pending orders list)
 */
const openVoidModalForOrder = (order: Order) => {
  orderToVoid.value = {
    id: order.id,
    orderNumber: order.orderNumber,
  };
  showPendingOrdersModal.value = false;
  showVoidOrderModal.value = true;
};

/**
 * Handle void/cancel order confirmation
 */
const handleVoidOrder = async (orderId: string, reason: string) => {
  try {
    isProcessing.value = true;

    const result = await ordersStore.voidOrder(orderId, reason);

    if (result) {
      toast.add({
        title: t("pos.order_voided"),
        description: t("pos.order_voided_success", {
          orderNumber: result.orderNumber || orderId.slice(-8),
        }),
        color: "green",
      });

      // Clear cart
      pos.clearCart();

      // Play sound
      sound.playSuccess();
    }
  } catch (error) {
    console.error("[POS] Failed to void order:", error);
    toast.add({
      title: t("common.error"),
      description: t("common.something_went_wrong"),
      color: "red",
    });
  } finally {
    isProcessing.value = false;
  }
};

// ============================================
// Tax Calculation
// ============================================
const taxAmount = computed(() => {
  if (!taxEnabled.value) return 0;

  if (taxInclusive.value) {
    // Tax is already included in price, calculate it for display
    // If price includes 10% tax: taxAmount = price - (price / 1.10)
    return Math.round(
      pos.subtotal.value - pos.subtotal.value / (1 + taxRatePercent.value / 100)
    );
  } else {
    // Tax is added on top
    return Math.round(pos.subtotal.value * (taxRatePercent.value / 100));
  }
});

// Override total calculation to include tax
const totalWithTax = computed(() => {
  // Use pos.total which already includes all discounts (promotions + manual discounts)
  // and all additions (tax + tip)
  return pos.total.value;
});

// Calculate sats amount with tax
const totalSatsWithTax = computed(() => {
  if (totalWithTax.value <= 0) return 0;
  return currency.toSats(totalWithTax.value, pos.selectedCurrency.value);
});

// Formatted totals with tax
const formattedTotalWithTax = computed(() =>
  currency.format(totalWithTax.value, pos.selectedCurrency.value)
);

const formattedTotalSatsWithTax = computed(() =>
  currency.format(totalSatsWithTax.value, "SATS")
);

const loadTaxSettings = () => {
  try {
    const stored = localStorage.getItem("pos_tax_settings");
    if (stored) {
      const settings = JSON.parse(stored);
      taxEnabled.value = settings.enabled ?? false;
      taxRatePercent.value = settings.rate ?? 10;
      taxInclusive.value = settings.inclusive ?? false;
    }
  } catch (e) {
    console.error("Failed to load tax settings:", e);
  }
};

const saveTaxSettings = () => {
  localStorage.setItem(
    "pos_tax_settings",
    JSON.stringify({
      enabled: taxEnabled.value,
      rate: taxRatePercent.value,
      inclusive: taxInclusive.value,
    })
  );
};

// Watch tax settings changes and save
watch([taxEnabled, taxRatePercent, taxInclusive], () => {
  saveTaxSettings();
});

// ============================================
// Auto-select product on exact barcode/SKU match
// ============================================
let searchDebounce: ReturnType<typeof setTimeout> | null = null;
watch(
  () => productsStore.searchQuery.value,
  (newQuery) => {
    if (searchDebounce) clearTimeout(searchDebounce);

    if (!newQuery || newQuery.length < 3) return;

    // Debounce to avoid selecting while user is still typing
    searchDebounce = setTimeout(() => {
      const query = newQuery.trim();

      // Check for exact barcode or SKU match
      const exactMatch = productsStore.products.value.find(
        (p) => p.status === "active" && (p.barcode === query || p.sku === query)
      );

      if (exactMatch) {
        // Auto-select the product
        selectProduct(exactMatch);

        // Clear search
        productsStore.searchQuery.value = "";

        // Success feedback
        const toast = useToast();
        toast.add({
          title: t("pos.scanner.productFound", "Product Found"),
          description: exactMatch.name,
          color: "success",
          icon: "i-heroicons-check-circle",
        });

        // Play beep sound
        playBeep();
      }
    }, 300); // 300ms debounce
  }
);

// Audio beep for barcode feedback
function playBeep() {
  try {
    const audioContext = new AudioContext();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    oscillator.frequency.value = 1000;
    oscillator.type = "sine";
    gainNode.gain.value = 0.1;

    oscillator.start();
    oscillator.stop(audioContext.currentTime + 0.1);
  } catch {
    // Audio not supported
  }
}

// ============================================
// Table Switching Functions
// ============================================
const loadTables = async () => {
  try {
    const tablesStore = useTables();

    // Load tables from store (this loads from localStorage cache first, then Nostr)
    await tablesStore.loadTables();

    // Map to local format after store is loaded
    if (tablesStore.tables.value && tablesStore.tables.value.length > 0) {
      tables.value = tablesStore.tables.value.map((t) => ({
        id: t.id,
        name: t.name || t.number,
        number: t.number,
        status: t.status,
        seats: t.capacity,
      }));
    }
  } catch (e) {
    console.error("Failed to load tables:", e);
  }
};

const switchTable = (table: (typeof tables.value)[0]) => {
  // If there's an existing table with items, hold the current order
  if (
    pos.tableNumber.value &&
    pos.cartItems.value.length > 0 &&
    pos.tableNumber.value !== table.name
  ) {
    heldOrders.value.push({
      id: Date.now().toString(),
      items: [...pos.cartItems.value],
      total: pos.total.value,
      createdAt: new Date().toISOString(),
      tableNumber: pos.tableNumber.value,
    });
    pos.clearCart();
  }

  // Switch to new table
  pos.tableNumber.value = table.name;
  pos.setOrderType("dine_in");

  // Check if there's a held order for this table and restore it
  const heldIndex = heldOrders.value.findIndex(
    (o) => o.tableNumber === table.name
  );
  if (heldIndex !== -1) {
    const held = heldOrders.value[heldIndex];
    if (held) {
      held.items.forEach((item) => {
        pos.addToCart(item.product, item.quantity, {
          variant: item.selectedVariant,
          modifiers: item.selectedModifiers,
          notes: item.notes,
        });
      });
      heldOrders.value.splice(heldIndex, 1);
    }
  }

  // Update table status
  const tableIndex = tables.value.findIndex((t) => t.id === table.id);
  if (tableIndex !== -1 && tables.value[tableIndex]) {
    tables.value[tableIndex].status = "occupied";
    localStorage.setItem("tables", JSON.stringify(tables.value));
  }

  showTableSwitcher.value = false;
};

const clearTableSelection = () => {
  pos.tableNumber.value = "";
};

// ============================================
// Lifecycle
// ============================================
const route = useRoute();

shop.loadShopConfigCache();

onMounted(async () => {
  await currency.init(shop.shopConfig.value?.currency || "LAK");
  await offline.init();
  await productsStore.init();
  await ordersStore.init();
  await promotionsStore.init();

  pos.selectedCurrency.value = shop.shopConfig.value?.currency || "LAK";

  // Initialize order sync notifications for multi-device updates
  orderSyncNotifications.initOrderSyncNotifications();

  if (!pos.isSessionActive.value) {
    const branchId =
      shop.currentBranch.value?.id || localStorage.getItem("currentBranchId");
    console.log("branch", branchId);
    pos.startSession(branchId || "main", "staff-1", 0);
  }

  // Load tables from tablesStore
  await loadTables();

  // Load tax settings
  loadTaxSettings();

  // Handle table context from query params
  if (route.query.tableId) {
    const tableId = route.query.tableId as string;
    // Find table by ID to get its name (dropdown uses name, not id)
    const foundTable = tables.value.find(
      (t) => t.id === tableId || t.name === tableId || t.number === tableId
    );
    if (foundTable) {
      pos.tableNumber.value = foundTable.name || foundTable.number || tableId;
    } else {
      // Fallback: use tableName from query or tableId
      pos.tableNumber.value = (route.query.tableName as string) || tableId;
    }
    pos.setOrderType("dine_in");

    // If action is 'pay', open payment modal
    if (route.query.action === "pay" && pos.cartItems.value.length > 0) {
      setTimeout(() => proceedToPayment(), 500);
    }
  }

  // Handle session payment from sessionStorage
  if (import.meta.client) {
    const sessionPaymentData = sessionStorage.getItem(
      "pending-session-payment"
    );
    if (sessionPaymentData) {
      try {
        const { orders, sessionInfo } = JSON.parse(sessionPaymentData);

        // Clear cart and load all items from all orders
        pos.clearCart();

        // Add all items from all orders to cart
        for (const order of orders) {
          for (const item of order.items) {
            pos.addToCart(item.product, item.quantity);
          }
        }

        // Set table info
        if (sessionInfo.tableName || sessionInfo.tableNumber) {
          pos.tableNumber.value =
            sessionInfo.tableName || sessionInfo.tableNumber;
          pos.setOrderType("dine_in");
        }

        // Store session info for consolidated receipt generation
        sessionStorage.setItem(
          "active-session-info",
          JSON.stringify({
            sessionId: sessionInfo.sessionId,
            tableName: sessionInfo.tableName,
            tableNumber: sessionInfo.tableNumber,
            orderIds: orders.map((o: Order) => o.id),
          })
        );

        // Clear the pending payment data
        sessionStorage.removeItem("pending-session-payment");

        // Wait for Vue to update, then open payment modal
        await nextTick();
        // Give a bit more time for cart rendering
        setTimeout(() => {
          if (pos.cartItems.value.length > 0) {
            proceedToPayment();
          }
        }, 100);
      } catch (e) {
        console.error("Failed to load session payment:", e);
      }
    }
  }

  // Handle editing existing order
  if (route.query.orderId) {
    const orderId = route.query.orderId as string;
    // Wait for orders to load (init called above)
    // Find order
    const order = ordersStore.orders.value.find((o) => o.id === orderId);
    if (order) {
      editingOrderId.value = order.id;
      pos.clearCart();

      // Map items to cart
      // We need to cast or map explicitly to match CartItem extended interface
      const items = order.items.map((item) => ({
        id: item.id,
        kitchenStatus: item.kitchenStatus,
        product: item.product,
        quantity: item.quantity,
        price: item.price,
        total: item.total,
        selectedVariant: item.selectedVariant,
        selectedModifiers: item.selectedModifiers,
        notes: item.notes,
      }));

      pos.cartItems.value = items;
      pos.tableNumber.value = order.tableNumber || "";
      pos.orderType.value = order.orderType || "dine_in";
      if (order.notes) pos.customerNote.value = order.notes;

      const toast = useToast();
      toast.add({
        title: "Editing Order",
        description: `Loaded order #${order.id}`,
        color: "blue",
      });
    }
  }

  timeInterval = setInterval(() => {
    currentTime.value = new Date();
  }, 60000);

  // Listen for kitchen order-ready notifications
  if (import.meta.client) {
    orderReadyChannel = new BroadcastChannel("bitspace-kitchen-ready");
    orderReadyChannel.onmessage = (event) => {
      if (event.data?.type === "order-ready" && event.data?.order) {
        const order = event.data.order;
        const dedupKey = `order_ready_notified_${order.id}`;

        // Deduplicate using sessionStorage - persists across hot-reloads
        const lastNotified = sessionStorage.getItem(dedupKey);
        const now = Date.now();

        if (lastNotified && now - parseInt(lastNotified) < 10000) {
          // Skip if notified within last 10 seconds
          return;
        }

        // Mark as notified
        sessionStorage.setItem(dedupKey, now.toString());

        // Clean up old entries after 15 seconds
        setTimeout(() => {
          sessionStorage.removeItem(dedupKey);
        }, 15000);

        // Play ready notification sound
        sound.playNotification();

        // Show toast notification
        const toast = useToast();
        toast.add({
          title: "🔔 Order Ready!",
          description: `${order.id}${
            order.tableNumber ? ` - Table ${order.tableNumber}` : ""
          }`,
          icon: "i-heroicons-bell-alert",
          color: "green",
        });

        // Refresh orders to update pending count
        ordersStore.init();
      }
    };
  }

  // Listen for NEW customer orders (from order.vue QR ordering)
  if (import.meta.client) {
    customerOrderChannel = new BroadcastChannel("bitspace-orders");

    customerOrderChannel.onmessage = (event) => {
      if (event.data?.type === "new-order" && event.data?.order) {
        const order = event.data.order;
        const dedupKey = `new_order_notified_${order.id}`;

        // Deduplicate using sessionStorage
        const lastNotified = sessionStorage.getItem(dedupKey);
        const now = Date.now();

        if (lastNotified && now - parseInt(lastNotified) < 10000) {
          return; // Skip if notified within last 10 seconds
        }

        // Mark as notified
        sessionStorage.setItem(dedupKey, now.toString());
        setTimeout(() => sessionStorage.removeItem(dedupKey), 15000);

        // Play notification sound
        sound.playNotification();

        // Show toast notification
        const toast = useToast();
        toast.add({
          title: t("pos.newCustomerOrder", "🔔 New Customer Order!"),
          description: `#${order.id.slice(-6).toUpperCase()} - ${
            order.tableNumber
              ? t("orders.table") + " " + order.tableNumber
              : t("orders.walkInCustomer", "Walk-in")
          }`,
          icon: "i-heroicons-bell-alert",
          color: "blue",
        });

        // FORCE ADD to local store immediately
        const exists = ordersStore.orders.value.find((o) => o.id === order.id);
        if (!exists) {
          ordersStore.orders.value.unshift(order);
          // Optional: re-sort if needed, but unshift is usually fine for "newest"
        }
      } else if (event.data?.type === "order-update" && event.data?.order) {
        // Handle STATUS updates from other POS tabs (e.g. Paid)
        const updatedOrder = event.data.order;
        const index = ordersStore.orders.value.findIndex(
          (o) => o.id === updatedOrder.id
        );

        if (index !== -1) {
          // Update in place
          ordersStore.orders.value[index] = updatedOrder;

          // If status changed to completed, show small toast
          if (updatedOrder.status === "completed") {
            const toast = useToast();
            toast.add({
              title: "Order Updated",
              description: `#${
                updatedOrder.orderNumber || updatedOrder.id.slice(-6)
              } paid`,
              color: "green",
            });
          }
        }
      }
    };
  }

  // Listen for POS commands (e.g., process-session-payment from PendingBillRequests)
  if (import.meta.client) {
    posCommandsChannel = new BroadcastChannel("bitspace-pos-commands");
    posCommandsChannel.onmessage = async (event) => {
      if (event.data?.type === "process-session-payment") {
        const { orders, sessionInfo } = event.data;

        // Clear cart and load all items from all orders
        pos.clearCart();

        for (const order of orders) {
          for (const item of order.items) {
            pos.addToCart(item.product, item.quantity);
          }
        }

        // Set table info
        if (sessionInfo.tableName || sessionInfo.tableNumber) {
          pos.tableNumber.value =
            sessionInfo.tableName || sessionInfo.tableNumber;
          pos.setOrderType("dine_in");
        }

        // Store session info for consolidated receipt generation
        sessionStorage.setItem(
          "active-session-info",
          JSON.stringify({
            sessionId: sessionInfo.sessionId,
            tableName: sessionInfo.tableName,
            tableNumber: sessionInfo.tableNumber,
            orderIds: orders.map((o: Order) => o.id),
          })
        );

        // Clear the sessionStorage payment data since we handled it via broadcast
        sessionStorage.removeItem("pending-session-payment");

        // Wait for Vue to update, then open payment modal
        await nextTick();
        if (pos.cartItems.value.length > 0) {
          await proceedToPayment();
        }
      }
    };
  }

  // ============================================
  // 🔔 POS Alerts are now handled centrally in default.vue layout
  // via initPosAlerts() using kind 30050 (parameterized replaceable)
  // ============================================
  // Old subscription code removed to prevent duplicates

  // ============================================
  // Keyboard shortcuts
  // ============================================
  keyboardShortcutHandler = (e: KeyboardEvent) => {
    // F2: Open barcode scanner
    if (e.key === "F2") {
      e.preventDefault();
      showBarcodeScannerModal.value = true;
    }
  };

  document.addEventListener("keydown", keyboardShortcutHandler);
});

// Order ready channel for kitchen notifications
let orderReadyChannel: BroadcastChannel | null = null;
// Customer order channel for new order alerts
let customerOrderChannel: BroadcastChannel | null = null;

// Store keyboard handler reference for cleanup
let keyboardShortcutHandler: ((e: KeyboardEvent) => void) | null = null;
// POS commands channel for same-page communication
let posCommandsChannel: BroadcastChannel | null = null;

onUnmounted(() => {
  if (timeInterval) clearInterval(timeInterval);
  if (orderReadyChannel) orderReadyChannel.close();
  if (customerOrderChannel) customerOrderChannel.close();
  if (posCommandsChannel) posCommandsChannel.close();

  // Clean up keyboard event listener
  if (keyboardShortcutHandler) {
    document.removeEventListener("keydown", keyboardShortcutHandler);
  }
});
</script>

<template>
  <div
    class="h-screen flex flex-col lg:flex-row bg-gray-100 dark:bg-gray-950 text-gray-900 dark:text-white overflow-hidden"
  >
    <!-- ============================================ -->
    <!-- LEFT PANEL - Products -->
    <!-- ============================================ -->
    <div class="flex-1 flex flex-col min-w-0 overflow-hidden">
      <!-- Header Bar -->
      <header
        class="bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border-b border-gray-200 dark:border-gray-800/50 px-2 sm:px-4 py-2 sm:py-3"
      >
        <div class="flex items-center justify-between">
          <!-- Logo & Status -->
          <div class="flex items-center gap-2 sm:gap-4">
            <NuxtLinkLocale to="/" class="flex items-center gap-2">
              <div>
                <div
                  class="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-linear-to-br from-amber-500 to-orange-600 flex items-center justify-center text-base sm:text-xl shadow-lg shadow-amber-500/20"
                >
                  ⚡
                </div>
              </div>
              <div class="hidden sm:block">
                <h1
                  class="text-lg font-bold bg-linear-to-r from-amber-500 to-orange-600 dark:from-amber-400 dark:to-orange-500 bg-clip-text text-transparent"
                >
                  bnos.space
                </h1>
                <p class="text-xs text-gray-500 dark:text-gray-500">
                  Lightning Powered
                </p>
              </div>
            </NuxtLinkLocale>

            <!-- Connection Status -->
            <div
              class="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium"
              :class="
                offline.isOnline.value
                  ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 ring-1 ring-emerald-500/20'
                  : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 ring-1 ring-amber-500/20'
              "
            >
              <span class="relative flex h-2 w-2">
                <span
                  class="absolute inline-flex h-full w-full rounded-full opacity-75 animate-ping"
                  :class="
                    offline.isOnline.value ? 'bg-emerald-400' : 'bg-amber-400'
                  "
                />
                <span
                  class="relative inline-flex rounded-full h-2 w-2"
                  :class="
                    offline.isOnline.value ? 'bg-emerald-500' : 'bg-amber-500'
                  "
                />
              </span>
              {{ offline.isOnline.value ? "Online" : "Offline" }}
            </div>

            <!-- Mobile status indicator -->
            <span
              class="sm:hidden flex h-2.5 w-2.5 rounded-full"
              :class="
                offline.isOnline.value ? 'bg-emerald-500' : 'bg-amber-500'
              "
            />

            <!-- Pending Sync -->
            <div
              v-if="offline.pendingCount.value > 0"
              class="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium bg-blue-500/10 text-blue-600 dark:text-blue-400 ring-1 ring-blue-500/20"
            >
              <UIcon
                name="i-heroicons-arrow-path"
                class="w-3 h-3 animate-spin"
              />
              {{ offline.pendingCount.value }} pending
            </div>
          </div>

          <!-- Right Side -->
          <div class="flex items-center gap-4">
            <!-- Date & Time -->
            <div class="text-right hidden md:block">
              <div class="text-sm font-medium text-gray-900 dark:text-white">
                {{ formattedTime }}
              </div>
              <div class="text-xs text-gray-500">{{ formattedDate }}</div>
            </div>

            <div class="h-8 w-px bg-gray-300 dark:bg-gray-800" />

            <!-- BTC Price -->
            <div
              class="hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gray-200/50 dark:bg-gray-800/50"
            >
              <span class="text-amber-500">₿</span>
              <span class="text-sm font-medium">{{
                currency.btcPriceFormatted.value
              }}</span>
            </div>

            <!-- Currency Selector -->
            <USelect
              v-model="pos.selectedCurrency.value"
              :items="POS_CURRENCY_OPTIONS"
              size="sm"
              class="w-24"
            />

            <!-- Dashboard Link -->
            <UTooltip text="Go to Dashboard">
              <NuxtLinkLocale to="/">
                <UButton
                  icon="i-heroicons-squares-2x2"
                  color="neutral"
                  variant="ghost"
                  size="sm"
                />
              </NuxtLinkLocale>
            </UTooltip>

            <!-- Shift Management Link -->
            <UTooltip text="Shift Management">
              <NuxtLinkLocale to="/pos/shift">
                <UButton
                  icon="i-heroicons-banknotes"
                  color="neutral"
                  variant="ghost"
                  size="sm"
                />
              </NuxtLinkLocale>
            </UTooltip>

            <!-- Table Management Link -->
            <UTooltip text="Tables">
              <NuxtLinkLocale to="/pos/tables">
                <UButton
                  icon="i-heroicons-table-cells"
                  color="neutral"
                  variant="ghost"
                  size="sm"
                />
              </NuxtLinkLocale>
            </UTooltip>

            <!-- Settings Button -->
            <UTooltip text="Quick Settings">
              <UButton
                icon="i-heroicons-cog-6-tooth"
                color="neutral"
                variant="ghost"
                size="sm"
                @click="showSettingsModal = true"
              />
            </UTooltip>

            <!-- Lightning Settings Link -->
            <UTooltip text="Lightning Settings">
              <NuxtLinkLocale to="/settings/lightning">
                <UButton
                  icon="i-heroicons-bolt"
                  :color="lightning.isConnected.value ? 'primary' : 'yellow'"
                  variant="ghost"
                  size="sm"
                />
              </NuxtLinkLocale>
            </UTooltip>

            <!-- Notification Center -->
            <NotificationCenter />
          </div>
        </div>

        <!-- Search & Quick Actions -->
        <div class="mt-3 flex gap-3">
          <!-- Search with Barcode Scan -->
          <div class="relative flex-1 max-w-md">
            <UInput
              v-model="productsStore.searchQuery.value"
              placeholder="Search by name, SKU, or barcode..."
              icon="i-heroicons-magnifying-glass"
              size="sm"
              class="flex-1 w-full"
            >
              <template #trailing>
                <UTooltip
                  :text="t('pos.scanner.scanBarcode', 'Scan with Camera (F2)')"
                >
                  <UButton
                    size="xs"
                    color="amber"
                    variant="soft"
                    icon="i-heroicons-qr-code"
                    class="cursor-pointer"
                    :padded="false"
                    @click="openCameraScanner"
                  />
                </UTooltip>
              </template>
            </UInput>
          </div>

          <!-- Quick Action Buttons -->
          <div class="flex gap-2">
            <UButton
              size="sm"
              color="neutral"
              variant="soft"
              @click="showCustomItemModal = true"
            >
              <UIcon name="i-heroicons-plus" class="w-4 h-4" />
              <span class="hidden sm:inline">Custom</span>
            </UButton>

            <UButton
              size="sm"
              color="neutral"
              variant="soft"
              :disabled="pos.cartItems.value.length === 0"
              @click="holdOrder"
            >
              <UIcon name="i-heroicons-pause" class="w-4 h-4" />
              <span class="hidden sm:inline">Hold</span>
            </UButton>

            <UButton
              v-if="heldOrders.length > 0"
              size="sm"
              color="amber"
              variant="soft"
              @click="showHeldOrdersModal = true"
            >
              <UIcon name="i-heroicons-clock" class="w-4 h-4" />
              <span>{{ heldOrders.length }}</span>
            </UButton>

            <!-- Pending Bills (Pay Later orders) Button -->
            <UButton
              v-if="pendingOrdersList.length > 0"
              size="sm"
              color="red"
              variant="soft"
              @click="showPendingOrdersModal = true"
            >
              <UIcon name="i-heroicons-banknotes" class="w-4 h-4" />
              <span
                >{{ pendingOrdersList.length }}
                {{ t("pos.pendingBills", "Bills") }}</span
              >
            </UButton>

            <!-- Kitchen Display Link (with pending orders badge) -->
            <UTooltip
              :text="
                pendingKitchenOrders > 0
                  ? `Kitchen (${pendingKitchenOrders} new)`
                  : 'Kitchen Display'
              "
            >
              <NuxtLinkLocale to="/kitchen" class="relative">
                <UButton
                  icon="i-heroicons-fire"
                  :color="pendingKitchenOrders > 0 ? 'amber' : 'neutral'"
                  variant="ghost"
                  size="sm"
                />
                <span
                  v-if="pendingKitchenOrders > 0"
                  class="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center animate-pulse"
                >
                  {{ pendingKitchenOrders > 9 ? "9+" : pendingKitchenOrders }}
                </span>
              </NuxtLinkLocale>
            </UTooltip>

            <!-- Customer Monitor -->
            <UTooltip text="Customer Monitor">
              <UButton
                size="sm"
                color="neutral"
                variant="soft"
                to="/pos/customer"
                icon="material-symbols-light:screenshot-monitor-outline"
                target="_blank"
                rel="noopener noreferrer"
              />
            </UTooltip>
          </div>
        </div>

        <!-- Categories -->
        <div class="mt-3 flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
          <button
            v-for="cat in productsStore.categories.value"
            :key="cat.id"
            class="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all duration-200"
            :class="
              productsStore.selectedCategory.value === cat.id
                ? 'bg-linear-to-r from-amber-500 to-orange-500 text-white dark:text-black shadow-lg shadow-amber-500/25'
                : 'bg-gray-200/50 dark:bg-gray-800/50 text-gray-600 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white'
            "
            @click="productsStore.selectedCategory.value = cat.id"
          >
            <span>{{ categoryIcons[cat.id] || "📁" }}</span>
            <span>{{ cat.name }}</span>
          </button>

          <!-- Promotions Filter Button -->
          <button
            v-if="productsWithPromotionsCount > 0"
            class="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold whitespace-nowrap transition-all duration-200 relative"
            :class="
              filterByPromotions
                ? 'bg-gradient-to-r from-green-500 to-emerald-500 text-white shadow-lg shadow-green-500/25 animate-pulse'
                : 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 hover:bg-green-200 dark:hover:bg-green-900/50 border-2 border-green-300 dark:border-green-700'
            "
            @click="filterByPromotions = !filterByPromotions"
          >
            <span class="text-lg">🎁</span>
            <span>Promotions</span>
            <span
              class="ml-1 px-2 py-0.5 rounded-full text-xs font-bold"
              :class="
                filterByPromotions
                  ? 'bg-white/30 text-white'
                  : 'bg-green-500 text-white'
              "
            >
              {{ productsWithPromotionsCount }}
            </span>
          </button>
        </div>
      </header>

      <!-- Products Grid -->
      <div class="flex-1 p-4 overflow-auto bg-gray-50 dark:bg-transparent">
        <!-- Pending Bill Requests (Session Bills) -->
        <PosPendingBillRequests />

        <!-- Active Promotions Banner -->
        <div
          v-if="pos.appliedPromotions.value.length > 0"
          class="mb-4 p-4 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border-2 border-green-300 dark:border-green-700 rounded-2xl shadow-lg"
        >
          <div class="flex items-center gap-3 mb-3">
            <div
              class="w-10 h-10 rounded-full bg-green-500 flex items-center justify-center text-2xl animate-bounce"
            >
              🎁
            </div>
            <div>
              <h3 class="font-bold text-green-800 dark:text-green-300 text-lg">
                Active Promotions
              </h3>
              <p class="text-sm text-green-600 dark:text-green-400">
                {{ pos.appliedPromotions.value.length }} promotion{{
                  pos.appliedPromotions.value.length > 1 ? "s" : ""
                }}
                applied
              </p>
            </div>
            <div class="ml-auto text-right">
              <p class="text-xs text-green-600 dark:text-green-400 font-medium">
                Total Savings
              </p>
              <p class="text-2xl font-bold text-green-700 dark:text-green-300">
                {{
                  currency.format(
                    pos.promotionDiscount.value,
                    pos.selectedCurrency.value
                  )
                }}
              </p>
            </div>
          </div>
          <div class="space-y-2">
            <div
              v-for="promo in pos.appliedPromotions.value"
              :key="promo.promotionId"
              class="flex items-center justify-between p-2 bg-white/60 dark:bg-gray-800/60 rounded-lg"
            >
              <div class="flex items-center gap-2">
                <span class="text-lg">🎉</span>
                <div>
                  <p class="font-medium text-gray-900 dark:text-white text-sm">
                    {{ promo.promotionName }}
                  </p>
                  <p
                    v-if="promo.description"
                    class="text-xs text-gray-600 dark:text-gray-400"
                  >
                    {{ promo.description }}
                  </p>
                </div>
              </div>
              <div class="text-right">
                <p class="font-bold text-green-600 dark:text-green-400">
                  -{{
                    currency.format(
                      promo.discountAmount,
                      pos.selectedCurrency.value
                    )
                  }}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div
          v-if="displayedProducts.length === 0"
          class="flex flex-col items-center justify-center h-full text-gray-400 dark:text-gray-500"
        >
          <span class="text-6xl mb-4">{{
            filterByPromotions ? "🎁" : "🔍"
          }}</span>
          <p class="text-lg">
            {{
              filterByPromotions
                ? "No products with promotions"
                : "No products found"
            }}
          </p>
          <p class="text-sm mt-2">
            {{
              filterByPromotions
                ? "Try disabling the promotions filter"
                : "Try a different search or category"
            }}
          </p>
        </div>

        <div
          v-else
          class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3"
        >
          <button
            v-for="product in displayedProducts"
            :key="product.id"
            class="group relative bg-white dark:bg-gray-800/50 hover:bg-gray-50 dark:hover:bg-gray-800 border border-gray-200 dark:border-gray-700/50 hover:border-amber-500/50 dark:hover:border-amber-500/30 rounded-2xl p-4 text-left transition-all duration-200 hover:scale-[1.02] hover:shadow-xl hover:shadow-amber-500/10 dark:hover:shadow-amber-500/5"
            @click="selectProduct(product)"
          >
            <!-- Favorite Badge -->
            <button
              v-if="productsStore.isFavorite(product.id)"
              class="absolute top-2 right-2 text-amber-400"
              @click.stop="productsStore.toggleFavorite(product.id)"
            >
              ⭐
            </button>

            <!-- Promotion Badge -->
            <div
              v-if="hasPromotion(product.id)"
              class="absolute top-2 left-2 px-2 py-0.5 rounded-full text-xs font-bold bg-gradient-to-r from-green-500 to-emerald-500 text-white shadow-lg animate-pulse"
            >
              🎁 {{ getProductPromotionCount(product.id) }}
            </div>

            <!-- Product Image/Emoji -->
            <div
              class="w-14 h-14 mb-3 group-hover:scale-110 transition-transform flex items-center justify-center"
            >
              <img
                v-if="product.image && product.image.startsWith('http')"
                :src="product.image"
                :alt="product.name"
                class="w-full h-full object-cover rounded-lg"
                loading="lazy"
                @error="(e: Event) => (e.target as HTMLImageElement).style.display = 'none'"
              />
              <span v-else class="text-4xl">{{ product.image || "📦" }}</span>
            </div>

            <!-- Product Info -->
            <div class="space-y-1">
              <h3
                class="font-medium text-gray-900 dark:text-white text-sm leading-tight line-clamp-2"
              >
                {{ product.name }}
              </h3>
              <p class="text-xs text-gray-400 dark:text-gray-500">
                {{ product.sku }}
              </p>
            </div>

            <!-- Price -->
            <div class="mt-3 space-y-0.5">
              <div
                class="text-amber-600 dark:text-amber-400 font-bold text-base"
              >
                {{
                  currency.format(
                    product.prices?.[pos.selectedCurrency.value] ||
                      product.price,
                    pos.selectedCurrency.value
                  )
                }}
              </div>
              <div class="text-xs text-gray-500">
                ≈ {{ currency.format(product.prices?.SATS || 0, "SATS") }}
              </div>
            </div>

            <!-- Stock indicator -->
            <div
              v-if="product.stock <= product.minStock"
              class="absolute bottom-2 right-2 px-2 py-0.5 rounded text-xs font-medium bg-red-500/20 text-red-600 dark:text-red-400"
            >
              Low
            </div>
          </button>
        </div>
      </div>
    </div>

    <!-- ============================================ -->
    <!-- MOBILE CART TOGGLE (visible on small screens) -->
    <!-- ============================================ -->
    <button
      v-if="pos.cartItems.value.length > 0"
      class="lg:hidden fixed bottom-4 right-4 z-40 flex items-center gap-2 px-5 py-3.5 bg-linear-to-r from-amber-500 to-orange-500 dark:from-amber-600 dark:to-orange-600 text-white rounded-2xl shadow-[0_8px_30px_rgba(251,146,60,0.5)] dark:shadow-[0_8px_30px_rgba(251,146,60,0.35)] ring-1 ring-white/20 backdrop-blur-sm active:scale-95 transition-all duration-200 hover:shadow-[0_12px_40px_rgba(251,146,60,0.6)] dark:hover:shadow-[0_12px_40px_rgba(251,146,60,0.45)]"
      @click="showMobileCart = true"
    >
      <span class="text-xl drop-shadow-sm">🛒</span>
      <span class="font-bold text-white/90">{{ pos.itemCount.value }}</span>
      <span class="w-px h-4 bg-white/30" />
      <span class="font-semibold">{{
        currency.format(pos.total.value, pos.selectedCurrency.value)
      }}</span>
    </button>

    <!-- ============================================ -->
    <!-- RIGHT PANEL - Cart (Desktop) / Slide-up (Mobile) -->
    <!-- ============================================ -->
    <!-- Desktop Cart Panel -->
    <div
      class="hidden lg:flex w-[380px] bg-white dark:bg-gray-900 border-l border-gray-200 dark:border-gray-800/50 flex-col"
    >
      <!-- Cart Header -->
      <div
        class="p-4 border-gray-200 dark:border-gray-800/50 bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl"
      >
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-3">
            <div
              class="w-10 h-10 rounded-xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-xl"
            >
              🛒
            </div>
            <div>
              <h2 class="text-base font-semibold text-gray-900 dark:text-white">
                Current Order
              </h2>
              <p class="text-xs text-gray-500">
                {{ pos.itemCount.value }} items
              </p>
            </div>
          </div>

          <article class="flex items-center gap-2">
            <!-- Branch Selector -->
            <div v-if="branches.length > 1">
              <USelectMenu
                v-model="shop.currentBranch.value"
                :items="branches"
                value-key="id"
                label-key="name"
                placeholder="Select Branch"
                icon="i-heroicons-building-storefront"
                size="sm"
                @update:model-value="
                  (branchId) => {
                    shop.setCurrentBranch(branchId);
                    if (pos.currentSession.value) {
                      pos.currentSession.value = {
                        ...pos.currentSession.value,
                        branchId,
                      };
                    }
                  }
                "
              />
            </div>

            <div v-if="pos.cartItems.value.length > 0" class="flex gap-1">
              <UButton
                icon="i-heroicons-x-circle"
                color="red"
                variant="ghost"
                size="xs"
                :title="t('pos.void_order')"
                @click="openVoidOrderModal"
              />
              <UButton
                icon="i-heroicons-trash"
                color="gray"
                variant="ghost"
                size="xs"
                :title="t('common.clear')"
                @click="pos.clearCart"
              />
            </div>
          </article>
        </div>

        <!-- Order Type Selector -->
        <div class="mt-3 flex gap-1.5 px-4">
          <button
            v-for="type in orderTypes"
            :key="type.value"
            class="flex-1 flex flex-col items-center gap-1 py-2 px-2 rounded-lg text-xs font-medium transition-all"
            :class="
              pos.orderType.value === type.value
                ? 'bg-linear-to-br from-amber-500 to-orange-500 text-white shadow-md shadow-amber-500/25'
                : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
            "
            @click="pos.setOrderType(type.value)"
          >
            <span class="text-lg">{{ type.icon }}</span>
            <span>{{ type.label }}</span>
          </button>
        </div>

        <!-- Table Number (for dine-in) -->
        <div v-if="pos.orderType.value === 'dine_in'" class="mt-2">
          <!-- Table Quick Selector (when tables exist) -->
          <div v-if="tables.length > 0" class="flex gap-2">
            <button
              class="flex-1 flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-all"
              :class="
                currentTable
                  ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 ring-1 ring-emerald-500/30 hover:ring-emerald-500/50'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
              "
              @click="showTableSwitcher = true"
            >
              <UIcon name="i-heroicons-table-cells" class="w-4 h-4" />
              <span v-if="currentTable" class="font-medium">{{
                currentTable.name
              }}</span>
              <span v-else>Select Table</span>
              <UIcon
                name="i-heroicons-chevron-down"
                class="w-4 h-4 ml-auto opacity-50"
              />
            </button>
            <button
              v-if="pos.tableNumber.value"
              title="Clear table"
              class="p-2 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-500 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
              @click="clearTableSelection"
            >
              <UIcon name="i-heroicons-x-mark" class="w-4 h-4" />
            </button>
          </div>
          <!-- Fallback input (when no tables configured) -->
          <UInput
            v-else
            v-model="pos.tableNumber.value"
            placeholder="Table # (optional)"
            size="xs"
            icon="i-heroicons-table-cells"
            class="w-full"
          />
        </div>

        <!-- Delivery/Pickup Info -->
        <div v-if="pos.orderType.value === 'delivery'" class="mt-2 space-y-2">
          <UInput
            v-model="pos.customerPhone.value"
            placeholder="Customer phone"
            size="xs"
            icon="i-heroicons-phone"
            class="w-full"
          />
          <UInput
            v-model="pos.deliveryAddress.value"
            placeholder="Delivery address"
            size="xs"
            icon="i-heroicons-map-pin"
            class="w-full"
          />
        </div>

        <!-- Pickup Info -->
        <div v-if="pos.orderType.value === 'pickup'" class="mt-2">
          <UInput
            v-model="pos.customerPhone.value"
            placeholder="Customer phone (pickup)"
            size="xs"
            icon="i-heroicons-phone"
            class="w-full"
          />
        </div>

        <!-- Customer Selection -->
        <div class="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
          <div
            v-if="selectedCustomer"
            class="flex items-center justify-between"
          >
            <div class="flex items-center gap-2">
              <div
                class="w-8 h-8 rounded-full bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center text-white text-xs font-bold"
              >
                {{ (selectedCustomer.name || "C").slice(0, 2).toUpperCase() }}
              </div>
              <div class="text-sm">
                <p
                  class="font-medium text-gray-900 dark:text-white truncate max-w-[120px]"
                >
                  {{ selectedCustomer.name || "Customer" }}
                </p>
                <p class="text-xs text-gray-500">
                  {{ selectedCustomer.phone || selectedCustomer.tier }}
                </p>
              </div>
            </div>
            <div class="flex gap-1">
              <UButton
                icon="i-heroicons-pencil"
                size="xs"
                variant="ghost"
                @click="showCustomerModal = true"
              />
              <UButton
                icon="i-heroicons-x-mark"
                size="xs"
                variant="ghost"
                color="red"
                @click="clearCustomer"
              />
            </div>
          </div>
          <UButton
            v-else
            icon="i-heroicons-user-plus"
            size="sm"
            variant="soft"
            color="primary"
            class="w-full"
            @click="showCustomerModal = true"
          >
            Add Customer (F3)
          </UButton>
        </div>
      </div>

      <!-- Cart Items -->
      <div class="flex-1 overflow-auto p-3 bg-gray-50 dark:bg-gray-950/50">
        <!-- Empty State -->
        <div
          v-if="pos.cartItems.value.length === 0"
          class="flex flex-col items-center justify-center h-full text-gray-400 dark:text-gray-500"
        >
          <div
            class="w-20 h-20 rounded-full bg-white dark:bg-gray-800 shadow-sm flex items-center justify-center text-4xl mb-4"
          >
            🛒
          </div>
          <p class="text-base font-medium text-gray-500">Cart is empty</p>
          <p class="text-sm mt-1">Tap products to add</p>
        </div>

        <!-- Cart Items List -->
        <div
          v-else
          class="bg-white dark:bg-gray-800 rounded-xl overflow-hidden divide-y divide-gray-100 dark:divide-gray-700/50"
        >
          <div
            v-for="(item, index) in pos.cartItems.value"
            :key="`${item.product.id}-${index}`"
            class="p-3 hover:bg-gray-50/50 dark:hover:bg-gray-700/30"
          >
            <div class="flex gap-3">
              <!-- Product Image -->
              <div
                class="w-10 h-10 rounded-lg bg-amber-50 dark:bg-amber-900/20 flex items-center justify-center text-xl flex-shrink-0 overflow-hidden"
              >
                <img
                  v-if="
                    item.product.image && item.product.image.startsWith('http')
                  "
                  :src="item.product.image"
                  :alt="item.product.name"
                  class="w-full h-full object-cover"
                  loading="lazy"
                />
                <span v-else>{{ item.product.image || "📦" }}</span>
              </div>

              <!-- Product Details -->
              <div class="flex-1 min-w-0">
                <div class="flex justify-between items-start gap-2">
                  <div class="flex-1 min-w-0">
                    <h4
                      class="font-semibold text-gray-900 dark:text-white text-sm leading-tight truncate"
                    >
                      {{ item.product.name }}
                    </h4>
                    <!-- Variant & Modifiers -->
                    <div
                      v-if="
                        item.selectedVariant ||
                        (item.selectedModifiers &&
                          item.selectedModifiers.length > 0)
                      "
                      class="mt-0.5"
                    >
                      <span
                        v-if="item.selectedVariant"
                        class="inline-flex items-center px-1.5 py-0.5 rounded text-xs bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-400 font-medium mr-1"
                      >
                        {{ item.selectedVariant.shortName }}
                      </span>
                      <span
                        v-for="mod in item.selectedModifiers"
                        :key="mod.id"
                        class="inline-flex items-center px-1.5 py-0.5 rounded text-xs bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 mr-1"
                      >
                        {{ mod.name }}
                      </span>
                    </div>
                  </div>
                  <button
                    class="text-gray-300 dark:text-gray-500 hover:text-red-500 dark:hover:text-red-400 flex-shrink-0 transition-colors"
                    @click="pos.removeFromCart(index)"
                  >
                    <UIcon name="i-heroicons-x-mark" class="w-4 h-4" />
                  </button>
                </div>

                <p class="text-xs text-gray-500 mt-0.5">
                  {{ currency.format(item.price, pos.selectedCurrency.value) }}
                  each
                </p>

                <!-- Item Notes (if any) -->
                <div
                  v-if="item.notes"
                  class="mt-1.5 px-2 py-1 rounded-lg bg-yellow-50 dark:bg-yellow-500/10 text-yellow-700 dark:text-yellow-400 text-xs"
                >
                  📝 {{ item.notes }}
                </div>

                <!-- Quantity Controls & Total -->
                <div class="flex items-center justify-between mt-2">
                  <div
                    class="flex items-center gap-1 bg-gray-100 dark:bg-gray-700 rounded-lg p-0.5"
                  >
                    <button
                      class="w-7 h-7 rounded-md hover:bg-white dark:hover:bg-gray-600 flex items-center justify-center text-sm font-bold text-gray-600 dark:text-gray-300 transition-colors"
                      @click="handleQuantityChange(index, -1)"
                    >
                      −
                    </button>
                    <button
                      class="w-8 h-7 flex items-center justify-center text-sm font-bold text-gray-900 dark:text-white"
                      @click="openNumpad(index, item.quantity)"
                    >
                      {{ item.quantity }}
                    </button>
                    <button
                      class="w-7 h-7 rounded-md hover:bg-white dark:hover:bg-gray-600 flex items-center justify-center text-sm font-bold text-gray-600 dark:text-gray-300 transition-colors"
                      @click="handleQuantityChange(index, 1)"
                    >
                      +
                    </button>

                    <!-- Add/Edit Note Button -->
                    <button
                      class="ml-1 w-7 h-7 rounded-lg flex items-center justify-center text-xs transition-colors"
                      :class="
                        item.notes
                          ? 'bg-yellow-500/20 text-yellow-600 dark:text-yellow-400'
                          : 'bg-gray-100 dark:bg-gray-700/50 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'
                      "
                      :title="item.notes ? 'Edit note' : 'Add note'"
                      @click="openItemNotes(index)"
                    >
                      📝
                    </button>
                  </div>

                  <div
                    class="text-amber-600 dark:text-amber-400 font-bold text-sm"
                  >
                    {{
                      currency.format(item.total, pos.selectedCurrency.value)
                    }}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Extras Toggle Bar (Coupon/Discount/Tip) -->
      <div
        v-if="pos.cartItems.value.length > 0"
        class="border-t border-gray-200 dark:border-gray-800/50"
      >
        <!-- Toggle Header -->
        <button
          class="w-full px-4 py-2.5 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors"
          @click="showExtras = !showExtras"
        >
          <div class="flex items-center gap-3">
            <span class="text-sm font-medium text-gray-700 dark:text-gray-300"
              >Extras</span
            >
            <!-- Active indicators -->
            <div class="flex items-center gap-1.5">
              <span
                v-if="appliedCoupon"
                class="px-1.5 py-0.5 text-[10px] font-semibold bg-green-500/20 text-green-600 dark:text-green-400 rounded"
              >
                🎟️ {{ appliedCoupon.coupon.code }}
              </span>
              <span
                v-if="pos.tipAmount.value > 0"
                class="px-1.5 py-0.5 text-[10px] font-semibold bg-amber-500/20 text-amber-600 dark:text-amber-400 rounded"
              >
                ⚡ Tip
              </span>
            </div>
          </div>
          <UIcon
            :name="
              showExtras ? 'i-heroicons-chevron-up' : 'i-heroicons-chevron-down'
            "
            class="w-4 h-4 text-gray-400 transition-transform"
          />
        </button>

        <!-- Collapsible Content -->
        <Transition name="collapse">
          <div v-if="showExtras" class="px-4 pb-3 space-y-3">
            <!-- Quick Actions Row -->
            <div class="flex gap-2">
              <!-- Coupon Button -->
              <button
                class="flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-sm font-medium transition-all"
                :class="
                  appliedCoupon
                    ? 'bg-green-500/10 text-green-600 dark:text-green-400 ring-1 ring-green-500/30'
                    : 'bg-gray-100 dark:bg-gray-800/50 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-800'
                "
                @click="appliedCoupon ? handleCouponRemove() : null"
              >
                <span>🎟️</span>
                <span v-if="appliedCoupon"
                  >{{ appliedCoupon.coupon.code }} ✓</span
                >
                <span v-else>Coupon</span>
              </button>

              <!-- Discount Button -->
              <button
                class="flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-sm font-medium bg-gray-100 dark:bg-gray-800/50 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-800 transition-all"
                @click="showDiscountModal = true"
              >
                <span>🏷️</span>
                <span>Discount</span>
              </button>
            </div>

            <!-- Coupon Input (shows when no coupon applied) -->
            <div v-if="!appliedCoupon" class="-mt-1">
              <PosCouponInput
                :subtotal="pos.subtotal.value"
                :currency="pos.selectedCurrency.value"
                :applied-coupon="appliedCoupon"
                @apply="handleCouponApply"
                @remove="handleCouponRemove"
              />
            </div>

            <!-- Tip Options -->
            <div>
              <p
                class="text-xs text-gray-500 dark:text-gray-400 mb-2 flex items-center gap-1"
              >
                <span>⚡</span> Quick Tip
              </p>
              <div class="grid grid-cols-5 gap-1.5">
                <button
                  v-for="tip in tipOptions"
                  :key="tip.value"
                  class="py-2 rounded-lg text-xs font-medium transition-all"
                  :class="
                    pos.tipAmount.value ===
                    (tip.value === 0
                      ? 0
                      : Math.round((pos.subtotal.value * tip.value) / 100))
                      ? 'bg-linear-to-r from-amber-500 to-orange-500 text-white shadow-md shadow-amber-500/25 scale-105'
                      : 'bg-gray-100 dark:bg-gray-800/50 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-800'
                  "
                  @click="pos.setTipPercentage(tip.value)"
                >
                  {{ tip.label }}
                </button>
              </div>
            </div>
          </div>
        </Transition>
      </div>

      <!-- Cart Summary -->
      <div
        class="p-4 border-t border-gray-200 dark:border-gray-800/50 bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl"
      >
        <!-- Summary Lines -->
        <div class="space-y-1.5 text-sm mb-3">
          <div class="flex justify-between text-gray-500 dark:text-gray-400">
            <span>Subtotal</span>
            <span>{{
              currency.format(pos.subtotal.value, pos.selectedCurrency.value)
            }}</span>
          </div>
          <!-- Tax Line -->
          <div
            v-if="taxEnabled && taxAmount > 0"
            class="flex justify-between text-gray-500 dark:text-gray-400"
          >
            <span class="flex items-center gap-1">
              <span>🧾</span>
              <span>VAT {{ taxRatePercent }}%</span>
              <span v-if="taxInclusive" class="text-xs opacity-60"
                >(incl.)</span
              >
            </span>
            <span :class="taxInclusive ? '' : ''">
              {{ taxInclusive ? "" : "+"
              }}{{ currency.format(taxAmount, pos.selectedCurrency.value) }}
            </span>
          </div>
          <!-- Manual Discount -->
          <div
            v-if="discountValue > 0 && !appliedCoupon"
            class="flex justify-between text-green-600 dark:text-green-400"
          >
            <span class="flex items-center gap-1">
              <span>🏷️</span>
              Discount
              <span class="text-xs opacity-75">
                ({{
                  discountType === "percentage" ? `${discountValue}%` : "Fixed"
                }})
              </span>
            </span>
            <span>
              -{{
                currency.format(
                  discountType === "percentage"
                    ? Math.round(
                        (pos.subtotal.value * discountValue) /
                          (100 + discountValue)
                      )
                    : discountValue,
                  pos.selectedCurrency.value
                )
              }}
            </span>
          </div>
          <!-- Coupon Discount -->
          <div
            v-if="appliedCoupon"
            class="flex justify-between text-green-600 dark:text-green-400"
          >
            <span class="flex items-center gap-1">
              <span>🎟️</span> {{ appliedCoupon.coupon.code }}
            </span>
            <span
              >-{{
                currency.format(
                  appliedCoupon.discountAmount,
                  pos.selectedCurrency.value
                )
              }}</span
            >
          </div>
          <!-- Promotion Discounts -->
          <div
            v-for="promo in pos.appliedPromotions.value"
            :key="promo.promotionId"
            class="flex justify-between text-green-600 dark:text-green-400"
          >
            <span class="flex items-center gap-1">
              <span>🎁</span> {{ promo.promotionName }}
              <span v-if="promo.description" class="text-xs opacity-75">
                ({{ promo.description }})
              </span>
            </span>
            <span
              >-{{
                currency.format(
                  promo.discountAmount,
                  pos.selectedCurrency.value
                )
              }}</span
            >
          </div>
          <div
            v-if="pos.tipAmount.value > 0"
            class="flex justify-between text-amber-600 dark:text-amber-400"
          >
            <span class="flex items-center gap-1"> <span>⚡</span> Tip </span>
            <span
              >+{{
                currency.format(pos.tipAmount.value, pos.selectedCurrency.value)
              }}</span
            >
          </div>
        </div>

        <!-- Total -->
        <div
          class="flex items-end justify-between mb-4 pt-3 border-t border-gray-200 dark:border-gray-800/50"
        >
          <div>
            <p class="text-xs text-gray-500 mb-1">Total</p>
            <p class="text-2xl font-bold text-gray-900 dark:text-white">
              {{ formattedTotalWithTax }}
            </p>
          </div>
          <div class="text-right">
            <p class="text-xs text-gray-500 mb-1">≈ Sats</p>
            <p class="text-lg font-semibold text-amber-600 dark:text-amber-400">
              {{ formattedTotalSatsWithTax }}
            </p>
          </div>
        </div>

        <!-- Payment Buttons -->
        <div class="space-y-2">
          <UButton
            block
            size="lg"
            :disabled="pos.cartItems.value.length === 0"
            class="bg-linear-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-white dark:text-black font-semibold shadow-sm shadow-amber-500/25"
            @click="proceedToPayment('lightning')"
          >
            <span class="flex items-center gap-2">
              <span class="text-lg">⚡</span>
              <span>Pay with Lightning</span>
            </span>
          </UButton>

          <div class="grid grid-cols-2 gap-2">
            <UButton
              block
              size="md"
              color="neutral"
              variant="soft"
              :disabled="pos.cartItems.value.length === 0"
              @click="proceedToPayment('cash')"
            >
              💵 {{ t("payment.methods.cash") }}
            </UButton>
            <!-- Send to Kitchen (Pay Later) Button -->
            <UButton
              block
              size="md"
              color="emerald"
              variant="soft"
              :disabled="!pos.cartItems.value.length"
              :loading="isProcessing"
              @click="sendToKitchen"
            >
              <span class="flex items-center gap-2">
                <span class="text-lg">🔥</span>
                <span>{{
                  isEditingOrder
                    ? "Update Order"
                    : t("pos.sendToKitchen", "Send to Kitchen")
                }}</span>
                <span class="text-xs opacity-75"
                  >({{
                    isEditingOrder
                      ? "Save Changes"
                      : t("pos.payLater", "Pay Later")
                  }})</span
                >
              </span>
            </UButton>
          </div>
        </div>
      </div>
    </div>

    <!-- ============================================ -->
    <!-- MOBILE CART SLIDE-UP PANEL -->
    <!-- ============================================ -->
    <Transition name="slide-up">
      <div v-if="showMobileCart" class="lg:hidden fixed inset-0 z-50">
        <!-- Backdrop with blur -->
        <div
          class="absolute inset-0 bg-black/30 dark:bg-black/50 backdrop-blur-md"
          @click="showMobileCart = false"
        />

        <!-- Cart Panel - Glass effect -->
        <div
          class="absolute bottom-0 left-0 right-0 bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl rounded-t-[2rem] max-h-[85vh] flex flex-col shadow-[0_-10px_40px_rgba(0,0,0,0.1)] dark:shadow-[0_-10px_40px_rgba(0,0,0,0.4)]"
        >
          <!-- Drag Handle -->
          <div class="flex justify-center pt-3 pb-2">
            <div
              class="w-10 h-1 bg-gray-300/80 dark:bg-gray-600 rounded-full"
            />
          </div>

          <!-- Cart Header - Cleaner -->
          <div class="px-5 pb-4 flex items-center justify-between">
            <div class="flex items-center gap-3">
              <div
                class="w-11 h-11 rounded-2xl bg-linear-to-br from-amber-100 to-orange-100 dark:from-amber-900/30 dark:to-orange-900/30 flex items-center justify-center"
              >
                <span class="text-xl">🛒</span>
              </div>
              <div>
                <h2 class="font-bold text-gray-900 dark:text-white">
                  Your Order
                </h2>
                <p
                  class="text-xs text-amber-600 dark:text-amber-400 font-medium"
                >
                  {{ pos.itemCount.value }} items
                </p>
              </div>
            </div>
            <button
              class="w-9 h-9 rounded-full bg-gray-100/80 dark:bg-gray-800 flex items-center justify-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-200/80 dark:hover:bg-gray-700 transition-colors"
              @click="showMobileCart = false"
            >
              <UIcon name="i-heroicons-x-mark" class="w-5 h-5" />
            </button>
          </div>

          <!-- Order Type Selector (Mobile) -->
          <div class="px-4 pb-4">
            <div class="flex gap-1.5">
              <button
                v-for="type in orderTypes"
                :key="type.value"
                class="flex-1 flex flex-col items-center gap-1 py-2 px-2 rounded-lg text-xs font-medium transition-all"
                :class="
                  pos.orderType.value === type.value
                    ? 'bg-linear-to-br from-amber-500 to-orange-500 text-white'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
                "
                @click="pos.setOrderType(type.value)"
              >
                <span class="text-lg">{{ type.icon }}</span>
                <span>{{ type.label }}</span>
              </button>
            </div>

            <!-- Table Selector (Mobile - for dine-in) -->
            <div v-if="pos.orderType.value === 'dine_in'" class="mt-3">
              <div v-if="tables.length > 0" class="flex gap-2">
                <button
                  class="flex-1 flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm transition-all touch-manipulation"
                  :class="
                    currentTable
                      ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 ring-1 ring-emerald-500/30'
                      : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400'
                  "
                  @click="showTableSwitcher = true"
                >
                  <UIcon name="i-heroicons-table-cells" class="w-5 h-5" />
                  <span v-if="currentTable" class="font-medium">{{
                    currentTable.name
                  }}</span>
                  <span v-else>{{
                    $t("pos.selectTable", "Select Table")
                  }}</span>
                  <UIcon
                    name="i-heroicons-chevron-right"
                    class="w-4 h-4 ml-auto opacity-50"
                  />
                </button>
                <button
                  v-if="pos.tableNumber.value"
                  title="Clear table"
                  class="p-2.5 rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-500 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors touch-manipulation"
                  @click="clearTableSelection"
                >
                  <UIcon name="i-heroicons-x-mark" class="w-5 h-5" />
                </button>
              </div>
              <UInput
                v-else
                v-model="pos.tableNumber.value"
                :placeholder="
                  $t('pos.tableNumberOptional', 'Table # (optional)')
                "
                size="sm"
                icon="i-heroicons-table-cells"
                class="w-full"
              />
            </div>
          </div>

          <!-- Cart Items (Scrollable) -->
          <div
            class="flex-1 overflow-y-auto px-4 pb-3 bg-gray-50/50 dark:bg-gray-950/50"
          >
            <div
              v-if="pos.cartItems.value.length === 0"
              class="flex flex-col items-center justify-center py-16 text-gray-400"
            >
              <div
                class="w-20 h-20 rounded-full bg-white dark:bg-gray-800 shadow-sm flex items-center justify-center mb-4"
              >
                <span class="text-4xl">🛒</span>
              </div>
              <p class="font-medium text-gray-500">Cart is empty</p>
              <p class="text-sm text-gray-400 mt-1">Tap products to add</p>
            </div>
            <div v-else class="space-y-2 pt-2">
              <div
                v-for="(item, index) in pos.cartItems.value"
                :key="`mobile-${item.product.id}-${index}`"
                class="bg-white dark:bg-gray-800 rounded-xl p-3"
              >
                <div class="flex items-center gap-3">
                  <!-- Product Icon -->
                  <div
                    class="w-11 h-11 rounded-lg bg-amber-50 dark:bg-amber-900/20 flex items-center justify-center text-xl flex-shrink-0 overflow-hidden"
                  >
                    <img
                      v-if="
                        item.product.image &&
                        item.product.image.startsWith('http')
                      "
                      :src="item.product.image"
                      :alt="item.product.name"
                      class="w-full h-full object-cover"
                      loading="lazy"
                    />
                    <span v-else>{{ item.product.image || "📦" }}</span>
                  </div>

                  <!-- Product Info -->
                  <div class="flex-1 min-w-0">
                    <p
                      class="font-semibold text-sm text-gray-900 dark:text-white truncate"
                    >
                      {{ item.product.name }}
                    </p>
                    <p class="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                      {{
                        currency.format(item.price, pos.selectedCurrency.value)
                      }}
                    </p>
                  </div>

                  <!-- Quantity Controls -->
                  <div
                    class="flex items-center gap-1 bg-gray-100 dark:bg-gray-700 rounded-lg p-0.5"
                  >
                    <button
                      class="w-7 h-7 rounded-md hover:bg-white dark:hover:bg-gray-600 text-gray-600 dark:text-gray-300 font-bold transition-colors flex items-center justify-center text-lg"
                      @click="handleQuantityChange(index, -1)"
                    >
                      −
                    </button>
                    <span
                      class="w-7 text-center font-bold text-sm text-gray-900 dark:text-white"
                      >{{ item.quantity }}</span
                    >
                    <button
                      class="w-7 h-7 rounded-md hover:bg-white dark:hover:bg-gray-600 text-gray-600 dark:text-gray-300 font-bold transition-colors flex items-center justify-center text-lg"
                      @click="handleQuantityChange(index, 1)"
                    >
                      +
                    </button>
                  </div>

                  <!-- Total Price -->
                  <p
                    class="font-bold text-amber-600 dark:text-amber-400 text-sm min-w-[4rem] text-right tabular-nums"
                  >
                    {{
                      currency.format(item.total, pos.selectedCurrency.value)
                    }}
                  </p>
                </div>

                <!-- Item Notes & Actions Row -->
                <div
                  class="flex items-center justify-between mt-2 pt-2 border-t border-gray-100 dark:border-gray-700/50"
                >
                  <!-- Notes display or add button -->
                  <button
                    class="flex items-center gap-1.5 text-xs transition-colors"
                    :class="
                      item.notes
                        ? 'text-yellow-600 dark:text-yellow-400'
                        : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'
                    "
                    @click="openItemNotes(index)"
                  >
                    <span>📝</span>
                    <span v-if="item.notes" class="truncate max-w-[150px]">{{
                      item.notes
                    }}</span>
                    <span v-else>Add note</span>
                  </button>

                  <!-- Remove button -->
                  <button
                    class="text-xs text-gray-400 hover:text-red-500 dark:hover:text-red-400 transition-colors"
                    @click="pos.removeFromCart(index)"
                  >
                    Remove
                  </button>
                </div>
              </div>
            </div>
          </div>

          <!-- Cart Footer - Glass effect -->
          <div
            class="px-5 py-4 bg-linear-to-t from-white via-white to-white/80 dark:from-gray-900 dark:via-gray-900 dark:to-gray-900/80 border-t border-gray-100 dark:border-gray-800"
          >
            <!-- Summary -->
            <div class="flex justify-between items-end mb-4">
              <div>
                <p
                  class="text-xs text-gray-400 uppercase tracking-wide font-medium"
                >
                  Total
                </p>
                <p
                  class="text-3xl font-bold text-gray-900 dark:text-white tracking-tight"
                >
                  {{ formattedTotalWithTax }}
                </p>
              </div>
              <div class="text-right">
                <div
                  class="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 dark:bg-amber-900/20 rounded-full"
                >
                  <span class="text-amber-500">⚡</span>
                  <span
                    class="text-sm font-semibold text-amber-600 dark:text-amber-400"
                    >{{ formattedTotalSatsWithTax }}</span
                  >
                </div>
              </div>
            </div>
            <!-- Action Buttons -->
            <div class="grid grid-cols-5 gap-2.5">
              <UButton
                color="neutral"
                variant="soft"
                size="lg"
                block
                class="col-span-1 !bg-gray-100 hover:!bg-gray-200 dark:!bg-gray-800 dark:hover:!bg-gray-700 !text-gray-600 dark:!text-gray-300 font-semibold"
                @click="
                  pos.clearCart();
                  showMobileCart = false;
                "
              >
                Clear
              </UButton>
              <UButton
                color="primary"
                size="lg"
                block
                class="col-span-2 !bg-linear-to-r !from-amber-500 !to-orange-500 hover:!from-amber-600 hover:!to-orange-600 !text-white font-semibold shadow-lg shadow-amber-500/25"
                :disabled="pos.cartItems.value.length === 0"
                @click="
                  showMobileCart = false;
                  proceedToPayment();
                "
              >
                <span class="flex items-center gap-2">
                  <span>Pay Now</span>
                  <span class="text-amber-200">→</span>
                </span>
              </UButton>
              <!-- Pay Later -->
              <UButton
                color="emerald"
                variant="soft"
                size="lg"
                block
                class="col-span-2 !text-emerald-700 dark:!text-emerald-300 font-semibold"
                :disabled="pos.cartItems.value.length === 0"
                :loading="isProcessing"
                @click="
                  showMobileCart = false;
                  sendToKitchen();
                "
              >
                <span class="flex items-center gap-2">
                  <span class="text-lg">🔥</span>
                  <span>{{
                    isEditingOrder
                      ? "Update Order"
                      : t("pos.sendToKitchen", "Send to Kitchen")
                  }}</span>
                  <span class="text-xs opacity-75"
                    >({{
                      isEditingOrder ? "Save" : t("pos.payLater", "Pay Later")
                    }})</span
                  >
                </span>
              </UButton>
            </div>
          </div>
        </div>
      </div>
    </Transition>

    <!-- ============================================ -->
    <!-- MODALS -->
    <!-- ============================================ -->

    <!-- Payment Modal -->
    <UModal
      v-model:open="showPaymentModal"
      :dismissable="!isProcessing"
      title="Payment"
      description="Select a payment method"
    >
      <template #content>
        <div
          class="p-6 bg-white dark:bg-gray-900 min-w-[400px] max-w-lg max-h-[85vh] overflow-y-auto"
        >
          <!-- Order Summary Toggle Button -->
          <button
            class="w-full mb-3 flex items-center justify-between px-4 py-3 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors"
            @click="showPaymentOrderDetails = !showPaymentOrderDetails"
          >
            <div class="flex items-center gap-2">
              <span
                class="text-sm font-medium text-gray-700 dark:text-gray-300"
              >
                {{ showPaymentOrderDetails ? "Hide" : "Show" }} Order Details
              </span>
              <span class="text-xs text-gray-500">
                ({{ pos.cartItems.value.length }} items{{
                  pos.appliedPromotions.value.length > 0
                    ? ", " +
                      pos.appliedPromotions.value.length +
                      " promotion" +
                      (pos.appliedPromotions.value.length > 1 ? "s" : "")
                    : ""
                }})
              </span>
            </div>
            <svg
              :class="{ 'rotate-180': showPaymentOrderDetails }"
              class="w-5 h-5 text-gray-500 transition-transform"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M19 9l-7 7-7-7"
              />
            </svg>
          </button>

          <!-- Order Summary with Promotions (Collapsible) -->
          <div v-show="showPaymentOrderDetails" class="mb-6 space-y-3">
            <!-- Cart Items -->
            <div class="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
              <h3
                class="font-semibold text-sm text-gray-700 dark:text-gray-300 mb-3"
              >
                ORDER ITEMS
              </h3>
              <div class="space-y-2">
                <div
                  v-for="item in pos.cartItems.value"
                  :key="item.id"
                  class="flex justify-between text-sm"
                >
                  <span class="text-gray-600 dark:text-gray-400">
                    {{ item.quantity }}× {{ item.product.name }}
                    <span class="text-xs text-gray-500"
                      >@
                      {{
                        currency.format(item.price, pos.selectedCurrency.value)
                      }}</span
                    >
                  </span>
                  <span class="font-medium">{{
                    currency.format(item.total, pos.selectedCurrency.value)
                  }}</span>
                </div>
              </div>
            </div>

            <!-- Applied Promotions -->
            <div
              v-if="pos.appliedPromotions.value.length > 0"
              class="bg-green-50 dark:bg-green-900/20 border-2 border-green-200 dark:border-green-800 rounded-lg p-4"
            >
              <h3
                class="font-semibold text-sm text-green-700 dark:text-green-400 mb-3 flex items-center gap-2"
              >
                <span>🎁</span> PROMOTIONS APPLIED
              </h3>
              <div class="space-y-2">
                <div
                  v-for="promo in pos.appliedPromotions.value"
                  :key="promo.promotionId"
                  class="bg-white dark:bg-gray-800 p-2 rounded border border-green-300 dark:border-green-700"
                >
                  <div
                    class="font-medium text-green-700 dark:text-green-400 text-sm"
                  >
                    {{ promo.promotionName }}
                  </div>
                  <div
                    v-if="promo.description"
                    class="text-xs text-green-600 dark:text-green-500"
                  >
                    {{ promo.description }}
                  </div>
                  <div
                    class="flex justify-between text-green-700 dark:text-green-400 font-semibold text-sm mt-1"
                  >
                    <span>You Save:</span>
                    <span>{{
                      currency.format(
                        promo.discountAmount,
                        pos.selectedCurrency.value
                      )
                    }}</span>
                  </div>
                </div>
              </div>
            </div>

            <!-- Payment Summary -->
            <div class="bg-gray-100 dark:bg-gray-800 rounded-lg p-4">
              <div class="space-y-1 text-sm">
                <div
                  class="flex justify-between text-gray-600 dark:text-gray-400"
                >
                  <span>Subtotal:</span>
                  <span>{{
                    currency.format(
                      pos.subtotal.value,
                      pos.selectedCurrency.value
                    )
                  }}</span>
                </div>
                <div
                  v-if="pos.appliedPromotions.value.length > 0"
                  class="flex justify-between text-green-600 dark:text-green-400 font-medium"
                >
                  <span>Promotion Savings:</span>
                  <span
                    >-{{
                      currency.format(
                        pos.promotionDiscount.value,
                        pos.selectedCurrency.value
                      )
                    }}</span
                  >
                </div>
                <div
                  v-if="pos.discountAmount.value > 0"
                  class="flex justify-between text-green-600 dark:text-green-400"
                >
                  <span>Discount:</span>
                  <span
                    >-{{
                      currency.format(
                        pos.discountAmount.value,
                        pos.selectedCurrency.value
                      )
                    }}</span
                  >
                </div>
                <div
                  v-if="pos.tax.value > 0"
                  class="flex justify-between text-gray-600 dark:text-gray-400"
                >
                  <span>Tax:</span>
                  <span>{{
                    currency.format(pos.tax.value, pos.selectedCurrency.value)
                  }}</span>
                </div>
                <div
                  v-if="pos.tipAmount.value > 0"
                  class="flex justify-between text-gray-600 dark:text-gray-400"
                >
                  <span>Tip:</span>
                  <span>{{
                    currency.format(
                      pos.tipAmount.value,
                      pos.selectedCurrency.value
                    )
                  }}</span>
                </div>
                <div
                  class="flex justify-between font-bold text-lg pt-2 border-t-2 border-gray-300 dark:border-gray-600 mt-2"
                >
                  <span>TOTAL TO PAY:</span>
                  <span class="text-primary-600">{{
                    currency.format(totalWithTax, pos.selectedCurrency.value)
                  }}</span>
                </div>
              </div>
            </div>
          </div>

          <!-- Kitchen Auto-Close Checkbox -->
          <div
            class="mb-4 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg"
          >
            <label class="flex items-center gap-3 cursor-pointer">
              <UCheckbox v-model="autoCloseKitchenOnPayment" size="lg" />
              <div class="flex-1">
                <div class="flex items-center gap-2">
                  <span
                    class="text-sm font-medium text-gray-900 dark:text-white"
                  >
                    👨‍🍳 {{ $t("pos.autoCloseKitchen", "Auto-Close Kitchen") }}
                  </span>
                </div>
                <p class="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                  {{
                    $t(
                      "pos.autoCloseKitchenDesc",
                      "Mark order as served when payment completes"
                    )
                  }}
                </p>
              </div>
            </label>
          </div>

          <PaymentSelector
            v-if="showPaymentModal"
            :amount="
              splitOrder
                ? splitAmountPerPerson
                : selectedPendingOrder
                ? selectedPendingOrder.total
                : totalWithTax
            "
            :sats-amount="
              splitOrder
                ? currency.toSats(
                    splitAmountPerPerson,
                    splitOrder.currency || 'LAK'
                  )
                : selectedPendingOrder
                ? currency.toSats(
                    selectedPendingOrder.total,
                    selectedPendingOrder.currency || 'LAK'
                  )
                : totalSatsWithTax
            "
            :currency="
              splitOrder
                ? splitOrder.currency || pos.selectedCurrency.value
                : selectedPendingOrder
                ? selectedPendingOrder.currency || pos.selectedCurrency.value
                : pos.selectedCurrency.value
            "
            :order-id="
              splitOrder
                ? `${splitOrder.id}-${splitPaidCount + 1}`
                : selectedPendingOrder
                ? selectedPendingOrder.id
                : 'ORD-' + Date.now().toString(36).toUpperCase()
            "
            :default-method="defaultPaymentMethod || undefined"
            @paid="
              (method, proof) =>
                splitOrder
                  ? paySplitPortion(method, proof)
                  : selectedPendingOrder
                  ? payPendingOrder(method, proof)
                  : handlePaymentComplete(method, proof)
            "
            @cancel="
              splitOrder
                ? () => {
                    showPaymentModal = false;
                    showSplitBillModal = true;
                  }
                : cancelPayment
            "
          />
        </div>
      </template>
    </UModal>

    <!-- Receipt Actions Modal -->
    <UModal
      v-model:open="showReceiptModal"
      :dismissable="false"
      title="Receipt Actions"
      description="Choose an action for the receipt"
    >
      <template #content>
        <div class="p-6 bg-white dark:bg-gray-900 min-w-[400px] max-w-lg">
          <ReceiptActions
            v-if="showReceiptModal && completedOrder"
            :order="completedOrder"
            :payment-method="completedPaymentMethod"
            @close="showReceiptModal = false"
            @done="
              showReceiptModal = false;
              completedOrder = null;
            "
          />
        </div>
      </template>
    </UModal>

    <!-- Discount Modal -->
    <PosDiscountModal
      v-model:open="showDiscountModal"
      :current-type="discountType"
      :current-value="discountValue"
      @apply="applyDiscount"
    />

    <!-- Custom Item Modal -->
    <PosCustomItemModal
      v-model:open="showCustomItemModal"
      :currency="pos.selectedCurrency.value"
      @add="addCustomItem"
    />

    <!-- Void Order Modal -->
    <PosVoidOrderModal
      v-model:open="showVoidOrderModal"
      :order-id="orderToVoid?.id"
      :order-number="orderToVoid?.orderNumber"
      @confirm="handleVoidOrder"
    />

    <!-- Held Orders Modal -->
    <PosHeldOrdersModal
      v-model:open="showHeldOrdersModal"
      :orders="heldOrders"
      :currency="pos.selectedCurrency.value"
      @recall="recallOrder"
      @delete="deleteHeldOrder"
    />

    <!-- Pending Orders Modal (Bills waiting for payment) -->
    <UModal
      v-model:open="showPendingOrdersModal"
      title="Pending Orders"
      description="Bills waiting for payment"
    >
      <template #content>
        <div class="p-6 bg-white dark:bg-gray-900">
          <div class="flex items-center justify-between mb-4">
            <h3
              class="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2"
            >
              <span>💳</span> {{ t("pos.pendingBills", "Pending Bills") }}
              <span class="text-sm font-normal text-gray-500"
                >({{ t("pos.awaitingPayment", "Awaiting Payment") }})</span
              >
            </h3>

            <!-- Merge Toggle Buttons -->
            <div v-if="pendingOrdersList.length > 1" class="flex gap-2">
              <UButton
                v-if="!isMergeMode"
                size="xs"
                color="violet"
                variant="soft"
                @click="isMergeMode = true"
              >
                <UIcon name="i-heroicons-squares-plus" class="w-4 h-4" />
                {{ t("pos.mergeOrders", "Merge") }}
              </UButton>
              <template v-else>
                <UButton
                  size="xs"
                  color="gray"
                  variant="ghost"
                  @click="
                    isMergeMode = false;
                    ordersToMerge = [];
                  "
                >
                  {{ t("common.cancel", "Cancel") }}
                </UButton>
                <UButton
                  size="xs"
                  color="violet"
                  :disabled="ordersToMerge.length < 2"
                  @click="mergeSelectedOrders"
                >
                  <UIcon name="i-heroicons-check" class="w-4 h-4" />
                  {{ t("pos.mergeSelected", "Merge") }} ({{
                    ordersToMerge.length
                  }})
                </UButton>
              </template>
            </div>
          </div>

          <div
            v-if="pendingOrdersList.length === 0"
            class="text-center py-8 text-gray-400 dark:text-gray-500"
          >
            <span class="text-4xl block mb-2">✅</span>
            {{ t("pos.noPendingBills", "No pending bills") }}
          </div>

          <div v-else class="space-y-3 max-h-96 overflow-auto">
            <div
              v-for="order in pendingOrdersList"
              :key="order.id"
              class="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-4 border-2 transition-all cursor-pointer"
              :class="[
                isMergeMode && isOrderSelectedForMerge(order.id)
                  ? 'border-violet-500 bg-violet-50 dark:bg-violet-900/20'
                  : 'border-gray-200 dark:border-gray-700/30',
                isMergeMode ? 'hover:border-violet-300' : '',
              ]"
              @click="isMergeMode ? toggleOrderForMerge(order) : null"
            >
              <div class="flex justify-between items-start mb-2">
                <div class="flex items-center gap-2">
                  <!-- Merge checkbox -->
                  <UCheckbox
                    v-if="isMergeMode"
                    :model-value="isOrderSelectedForMerge(order.id)"
                    color="violet"
                    class="mr-1"
                    @click.stop
                    @update:model-value="toggleOrderForMerge(order)"
                  />
                  <span
                    v-if="order.orderNumber"
                    class="text-lg font-bold text-amber-600 dark:text-amber-400 bg-amber-100 dark:bg-amber-900/30 px-2 py-0.5 rounded"
                  >
                    #{{ order.orderNumber }}
                  </span>
                  <div>
                    <p
                      class="font-medium text-gray-900 dark:text-white flex items-center gap-2"
                    >
                      {{ order?.code || order.id }}
                      <span
                        v-if="order.tableNumber"
                        class="text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 px-2 py-0.5 rounded-full"
                      >
                        🪑 {{ order.tableNumber }}
                      </span>
                    </p>
                    <p class="text-xs text-gray-500">
                      {{ new Date(order.date).toLocaleTimeString() }}
                    </p>
                  </div>
                </div>
                <div class="text-right">
                  <p class="font-bold text-red-600 dark:text-red-400 text-lg">
                    {{
                      currency.format(
                        order.total,
                        order.currency || pos.selectedCurrency.value
                      )
                    }}
                  </p>
                  <p class="text-xs text-gray-500">
                    {{ order.items.length }} {{ t("common.items", "items") }}
                  </p>
                </div>
              </div>

              <!-- Order Items Preview -->
              <div
                class="text-sm text-gray-500 dark:text-gray-400 mb-3 space-y-1"
              >
                <div
                  v-for="item in order.items.slice(0, 3)"
                  :key="item.product.id"
                  class="flex justify-between"
                >
                  <span>{{ item.quantity }}x {{ item.product.name }}</span>
                  <span>{{
                    currency.format(
                      item.product.price * item.quantity,
                      order.currency || "LAK"
                    )
                  }}</span>
                </div>
                <p v-if="order.items.length > 3" class="text-xs italic">
                  +{{ order.items.length - 3 }}
                  {{ t("common.more", "more") }}...
                </p>
              </div>

              <div class="flex gap-2">
                <UButton
                  size="sm"
                  color="emerald"
                  variant="soft"
                  @click.stop="loadOrderForEditing(order)"
                >
                  <UIcon name="i-heroicons-pencil-square" class="w-4 h-4" />
                  {{ t("common.edit", "Edit") }}
                </UButton>
                <UButton
                  block
                  size="sm"
                  color="primary"
                  @click.stop="selectPendingOrderForPayment(order)"
                >
                  <UIcon name="i-heroicons-banknotes" class="w-4 h-4" />
                  {{ t("pos.collectPayment", "Pay") }}
                </UButton>
                <UButton
                  size="sm"
                  color="amber"
                  variant="soft"
                  class="text-nowrap"
                  @click.stop="openSplitBill(order)"
                >
                  <UIcon name="i-heroicons-scissors" class="w-4 h-4" />
                  {{ t("pos.splitBill", "Split") }}
                </UButton>
                <UButton
                  size="sm"
                  color="red"
                  variant="ghost"
                  :title="t('pos.void_order')"
                  @click.stop="openVoidModalForOrder(order)"
                >
                  <UIcon name="i-heroicons-x-circle" class="w-4 h-4" />
                </UButton>
              </div>
            </div>
          </div>
        </div>
      </template>
    </UModal>

    <!-- Split Bill Modal -->
    <UModal
      v-model:open="showSplitBillModal"
      title="Split Bill"
      description="Split the bill into multiple orders"
    >
      <template #content>
        <div class="p-6 bg-white dark:bg-gray-900 min-w-[400px]">
          <h3
            class="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2"
          >
            <span>✂️</span> {{ t("pos.splitBill", "Split Bill") }}
          </h3>

          <!-- Order Info -->
          <div
            v-if="splitOrder"
            class="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-4 mb-4"
          >
            <div class="flex justify-between items-center mb-2">
              <span class="text-sm text-gray-500">{{ splitOrder.id }}</span>
              <span
                v-if="splitOrder.tableNumber"
                class="text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 px-2 py-0.5 rounded-full"
              >
                🪑 {{ splitOrder.tableNumber }}
              </span>
            </div>
            <div class="text-2xl font-bold text-gray-900 dark:text-white">
              {{
                currency.format(
                  splitOrder.total,
                  splitOrder.currency || pos.selectedCurrency.value
                )
              }}
            </div>
          </div>

          <!-- Split Count Selector -->
          <div class="mb-4">
            <label
              class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
            >
              {{ t("pos.numberOfPeople", "Number of People") }}
            </label>
            <div class="flex items-center gap-3">
              <UButton
                icon="i-heroicons-minus"
                color="neutral"
                variant="soft"
                :disabled="splitCount <= 2 || splitPaidCount > 0"
                @click="splitCount = Math.max(2, splitCount - 1)"
              />
              <div class="flex-1 text-center">
                <span
                  class="text-3xl font-bold text-gray-900 dark:text-white"
                  >{{ splitCount }}</span
                >
                <span class="text-sm text-gray-500 ml-2">{{
                  t("pos.people", "people")
                }}</span>
              </div>
              <UButton
                icon="i-heroicons-plus"
                color="neutral"
                variant="soft"
                :disabled="splitCount >= 10 || splitPaidCount > 0"
                @click="splitCount = Math.min(10, splitCount + 1)"
              />
            </div>
          </div>

          <!-- Amount Per Person -->
          <div
            class="bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-500/20 rounded-xl p-4 mb-4 text-center"
          >
            <div class="text-sm text-gray-600 dark:text-gray-400 mb-1">
              {{ t("pos.amountPerPerson", "Amount per person") }}
            </div>
            <div class="text-2xl font-bold text-amber-600 dark:text-amber-400">
              {{
                currency.format(
                  splitAmountPerPerson,
                  splitOrder?.currency || pos.selectedCurrency.value
                )
              }}
            </div>
          </div>

          <!-- Payment Progress -->
          <div v-if="splitPaidCount > 0" class="mb-4">
            <div class="flex items-center justify-between mb-2">
              <span
                class="text-sm font-medium text-gray-700 dark:text-gray-300"
              >
                {{ t("pos.paymentProgress", "Payment Progress") }}
              </span>
              <span class="text-sm text-gray-500">
                {{ splitPaidCount }}/{{ splitCount }}
                {{ t("pos.paid", "paid") }}
              </span>
            </div>
            <div class="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
              <div
                class="bg-green-500 h-3 rounded-full transition-all duration-300"
                :style="{ width: `${(splitPaidCount / splitCount) * 100}%` }"
              />
            </div>
            <div class="text-xs text-gray-500 mt-1 text-center">
              {{
                currency.format(
                  splitRemainingAmount,
                  splitOrder?.currency || "LAK"
                )
              }}
              {{ t("pos.remaining", "remaining") }}
            </div>
          </div>

          <!-- Payment History -->
          <div v-if="splitPayments.length > 0" class="mb-4">
            <h4
              class="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
            >
              {{ t("pos.paymentHistory", "Payment History") }}
            </h4>
            <div class="space-y-2">
              <div
                v-for="payment in splitPayments"
                :key="payment.portionNumber"
                class="flex items-center justify-between bg-green-50 dark:bg-green-900/20 rounded-lg p-3"
              >
                <div class="flex items-center gap-2">
                  <span class="text-green-600 dark:text-green-400">✓</span>
                  <div>
                    <div
                      class="text-sm font-medium text-gray-900 dark:text-white"
                    >
                      {{ t("pos.portion", "Portion") }}
                      {{ payment.portionNumber }}
                    </div>
                    <div class="text-xs text-gray-500">
                      {{ payment.method.toUpperCase() }} •
                      {{ new Date(payment.paidAt).toLocaleTimeString() }}
                    </div>
                  </div>
                </div>
                <div
                  class="text-sm font-semibold text-green-600 dark:text-green-400"
                >
                  {{
                    currency.format(
                      payment.amount,
                      splitOrder?.currency || "LAK"
                    )
                  }}
                </div>
              </div>
            </div>
          </div>

          <!-- Actions -->
          <div class="flex gap-3">
            <UButton
              block
              color="neutral"
              variant="soft"
              @click="closeSplitBill"
            >
              {{ t("common.cancel", "Cancel") }}
            </UButton>
            <UButton
              block
              color="primary"
              :loading="isProcessingSplit"
              :disabled="splitPaidCount >= splitCount"
              @click="paySplitPortion"
            >
              {{
                splitPaidCount > 0
                  ? t("pos.payNextPortion") ||
                    `Pay Portion ${splitPaidCount + 1}`
                  : t("pos.startSplitPayment", "Start Payment")
              }}
            </UButton>
          </div>
        </div>
      </template>
    </UModal>

    <!-- Numpad Modal -->
    <PosNumpadModal
      v-model:open="showNumpad"
      :initial-value="numpadInitialValue"
      @confirm="handleNumpadConfirm"
    />

    <!-- Settings Modal -->
    <UModal
      v-model:open="showSettingsModal"
      title="POS Settings"
      description="Settings for the POS system"
    >
      <template #content>
        <div class="p-6 bg-white dark:bg-gray-900 overflow-y-auto">
          <h2
            class="text-xl font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-2"
          >
            <Icon name="heroicons-solid:adjustments-vertical" />
            POS Settings
          </h2>

          <div class="space-y-6">
            <!-- Currency Setting -->
            <div>
              <label class="block text-sm text-gray-500 dark:text-gray-400 mb-2"
                >Default Currency</label
              >
              <USelectMenu
                v-model="pos.selectedCurrency.value"
                :items="getPOSCurrencyOptions()"
                value-key="value"
                label-key="label"
                searchable
                placeholder="Select currency"
              />
            </div>

            <!-- Lightning Provider -->
            <div>
              <label
                class="block text-sm text-gray-500 dark:text-gray-400 mb-2"
              >
                Lightning Provider
              </label>
              <USelect :items="['LNbits', 'Alby', 'NWC']" class="w-full" />
            </div>

            <!-- Tax Settings -->
            <div class="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-4">
              <div class="flex items-center justify-between mb-3">
                <div class="flex items-center gap-2">
                  <span>🧾</span>
                  <span class="font-medium text-gray-900 dark:text-white"
                    >Tax / VAT</span
                  >
                </div>
                <USwitch v-model="taxEnabled" />
              </div>

              <Transition name="collapse">
                <div v-if="taxEnabled" class="space-y-3 pt-2">
                  <!-- Tax Rate -->
                  <div>
                    <label
                      class="block text-xs text-gray-500 dark:text-gray-400 mb-1.5"
                      >Tax Rate (%)</label
                    >
                    <div class="flex gap-2">
                      <button
                        v-for="rate in [5, 7, 10, 15, 20]"
                        :key="rate"
                        class="flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all"
                        :class="
                          taxRatePercent === rate
                            ? 'bg-primary-500 text-white shadow-md'
                            : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600'
                        "
                        @click="taxRatePercent = rate"
                      >
                        {{ rate }}%
                      </button>
                    </div>
                    <!-- Custom rate input -->
                    <div class="mt-2">
                      <UInput
                        v-model.number="taxRatePercent"
                        type="number"
                        placeholder="Custom rate"
                        size="sm"
                        :min="0"
                        :max="100"
                        :step="0.5"
                      >
                        <template #trailing>
                          <span class="text-gray-400 text-xs">%</span>
                        </template>
                      </UInput>
                    </div>
                  </div>

                  <!-- Tax Mode -->
                  <div>
                    <label
                      class="block text-xs text-gray-500 dark:text-gray-400 mb-1.5"
                      >Tax Mode</label
                    >
                    <div class="grid grid-cols-2 gap-2">
                      <button
                        class="py-2 px-3 rounded-lg text-sm font-medium transition-all"
                        :class="
                          !taxInclusive
                            ? 'bg-primary-500 text-white shadow-md'
                            : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600'
                        "
                        @click="taxInclusive = false"
                      >
                        <div class="flex flex-col items-center gap-0.5">
                          <span>➕</span>
                          <span>Add on top</span>
                        </div>
                      </button>
                      <button
                        class="py-2 px-3 rounded-lg text-sm font-medium transition-all"
                        :class="
                          taxInclusive
                            ? 'bg-primary-500 text-white shadow-md'
                            : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600'
                        "
                        @click="taxInclusive = true"
                      >
                        <div class="flex flex-col items-center gap-0.5">
                          <span>📦</span>
                          <span>Included</span>
                        </div>
                      </button>
                    </div>
                    <p class="text-xs text-gray-400 mt-2">
                      {{
                        taxInclusive
                          ? "Prices already include tax (e.g., ₭110,000 includes ₭10,000 tax)"
                          : "Tax added to subtotal (e.g., ₭100,000 + ₭10,000 tax = ₭110,000)"
                      }}
                    </p>
                  </div>
                </div>
              </Transition>
            </div>

            <!-- Kitchen Auto-Serve Setting -->
            <div class="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-4">
              <div class="flex items-center justify-between">
                <div class="flex items-center gap-3">
                  <span class="text-xl">👨‍🍳</span>
                  <div>
                    <span class="font-medium text-gray-900 dark:text-white">
                      {{ $t("pos.autoServeOnPayment", "Auto-Close Kitchen") }}
                    </span>
                    <p class="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                      {{
                        $t(
                          "pos.autoServeOnPaymentDesc",
                          'Automatically mark orders as "served" when payment is completed'
                        )
                      }}
                    </p>
                  </div>
                </div>
                <USwitch
                  v-model="
                    posSettings.settings.value.autoCloseKitchenStatusOnPayment
                  "
                  @update:model-value="
                    (val) =>
                      posSettings.updateSettings({
                        autoCloseKitchenStatusOnPayment: val,
                      })
                  "
                />
              </div>
            </div>

            <!-- Session Info -->
            <div class="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-4">
              <div class="flex items-center justify-between mb-3">
                <span class="text-sm text-gray-500 dark:text-gray-400"
                  >Session Status</span
                >
                <UBadge
                  :color="pos.isSessionActive.value ? 'success' : 'error'"
                  variant="soft"
                >
                  {{ pos.isSessionActive.value ? "Active" : "Inactive" }}
                </UBadge>
              </div>

              <div v-if="pos.currentSession.value" class="space-y-2 text-sm">
                <div class="flex justify-between">
                  <span class="text-gray-500">Total Sales</span>
                  <span class="text-gray-900 dark:text-white font-medium">
                    {{
                      currency.format(
                        pos.currentSession.value.totalSales,
                        pos.selectedCurrency.value
                      )
                    }}
                  </span>
                </div>
                <div class="flex justify-between">
                  <span class="text-gray-500">Orders</span>
                  <span class="text-gray-900 dark:text-white font-medium">{{
                    pos.currentSession.value.totalOrders
                  }}</span>
                </div>
                <div class="flex justify-between">
                  <span class="text-gray-500">Cash Sales</span>
                  <span class="text-gray-900 dark:text-white font-medium">
                    {{
                      currency.format(
                        pos.currentSession.value.cashSales,
                        pos.selectedCurrency.value
                      )
                    }}
                  </span>
                </div>
                <div class="flex justify-between">
                  <span class="text-gray-500">Lightning Sales</span>
                  <span class="text-amber-600 dark:text-amber-400 font-medium">
                    {{
                      currency.format(
                        pos.currentSession.value.lightningSales,
                        pos.selectedCurrency.value
                      )
                    }}
                  </span>
                </div>
              </div>
            </div>

            <!-- Offline Mode Info -->
            <div class="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-4">
              <div class="flex items-center gap-2 mb-2">
                <span>📴</span>
                <span class="font-medium text-gray-900 dark:text-white"
                  >Offline Mode</span
                >
              </div>
              <p class="text-sm text-gray-500 dark:text-gray-400">
                Payments are stored locally and synced when online.
              </p>
              <p class="text-sm text-amber-600 dark:text-amber-400 mt-2">
                {{ offline.pendingCount.value }} payments pending sync
              </p>
            </div>

            <!-- Close Button -->
            <UButton
              block
              color="neutral"
              variant="outline"
              @click="showSettingsModal = false"
            >
              Close
            </UButton>
          </div>
        </div>
      </template>
    </UModal>

    <!-- Product Options Modal (Variants & Modifiers) -->
    <UModal
      v-model:open="showProductOptionsModal"
      title="Product Options"
      description="Select options for the product"
    >
      <template #content>
        <div class="p-6 bg-white dark:bg-gray-900 max-h-[80vh] overflow-auto">
          <div v-if="selectedProduct" class="space-y-5">
            <!-- Product Header -->
            <div class="flex items-center gap-4">
              <div
                v-if="
                  selectedProduct.image &&
                  selectedProduct.image.startsWith('http')
                "
              >
                <img
                  :src="selectedProduct.image"
                  :alt="selectedProduct.name"
                  class="object-cover rounded-lg w-10 h-10"
                  loading="lazy"
                  @error="(e: Event) => (e.target as HTMLImageElement).style.display = 'none'"
                />
              </div>
              <div v-else class="text-4xl">📦</div>
              <div class="flex-1">
                <h3 class="text-lg font-bold text-gray-900 dark:text-white">
                  {{ selectedProduct.name }}
                </h3>
                <p class="text-sm text-gray-500">
                  {{ selectedProduct.description || selectedProduct.sku }}
                </p>
              </div>
            </div>

            <!-- Size/Variant Selection -->
            <div
              v-if="
                selectedProduct.hasVariants &&
                selectedProduct.variants &&
                selectedProduct.variants.length > 0
              "
            >
              <label
                class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
              >
                📏 Select Size
              </label>
              <div class="grid grid-cols-3 gap-2">
                <button
                  v-for="variant in selectedProduct.variants"
                  :key="variant.id"
                  class="p-3 rounded-xl border-2 text-center transition-all"
                  :class="
                    selectedVariant?.id === variant.id
                      ? 'border-amber-500 bg-amber-500/10 text-amber-600 dark:text-amber-400'
                      : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                  "
                  @click="selectedVariant = variant"
                >
                  <div class="text-lg font-bold">{{ variant.shortName }}</div>
                  <div class="text-xs text-gray-500">{{ variant.name }}</div>
                  <div
                    v-if="variant.priceModifier !== 0"
                    class="text-xs mt-1"
                    :class="
                      variant.priceModifier > 0
                        ? 'text-amber-600'
                        : 'text-green-600'
                    "
                  >
                    {{ variant.priceModifier > 0 ? "+" : ""
                    }}{{
                      variant.priceModifierType === "percentage"
                        ? `${variant.priceModifier}%`
                        : currency.format(
                            variant.priceModifier,
                            pos.selectedCurrency.value
                          )
                    }}
                  </div>
                </button>
              </div>
            </div>

            <!-- Modifier Groups -->
            <div
              v-if="
                selectedProduct.modifierGroups &&
                selectedProduct.modifierGroups.length > 0
              "
            >
              <div
                v-for="group in selectedProduct.modifierGroups"
                :key="group.id"
                class="mb-4"
              >
                <label
                  class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
                >
                  {{ group.name }}
                  <span v-if="group.required" class="text-red-500">*</span>
                  <span
                    v-if="group.type === 'multiple'"
                    class="text-xs text-gray-500 ml-1"
                  >
                    (select {{ group.minSelect || 0 }}-{{
                      group.maxSelect || "any"
                    }})
                  </span>
                </label>
                <div class="space-y-2">
                  <button
                    v-for="mod in group.modifiers"
                    :key="mod.id"
                    class="w-full flex items-center justify-between p-3 rounded-xl border-2 transition-all"
                    :class="
                      selectedModifiers.some((m) => m.id === mod.id)
                        ? 'border-amber-500 bg-amber-500/10'
                        : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                    "
                    @click="toggleModifier(mod)"
                  >
                    <div class="flex items-center gap-3">
                      <div
                        class="w-5 h-5 rounded-full border-2 flex items-center justify-center"
                        :class="
                          selectedModifiers.some((m) => m.id === mod.id)
                            ? 'border-amber-500 bg-amber-500'
                            : 'border-gray-300 dark:border-gray-600'
                        "
                      >
                        <UIcon
                          v-if="selectedModifiers.some((m) => m.id === mod.id)"
                          name="i-heroicons-check"
                          class="w-3 h-3 text-white"
                        />
                      </div>
                      <span class="text-gray-900 dark:text-white">{{
                        mod.name
                      }}</span>
                    </div>
                    <span
                      v-if="mod.price !== 0"
                      class="text-sm"
                      :class="
                        mod.price > 0 ? 'text-amber-600' : 'text-green-600'
                      "
                    >
                      {{ mod.price > 0 ? "+" : ""
                      }}{{
                        currency.format(mod.price, pos.selectedCurrency.value)
                      }}
                    </span>
                  </button>
                </div>
              </div>
            </div>

            <!-- Quantity -->
            <div>
              <label
                class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
              >
                Quantity
              </label>
              <div class="flex items-center gap-3">
                <button
                  class="w-12 h-12 rounded-xl bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-xl font-bold"
                  @click="productQuantity = Math.max(1, productQuantity - 1)"
                >
                  −
                </button>
                <span
                  class="w-16 text-center text-2xl font-bold text-gray-900 dark:text-white"
                >
                  {{ productQuantity }}
                </span>
                <button
                  class="w-12 h-12 rounded-xl bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-xl font-bold"
                  @click="productQuantity++"
                >
                  +
                </button>
              </div>
            </div>

            <!-- Total & Actions -->
            <div class="pt-4 border-t border-gray-200 dark:border-gray-700">
              <div class="flex items-center justify-between mb-4">
                <span class="text-gray-500">Total</span>
                <span
                  class="text-2xl font-bold text-amber-600 dark:text-amber-400"
                >
                  {{
                    currency.format(
                      selectedProductPrice * productQuantity,
                      pos.selectedCurrency.value
                    )
                  }}
                </span>
              </div>
              <div class="flex gap-2">
                <UButton
                  color="neutral"
                  variant="outline"
                  blcok
                  @click="showProductOptionsModal = false"
                >
                  Cancel
                </UButton>
                <UButton
                  color="primary"
                  class="bg-linear-to-r from-amber-500 to-orange-500"
                  block
                  @click="addProductWithOptions"
                >
                  Add to Cart
                </UButton>
              </div>
            </div>
          </div>
        </div>
      </template>
    </UModal>

    <!-- Item Notes Modal -->
    <PosItemNotesModal
      v-model:open="showItemNotesModal"
      :initial-notes="editingItemNotes"
      :item-name="editingItemName"
      @save="saveItemNotes"
    />

    <!-- Table Switcher Modal -->
    <PosTableSwitcherModal
      v-model:open="showTableSwitcher"
      :tables="tables"
      :current-table-name="pos.tableNumber.value"
      :tables-store="tablesStore"
      :current-time="currentTime"
      @switch="switchTable"
      @manage="navigateTo('/pos/tables')"
    />

    <!-- Barcode Scanner Modal -->
    <UModal v-model:open="showBarcodeScannerModal">
      <template #content>
        <div class="p-6">
          <div class="flex items-center justify-between mb-4">
            <h3 class="text-lg font-semibold text-gray-900 dark:text-white">
              {{ t("pos.scanner.title", "Scan Barcode") }}
            </h3>
            <UButton
              icon="i-heroicons-x-mark"
              color="neutral"
              variant="ghost"
              size="sm"
              @click="showBarcodeScannerModal = false"
            />
          </div>
          <PosBarcodeScanner
            :auto-focus="true"
            :show-history="true"
            :initial-mode="barcodeScannerMode"
            @scan="handleBarcodeScan"
          />
        </div>
      </template>
    </UModal>

    <!-- Customer Lookup Modal -->
    <PosCustomerModal
      v-model:open="showCustomerModal"
      :customers="customersStore.customers.value"
      @select="selectCustomer"
      @create-new="navigateTo('/customers/new')"
    />
  </div>
</template>

<style scoped>
.scrollbar-hide {
  -ms-overflow-style: none;
  scrollbar-width: none;
}

.scrollbar-hide::-webkit-scrollbar {
  display: none;
}

.line-clamp-2 {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

/* Slide-up transition for mobile cart */
.slide-up-enter-active,
.slide-up-leave-active {
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.slide-up-enter-from,
.slide-up-leave-to {
  opacity: 0;
}

.slide-up-enter-from > div:last-child,
.slide-up-leave-to > div:last-child {
  transform: translateY(100%);
}

/* Collapse transition for extras section */
.collapse-enter-active,
.collapse-leave-active {
  transition: all 0.2s ease-out;
  overflow: hidden;
}

.collapse-enter-from,
.collapse-leave-to {
  opacity: 0;
  max-height: 0;
  padding-top: 0;
  padding-bottom: 0;
}

.collapse-enter-to,
.collapse-leave-from {
  opacity: 1;
  max-height: 200px;
}
</style>
