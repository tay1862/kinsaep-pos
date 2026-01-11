<!-- pages/orders/create.vue -->
<!-- 🛒 Enterprise Order System - Full Featured -->
<script setup lang="ts">
import type {
  Product,
  CartItem,
  Order,
  PaymentMethod,
  LoyaltyMember,
  OrderType,
} from "~/types";

definePageMeta({
  layout: "default",
  middleware: ["auth"],
});

useHead({
  title: "Create New Order - Enterprise Order System",
});

const { t } = useI18n();
const router = useRouter();
const toast = useToast();

// Composables
const productsStore = useProductsStore();
const ordersStore = useOrders();
const customersStore = useCustomers();
const { format: formatCurrency } = useCurrency();

// Initialize
const isLoading = ref(true);
onMounted(async () => {
  await Promise.all([productsStore.init(), customersStore.init()]);
  loadTaxSettings(); // Load tax settings from localStorage like POS
  isLoading.value = false;
});

// ============================================
// ORDER STATE
// ============================================
const orderStatus = ref<"draft" | "confirmed" | "processing">("draft");
const orderType = ref<OrderType>("take_away");
const tableNumber = ref("");

// ============================================
// CUSTOMER (from system)
// ============================================
const showCustomerModal = ref(false);
const customerSearchQuery = ref("");
const selectedCustomer = ref<LoyaltyMember | null>(null);

const filteredCustomers = computed(() => {
  if (!customerSearchQuery.value.trim()) {
    return customersStore.customers.value.slice(0, 10);
  }
  return customersStore.searchCustomers(customerSearchQuery.value);
});

const selectCustomer = (customer: LoyaltyMember) => {
  selectedCustomer.value = customer;
  showCustomerModal.value = false;
  toast.add({
    title: "Customer Selected",
    description: customer.name || customer.phone || "Customer",
    color: "green",
  });
};

// ============================================
// SHIPPING / SENDER INFO + TRACKING
// ============================================
const showShippingModal = ref(false);
const shippingInfo = ref({
  senderName: "",
  senderPhone: "",
  recipientName: "",
  recipientPhone: "",
  address: "",
  city: "",
  postalCode: "",
  deliveryNotes: "",
  deliveryDate: "",
  deliveryTime: "",
  carrier: "",
  trackingNumber: "",
  shippingMethod: "standard",
  requiresSignature: false,
  insurance: 0,
});

const shippingCarriers = [
  { value: "fedex", label: "FedEx", icon: "📦" },
  { value: "ups", label: "UPS", icon: "🚚" },
  { value: "dhl", label: "DHL", icon: "✈️" },
  { value: "usps", label: "USPS", icon: "📮" },
  { value: "local", label: "Local Courier", icon: "🏍️" },
];

const shippingMethods = [
  { value: "standard", label: "Standard (3-5 days)", price: 50000 },
  { value: "express", label: "Express (1-2 days)", price: 100000 },
  { value: "overnight", label: "Overnight", price: 200000 },
  { value: "pickup", label: "Customer Pickup", price: 0 },
];

// ============================================
// ENTERPRISE FEATURES
// ============================================
// Order Priority & Tags
const orderPriority = ref<"low" | "normal" | "high" | "urgent">("normal");
const orderTags = ref<string[]>([]);
const tagInput = ref("");

const priorityOptions = [
  { value: "low", label: "Low", color: "gray", icon: "⬇️" },
  { value: "normal", label: "Normal", color: "blue", icon: "➡️" },
  { value: "high", label: "High", color: "orange", icon: "⬆️" },
  { value: "urgent", label: "Urgent", color: "red", icon: "🚨" },
];

const popularTags = [
  "Wholesale",
  "VIP",
  "Rush",
  "Gift",
  "Corporate",
  "Recurring",
  "Special Request",
];

const addTag = (tag: string) => {
  if (tag && !orderTags.value.includes(tag)) {
    orderTags.value.push(tag);
    tagInput.value = "";
  }
};

const removeTag = (tag: string) => {
  orderTags.value = orderTags.value.filter((t) => t !== tag);
};

// Staff Assignment
const assignedStaff = ref<string[]>([]);
const showStaffModal = ref(false);

// Use real employees from Nostr
const employeesStore = useEmployeesStore();
await employeesStore.init();

const staffMembers = computed(() => {
  return employeesStore.activeEmployees.value.map(emp => ({
    id: emp.id,
    name: `${emp.firstName} ${emp.lastName}`,
    role: emp.position || emp.department || 'Staff',
    avatar: emp.avatar || '👤',
    email: emp.email
  }));
});

// Split Payments
const enableSplitPayment = ref(false);
const splitPayments = ref<Array<{ method: PaymentMethod; amount: number }>>([]);

const addSplitPayment = () => {
  splitPayments.value.push({ method: "cash", amount: 0 });
};

const removeSplitPayment = (index: number) => {
  splitPayments.value.splice(index, 1);
};

const splitPaymentTotal = computed(() =>
  splitPayments.value.reduce((sum, p) => sum + p.amount, 0)
);

// Advanced Notes Categories
type NoteCategory = "internal" | "customer" | "shipping" | "accounting";
const notes = ref<
  Array<{ category: NoteCategory; text: string; timestamp: Date }>
>([]);
const noteCategory = ref<NoteCategory>("internal");
const noteText = ref("");

const noteCategories = [
  { value: "internal", label: "Internal", icon: "🔒", color: "gray" },
  { value: "customer", label: "Customer", icon: "👤", color: "blue" },
  { value: "shipping", label: "Shipping", icon: "📦", color: "green" },
  { value: "accounting", label: "Accounting", icon: "💰", color: "purple" },
];

const addNote = () => {
  if (noteText.value.trim()) {
    notes.value.push({
      category: noteCategory.value,
      text: noteText.value,
      timestamp: new Date(),
    });
    noteText.value = "";
  }
};

// Customer Insights
const showCustomerInsights = ref(false);
const customerOrderHistory = computed(() => {
  if (!selectedCustomer.value) return [];
  // Mock data - in real app, fetch from ordersStore
  return [
    { id: "ORD-001", date: "2025-12-15", total: 150000, status: "completed" },
    { id: "ORD-002", date: "2025-11-20", total: 280000, status: "completed" },
  ];
});

// Product Recommendations
const showRecommendations = ref(false);
const recommendedProducts = computed(() => {
  // Smart recommendations based on cart items or customer history
  if (cart.value.length === 0) return [];
  // Mock - in real app, use ML/analytics
  return products.value.filter((p) => p.status === "active").slice(0, 3);
});

// Order Templates
const showTemplateModal = ref(false);
const orderTemplates = ref([
  { id: "t1", name: "Weekly Wholesale Order", items: 5, total: 500000 },
  { id: "t2", name: "Corporate Gift Pack", items: 3, total: 250000 },
]);

// Fulfillment Scheduling
const scheduleFulfillment = ref(false);
const fulfillmentDate = ref("");
const fulfillmentTime = ref("");
const fulfillmentNotes = ref("");

// Document Attachments
const attachments = ref<Array<{ name: string; url: string; type: string }>>([]);

// Quick Actions Panel
const showQuickActions = ref(true);

// ============================================
// PRODUCT SELECTION MODAL
// ============================================
const showProductModal = ref(false);
const productSearchQuery = ref("");
const selectedProductsInModal = ref<Set<string>>(new Set());
const productQuantities = ref<Record<string, number>>({});

const products = computed(() => productsStore.products.value);

const filteredProducts = computed(() => {
  if (!productSearchQuery.value.trim()) {
    return products.value.filter((p) => p.status === "active");
  }
  const query = productSearchQuery.value.toLowerCase();
  return products.value.filter(
    (p) =>
      p.status === "active" &&
      (p.name.toLowerCase().includes(query) ||
        p.sku?.toLowerCase().includes(query) ||
        p.barcode?.toLowerCase().includes(query))
  );
});

const toggleProductSelection = (productId: string) => {
  if (selectedProductsInModal.value.has(productId)) {
    selectedProductsInModal.value.delete(productId);
    delete productQuantities.value[productId];
  } else {
    selectedProductsInModal.value.add(productId);
    productQuantities.value[productId] = 1;
  }
  // Trigger reactivity
  selectedProductsInModal.value = new Set(selectedProductsInModal.value);
};

const updateProductQuantityInModal = (productId: string, qty: number) => {
  if (qty > 0) {
    productQuantities.value[productId] = qty;
  }
};

// Update delivery fee when shipping method changes
watch(
  () => shippingInfo.value.shippingMethod,
  (newMethod) => {
    const method = shippingMethods.find((m) => m.value === newMethod);
    if (method) {
      deliveryFee.value = method.price;
    }
  }
);

const addSelectedProductsToCart = () => {
  for (const productId of selectedProductsInModal.value) {
    const product = products.value.find((p) => p.id === productId);
    if (product) {
      const qty = productQuantities.value[productId] || 1;
      addToCartWithQty(product, qty);
    }
  }

  toast.add({
    title: "Products Added",
    description: `${selectedProductsInModal.value.size} items added to order`,
    color: "green",
  });

  selectedProductsInModal.value = new Set();
  productQuantities.value = {};
  showProductModal.value = false;
};

// ============================================
// CART STATE
// ============================================
const cart = ref<CartItem[]>([]);
const orderNotes = ref("");
const selectedPaymentMethod = ref<PaymentMethod>("cash");
const discountAmount = ref(0);
const discountType = ref<"fixed" | "percent">("fixed");
const deliveryFee = ref(0);

// Tax settings (loaded from localStorage like POS)
const taxEnabled = ref(false);
const taxRatePercent = ref(10);
const taxInclusive = ref(false);

// Tip settings
const tipPercent = ref(0);
const tipOptions = [
  { label: "No Tip", value: 0 },
  { label: "5%", value: 5 },
  { label: "10%", value: 10 },
  { label: "15%", value: 15 },
  { label: "20%", value: 20 },
];

// Coupon state
const appliedCoupon = ref<{ code: string; discount: number } | null>(null);

// KiotViet-style: Barcode scan & paid amount
const barcodeInput = ref("");
const paidAmount = ref(0);

// Load tax settings from localStorage (same as POS)
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

// Cart calculations
const cartItemCount = computed(() =>
  cart.value.reduce((sum, item) => sum + item.quantity, 0)
);
const subtotal = computed(() =>
  cart.value.reduce((sum, item) => sum + item.total, 0)
);
const discountValue = computed(() => {
  let discount = 0;
  if (discountType.value === "percent") {
    discount = subtotal.value * (discountAmount.value / 100);
  } else {
    discount = discountAmount.value;
  }
  // Add coupon discount
  if (appliedCoupon.value) {
    discount += appliedCoupon.value.discount;
  }
  return discount;
});
const tipAmount = computed(() => subtotal.value * (tipPercent.value / 100));
const taxAmount = computed(() => {
  if (!taxEnabled.value) return 0;
  const taxableAmount = subtotal.value - discountValue.value;
  if (taxInclusive.value) {
    return Math.round(
      taxableAmount - taxableAmount / (1 + taxRatePercent.value / 100)
    );
  }
  return Math.round(taxableAmount * (taxRatePercent.value / 100));
});
const total = computed(() => {
  const base =
    subtotal.value - discountValue.value + tipAmount.value + deliveryFee.value;
  if (taxInclusive.value) return base;
  return base + taxAmount.value;
});
const change = computed(() => Math.max(0, paidAmount.value - total.value));

// Barcode/SKU quick add handler
const handleBarcodeInput = () => {
  if (!barcodeInput.value.trim()) return;
  const query = barcodeInput.value.trim().toLowerCase();
  const product = products.value.find(
    (p) =>
      p.sku?.toLowerCase() === query ||
      p.barcode?.toLowerCase() === query ||
      p.name.toLowerCase() === query
  );
  if (product) {
    addToCartWithQty(product, 1);
    toast.add({ title: "Added", description: product.name, color: "green" });
  } else {
    toast.add({
      title: "Not Found",
      description: `No product with SKU/barcode: ${barcodeInput.value}`,
      color: "red",
    });
  }
  barcodeInput.value = "";
};

// Coupon handler
const couponCodeInput = ref("");
const sampleCoupons: Record<string, number> = {
  SAVE10: 10000,
  SAVE20: 20000,
  WELCOME: 15000,
  VIP50: 50000,
  "10OFF": subtotal.value * 0.1, // 10% off
};

const validateAndApplyCoupon = () => {
  const code = couponCodeInput.value.trim().toUpperCase();
  if (!code) return;

  // Check if coupon exists
  if (sampleCoupons[code] !== undefined) {
    const discountAmt =
      code === "10OFF" ? Math.round(subtotal.value * 0.1) : sampleCoupons[code];
    appliedCoupon.value = { code, discount: discountAmt };
    toast.add({
      title: "Coupon Applied!",
      description: `${code} - ${formatCurrency(discountAmt, "LAK")} off`,
      color: "green",
    });
    couponCodeInput.value = "";
  } else {
    toast.add({
      title: "Invalid Coupon",
      description: `Coupon "${code}" not found`,
      color: "red",
    });
  }
};

const applyCoupon = (code: string, discountAmt: number) => {
  appliedCoupon.value = { code, discount: discountAmt };
  toast.add({
    title: "Coupon Applied",
    description: `${code} - ${formatCurrency(discountAmt, "LAK")} off`,
    color: "green",
  });
};
const removeCoupon = () => {
  appliedCoupon.value = null;
  couponCodeInput.value = "";
};

// Cart actions
const addToCartWithQty = (product: Product, qty: number) => {
  const existingItem = cart.value.find(
    (item) => item.product.id === product.id
  );

  if (existingItem) {
    existingItem.quantity += qty;
    existingItem.total = existingItem.quantity * existingItem.price;
  } else {
    cart.value.push({
      product,
      quantity: qty,
      price: product.price,
      total: product.price * qty,
    });
  }
};

const updateQuantity = (item: CartItem, qty: number) => {
  if (qty <= 0) {
    removeFromCart(item);
  } else if (qty <= item.product.stock) {
    item.quantity = qty;
    item.total = item.quantity * item.price;
  }
};

const removeFromCart = (item: CartItem) => {
  const index = cart.value.findIndex((i) => i.product.id === item.product.id);
  if (index !== -1) {
    cart.value.splice(index, 1);
  }
};

const clearCart = () => {
  cart.value = [];
  discountAmount.value = 0;
  deliveryFee.value = 0;
  selectedCustomer.value = null;
  orderNotes.value = "";
  shippingInfo.value = {
    senderName: "",
    senderPhone: "",
    recipientName: "",
    recipientPhone: "",
    address: "",
    city: "",
    postalCode: "",
    deliveryNotes: "",
    deliveryDate: "",
    deliveryTime: "",
    carrier: "",
    trackingNumber: "",
    shippingMethod: "",
    requiresSignature: false,
    insurance: 0,
  };
};

// ============================================
// PAYMENT
// ============================================
const showPaymentModal = ref(false);
const processing = ref(false);

const paymentMethods = [
  { value: "cash", label: "Cash", emoji: "💵" },
  { value: "lightning", label: "Lightning", emoji: "⚡" },
  { value: "qr_static", label: "QR Code", emoji: "📱" },
  { value: "bank_transfer", label: "Bank Transfer", emoji: "🏦" },
];

const orderTypeOptions = [
  { value: "dine_in", label: "Dine In", icon: "🍽️" },
  { value: "take_away", label: "Takeaway", icon: "🥡" },
  { value: "delivery", label: "Delivery", icon: "🚚" },
  { value: "pickup", label: "Pickup", icon: "🏪" },
];

const statusOptions = [
  { value: "draft", label: "Draft", color: "gray" },
  { value: "confirmed", label: "Confirmed", color: "blue" },
  { value: "processing", label: "Processing", color: "yellow" },
];

const getStatusStyle = (status: string) => {
  const styles: Record<string, string> = {
    draft:
      "bg-gray-100 text-gray-600 border-gray-200 dark:bg-gray-800 dark:text-gray-400",
    confirmed:
      "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400",
    processing:
      "bg-yellow-100 text-yellow-700 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-400",
  };
  return styles[status] || styles.draft;
};

const processOrder = async () => {
  if (cart.value.length === 0) return;
  processing.value = true;

  try {
    const orderData: Order = {
      id: `ORD-${Date.now().toString(36).toUpperCase()}`,
      customer: selectedCustomer.value?.name || "Walk-in Customer",
      customerPhone:
        selectedCustomer.value?.phone || shippingInfo.value.senderPhone,
      customerEmail: selectedCustomer.value?.email,
      branch: "Default Branch",
      date: new Date().toISOString(),
      total: total.value,
      subtotal: subtotal.value,
      tax: taxAmount.value,
      discount: discountValue.value,
      currency: "LAK",
      status: orderStatus.value === "draft" ? "pending" : "processing",
      orderType: orderType.value,
      tableNumber: tableNumber.value || undefined,
      paymentMethod: selectedPaymentMethod.value,
      notes: orderNotes.value || undefined,
      shippingAddress:
        orderType.value === "delivery" ? shippingInfo.value.address : undefined,
      // Enterprise features
      priority: orderPriority.value,
      tags: orderTags.value.length > 0 ? orderTags.value : undefined,
      assignedStaff: assignedStaff.value.length > 0 ? assignedStaff.value : undefined,
      shippingInfo: orderType.value === "delivery" && shippingInfo.value.address
        ? {
            senderName: shippingInfo.value.senderName,
            senderPhone: shippingInfo.value.senderPhone,
            recipientName: shippingInfo.value.recipientName,
            recipientPhone: shippingInfo.value.recipientPhone,
            address: shippingInfo.value.address,
            city: shippingInfo.value.city,
            postalCode: shippingInfo.value.postalCode,
            deliveryNotes: shippingInfo.value.deliveryNotes,
            shippingMethod: shippingInfo.value.shippingMethod,
            carrier: shippingInfo.value.carrier,
            trackingNumber: shippingInfo.value.trackingNumber,
            requiresSignature: shippingInfo.value.requiresSignature,
            insurance: shippingInfo.value.insurance,
          }
        : undefined,
      fulfillment: scheduleFulfillment.value
        ? {
            scheduledDate: fulfillmentDate.value,
            scheduledTime: fulfillmentTime.value,
            notes: fulfillmentNotes.value,
          }
        : undefined,
      items: cart.value.map((item) => ({
        id: `ITEM-${Date.now()}-${item.product.id}`,
        productId: item.product.id,
        quantity: item.quantity,
        price: item.price,
        total: item.total,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        product: item.product,
      })),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const savedOrder = await ordersStore.createOrder(orderData);

    // ✅ AUTO-ADJUST STOCK: Decrease stock for each item (only if product tracks stock)
    for (const item of cart.value) {
      // Only deduct stock if product trackStock is not explicitly false
      // Products with trackStock=undefined or true will have stock deducted
      // Services/digital products with trackStock=false will be skipped
      if (item.product.trackStock !== false) {
        await productsStore.decreaseStock(item.product.id, item.quantity);
      }
    }

    if (
      selectedPaymentMethod.value === "cash" ||
      selectedPaymentMethod.value === "bank_transfer"
    ) {
      await ordersStore.completeOrder(
        savedOrder.id,
        selectedPaymentMethod.value
      );
    }

    toast.add({
      title: "Order Created",
      description: `Order #${savedOrder.id.slice(-6).toUpperCase()}`,
      icon: "i-heroicons-check-circle",
      color: "green",
    });

    showPaymentModal.value = false;
    clearCart();
    router.push(`/orders/${savedOrder.id}`);
  } catch (error) {
    toast.add({
      title: "Error",
      description:
        error instanceof Error ? error.message : "Failed to create order",
      color: "red",
    });
  } finally {
    processing.value = false;
  }
};

// Keyboard shortcuts
onMounted(() => {
  const handleKeydown = (e: KeyboardEvent) => {
    if (e.key === "F2") {
      e.preventDefault();
      showProductModal.value = true;
    }
    if (e.key === "F3") {
      e.preventDefault();
      showCustomerModal.value = true;
    }
    if ((e.ctrlKey || e.metaKey) && e.key === "p") {
      e.preventDefault();
      if (cart.value.length > 0) showPaymentModal.value = true;
    }
    if (e.key === "Escape") {
      showPaymentModal.value = false;
      showCustomerModal.value = false;
      showProductModal.value = false;
      showShippingModal.value = false;
    }
  };
  window.addEventListener("keydown", handleKeydown);
  onUnmounted(() => window.removeEventListener("keydown", handleKeydown));
});
</script>

<template>
  <div class="min-h-screen bg-gray-50 dark:bg-gray-950">
    <!-- ============ HEADER ============ -->
    <div
      class="bg-slate-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 sticky top-0 z-20"
    >
      <div class="max-w-7xl mx-auto px-4 py-3">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-4">
            <UButton
              icon="i-heroicons-chevron-left"
              variant="ghost"
              color="gray"
              to="/orders"
            />
            <span class="text-sm text-gray-500">New Order</span>
            <span class="text-gray-300">›</span>
            <span class="font-medium text-gray-900 dark:text-white"
              >Order #NEW</span
            >
          </div>
          <div class="flex items-center gap-2">
            <UButton
              icon="i-heroicons-document-duplicate"
              variant="outline"
              color="gray"
              size="sm"
              @click="showTemplateModal = true"
              title="Load Template"
            >
              Template
            </UButton>
            <UButton
              icon="i-heroicons-sparkles"
              variant="outline"
              color="purple"
              size="sm"
              @click="showRecommendations = !showRecommendations"
              title="Smart Recommendations"
            >
              AI
            </UButton>
            <UButton
              icon="i-heroicons-printer"
              variant="outline"
              color="gray"
              size="sm"
              disabled
              >Print</UButton
            >
            <UButton
              v-if="cart.length > 0"
              icon="i-heroicons-trash"
              variant="outline"
              color="red"
              size="sm"
              @click="clearCart"
            >
              Clear</UButton
            >
          </div>
        </div>
      </div>
    </div>

    <div class="max-w-7xl mx-auto px-4 py-6">
      <div class="flex gap-6">
        <!-- ============ MAIN CONTENT ============ -->
        <div class="flex-1 space-y-6">
          <!-- Order Title & Status -->
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-3">
              <h1 class="text-2xl font-bold text-gray-900 dark:text-white">
                Order #NEW
              </h1>
              <!-- Status Dropdown -->
              <UDropdownMenu
                :items="[
                  [
                    { label: 'Draft', click: () => (orderStatus = 'draft') },
                    {
                      label: 'Confirmed',
                      click: () => (orderStatus = 'confirmed'),
                    },
                    {
                      label: 'Processing',
                      click: () => (orderStatus = 'processing'),
                    },
                  ],
                ]"
              >
                <UBadge
                  :color="statusOptions.find((s) => s.value === orderStatus)?.color || 'gray'"
                  variant="subtle"
                  size="md"
                  class="cursor-pointer"
                >
                  {{ statusOptions.find((s) => s.value === orderStatus)?.label }}
                  <UIcon name="i-heroicons-chevron-down" class="w-3 h-3 ml-1" />
                </UBadge>
              </UDropdownMenu>

              <!-- Priority Badge -->
              <UDropdownMenu
                :items="[[
                ...priorityOptions.map(p => ({ 
                  label: p.icon + ' ' + p.label, 
                  click: () => orderPriority = p.value as any 
                }))
              ]]"
              >
                <UBadge
                  :color="priorityOptions.find((p) => p.value === orderPriority)?.color"
                  variant="subtle"
                  size="md"
                  class="cursor-pointer"
                >
                  {{ priorityOptions.find((p) => p.value === orderPriority)?.icon }}
                  {{ priorityOptions.find((p) => p.value === orderPriority)?.label }}
                  <UIcon name="i-heroicons-chevron-down" class="w-3 h-3 ml-1" />
                </UBadge>
              </UDropdownMenu>
            </div>

            <!-- Order Type -->
            <div
              class="flex items-center gap-2 bg-gray-100 dark:bg-gray-800 rounded-lg p-1"
            >
              <button
                v-for="type in orderTypeOptions"
                :key="type.value"
                class="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all"
                :class="[
                  orderType === type.value
                    ? 'bg-white dark:bg-gray-700 shadow text-gray-900 dark:text-white'
                    : 'text-gray-500 hover:text-gray-700',
                ]"
                @click="orderType = type.value as any"
              >
                <span>{{ type.icon }}</span>
                <span>{{ type.label }}</span>
              </button>
            </div>
          </div>

          <!-- Table Number (for Dine In) -->
          <div
            v-if="orderType === 'dine_in'"
            class="flex items-center gap-3 bg-white dark:bg-gray-900 rounded-xl border dark:border-gray-700 border-slate-200 p-4"
          >
            <UIcon
              name="i-heroicons-square-2-stack"
              class="w-5 h-5 text-gray-400"
            />
            <label class="text-sm text-gray-500">Table Number</label>
            <UInput
              v-model="tableNumber"
              placeholder="e.g. A1, 5"
              class="w-32"
            />
          </div>

          <!-- Tags & Labels -->
          <div
            class="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-5"
          >
            <div class="flex items-center justify-between mb-3">
              <h3
                class="font-semibold text-gray-900 dark:text-white flex items-center gap-2"
              >
                <UIcon name="i-heroicons-tag" class="w-5 h-5" />
                Tags & Labels
              </h3>
            </div>

            <!-- Tag Input -->
            <div class="flex items-center gap-2 mb-3">
              <UInput
                v-model="tagInput"
                icon="i-heroicons-plus"
                placeholder="Add custom tag..."
                class="flex-1"
                size="sm"
                @keyup.enter="addTag(tagInput)"
              />
              <UButton
                size="sm"
                :disabled="!tagInput.trim()"
                @click="addTag(tagInput)"
                >Add</UButton
              >
            </div>

            <!-- Popular Tags -->
            <div class="flex flex-wrap gap-2 mb-3">
              <UBadge
                v-for="tag in popularTags"
                :key="tag"
                :color="orderTags.includes(tag) ? 'primary' : 'gray'"
                :variant="orderTags.includes(tag) ? 'solid' : 'soft'"
                size="sm"
                class="cursor-pointer"
                @click="orderTags.includes(tag) ? removeTag(tag) : addTag(tag)"
              >
                {{ tag }}
              </UBadge>
            </div>

            <!-- Applied Tags -->
            <div
              v-if="orderTags.length > 0"
              class="flex flex-wrap gap-2 pt-3 border-t border-gray-200 dark:border-gray-700"
            >
              <UBadge
                v-for="tag in orderTags"
                :key="tag"
                color="primary"
                variant="solid"
                size="md"
                class="cursor-pointer"
              >
                {{ tag }}
                <button
                  @click="removeTag(tag)"
                  class="ml-1 hover:opacity-70"
                >
                  <UIcon name="i-heroicons-x-mark" class="w-3 h-3" />
                </button>
              </UBadge>
            </div>
          </div>

          <!-- Customer Section -->
          <div
            class="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-5"
          >
            <div
              v-if="selectedCustomer"
              class="flex items-center justify-between"
            >
              <div class="flex items-center gap-4">
                <div
                  class="w-14 h-14 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-white font-bold text-xl shadow-lg"
                >
                  {{ (selectedCustomer.name || "C").slice(0, 2).toUpperCase() }}
                </div>
                <div>
                  <div class="flex items-center gap-2">
                    <h3
                      class="text-lg font-semibold text-gray-900 dark:text-white"
                    >
                      {{ selectedCustomer.name || "Customer" }}
                    </h3>
                    <UBadge color="gray" variant="soft" size="xs">
                      {{ selectedCustomer.tier }}
                    </UBadge>
                  </div>
                  <p class="text-sm text-gray-500">
                    {{
                      selectedCustomer.phone ||
                      selectedCustomer.email ||
                      "No contact"
                    }}
                  </p>
                  <button
                    class="text-sm text-primary-600 hover:underline flex items-center gap-1 mt-1"
                    @click="showCustomerModal = true"
                  >
                    <UIcon name="i-heroicons-pencil" class="w-3 h-3" /> Change
                    Customer
                  </button>
                </div>
              </div>
              <div class="flex items-center gap-2">
                <UButton
                  icon="i-heroicons-chart-bar"
                  variant="soft"
                  color="purple"
                  size="sm"
                  @click="showCustomerInsights = true"
                  title="Customer Insights"
                >
                  Insights
                </UButton>
                <UButton
                  v-if="selectedCustomer.email"
                  icon="i-heroicons-envelope"
                  variant="soft"
                  color="gray"
                  size="sm"
                >
                  Email
                </UButton>
                <UButton
                  v-if="selectedCustomer.phone"
                  icon="i-heroicons-phone"
                  variant="soft"
                  color="gray"
                  size="sm"
                >
                  Call
                </UButton>
              </div>
            </div>
            <div v-else class="flex items-center justify-between">
              <span class="text-gray-500">No customer selected</span>
              <UButton
                icon="i-heroicons-user-plus"
                variant="soft"
                color="primary"
                @click="showCustomerModal = true"
              >
                Add Customer (F3)
              </UButton>
            </div>
          </div>

          <!-- Shipping Info (for Delivery) -->
          <div
            v-if="orderType === 'delivery'"
            class="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-5"
          >
            <div class="flex items-center justify-between mb-4">
              <h3
                class="font-semibold text-gray-900 dark:text-white flex items-center gap-2"
              >
                <span>🚚</span> Delivery Information
              </h3>
              <UButton
                variant="soft"
                size="sm"
                @click="showShippingModal = true"
              >
                {{ shippingInfo.address ? "Edit" : "Add Delivery Info" }}
              </UButton>
            </div>
            <div v-if="shippingInfo.address" class="space-y-3 text-sm">
              <div class="grid grid-cols-2 gap-4">
                <div>
                  <p class="text-gray-500">Recipient</p>
                  <p class="font-medium">{{ shippingInfo.recipientName }}</p>
                  <p>{{ shippingInfo.recipientPhone }}</p>
                </div>
                <div>
                  <p class="text-gray-500">Address</p>
                  <p class="font-medium">{{ shippingInfo.address }}</p>
                  <p>{{ shippingInfo.city }}</p>
                </div>
              </div>
              <div
                v-if="shippingInfo.carrier"
                class="pt-3 border-t border-gray-200 dark:border-gray-700 grid grid-cols-2 gap-4"
              >
                <div>
                  <p class="text-gray-500">Carrier</p>
                  <p class="font-medium">
                    {{
                      shippingCarriers.find(
                        (c) => c.value === shippingInfo.carrier
                      )?.label
                    }}
                  </p>
                </div>
                <div v-if="shippingInfo.trackingNumber">
                  <p class="text-gray-500">Tracking</p>
                  <p class="font-mono text-xs text-primary-600">
                    {{ shippingInfo.trackingNumber }}
                  </p>
                </div>
              </div>
            </div>
            <div v-else class="text-gray-400 text-sm">
              No delivery information added
            </div>
          </div>

          <!-- Smart Recommendations -->
          <div
            v-if="showRecommendations && recommendedProducts.length > 0"
            class="bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 rounded-xl border border-purple-200 dark:border-purple-800 p-5"
          >
            <div class="flex items-center justify-between mb-4">
              <h3
                class="font-semibold text-gray-900 dark:text-white flex items-center gap-2"
              >
                <UIcon
                  name="i-heroicons-sparkles"
                  class="w-5 h-5 text-purple-600"
                />
                Smart Recommendations
              </h3>
              <UButton
                icon="i-heroicons-x-mark"
                variant="ghost"
                size="xs"
                @click="showRecommendations = false"
              />
            </div>
            <div class="grid grid-cols-3 gap-3">
              <div
                v-for="product in recommendedProducts"
                :key="product.id"
                class="bg-white dark:bg-gray-900 rounded-lg p-3 border border-gray-200 dark:border-gray-700 cursor-pointer hover:shadow-md transition-all"
                @click="addToCartWithQty(product, 1)"
              >
                <div
                  class="w-full aspect-square rounded bg-gray-100 dark:bg-gray-800 mb-2 overflow-hidden"
                >
                  <img
                    v-if="product.image"
                    :src="product.image"
                    class="w-full h-full object-cover"
                  />
                  <div
                    v-else
                    class="w-full h-full flex items-center justify-center text-2xl"
                  >
                    📦
                  </div>
                </div>
                <p
                  class="text-sm font-medium text-gray-900 dark:text-white truncate"
                >
                  {{ product.name }}
                </p>
                <p class="text-xs text-primary-600 font-semibold">
                  {{ formatCurrency(product.price, "LAK") }}
                </p>
                <UButton size="xs" color="purple" block class="mt-2"
                  >+ Add</UButton
                >
              </div>
            </div>
          </div>

          <!-- Product Items Section -->
          <div
            class="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden"
          >
            <div
              class="px-5 py-4 border-b border-gray-200 dark:border-gray-800"
            >
              <!-- KiotViet-style: Barcode scan + quick add -->
              <div class="flex items-center gap-3 mb-3">
                <UInput
                  v-model="barcodeInput"
                  icon="i-heroicons-qr-code"
                  placeholder="Scan barcode or enter SKU..."
                  size="lg"
                  class="flex-1"
                  @keyup.enter="handleBarcodeInput"
                />
                <UButton
                  icon="i-heroicons-plus"
                  color="primary"
                  size="lg"
                  @click="showProductModal = true"
                >
                  Add (F2)
                </UButton>
              </div>
              <div class="flex items-center justify-between">
                <h3 class="font-semibold text-gray-900 dark:text-white">
                  Product Items ({{ cart.length }})
                </h3>
                <span class="text-sm text-gray-500"
                  >{{ cart.reduce((s, i) => s + i.quantity, 0) }} items
                  total</span
                >
              </div>
            </div>

            <!-- Empty State -->
            <div v-if="cart.length === 0" class="p-16 text-center">
              <UIcon
                name="i-heroicons-shopping-bag"
                class="w-16 h-16 text-gray-300 mx-auto mb-4"
              />
              <p class="text-gray-500 font-medium">No items in order</p>
              <p class="text-sm text-gray-400 mt-1">
                Click "Add Products" to select items
              </p>
            </div>

            <!-- Items Table -->
            <table v-else class="w-full">
              <thead class="bg-gray-50 dark:bg-gray-800/50">
                <tr>
                  <th
                    class="text-left py-3 px-5 text-xs font-semibold text-gray-500 uppercase"
                  >
                    Item Details
                  </th>
                  <th
                    class="text-center py-3 px-4 text-xs font-semibold text-gray-500 uppercase w-32"
                  >
                    Quantity
                  </th>
                  <th
                    class="text-right py-3 px-4 text-xs font-semibold text-gray-500 uppercase w-28"
                  >
                    Unit Price
                  </th>
                  <th
                    class="text-right py-3 px-5 text-xs font-semibold text-gray-500 uppercase w-32"
                  >
                    Total
                  </th>
                  <th class="w-10"></th>
                </tr>
              </thead>
              <tbody class="divide-y divide-gray-100 dark:divide-gray-800">
                <tr v-for="item in cart" :key="item.product.id">
                  <td class="py-4 px-5">
                    <div class="flex items-center gap-4">
                      <div
                        class="w-12 h-12 rounded-lg bg-gray-100 dark:bg-gray-700 flex items-center justify-center overflow-hidden"
                      >
                        <img
                          v-if="item.product.image"
                          :src="item.product.image"
                          class="w-full h-full object-cover"
                        />
                        <span v-else>📦</span>
                      </div>
                      <div>
                        <p class="font-medium text-gray-900 dark:text-white">
                          {{ item.product.name }}
                        </p>
                        <p class="text-xs text-gray-500">
                          SKU: {{ item.product.sku }}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td class="py-4 px-4">
                    <div class="flex items-center justify-center gap-1">
                      <UButton
                        icon="i-heroicons-minus"
                        size="xs"
                        color="gray"
                        variant="soft"
                        @click="updateQuantity(item, item.quantity - 1)"
                      />
                      <input
                        type="number"
                        :value="item.quantity"
                        class="w-14 text-center border border-gray-300 dark:border-gray-600 rounded-lg py-1 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                        @change="(e) => updateQuantity(item, parseInt((e.target as HTMLInputElement).value) || 1)"
                      />
                      <UButton
                        icon="i-heroicons-plus"
                        size="xs"
                        color="gray"
                        variant="soft"
                        @click="updateQuantity(item, item.quantity + 1)"
                      />
                    </div>
                  </td>
                  <td class="py-4 px-4 text-right text-sm text-gray-500">
                    {{ formatCurrency(item.price, "LAK") }}
                  </td>
                  <td class="py-4 px-5 text-right font-semibold">
                    {{ formatCurrency(item.total, "LAK") }}
                  </td>
                  <td class="py-4 px-2">
                    <UButton
                      icon="i-heroicons-x-mark"
                      size="xs"
                      variant="ghost"
                      color="red"
                      @click="removeFromCart(item)"
                    />
                  </td>
                </tr>
              </tbody>
            </table>

            <!-- Order Totals -->
            <div
              v-if="cart.length > 0"
              class="border-t p-5 bg-gray-50 dark:bg-gray-800/30 border-slate-200 dark:border-gray-700"
            >
              <div class="max-w-xs ml-auto space-y-2 text-sm">
                <div class="flex justify-between">
                  <span class="text-gray-500">Subtotal</span
                  ><span>{{ formatCurrency(subtotal, "LAK") }}</span>
                </div>
                <div
                  v-if="orderType === 'delivery'"
                  class="flex justify-between"
                >
                  <span class="text-gray-500">Delivery Fee</span>
                  <input
                    v-model.number="deliveryFee"
                    type="number"
                    class="w-24 text-right border border-gray-300 dark:border-gray-600 rounded px-2 py-1 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                    :min="0"
                  />
                </div>
                <div class="flex justify-between items-center">
                  <span class="text-gray-500">Discount</span>
                  <div class="flex items-center gap-1">
                    <input
                      v-model.number="discountAmount"
                      type="number"
                      class="w-16 text-right border border-gray-300 dark:border-gray-600 rounded px-2 py-1 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                      :min="0"
                    />
                    <div
                      class="flex rounded-md overflow-hidden border border-gray-300 dark:border-gray-600"
                    >
                      <button
                        type="button"
                        class="px-2 py-1 text-xs font-medium transition-colors"
                        :class="
                          discountType === 'percent'
                            ? 'bg-primary-500 text-white'
                            : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300'
                        "
                        @click="discountType = 'percent'"
                      >
                        %
                      </button>
                      <button
                        type="button"
                        class="px-2 py-1 text-xs font-medium transition-colors border-l border-gray-300 dark:border-gray-600"
                        :class="
                          discountType === 'fixed'
                            ? 'bg-primary-500 text-white'
                            : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300'
                        "
                        @click="discountType = 'fixed'"
                      >
                        ₭
                      </button>
                    </div>
                  </div>
                </div>
                <!-- Coupon Code Input -->
                <div v-if="!appliedCoupon" class="flex items-center gap-2">
                  <UInput
                    v-model="couponCodeInput"
                    icon="i-heroicons-ticket"
                    placeholder="Enter coupon code..."
                    size="sm"
                    class="flex-1"
                    @keyup.enter="validateAndApplyCoupon"
                  />
                  <UButton
                    size="sm"
                    color="primary"
                    variant="soft"
                    :disabled="!couponCodeInput.trim()"
                    @click="validateAndApplyCoupon"
                  >
                    Apply
                  </UButton>
                </div>
                <div
                  v-if="discountValue > 0 && !appliedCoupon"
                  class="flex justify-between text-green-600"
                >
                  <span>Discount Applied</span
                  ><span>-{{ formatCurrency(discountValue, "LAK") }}</span>
                </div>
                <div
                  v-if="appliedCoupon"
                  class="flex justify-between text-purple-600"
                >
                  <span class="flex items-center gap-1">
                    <UIcon name="i-heroicons-ticket" class="w-3 h-3" />
                    Coupon: {{ appliedCoupon.code }}
                    <button
                      @click="removeCoupon"
                      class="text-xs text-red-500 ml-1"
                    >
                      ×
                    </button>
                  </span>
                  <span
                    >-{{ formatCurrency(appliedCoupon.discount, "LAK") }}</span
                  >
                </div>
                <!-- Tip Selection -->
                <div class="flex justify-between items-center">
                  <span class="text-gray-500">Tip</span>
                  <div class="flex items-center gap-1">
                    <button
                      v-for="option in tipOptions"
                      :key="option.value"
                      type="button"
                      class="px-2 py-1 text-xs font-medium rounded transition-colors border"
                      :class="
                        tipPercent === option.value
                          ? 'bg-blue-500 text-white border-blue-500'
                          : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'
                      "
                      @click="tipPercent = option.value"
                    >
                      {{ option.label }}
                    </button>
                  </div>
                </div>
                <div
                  v-if="tipAmount > 0"
                  class="flex justify-between text-blue-600"
                >
                  <span>Tip ({{ tipPercent }}%)</span>
                  <span>+{{ formatCurrency(tipAmount, "LAK") }}</span>
                </div>
                <div
                  v-if="taxEnabled && taxAmount > 0"
                  class="flex justify-between"
                >
                  <span class="text-gray-500"
                    >Tax ({{ taxRatePercent }}%{{
                      taxInclusive ? " incl." : ""
                    }})</span
                  >
                  <span>{{ formatCurrency(taxAmount, "LAK") }}</span>
                </div>
                <div
                  class="flex justify-between text-lg font-bold pt-2 border-slate-200 dark:border-gray-700 border-t"
                >
                  <span>Total</span
                  ><span class="text-primary-600">{{
                    formatCurrency(total, "LAK")
                  }}</span>
                </div>
              </div>
            </div>
          </div>

          <!-- Advanced Notes System -->
          <div
            class="bg-white dark:bg-gray-900 dark:border-gray-700 border-slate-200 rounded-xl border p-5"
          >
            <h3 class="font-semibold mb-3 flex items-center gap-2">
              <UIcon name="i-heroicons-document-text" class="w-5 h-5" />
              Order Notes & Documentation
            </h3>

            <!-- Note Input -->
            <div class="space-y-3">
              <div class="flex items-center gap-2">
                <USelectMenu
                  v-model="noteCategory"
                  :options="noteCategories"
                  size="sm"
                  class="w-40"
                >
                  <template #label>
                    <span class="flex items-center gap-1">
                      {{
                        noteCategories.find((c) => c.value === noteCategory)
                          ?.icon
                      }}
                      {{
                        noteCategories.find((c) => c.value === noteCategory)
                          ?.label
                      }}
                    </span>
                  </template>
                </USelectMenu>
                <UInput
                  v-model="noteText"
                  placeholder="Add a note..."
                  class="flex-1"
                  size="sm"
                  @keyup.enter="addNote"
                />
                <UButton size="sm" @click="addNote" :disabled="!noteText.trim()"
                  >Add</UButton
                >
              </div>

              <!-- Notes List -->
              <div
                v-if="notes.length > 0"
                class="space-y-2 max-h-40 overflow-y-auto"
              >
                <div
                  v-for="(note, idx) in notes"
                  :key="idx"
                  class="flex items-start gap-2 p-2 rounded-lg border border-gray-200 dark:border-gray-700 text-sm"
                >
                  <span class="text-lg">{{
                    noteCategories.find((c) => c.value === note.category)?.icon
                  }}</span>
                  <div class="flex-1">
                    <p class="text-gray-900 dark:text-white">{{ note.text }}</p>
                    <p class="text-xs text-gray-400 mt-1">
                      {{ note.timestamp.toLocaleString() }}
                    </p>
                  </div>
                  <button
                    @click="notes.splice(idx, 1)"
                    class="text-gray-400 hover:text-red-500"
                  >
                    <UIcon name="i-heroicons-x-mark" class="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>

          <!-- Fulfillment Scheduling -->
          <div
            class="bg-white dark:bg-gray-900 dark:border-gray-700 border-slate-200 rounded-xl border p-5"
          >
            <div class="flex items-center justify-between mb-3">
              <h3 class="font-semibold flex items-center gap-2">
                <UIcon name="i-heroicons-calendar" class="w-5 h-5" />
                Fulfillment Schedule
              </h3>
              <USwitch v-model="scheduleFulfillment" />
            </div>

            <div v-if="scheduleFulfillment" class="space-y-3">
              <div class="grid grid-cols-2 gap-3">
                <UFormField label="Date">
                  <UInput v-model="fulfillmentDate" type="date" size="sm" />
                </UFormField>
                <UFormField label="Time">
                  <UInput v-model="fulfillmentTime" type="time" size="sm" />
                </UFormField>
              </div>
              <UFormField label="Special Instructions">
                <UTextarea
                  v-model="fulfillmentNotes"
                  :rows="2"
                  placeholder="e.g., Call before delivery..."
                />
              </UFormField>
            </div>
          </div>
        </div>

        <!-- ============ RIGHT SIDEBAR ============ -->
        <div class="w-80 space-y-4">
          <!-- Staff Assignment -->
          <div
            class="bg-white dark:bg-gray-900 dark:border-gray-700 border-slate-200 rounded-xl border overflow-hidden"
          >
            <div
              class="px-4 py-3 border-b dark:border-gray-700 border-slate-200 flex items-center justify-between"
            >
              <span
                class="text-sm font-medium text-gray-500 uppercase flex items-center gap-2"
              >
                <UIcon name="i-heroicons-user-group" class="w-4 h-4" />
                Staff
              </span>
              <UButton size="xs" variant="ghost" @click="showStaffModal = true"
                >Assign</UButton
              >
            </div>
            <div class="p-4">
              <div
                v-if="assignedStaff.length === 0"
                class="text-sm text-gray-400 text-center py-2"
              >
                No staff assigned
              </div>
              <div v-else class="space-y-2">
                <div
                  v-for="staffId in assignedStaff"
                  :key="staffId"
                  class="flex items-center gap-2 text-sm"
                >
                  <span>{{
                    staffMembers.find((s) => s.id === staffId)?.avatar
                  }}</span>
                  <span class="font-medium">{{
                    staffMembers.find((s) => s.id === staffId)?.name
                  }}</span>
                  <span class="text-xs text-gray-400">{{
                    staffMembers.find((s) => s.id === staffId)?.role
                  }}</span>
                </div>
              </div>
            </div>
          </div>

          <!-- Payment Card -->
          <div
            class="bg-white dark:bg-gray-900 dark:border-gray-700 border-slate-200 rounded-xl border overflow-hidden"
          >
            <div
              class="px-4 py-3 border-b dark:border-gray-700 border-slate-200 flex items-center justify-between"
            >
              <span class="text-sm font-medium text-gray-500 uppercase"
                >Payment</span
              >
            </div>
            <div class="p-4 space-y-4">
              <!-- Split Payment Toggle -->
              <div
                class="flex items-center justify-between pb-3 border-b border-gray-200 dark:border-gray-700"
              >
                <span class="text-sm text-gray-600 dark:text-gray-400"
                  >Split Payment</span
                >
                <USwitch v-model="enableSplitPayment" />
              </div>

              <div v-if="!enableSplitPayment" class="grid grid-cols-2 gap-2">
                <button
                  v-for="method in paymentMethods"
                  :key="method.value"
                  class="flex items-center gap-2 p-2 rounded-lg border text-sm transition-all"
                  :class="
                    selectedPaymentMethod === method.value
                      ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                      : 'border-gray-200 dark:border-gray-700'
                  "
                  @click="selectedPaymentMethod = method.value as PaymentMethod"
                >
                  <span>{{ method.emoji }}</span
                  ><span>{{ method.label }}</span>
                </button>
              </div>

              <!-- Split Payments -->
              <div v-else class="space-y-2">
                <div
                  v-for="(payment, idx) in splitPayments"
                  :key="idx"
                  class="flex items-center gap-2 p-2 bg-gray-50 dark:bg-gray-800 rounded-lg"
                >
                  <USelectMenu
                    v-model="payment.method"
                    :options="
                      paymentMethods.map((m) => ({
                        label: m.emoji + ' ' + m.label,
                        value: m.value,
                      }))
                    "
                    size="xs"
                    class="w-32"
                  />
                  <UInput
                    v-model.number="payment.amount"
                    type="number"
                    size="xs"
                    class="flex-1"
                    placeholder="Amount"
                  />
                  <UButton
                    icon="i-heroicons-x-mark"
                    size="xs"
                    variant="ghost"
                    color="red"
                    @click="removeSplitPayment(idx)"
                  />
                </div>
                <UButton
                  size="xs"
                  variant="soft"
                  block
                  @click="addSplitPayment"
                >
                  + Add Payment Method
                </UButton>
                <div
                  v-if="splitPayments.length > 0"
                  class="text-xs text-center pt-2 border-t border-gray-200 dark:border-gray-700"
                >
                  <span class="text-gray-500">Split Total:</span>
                  <span
                    class="font-bold ml-1"
                    :class="
                      splitPaymentTotal >= total
                        ? 'text-green-600'
                        : 'text-red-500'
                    "
                  >
                    {{ formatCurrency(splitPaymentTotal, "LAK") }}
                  </span>
                  <span class="text-gray-400 ml-1"
                    >/ {{ formatCurrency(total, "LAK") }}</span
                  >
                </div>
              </div>
              <div
                class="pt-3 border-t dark:border-gray-700 border-slate-200 space-y-3 text-sm"
              >
                <!-- KiotViet-style: Paid amount input -->
                <div class="flex items-center justify-between">
                  <span class="text-gray-500">Amount Paid</span>
                  <UInput
                    v-model.number="paidAmount"
                    type="number"
                    :min="0"
                    class="w-32 text-right"
                    size="sm"
                    placeholder="0"
                  />
                </div>
                <div class="flex justify-between">
                  <span class="text-gray-500">Outstanding</span>
                  <span
                    class="font-semibold"
                    :class="
                      paidAmount >= total ? 'text-green-600' : 'text-red-500'
                    "
                  >
                    {{ formatCurrency(Math.max(0, total - paidAmount), "LAK") }}
                  </span>
                </div>
                <div
                  v-if="paidAmount > total"
                  class="flex justify-between bg-green-50 dark:bg-green-900/20 -mx-4 px-4 py-2 rounded"
                >
                  <span class="text-green-700 dark:text-green-400 font-medium"
                    >Change</span
                  >
                  <span
                    class="text-green-700 dark:text-green-400 font-bold text-lg"
                    >{{ formatCurrency(change, "LAK") }}</span
                  >
                </div>
              </div>
              <UButton
                block
                color="green"
                size="lg"
                :disabled="cart.length === 0"
                @click="showPaymentModal = true"
              >
                Record Payment
              </UButton>
            </div>
          </div>

          <!-- Quick Actions -->
          <div
            class="bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-xl border border-blue-200 dark:border-blue-800 p-4"
          >
            <div class="flex items-center justify-between mb-3">
              <span class="text-sm font-semibold text-gray-900 dark:text-white"
                >Quick Actions</span
              >
              <UIcon name="i-heroicons-bolt" class="w-4 h-4 text-blue-600" />
            </div>
            <div class="space-y-2">
              <UButton
                size="xs"
                variant="soft"
                block
                color="blue"
                @click="showTemplateModal = true"
              >
                📋 Load Template
              </UButton>
              <UButton
                size="xs"
                variant="soft"
                block
                color="purple"
                @click="showRecommendations = !showRecommendations"
              >
                ✨ Smart Suggest
              </UButton>
              <UButton
                size="xs"
                variant="soft"
                block
                color="green"
                :disabled="cart.length === 0"
              >
                📧 Email Quote
              </UButton>
              <UButton
                size="xs"
                variant="soft"
                block
                color="orange"
                :disabled="cart.length === 0"
              >
                📄 Export PDF
              </UButton>
            </div>
          </div>

          <!-- Shortcuts -->
          <div class="bg-gray-100 dark:bg-gray-800/50 rounded-xl p-4 text-sm">
            <p class="font-medium mb-2">Shortcuts</p>
            <div class="space-y-1 text-gray-500">
              <div class="flex justify-between">
                <span>Add Products</span
                ><kbd class="px-1.5 bg-white dark:bg-gray-700 rounded text-xs"
                  >F2</kbd
                >
              </div>
              <div class="flex justify-between">
                <span>Customer</span
                ><kbd class="px-1.5 bg-white dark:bg-gray-700 rounded text-xs"
                  >F3</kbd
                >
              </div>
              <div class="flex justify-between">
                <span>Payment</span
                ><kbd class="px-1.5 bg-white dark:bg-gray-700 rounded text-xs"
                  >⌘P</kbd
                >
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- ============ CUSTOMER MODAL ============ -->
    <UModal v-model:open="showCustomerModal">
      <template #content>
        <div class="p-6">
          <div class="flex items-center justify-between mb-4">
            <h3 class="text-xl font-bold text-gray-900 dark:text-white">
              Customer Lookup
            </h3>
            <UButton
              icon="i-heroicons-x-mark"
              variant="ghost"
              color="gray"
              @click="showCustomerModal = false"
            />
          </div>
          <UInput
            v-model="customerSearchQuery"
            icon="i-heroicons-magnifying-glass"
            placeholder="Search customers..."
            size="lg"
            autofocus
            class="mb-4"
          />
          <div class="max-h-64 overflow-y-auto space-y-2">
            <div
              v-for="customer in filteredCustomers"
              :key="customer.id"
              class="flex items-center gap-3 p-3 rounded-lg border border-slate-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer"
              @click="selectCustomer(customer)"
            >
              <div
                class="w-10 h-10 rounded-full bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center text-white font-bold"
              >
                {{ (customer.name || "C").slice(0, 2).toUpperCase() }}
              </div>
              <div class="flex-1">
                <p class="font-medium text-gray-900 dark:text-white">
                  {{ customer.name || "Customer" }}
                </p>
                <p class="text-sm text-gray-500">
                  {{ customer.phone || customer.email }}
                </p>
              </div>
              <UBadge color="gray" variant="soft" size="xs">
                {{ customer.tier }}
              </UBadge>
            </div>
            <div
              v-if="filteredCustomers.length === 0"
              class="text-center py-8 text-gray-500"
            >
              No customers found
            </div>
          </div>
          <div
            class="mt-4 pt-4 border-t border-slate-200 dark:border-gray-700 flex gap-3"
          >
            <UButton
              variant="outline"
              class="flex-1"
              @click="showCustomerModal = false"
              >Cancel</UButton
            >
            <UButton color="primary" class="flex-1" icon="i-heroicons-plus"
              >New Customer</UButton
            >
          </div>
        </div>
      </template>
    </UModal>

    <!-- ============ PRODUCT SELECTION MODAL ============ -->
    <UModal v-model:open="showProductModal" :ui="{ width: 'sm:max-w-3xl' }">
      <template #content>
        <div class="p-6">
          <div class="flex items-center justify-between mb-4">
            <h3 class="text-xl font-bold text-gray-900 dark:text-white">
              Select Products
            </h3>
            <UButton
              icon="i-heroicons-x-mark"
              variant="ghost"
              color="gray"
              @click="showProductModal = false"
            />
          </div>
          <UInput
            v-model="productSearchQuery"
            icon="i-heroicons-magnifying-glass"
            placeholder="Search by name, SKU, or barcode..."
            size="lg"
            autofocus
            class="mb-4"
          />

          <!-- Product List -->
          <div
            class="max-h-96 overflow-y-auto border border-slate-200 dark:border-gray-700 rounded-lg divide-y divide-slate-200 dark:divide-gray-700"
          >
            <div
              v-for="product in filteredProducts"
              :key="product.id"
              class="flex items-center gap-4 p-4 hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer"
              :class="{
                'bg-primary-50 dark:bg-primary-900/20':
                  selectedProductsInModal.has(product.id),
              }"
              @click="toggleProductSelection(product.id)"
            >
              <UCheckbox
                :model-value="selectedProductsInModal.has(product.id)"
                @click.stop
              />

              <div
                class="w-12 h-12 rounded-lg bg-gray-100 dark:bg-gray-700 flex items-center justify-center overflow-hidden"
              >
                <img
                  v-if="product.image"
                  :src="product.image"
                  class="w-full h-full object-cover"
                />
                <span v-else>📦</span>
              </div>

              <div class="flex-1">
                <p class="font-medium text-gray-900 dark:text-white">
                  {{ product.name }}
                </p>
                <div class="flex items-center gap-2 text-sm text-gray-500">
                  <span>SKU: {{ product.sku }}</span>
                  <span v-if="product.barcode" class="text-xs">
                    | 📊 {{ product.barcode }}
                  </span>
                </div>
              </div>

              <div class="text-right">
                <p class="font-semibold text-primary-600">
                  {{ formatCurrency(product.price, "LAK") }}
                </p>
                <p class="text-xs text-gray-400">
                  {{ product.stock }} in stock
                </p>
              </div>

              <!-- Quantity Input (when selected) -->
              <div
                v-if="selectedProductsInModal.has(product.id)"
                class="flex items-center gap-2"
                @click.stop
              >
                <UInput
                  type="number"
                  :model-value="productQuantities[product.id] ?? 1"
                  :min="1"
                  :max="product.stock"
                  class="w-20"
                  size="sm"
                  @update:model-value="
                    (val) =>
                      updateProductQuantityInModal(product.id, Number(val) || 1)
                  "
                />
              </div>
            </div>
            <div
              v-if="filteredProducts.length === 0"
              class="p-8 text-center text-gray-500"
            >
              No products found
            </div>
          </div>

          <!-- Footer -->
          <div
            class="mt-4 pt-4 border-t border-slate-200 dark:border-gray-700 flex items-center justify-between"
          >
            <span class="text-sm text-gray-500"
              >{{ selectedProductsInModal.size }} products selected</span
            >
            <div class="flex gap-3">
              <UButton variant="outline" @click="showProductModal = false"
                >Cancel</UButton
              >
              <UButton
                color="primary"
                :disabled="selectedProductsInModal.size === 0"
                @click="addSelectedProductsToCart"
              >
                Add to Order
              </UButton>
            </div>
          </div>
        </div>
      </template>
    </UModal>

    <!-- ============ SHIPPING MODAL ============ -->
    <UModal v-model:open="showShippingModal">
      <template #content>
        <div class="p-6">
          <div class="flex items-center justify-between mb-4">
            <h3 class="text-xl font-bold text-gray-900 dark:text-white">
              Delivery Information
            </h3>
            <UButton
              icon="i-heroicons-x-mark"
              variant="ghost"
              color="gray"
              @click="showShippingModal = false"
            />
          </div>

          <div class="space-y-4">
            <div class="grid grid-cols-2 gap-4">
              <UFormField label="Sender Name">
                <UInput
                  v-model="shippingInfo.senderName"
                  placeholder="Your name"
                />
              </UFormField>
              <UFormField label="Sender Phone">
                <UInput
                  v-model="shippingInfo.senderPhone"
                  placeholder="Phone"
                />
              </UFormField>
            </div>
            <div class="border-t border-slate-200 dark:border-gray-700 pt-4">
              <p
                class="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3"
              >
                Recipient
              </p>
              <div class="grid grid-cols-2 gap-4">
                <UFormField label="Recipient Name">
                  <UInput
                    v-model="shippingInfo.recipientName"
                    placeholder="Recipient name"
                  />
                </UFormField>
                <UFormField label="Recipient Phone">
                  <UInput
                    v-model="shippingInfo.recipientPhone"
                    placeholder="Phone"
                  />
                </UFormField>
              </div>
            </div>
            <UFormField label="Delivery Address">
              <UTextarea
                v-model="shippingInfo.address"
                placeholder="Full address"
                :rows="2"
              />
            </UFormField>
            <div class="grid grid-cols-2 gap-4">
              <UFormField label="City">
                <UInput v-model="shippingInfo.city" placeholder="City" />
              </UFormField>
              <UFormField label="Postal Code">
                <UInput
                  v-model="shippingInfo.postalCode"
                  placeholder="Postal code"
                />
              </UFormField>
            </div>
            <UFormField label="Delivery Notes">
              <UTextarea
                v-model="shippingInfo.deliveryNotes"
                placeholder="Special instructions..."
                :rows="2"
              />
            </UFormField>

            <!-- Shipping Method & Carrier -->
            <div class="border-t border-gray-200 dark:border-gray-700 pt-4">
              <p
                class="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3"
              >
                Shipping Details
              </p>
              <div class="space-y-3">
                <UFormField label="Shipping Method">
                  <USelectMenu
                    v-model="shippingInfo.shippingMethod"
                    :options="
                      shippingMethods.map((m) => ({
                        label: m.label + ' - ' + formatCurrency(m.price, 'LAK'),
                        value: m.value,
                      }))
                    "
                  />
                </UFormField>
                <UFormField label="Carrier">
                  <USelectMenu
                    v-model="shippingInfo.carrier"
                    :options="
                      shippingCarriers.map((c) => ({
                        label: c.icon + ' ' + c.label,
                        value: c.value,
                      }))
                    "
                  />
                </UFormField>
                <UFormField label="Tracking Number (Optional)">
                  <UInput
                    v-model="shippingInfo.trackingNumber"
                    placeholder="e.g., 1Z999AA10123456784"
                  />
                </UFormField>
                <div class="flex items-center gap-4">
                  <label class="flex items-center gap-2 text-sm">
                    <UCheckbox v-model="shippingInfo.requiresSignature" />
                    <span>Requires Signature</span>
                  </label>
                </div>
                <UFormField label="Insurance Value (Optional)">
                  <UInput
                    v-model.number="shippingInfo.insurance"
                    type="number"
                    :min="0"
                    placeholder="0"
                  />
                </UFormField>
              </div>
            </div>
          </div>

          <div class="mt-6 flex gap-3">
            <UButton
              variant="outline"
              class="flex-1"
              @click="showShippingModal = false"
              >Cancel</UButton
            >
            <UButton
              color="primary"
              class="flex-1"
              @click="showShippingModal = false"
              >Save</UButton
            >
          </div>
        </div>
      </template>
    </UModal>

    <!-- ============ PAYMENT MODAL ============ -->
    <UModal v-model:open="showPaymentModal" :ui="{ width: 'sm:max-w-md' }">
      <template #content>
        <div class="p-6">
          <div class="flex items-center justify-between mb-4">
            <h3 class="text-xl font-bold">Record Payment</h3>
            <UButton
              icon="i-heroicons-x-mark"
              variant="ghost"
              @click="showPaymentModal = false"
            />
          </div>
          <div
            class="bg-gray-50 dark:bg-gray-800 rounded-xl p-4 mb-6 text-center"
          >
            <p class="text-sm text-gray-500 mb-1">Amount Due</p>
            <p class="text-3xl font-bold text-primary-600">
              {{ formatCurrency(total, "LAK") }}
            </p>
          </div>
          <div class="grid grid-cols-2 gap-2 mb-6">
            <button
              v-for="method in paymentMethods"
              :key="method.value"
              class="p-3 rounded-lg border text-center transition-all"
              :class="
                selectedPaymentMethod === method.value
                  ? 'border-primary-500 bg-primary-50'
                  : 'border-gray-200'
              "
              @click="selectedPaymentMethod = method.value as PaymentMethod"
            >
              <span class="text-2xl">{{ method.emoji }}</span>
              <p class="text-sm mt-1">{{ method.label }}</p>
            </button>
          </div>
          <div class="flex gap-3">
            <UButton
              variant="outline"
              class="flex-1"
              @click="showPaymentModal = false"
              >Cancel</UButton
            >
            <UButton
              color="green"
              class="flex-1"
              :loading="processing"
              @click="processOrder"
              >Confirm Payment</UButton
            >
          </div>
        </div>
      </template>
    </UModal>

    <!-- ============ CUSTOMER INSIGHTS MODAL ============ -->
    <UModal v-model:open="showCustomerInsights" :ui="{ width: 'sm:max-w-2xl' }">
      <template #content>
        <div class="p-6">
          <div class="flex items-center justify-between mb-4">
            <h3 class="text-xl font-bold text-gray-900 dark:text-white">
              Customer Insights
            </h3>
            <UButton
              icon="i-heroicons-x-mark"
              variant="ghost"
              color="gray"
              @click="showCustomerInsights = false"
            />
          </div>

          <div v-if="selectedCustomer" class="space-y-6">
            <!-- Customer Summary -->
            <div
              class="flex items-center gap-4 p-4 bg-gradient-to-r from-primary-50 to-purple-50 dark:from-primary-900/20 dark:to-purple-900/20 rounded-xl"
            >
              <div
                class="w-16 h-16 rounded-full bg-gradient-to-br from-primary-500 to-purple-500 flex items-center justify-center text-white font-bold text-2xl"
              >
                {{ (selectedCustomer.name || "C").slice(0, 2).toUpperCase() }}
              </div>
              <div class="flex-1">
                <h4 class="text-lg font-bold text-gray-900 dark:text-white">
                  {{ selectedCustomer.name }}
                </h4>
                <p class="text-sm text-gray-600 dark:text-gray-400">
                  {{ selectedCustomer.email || selectedCustomer.phone }}
                </p>
                <div class="flex items-center gap-2 mt-1">
                  <UBadge color="primary" variant="soft" size="xs">
                    {{ selectedCustomer.tier }}
                  </UBadge>
                  <span class="text-xs text-gray-500">Member since 2024</span>
                </div>
              </div>
            </div>

            <!-- Stats Grid -->
            <div class="grid grid-cols-3 gap-4">
              <div
                class="text-center p-4 bg-gray-50 dark:bg-gray-800 rounded-xl"
              >
                <p class="text-2xl font-bold text-gray-900 dark:text-white">
                  {{
                    selectedCustomer.totalSpent
                      ? formatCurrency(selectedCustomer.totalSpent, "LAK")
                      : "0"
                  }}
                </p>
                <p class="text-xs text-gray-500 mt-1">Total Spent</p>
              </div>
              <div
                class="text-center p-4 bg-gray-50 dark:bg-gray-800 rounded-xl"
              >
                <p class="text-2xl font-bold text-gray-900 dark:text-white">
                  {{ customerOrderHistory.length }}
                </p>
                <p class="text-xs text-gray-500 mt-1">Orders</p>
              </div>
              <div
                class="text-center p-4 bg-gray-50 dark:bg-gray-800 rounded-xl"
              >
                <p class="text-2xl font-bold text-gray-900 dark:text-white">
                  {{ selectedCustomer.points || 0 }}
                </p>
                <p class="text-xs text-gray-500 mt-1">Loyalty Points</p>
              </div>
            </div>

            <!-- Recent Orders -->
            <div>
              <h4 class="font-semibold text-gray-900 dark:text-white mb-3">
                Recent Orders
              </h4>
              <div class="space-y-2 max-h-48 overflow-y-auto">
                <div
                  v-for="order in customerOrderHistory"
                  :key="order.id"
                  class="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg"
                >
                  <div>
                    <p
                      class="font-medium text-sm text-gray-900 dark:text-white"
                    >
                      {{ order.id }}
                    </p>
                    <p class="text-xs text-gray-500">
                      {{ new Date(order.date).toLocaleDateString() }}
                    </p>
                  </div>
                  <div class="text-right">
                    <p
                      class="font-semibold text-sm text-gray-900 dark:text-white"
                    >
                      {{ formatCurrency(order.total, "LAK") }}
                    </p>
                    <UBadge color="green" variant="soft" size="xs">
                      {{ order.status }}
                    </UBadge>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div class="mt-6 flex gap-3">
            <UButton
              variant="outline"
              class="flex-1"
              @click="showCustomerInsights = false"
              >Close</UButton
            >
            <UButton color="primary" class="flex-1">View Full Profile</UButton>
          </div>
        </div>
      </template>
    </UModal>

    <!-- ============ STAFF ASSIGNMENT MODAL ============ -->
    <UModal v-model:open="showStaffModal">
      <template #content>
        <div class="p-6">
          <div class="flex items-center justify-between mb-4">
            <h3 class="text-xl font-bold text-gray-900 dark:text-white">
              Assign Staff
            </h3>
            <UButton
              icon="i-heroicons-x-mark"
              variant="ghost"
              color="gray"
              @click="showStaffModal = false"
            />
          </div>

          <div class="space-y-2">
            <div
              v-for="staff in staffMembers"
              :key="staff.id"
              class="flex items-center gap-3 p-3 rounded-lg border border-gray-200 dark:border-gray-700 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800"
              :class="{
                'bg-primary-50 dark:bg-primary-900/20 border-primary-300':
                  assignedStaff.includes(staff.id),
              }"
              @click="
                assignedStaff.includes(staff.id)
                  ? (assignedStaff = assignedStaff.filter(
                      (id) => id !== staff.id
                    ))
                  : assignedStaff.push(staff.id)
              "
            >
              <UCheckbox
                :model-value="assignedStaff.includes(staff.id)"
                @click.stop
              />
              <span class="text-2xl">{{ staff.avatar }}</span>
              <div class="flex-1">
                <p class="font-medium text-gray-900 dark:text-white">
                  {{ staff.name }}
                </p>
                <p class="text-sm text-gray-500">{{ staff.role }}</p>
              </div>
            </div>
          </div>

          <div class="mt-6 flex gap-3">
            <UButton
              variant="outline"
              class="flex-1"
              @click="showStaffModal = false"
              >Cancel</UButton
            >
            <UButton
              color="primary"
              class="flex-1"
              @click="showStaffModal = false"
              >Done</UButton
            >
          </div>
        </div>
      </template>
    </UModal>

    <!-- ============ ORDER TEMPLATES MODAL ============ -->
    <UModal v-model:open="showTemplateModal">
      <template #content>
        <div class="p-6">
          <div class="flex items-center justify-between mb-4">
            <h3 class="text-xl font-bold text-gray-900 dark:text-white">
              Order Templates
            </h3>
            <UButton
              icon="i-heroicons-x-mark"
              variant="ghost"
              color="gray"
              @click="showTemplateModal = false"
            />
          </div>

          <div class="space-y-2">
            <div
              v-for="template in orderTemplates"
              :key="template.id"
              class="flex items-center justify-between p-4 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer"
            >
              <div>
                <p class="font-medium text-gray-900 dark:text-white">
                  {{ template.name }}
                </p>
                <p class="text-sm text-gray-500">
                  {{ template.items }} items ·
                  {{ formatCurrency(template.total, "LAK") }}
                </p>
              </div>
              <UButton size="sm" variant="soft" color="primary">Load</UButton>
            </div>
          </div>

          <div class="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
            <UButton block variant="outline" icon="i-heroicons-plus">
              Save Current as Template
            </UButton>
          </div>
        </div>
      </template>
    </UModal>
  </div>
</template>
